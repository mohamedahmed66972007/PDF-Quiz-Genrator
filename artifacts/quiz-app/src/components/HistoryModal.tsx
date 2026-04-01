import React, { useState } from "react";
import { QuizResult, QuizAnswer } from "../types";
import { loadResultsByQuizId } from "../lib/storage";
import { cn } from "../lib/utils";
import {
  X,
  Check,
  ChevronLeft,
  Clock,
  Trophy,
  AlertCircle,
} from "lucide-react";

interface HistoryModalProps {
  quizId: string;
  quizName: string;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ar-EG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryModal({ quizId, quizName, onClose }: HistoryModalProps) {
  const [selected, setSelected] = useState<QuizResult | null>(null);
  const results = loadResultsByQuizId(quizId);

  if (selected) {
    return (
      <DetailView
        result={selected}
        onBack={() => setSelected(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-base truncate">{quizName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {results.length > 0
                ? `${results.length} محاولة سابقة`
                : "لا توجد محاولات بعد"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {results.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <Trophy size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">لا توجد محاولات بعد</p>
              <p className="text-sm text-muted-foreground">
                ابدأ الاختبار وستظهر نتائجك هنا تلقائيًا
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((r, i) => {
                const scoreColor =
                  r.score >= 80
                    ? "text-green-600 dark:text-green-400"
                    : r.score >= 60
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-destructive";
                const scoreBg =
                  r.score >= 80
                    ? "bg-green-50 dark:bg-green-950/40"
                    : r.score >= 60
                    ? "bg-yellow-50 dark:bg-yellow-950/40"
                    : "bg-destructive/5";
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(r)}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-accent transition-colors text-right"
                  >
                    {/* Score circle */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                        scoreBg
                      )}
                    >
                      <span className={cn("font-black text-sm", scoreColor)}>
                        {r.score}%
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {r.correctCount} ✓
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-destructive font-medium">
                          {r.totalQuestions - r.correctCount} ✗
                        </span>
                        <span className="text-muted-foreground text-xs">
                          من {r.totalQuestions}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock size={11} />
                        {formatDate(r.completedAt)}
                      </div>
                    </div>

                    <ChevronLeft size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailView({
  result,
  onBack,
  onClose,
}: {
  result: QuizResult;
  onBack: () => void;
  onClose: () => void;
}) {
  const [showWrongOnly, setShowWrongOnly] = useState(false);
  const wrongAnswers = result.answers.filter((a) => !a.correct);
  const displayAnswers = showWrongOnly ? wrongAnswers : result.answers;

  const scoreColor =
    result.score >= 80
      ? "text-green-600 dark:text-green-400"
      : result.score >= 60
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-accent transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} className="rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <div className={cn("text-xl font-black", scoreColor)}>
              {result.score}%
            </div>
            <div className="text-xs text-muted-foreground">
              {result.correctCount} صحيح • {result.totalQuestions - result.correctCount} خطأ
              {" "}• {formatDate(result.completedAt)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter tabs */}
        {wrongAnswers.length > 0 && (
          <div className="flex gap-2 px-4 py-3 border-b border-border">
            <button
              onClick={() => setShowWrongOnly(false)}
              className={cn(
                "flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors",
                !showWrongOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-accent text-foreground"
              )}
            >
              الكل ({result.answers.length})
            </button>
            <button
              onClick={() => setShowWrongOnly(true)}
              className={cn(
                "flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors",
                showWrongOnly
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-background hover:bg-accent text-foreground"
              )}
            >
              <AlertCircle className="inline ml-1" size={11} />
              الأخطاء ({wrongAnswers.length})
            </button>
          </div>
        )}

        {/* Answers list */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {displayAnswers.map((answer, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-2xl border p-3",
                answer.correct
                  ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                  : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white",
                    answer.correct ? "bg-green-500" : "bg-destructive"
                  )}
                >
                  {answer.correct ? <Check size={11} /> : <X size={11} />}
                </div>
                <span className="font-bold text-foreground text-sm" dir="ltr">
                  {answer.wordText}
                </span>
              </div>
              {!answer.correct && (
                <div className="text-xs text-destructive mr-7 mb-0.5">
                  إجابتك: <span className="font-medium">{answer.userAnswer || "(بلا إجابة)"}</span>
                </div>
              )}
              <div className="text-xs text-green-600 dark:text-green-400 mr-7">
                {answer.correct ? "إجابتك الصحيحة:" : "الصحيح:"}{" "}
                <span className="font-medium">{answer.correctMeanings.join(" / ")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
