export interface WordEntry {
  id: string;
  word: string;
  meanings: string[];
}

export type QuizType = "mcq" | "essay";
export type GradingMode = "immediate" | "final";

export interface QuizSettings {
  type: QuizType;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  gradingMode: GradingMode;
  wordCount: number;
}

export interface Quiz {
  id: string;
  name: string;
  words: WordEntry[];
  settings: QuizSettings;
  createdAt: number;
  updatedAt: number;
}

export interface QuizAnswer {
  wordId: string;
  wordText: string;
  userAnswer: string;
  correct: boolean;
  correctMeanings: string[];
}

export interface QuizResult {
  quizId: string;
  quizName: string;
  answers: QuizAnswer[];
  totalQuestions: number;
  correctCount: number;
  score: number;
  completedAt: number;
}

export type ThemeColor =
  | "blue"
  | "violet"
  | "green"
  | "orange"
  | "red"
  | "yellow"
  | "teal"
  | "pink";
export type ThemeMode = "light" | "dark";

export interface AppTheme {
  mode: ThemeMode;
  color: ThemeColor;
  autoChange: boolean;
}

export type AppPage =
  | "home"
  | "create"
  | "edit"
  | "quiz"
  | "results"
  | "import";
