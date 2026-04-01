import { Quiz, AppTheme, QuizResult } from "../types";

const QUIZZES_KEY = "pdf_quiz_quizzes";
const THEME_KEY = "pdf_quiz_theme";
const RESULTS_KEY = "pdf_quiz_results";

export function saveQuiz(quiz: Quiz): void {
  const quizzes = loadQuizzes();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) {
    quizzes[idx] = quiz;
  } else {
    quizzes.push(quiz);
  }
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function loadQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(QUIZZES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Quiz[];
  } catch {
    return [];
  }
}

export function deleteQuiz(id: string): void {
  const quizzes = loadQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function getQuizById(id: string): Quiz | undefined {
  return loadQuizzes().find((q) => q.id === id);
}

export function saveTheme(theme: AppTheme): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}

export function loadTheme(): AppTheme | null {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppTheme;
  } catch {
    return null;
  }
}

export function saveResult(result: QuizResult): void {
  const all = loadAllResults();
  all.unshift(result);
  // Keep only last 200 results total
  const trimmed = all.slice(0, 200);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(trimmed));
}

export function loadResultsByQuizId(quizId: string): QuizResult[] {
  const all = loadAllResults();
  return all.filter((r) => r.quizId === quizId);
}

function loadAllResults(): QuizResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuizResult[];
  } catch {
    return [];
  }
}
