import React, { useState } from "react";
import { QuizResult, QuizAnswer } from "../types";
import { cn } from "../lib/utils";
import {
  Check,
  X,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";

interface ResultsPageProps {
  result: QuizResult;
  onRetry: () => void;
  onHome: () => void;
}

export default function ResultsPage({ result, onRetry, onHome }: ResultsPageProps) {
  const [showWrongOnly, setShowWrongOnly] = useState(false);

  const wrongAnswers = result.answers.filter((a) => !a.correct);
  const displayAnswers = showWrongOnly ? wrongAnswers : result.answers;

  const scoreColor =
    result.score >= 80
      ? "text-green-600 dark:text-green-400"
      : result.score >= 60
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-destructive";

  const scoreBg =
    result.score >= 80
      ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
      : result.score >= 60
      ? "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800"
      : "bg-destructive/10 border-destructive/30";

  const message =
    result.score === 100
      ? "ممتاز! إجابات مثالية 🎉"
      : result.score >= 80
      ? "أحسنت! أداء رائع"
      : result.score >= 60
      ? "جيد! يمكنك التحسن أكثر"
      : "حاول مرة أخرى للتحسن";

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-8">

        {/* Score card */}
        <div className={cn("rounded-3xl border p-6 text-center mb-5", scoreBg)}>
          <h1 className="text-base font-semibold text-foreground/70 mb-1">
            {result.quizName}
          </h1>
          <div className={cn("text-7xl font-black my-3", scoreColor)}>
            {result.score}%
          </div>
          <p className="text-sm font-medium text-foreground mb-3">{message}</p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Check size={15} strokeWidth={2.5} />
              <span className="font-semibold">{result.correctCount} صحيح</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5 text-destructive">
              <X size={15} strokeWidth={2.5} />
              <span className="font-semibold">
                {result.totalQuestions - result.correctCount} خطأ
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span className="text-muted-foreground">{result.totalQuestions} سؤال</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border bg-card hover:bg-accent transition-colors font-semibold text-sm"
          >
            <Home size={17} />
            الرئيسية
          </button>
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold text-sm"
          >
            <RotateCcw size={17} />
            إعادة الاختبار
          </button>
        </div>

        {/* Filter */}
        {wrongAnswers.length > 0 && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowWrongOnly(false)}
              className={cn(
                "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors",
                !showWrongOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-accent text-foreground"
              )}
            >
              جميع الأسئلة ({result.answers.length})
            </button>
            <button
              onClick={() => setShowWrongOnly(true)}
              className={cn(
                "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors",
                showWrongOnly
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-card hover:bg-accent text-foreground"
              )}
            >
              <Eye className="inline ml-1" size={14} />
              الأخطاء ({wrongAnswers.length})
            </button>
          </div>
        )}

        {/* Answer cards */}
        <div className="space-y-2.5">
          {displayAnswers.map((answer, idx) => (
            <AnswerCard key={`${answer.wordId}-${idx}`} answer={answer} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({ answer }: { answer: QuizAnswer }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden",
        answer.correct
          ? "border-green-200 dark:border-green-800"
          : "border-destructive/40"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-right",
          answer.correct
            ? "bg-green-50 dark:bg-green-950/30"
            : "bg-destructive/5"
        )}
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white",
            answer.correct ? "bg-green-500" : "bg-destructive"
          )}
        >
          {answer.correct ? <Check size={13} /> : <X size={13} />}
        </div>
        <span className="font-semibold text-foreground flex-1" dir="ltr">
          {answer.wordText}
        </span>
        {!open && !answer.correct && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[180px]">
            {answer.userAnswer || "(بلا إجابة)"}
          </span>
        )}
        {open ? (
          <ChevronUp size={15} className="flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={15} className="flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-1.5 border-t border-border/40">
          {!answer.correct && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground flex-shrink-0">إجابتك:</span>
              <span className="text-destructive font-medium">
                {answer.userAnswer || "(بلا إجابة)"}
              </span>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground flex-shrink-0">
              {answer.correct ? "إجابتك الصحيحة:" : "الإجابة الصحيحة:"}
            </span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              {answer.correctMeanings.join(" / ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
