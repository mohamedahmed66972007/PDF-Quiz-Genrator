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

export default function ResultsPage({
  result,
  onRetry,
  onHome,
}: ResultsPageProps) {
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

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Score */}
        <div
          className={cn(
            "rounded-2xl border p-8 text-center mb-8",
            scoreBg
          )}
        >
          <h1 className="text-xl font-bold mb-2 text-foreground">
            {result.quizName}
          </h1>
          <div className={cn("text-7xl font-black my-4", scoreColor)}>
            {result.score}%
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Check size={16} />
              <span className="font-medium">{result.correctCount} صحيح</span>
            </div>
            <div className="flex items-center gap-1.5 text-destructive">
              <X size={16} />
              <span className="font-medium">
                {result.totalQuestions - result.correctCount} خطأ
              </span>
            </div>
            <div className="text-muted-foreground">
              من {result.totalQuestions} سؤال
            </div>
          </div>
          <p className="mt-4 text-lg font-medium text-foreground">
            {result.score === 100
              ? "ممتاز! إجابات مثالية"
              : result.score >= 80
              ? "أحسنت! أداء رائع"
              : result.score >= 60
              ? "جيد! يمكنك التحسن أكثر"
              : "حاول مرة أخرى للتحسن"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors font-medium"
          >
            <Home size={18} />
            الرئيسية
          </button>
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
          >
            <RotateCcw size={18} />
            إعادة الاختبار
          </button>
        </div>

        {/* Wrong answers filter */}
        {wrongAnswers.length > 0 && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setShowWrongOnly(false)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                !showWrongOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              جميع الأسئلة ({result.answers.length})
            </button>
            <button
              onClick={() => setShowWrongOnly(true)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                showWrongOnly
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              <Eye className="inline ml-1" size={14} />
              الأخطاء فقط ({wrongAnswers.length})
            </button>
          </div>
        )}

        {/* Detailed answers */}
        <div className="space-y-3">
          {displayAnswers.map((answer, idx) => (
            <AnswerCard key={idx} answer={answer} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({ answer, idx }: { answer: QuizAnswer; idx: number }) {
  const [open, setOpen] = useState(!answer.correct);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        answer.correct
          ? "border-green-200 dark:border-green-800"
          : "border-destructive/40"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 p-3 text-right",
          answer.correct
            ? "bg-green-50 dark:bg-green-950/30"
            : "bg-destructive/5"
        )}
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
            answer.correct
              ? "bg-green-500 text-white"
              : "bg-destructive text-white"
          )}
        >
          {answer.correct ? <Check size={13} /> : <X size={13} />}
        </div>
        <span className="font-medium text-foreground flex-1" dir="ltr">
          {answer.wordText}
        </span>
        {!answer.correct && (
          <span className="text-xs text-muted-foreground">
            إجابتك: {answer.userAnswer || "(بلا إجابة)"}
          </span>
        )}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && !answer.correct && (
        <div className="p-3 border-t border-destructive/20 space-y-1.5">
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground">إجابتك:</span>
            <span className="text-destructive font-medium">
              {answer.userAnswer || "(بلا إجابة)"}
            </span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground">الإجابة الصحيحة:</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              {answer.correctMeanings.join(" / ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
