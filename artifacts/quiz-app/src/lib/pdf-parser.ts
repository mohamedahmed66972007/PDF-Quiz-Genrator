import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { WordEntry } from "../types";
import { splitMeanings } from "./arabic";
import { nanoid } from "./utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function parsePdfFile(file: File): Promise<WordEntry[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allTextItems: { text: string; x: number; y: number; page: number }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    for (const item of content.items) {
      if ("str" in item && item.str.trim()) {
        const transform = item.transform as number[];
        allTextItems.push({
          text: item.str.trim(),
          x: Math.round(transform[4]),
          y: Math.round(transform[5]),
          page: pageNum,
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
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Known Part-of-Speech abbreviations (English column contains ONLY the word itself,
 * the POS column may spill short Latin tokens we must discard).
 */
const POS_ABBR = new Set([
  "n", "v", "adj", "adv", "prep", "conj", "int", "pron", "det", "art",
  "ph", "ph.",
  "n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.",
  // dot-only or Roman-numeral-looking tokens
  "i", "ii", "iii", "iv",
]);

function isPosAbbr(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/\.$/, ""); // strip trailing dot
  // Single letter
  if (/^[a-z]$/.test(t)) return true;
  return POS_ABBR.has(t) || POS_ABBR.has(t + ".");
}

function isHeaderOrJunk(text: string): boolean {
  const t = text.trim();

  // Empty
  if (!t) return true;

  const patterns = [
    // Table headers (English)
    /^(Word|Part of speech|Meaning|Lesson|Module|Unit|Vocabulary)$/i,
    // Watermark / branding
    /UULA/i,
    /uula/i,
    /www\./i,
    // Arabic copyright / footer
    /جميع الحقوق/,
    /محفوظة/,
    /حقوق الطبع/,
    /لـ?\s*uula/i,
    // Standalone Arabic POS words
    /^(صفة|اسم|فعل|حال|حرف|فعل مركب|ضمير|أداة)$/,
    // POS combos starting with Arabic POS word
    /^(صفة|اسم|فعل|حال|حرف|فعل مركب)\s/,
    // Lesson / page numbers
    /^\d+$/,
    /^[\d\s\-–]+$/,
    // Copyright symbol
    /^©/,
    // Very short punctuation-only strings
    /^[.\-–—،,;:]+$/,
  ];

  return patterns.some((p) => p.test(t));
}

function isValidEnglishWord(text: string): boolean {
  const t = text.trim();
  // Must contain at least one letter and only Latin chars, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z]/.test(t)) return false;
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
        const text = item.text.trim();
        if (!text || isHeaderOrJunk(text)) continue;

        if (isArabicText(text)) {
          arabicItems.push(item);
        } else if (isValidEnglishWord(text)) {
          englishItems.push(item);
        }
      }

      if (englishItems.length === 0 || arabicItems.length === 0) continue;

      // English word: join multi-word phrases (e.g. "do away with")
      const wordText = englishItems.map((i) => i.text.trim()).join(" ").trim();
      if (!wordText || seen.has(wordText.toLowerCase())) continue;
      seen.add(wordText.toLowerCase());

      // Arabic meanings: process each item separately through splitMeanings, then flatten.
      // This handles both:
      //   • "عذر - مبرر" as one item  → ["عذر", "مبرر"]
      //   • "عذر" + "مبرر" as two items → ["عذر", "مبرر"]
      const meanings = arabicItems
        .flatMap((item) => splitMeanings(item.text.trim()))
        .filter(Boolean);

      if (meanings.length === 0) continue;

      words.push({ id: nanoid(), word: wordText, meanings });
    }
  }

  return words;
}
