import React, { useState } from "react";
import { QuizResult, QuizAnswer } from "../types";
import { loadResultsByQuizId } from "../lib/storage";
import { cn } from "../lib/utils";
import {
  Check,
  X,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Clock,
} from "lucide-react";

interface ResultsPageProps {
  result: QuizResult;
  onRetry: () => void;
  onHome: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsPage({
  result,
  onRetry,
  onHome,
}: ResultsPageProps) {
  const [showWrongOnly, setShowWrongOnly] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const wrongAnswers = result.answers.filter((a) => !a.correct);
  const displayAnswers = showWrongOnly ? wrongAnswers : result.answers;

  // Load previous attempts for this quiz (excluding current)
  const history = loadResultsByQuizId(result.quizId).filter(
    (r) => r.completedAt !== result.completedAt
  );

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
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        {/* Score card */}
        <div className={cn("rounded-2xl border p-6 sm:p-8 text-center mb-6", scoreBg)}>
          <h1 className="text-lg sm:text-xl font-bold mb-2 text-foreground">
            {result.quizName}
          </h1>
          <div className={cn("text-6xl sm:text-7xl font-black my-4", scoreColor)}>
            {result.score}%
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-sm flex-wrap">
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
          <p className="mt-4 text-base font-medium text-foreground">
            {result.score === 100
              ? "ممتاز! إجابات مثالية"
              : result.score >= 80
              ? "أحسنت! أداء رائع"
              : result.score >= 60
              ? "جيد! يمكنك التحسن أكثر"
              : "حاول مرة أخرى للتحسن"}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors font-medium text-sm"
          >
            <Home size={18} />
            الرئيسية
          </button>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors font-medium text-sm",
                showHistory
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              <History size={18} />
              <span className="hidden sm:inline">المحاولات السابقة</span>
              <span className="sm:hidden">({history.length})</span>
            </button>
          )}
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm"
          >
            <RotateCcw size={18} />
            إعادة
          </button>
        </div>

        {/* Previous attempts history */}
        {showHistory && history.length > 0 && (
          <div className="mb-6 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <History size={16} className="text-primary" />
              <span className="font-semibold text-sm">المحاولات السابقة</span>
              <span className="text-xs text-muted-foreground mr-auto">
                {history.length} محاولة
              </span>
            </div>
            <div className="divide-y divide-border">
              {history.map((r, i) => {
                const hColor =
                  r.score >= 80
                    ? "text-green-600 dark:text-green-400"
                    : r.score >= 60
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-destructive";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1">
                      {formatDate(r.completedAt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.correctCount}/{r.totalQuestions}
                    </span>
                    <span className={cn("font-bold text-sm min-w-[3rem] text-left", hColor)}>
                      {r.score}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* Detailed answers — all open by default */}
        <div className="space-y-3">
          {displayAnswers.map((answer, idx) => (
            <AnswerCard key={`${answer.wordId}-${idx}`} answer={answer} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({ answer, idx }: { answer: QuizAnswer; idx: number }) {
  const [open, setOpen] = useState(true);

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
        <span className="font-medium text-foreground flex-1 text-right" dir="ltr">
          {answer.wordText}
        </span>
        {!answer.correct && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
            إجابتك: {answer.userAnswer || "(بلا إجابة)"}
          </span>
        )}
        {open ? <ChevronUp size={15} className="flex-shrink-0" /> : <ChevronDown size={15} className="flex-shrink-0" />}
      </button>

      {open && (
        <div className="p-3 border-t space-y-1.5"
          style={{ borderColor: answer.correct ? "rgb(187 247 208 / 0.5)" : "rgb(239 68 68 / 0.2)" }}
        >
          {!answer.correct ? (
            <>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground flex-shrink-0">إجابتك:</span>
                <span className="text-destructive font-medium">
                  {answer.userAnswer || "(بلا إجابة)"}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground flex-shrink-0">الإجابة الصحيحة:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {answer.correctMeanings.join(" / ")}
                </span>
              </div>
            </>
          ) : (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground flex-shrink-0">الإجابة الصحيحة:</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {answer.correctMeanings.join(" / ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
