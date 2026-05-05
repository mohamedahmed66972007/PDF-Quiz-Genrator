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
 * Pure meaning-separator characters that appear between Arabic words.
 * These must NOT be discarded — they are needed to split compound meanings
 * like "عجزة – شيخوخة" into two distinct entries.
 */
function isMeaningSeparator(text: string): boolean {
  return /^[—–\/،]+$/.test(text.trim());
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
 *      "N. freedom"         → "freedom"
 */
function stripLeadingPos(text: string): string {
  return text
    .replace(
      /^(?:Ph\.\s*V\.?|Ph\s+V\.?|Phr?\.?\s*V\.?|[NVAIP]\.?\s+(?=[A-Za-z]))/i,
      ""
    )
    .trim();
}

/**
 * Arabic words that belong to the Part-of-Speech column, not the meaning column.
 * These appear as full labels or fragments when PDF.js splits them.
 *
 * Full labels:   صفة, اسم, فعل, حال, حرف, فعل مركب, حرف جر, عبارة فعلية, مصطلح …
 * Fragments:     مركب (from "فعل مركب"), جر (from "حرف جر"), فعلية, متعد …
 */
const ARABIC_POS_WORDS = new Set([
  // Full standalone POS words
  "صفة", "اسم", "فعل", "حال", "حرف", "ضمير", "أداة", "عبارة",
  // Idiom label (Idiom = مصطلح)
  "مصطلح",
  // Fragments that leak when PDF.js splits a multi-word POS label
  "مركب", "جر", "فعلية", "متعد", "لازم",
]);

function isArabicPosLabel(text: string): boolean {
  const t = text.trim();
  // Single-word POS fragment
  if (ARABIC_POS_WORDS.has(t)) return true;
  // Multi-word POS labels (full forms)
  if (/^(فعل مركب|حرف جر|عبارة فعلية|فعل عبارة)$/.test(t)) return true;
  // POS word followed by anything (e.g. "صفة Adj", "اسم N", "مصطلح Idiom")
  if (/^(صفة|اسم|فعل|حال|حرف|فعل مركب|حرف جر|عبارة|مصطلح)\s/.test(t)) return true;
  return false;
}

/**
 * Returns true if a line contains a POS marker indicating an Idiom or Phrasal Verb.
 * These rows should be skipped entirely — they are not standalone vocabulary words.
 */
function isIdiomOrPhrasalVerbLine(items: TextItem[]): boolean {
  return items.some((item) => {
    const t = item.text.trim();
    // English POS markers
    if (/^Idiom$/i.test(t)) return true;
    if (/^(Ph\.\s*V\.?|Ph\s+V\.?|Phr?\.?\s*V\.?)$/i.test(t)) return true;
    // Arabic POS markers
    if (t === "مصطلح") return true;
    if (t === "فعل مركب") return true;
    // Combined label like "مصطلح Idiom" or "فعل مركب Ph. V"
    if (/مصطلح/.test(t)) return true;
    if (/فعل مركب/.test(t)) return true;
    return false;
  });
}

function isHeaderOrJunk(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  const patterns = [
    // Table headers (English)
    /^(Word|Part of speech|Meaning|Lesson|Module|Unit|Vocabulary|Type|Definition)$/i,
    // Watermark / branding
    /UULA/i,
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
    // Lesson / page numbers
    /^\d+$/,
    /^[\d\s]+$/,
    // Copyright symbol
    /^©/,
    // Pure POS patterns (standalone English)
    /^(Ph\.\s*V\.?|Ph\s+V|Phr?\.?\s*V\.?)$/i,
    // Idiom label
    /^Idiom$/i,
  ];

  return patterns.some((p) => p.test(t));
}

function isValidEnglishWord(text: string): boolean {
  const t = text.trim();
  if (!/^[a-zA-Z]/.test(t)) return false;
  if (!/^[a-zA-Z][a-zA-Z\s\-'\.]*$/.test(t)) return false;
  if (isPosAbbr(t)) return false;
  if (/^[A-Z]{2,}$/.test(t)) return false;
  return true;
}

/**
 * Reconstruct Arabic meanings from text items on the same line.
 *
 * Problem context:
 * - PDF.js emits Arabic text as many small chunks (one word or phrase per item).
 * - Separator characters like "–" may be emitted as their own separate item.
 * - The POS column ("فعل مركب") sits between the English word column and the
 *   Arabic meaning column; its fragments must be excluded.
 *
 * Strategy:
 * 1. Receive "arabic meaning" items (already filtered for POS words) and
 *    "separator" items (–, /, ،) that fell between them.
 * 2. Merge both lists and sort by x DESCENDING (RTL reading order).
 * 3. Join with spaces — this produces a string like "عجزة – شيخوخة" or
 *    "على الرغم من" (no separator ⇒ one compound meaning).
 * 4. Call splitMeanings() which splits on –, /, ، to get the final list.
 */
function buildArabicMeanings(
  arabicItems: TextItem[],
  separatorItems: TextItem[]
): string[] {
  const combined = [...arabicItems, ...separatorItems].sort(
    (a, b) => b.x - a.x
  );

  const joined = combined
    .map((i) => i.text.trim())
    .filter(Boolean)
    .join(" ");

  return splitMeanings(joined).filter(Boolean);
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
      // Skip entire rows that are Idioms or Phrasal Verbs — not vocabulary words
      if (isIdiomOrPhrasalVerbLine(line)) continue;

      const englishItems: TextItem[] = [];
      const arabicItems: TextItem[] = [];
      // Separator characters (–, /, ،) kept separately so they are not lost
      const separatorItems: TextItem[] = [];

      for (const item of line) {
        const rawText = item.text.trim();
        if (!rawText) continue;

        // Preserve meaning separators — do NOT discard them
        if (isMeaningSeparator(rawText)) {
          separatorItems.push(item);
          continue;
        }

        // Discard generic junk / headers / watermarks
        if (isHeaderOrJunk(rawText)) continue;

        if (isArabicText(rawText)) {
          // Discard Arabic POS column words (e.g. "صفة", "مركب", "جر")
          if (isArabicPosLabel(rawText)) continue;
          arabicItems.push(item);
        } else {
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

      // Arabic meanings: merge with separators, sort RTL, then split
      const meanings = buildArabicMeanings(arabicItems, separatorItems);
      if (meanings.length === 0) continue;

      words.push({ id: nanoid(), word: wordText, meanings });
    }
  }

  return words;
}
