import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { WordEntry } from "../types";
import { splitMeanings } from "./arabic";
import { nanoid } from "./utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function parsePdfFile(file: File): Promise<WordEntry[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allTextItems: { text: string; x: number; y: number; page: number; height: number }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    for (const item of content.items) {
      if ("str" in item && item.str.trim()) {
        const transform = item.transform as number[];
        const y = Math.round(transform[5]);
        const height = Math.abs(transform[3]) || 12;

        // Ignore items very close to top or bottom edge (headers/footers/watermarks)
        const marginThreshold = pageHeight * 0.07;
        if (y < marginThreshold || y > pageHeight - marginThreshold) continue;

        allTextItems.push({
          text: item.str.trim(),
          x: Math.round(transform[4]),
          y,
          page: pageNum,
          height,
        });
      }
    }
  }

  return extractWordsFromTextItems(allTextItems);
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  page: number;
  height?: number;
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Known Part-of-Speech abbreviations to reject as standalone tokens.
 */
const POS_ABBR = new Set([
  "n", "v", "adj", "adv", "prep", "conj", "int", "pron", "det", "art",
  "ph", "ph.",
  "n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.",
  "i", "ii", "iii", "iv",
]);

function isPosAbbr(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/\.$/, "");
  if (/^[a-z]$/.test(t)) return true;
  return POS_ABBR.has(t) || POS_ABBR.has(t + ".");
}

/**
 * Strip leading POS abbreviations merged into the word text.
 * e.g. "Ph. V make up for" → "make up for"
 *      "Ph.V run out"       → "run out"
 *      "N. freedom"         → "freedom"
 *      "V. escape"          → "escape"
 */
function stripLeadingPos(text: string): string {
  return text
    .replace(
      /^(?:Ph\.\s*V\.?|Ph\s+V\.?|Phr?\.?\s*V\.?|[NVAIP]\.?\s+(?=[A-Za-z]))/i,
      ""
    )
    .trim();
}

function isHeaderOrJunk(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  const patterns = [
    // Table headers (English)
    /^(Word|Part of speech|Meaning|Lesson|Module|Unit|Vocabulary|Type|Definition)$/i,
    // Watermark / branding (various spellings)
    /UULA/i,
    /uula/i,
    /www\./i,
    /\.com/i,
    /\.net/i,
    /\.org/i,
    // Arabic copyright / footer / watermarks
    /جميع الحقوق/,
    /محفوظة/,
    /حقوق الطبع/,
    /لـ?\s*uula/i,
    /يولا|يولى/,
    /الدرس|الوحدة|الفصل|الصفحة/,
    /الطالب|المعلم|الكتاب/,
    // Standalone Arabic POS words
    /^(صفة|اسم|فعل|حال|حرف|فعل مركب|فعل عبارة|ضمير|أداة|عبارة فعلية)$/,
    /^(صفة|اسم|فعل|حال|حرف|فعل مركب|عبارة)\s/,
    // Lesson / page numbers only
    /^\d+$/,
    /^[\d\s\-–]+$/,
    // Copyright symbol
    /^©/,
    // Very short punctuation-only strings
    /^[.\-–—،,;:]+$/,
    // Pure POS patterns (standalone)
    /^(Ph\.\s*V\.?|Ph\s+V|Phr?\.?\s*V\.?)$/i,
  ];

  return patterns.some((p) => p.test(t));
}

function isValidEnglishWord(text: string): boolean {
  const t = text.trim();
  // Must start with a letter
  if (!/^[a-zA-Z]/.test(t)) return false;
  // Must contain only Latin chars, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z][a-zA-Z\s\-'\.]*$/.test(t)) return false;
  // Reject POS abbreviations
  if (isPosAbbr(t)) return false;
  // Reject all-caps abbreviations like "UULA", "WWW"
  if (/^[A-Z]{2,}$/.test(t)) return false;
  return true;
}

function extractWordsFromTextItems(items: TextItem[]): WordEntry[] {
  const words: WordEntry[] = [];
  const seen = new Set<string>();

  const byPage = new Map<number, TextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.page)) byPage.set(item.page, []);
    byPage.get(item.page)!.push(item);
  }

  for (const [, pageItems] of byPage) {
    const sorted = [...pageItems].sort((a, b) => b.y - a.y || a.x - b.x);

    // Cluster into lines (items within 8px vertically)
    const lines: TextItem[][] = [];
    let currentLine: TextItem[] = [];
    let lastY = sorted[0]?.y ?? 0;

    for (const item of sorted) {
      if (Math.abs(item.y - lastY) <= 8) {
        currentLine.push(item);
      } else {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [item];
        lastY = item.y;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    for (const line of lines) {
      const englishItems: TextItem[] = [];
      const arabicItems: TextItem[] = [];

      for (const item of line) {
        const rawText = item.text.trim();
        if (!rawText || isHeaderOrJunk(rawText)) continue;

        if (isArabicText(rawText)) {
          arabicItems.push(item);
        } else {
          // Strip leading POS abbreviations merged with the word
          const cleaned = stripLeadingPos(rawText);
          if (cleaned && isValidEnglishWord(cleaned)) {
            englishItems.push({ ...item, text: cleaned });
          }
        }
      }

      if (englishItems.length === 0 || arabicItems.length === 0) continue;

      // English word: join multi-word phrases (e.g. "do away with")
      const wordText = englishItems.map((i) => i.text.trim()).join(" ").trim();
      if (!wordText || seen.has(wordText.toLowerCase())) continue;
      seen.add(wordText.toLowerCase());

      // Arabic meanings: split by separators (– / - / ،) and flatten
      const meanings = arabicItems
        .flatMap((item) => splitMeanings(item.text.trim()))
        .filter(Boolean);

      if (meanings.length === 0) continue;

      words.push({ id: nanoid(), word: wordText, meanings });
    }
  }

  return words;
}
