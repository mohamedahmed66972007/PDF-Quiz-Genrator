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
  s = s.replace(/[.,;:!?،؟؛\-—–_'"()[\]{}\/]/g, "");

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

/**
 * Split a raw meaning string into its distinct parts.
 *
 * Separators:
 *   /   → primary separator in vocabulary sheets ("يُخفي / يغطي")
 *   –   → en-dash between alternatives ("يُخفي – يغطي")
 *   —   → em-dash variant
 *   ،   → Arabic comma
 *
 * Plain hyphen "-" is intentionally excluded because it can appear inside
 * compound Arabic phrases or numbers (e.g. "100 عام") and should NOT be
 * treated as a meaning separator.
 */
export function splitMeanings(raw: string): string[] {
  const parts = raw
    .split(/\s*[—–\/،]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [raw.trim()];
}

/**
 * Compute the Levenshtein edit distance between two strings.
 * Used for fuzzy typo tolerance in essay grading.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rolling rows instead of a full matrix to save memory
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Maximum allowed edit-distance for a given string length.
 * Roughly 1 typo per 5 characters, capped at 3.
 */
function maxAllowedDistance(len: number): number {
  if (len <= 2) return 0;
  if (len <= 5) return 1;
  if (len <= 10) return 2;
  return 3;
}

/**
 * Check whether the user's answer matches any of the stored meanings.
 *
 * Matching strategy (in order):
 * 1. Exact match after Arabic normalization (diacritics, hamza, ta-marbuta, ال)
 * 2. Fuzzy match: Levenshtein distance ≤ maxAllowedDistance(len)
 *    — tolerates common typos without penalising the student
 * 3. Word-overlap match: every content word in the user's answer appears in
 *    the correct meaning (or vice-versa), ignoring short stop-words (≤ 2 chars)
 *    — accepts "close meaning" answers that use most of the right words
 *
 * Each stored meaning string is first split on separators so that
 * "يُخفي / يغطي" produces two independent options to match against.
 */
export function checkAnswer(userAnswer: string, meanings: string[]): boolean {
  const normalizedUser = normalizeArabic(userAnswer);
  if (!normalizedUser) return false;

  for (const meaning of meanings) {
    const parts = splitMeanings(meaning);
    for (const part of parts) {
      const normalizedPart = normalizeArabic(part);
      if (!normalizedPart) continue;

      // 1. Exact match
      if (normalizedUser === normalizedPart) return true;

      // 2. Fuzzy / typo tolerance
      const dist = levenshtein(normalizedUser, normalizedPart);
      const allowed = maxAllowedDistance(
        Math.max(normalizedUser.length, normalizedPart.length)
      );
      if (dist <= allowed) return true;

      // 3. Word-overlap: useful for multi-word meanings like "على الرغم من"
      //    Accept if the user wrote all the meaningful words (len > 2)
      const userWords = normalizedUser
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const partWords = normalizedPart
        .split(/\s+/)
        .filter((w) => w.length > 2);

      if (userWords.length > 0 && partWords.length > 0) {
        // All user words found in the correct meaning
        const allUserInPart = userWords.every((w) => partWords.includes(w));
        // All correct-meaning words found in user's answer
        const allPartInUser = partWords.every((w) => userWords.includes(w));
        if (allUserInPart || allPartInUser) return true;
      }
    }
  }

  return false;
}
