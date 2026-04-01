import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { Quiz, QuizSettings } from "../types";
import { nanoid } from "./utils";

/**
 * Compact wire format – strips large/redundant fields before compression.
 * Field names are abbreviated to save space before LZ encoding.
 *
 * Quiz wire:  { n, w, s }
 * Word wire:  { w, m }          (no id, no timestamps)
 * Settings:   { t, g, sq, sc }  (no wordCount – always 250)
 */
type WireWord = [string, string[]];           // [word, meanings]
type WireSettings = [string, string, 0 | 1, 0 | 1]; // [type, grading, shuffleQ, shuffleC]
type WireQuiz = { n: string; w: WireWord[]; s: WireSettings };

function quizToWire(quiz: Quiz): WireQuiz {
  return {
    n: quiz.name,
    w: quiz.words.map((e) => [e.word, e.meanings]),
    s: [
      quiz.settings.type,
      quiz.settings.gradingMode,
      quiz.settings.shuffleQuestions ? 1 : 0,
      quiz.settings.shuffleChoices ? 1 : 0,
    ],
  };
}

function wireToQuiz(wire: WireQuiz): Quiz {
  const settings: QuizSettings = {
    type: wire.s[0] as QuizSettings["type"],
    gradingMode: wire.s[1] as QuizSettings["gradingMode"],
    shuffleQuestions: wire.s[2] === 1,
    shuffleChoices: wire.s[3] === 1,
    wordCount: 250,
  };
  const now = Date.now();
  return {
    id: nanoid(),
    name: wire.n,
    words: wire.w.map(([word, meanings]) => ({ id: nanoid(), word, meanings })),
    settings,
    createdAt: now,
    updatedAt: now,
  };
}

function compress(data: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(data));
}

function decompress<T>(encoded: string): T | null {
  try {
    const raw = decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function encodeQuizToUrl(quiz: Quiz): string {
  const encoded = compress(quizToWire(quiz));
  const base = window.location.origin + window.location.pathname;
  return `${base}?import=${encoded}`;
}

export function encodeAllQuizzesToUrl(quizzes: Quiz[]): string {
  const encoded = compress(quizzes.map(quizToWire));
  const base = window.location.origin + window.location.pathname;
  return `${base}?importAll=${encoded}`;
}

export function decodeQuizFromUrl(encoded: string): Quiz | null {
  const wire = decompress<WireQuiz>(encoded);
  if (!wire) return null;
  try {
    return wireToQuiz(wire);
  } catch {
    return null;
  }
}

export function decodeAllQuizzesFromUrl(encoded: string): Quiz[] | null {
  const wires = decompress<WireQuiz[]>(encoded);
  if (!wires || !Array.isArray(wires)) return null;
  try {
    return wires.map(wireToQuiz);
  } catch {
    return null;
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
