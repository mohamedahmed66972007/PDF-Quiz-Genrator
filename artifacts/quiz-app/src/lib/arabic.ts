/**
 * Arabic text normalization for smart quiz grading.
 * Handles:
 * - Diacritics (tashkeel) removal: فَتْحة، ضَمّة، كَسْرة، تَنوين...
 * - Punctuation removal: . , ; : ! ? ، ؟
 * - Definite article "ال" removal
 * - Hamza normalization (أ/إ/آ → ا)
 * - Ta marbuta normalization (ة → ه)
 * - Extra whitespace
 */

export function normalizeArabic(text: string): string {
  let s = text.trim();

  // Remove diacritics (tashkeel): U+0610–U+061A and U+064B–U+065F
  s = s.replace(/[\u0610-\u061A\u064B-\u065F]/g, "");

  // Remove punctuation (Arabic and Latin)
  s = s.replace(/[.,;:!?،؟؛\-—–_'"()[\]{}]/g, "");

  // Normalize hamza variants: أ إ آ ء ئ ؤ → ا
  s = s.replace(/[أإآءئؤ]/g, "ا");

  // Normalize ta marbuta: ة → ه
  s = s.replace(/ة/g, "ه");

  // Remove definite article ال at start of word
  s = s.replace(/\bال/g, "");
  s = s.replace(/^ال/, "");

  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  return s.toLowerCase();
}

export function checkAnswer(userAnswer: string, meanings: string[]): boolean {
  const normalizedUser = normalizeArabic(userAnswer);
  if (!normalizedUser) return false;

  return meanings.some((meaning) => {
    const parts = splitMeanings(meaning);
    return parts.some((part) => normalizeArabic(part) === normalizedUser);
  });
}

export function splitMeanings(raw: string): string[] {
  // Split by common separators: em dash, en dash, hyphen, slash, Arabic comma, comma
  const parts = raw
    .split(/\s*[—–\-\/،,]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [raw.trim()];
}
