import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  AlertCircle,
  Trophy,
  Target,
  Frown,
} from "lucide-react";

interface ResultsPageProps {
  result: QuizResult;
  onRetry: () => void;
  onRetryWrong: () => void;
  onHome: () => void;
}

export default function ResultsPage({ result, onRetry, onRetryWrong, onHome }: ResultsPageProps) {
  const [showWrongOnly, setShowWrongOnly] = useState(false);

  const wrongAnswers = result.answers.filter((a) => !a.correct);
  const displayAnswers = showWrongOnly ? wrongAnswers : result.answers;

  const isExcellent = result.score === 100;
  const isGood = result.score >= 80;
  const isOk = result.score >= 60;

  const scoreColor = isGood
    ? "text-green-600 dark:text-green-400"
    : isOk
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-destructive";

  const scoreBg = isGood
    ? "from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/40 border-green-200 dark:border-green-800"
    : isOk
    ? "from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/40 border-yellow-200 dark:border-yellow-800"
    : "from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/30 border-destructive/30";

  const message = isExcellent
    ? "مثالي تمامًا!"
    : isGood
    ? "أداء رائع!"
    : isOk
    ? "جيد، يمكنك التحسن"
    : "حاول مجددًا!";

  const ScoreIcon = isGood ? Trophy : isOk ? Target : Frown;
  const scoreIconColor = isGood
    ? "text-green-500"
    : isOk
    ? "text-yellow-500"
    : "text-destructive";
  const scoreIconBg = isGood
    ? "bg-green-100 dark:bg-green-900/40"
    : isOk
    ? "bg-yellow-100 dark:bg-yellow-900/40"
    : "bg-destructive/10";

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-8">

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className={cn(
            "rounded-3xl border bg-gradient-to-br p-6 sm:p-8 text-center mb-5",
            scoreBg
          )}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 22, delay: 0.15 }}
            className={cn(
              "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4",
              scoreIconBg
            )}
          >
            <ScoreIcon size={32} className={scoreIconColor} />
          </motion.div>

          <h1 className="text-sm font-semibold text-foreground/60 mb-1 truncate">
            {result.quizName}
          </h1>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.2 }}
            className={cn("text-7xl font-black my-3 tabular-nums", scoreColor)}
          >
            {result.score}%
          </motion.div>

          <p className={cn("text-base font-bold mb-4", scoreColor)}>{message}</p>

          <div className="flex items-center justify-center gap-6 text-sm">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="flex items-center gap-1.5 text-green-600 dark:text-green-400"
            >
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={13} className="text-white" strokeWidth={3} />
              </div>
              <span className="font-bold">{result.correctCount} صحيح</span>
            </motion.div>
            <div className="w-px h-5 bg-border" />
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="flex items-center gap-1.5 text-destructive"
            >
              <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                <X size={13} className="text-white" strokeWidth={3} />
              </div>
              <span className="font-bold">
                {result.totalQuestions - result.correctCount} خطأ
              </span>
            </motion.div>
            <div className="w-px h-5 bg-border" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground font-medium"
            >
              {result.totalQuestions} سؤال
            </motion.div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 24 }}
          className="flex gap-3 mb-3"
        >
          <button
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border bg-card hover:bg-accent transition-colors font-semibold text-sm"
          >
            <Home size={16} />
            الرئيسية
          </button>
          <button
            onClick={onRetry}
            className="btn-primary-glow flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-all font-semibold text-sm shadow-sm"
          >
            <RotateCcw size={16} />
            إعادة الاختبار
          </button>
        </motion.div>

        {/* Retry wrong */}
        <AnimatePresence>
          {wrongAnswers.length > 0 && wrongAnswers.length < result.totalQuestions && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={onRetryWrong}
              className="w-full flex items-center justify-center gap-2 py-3.5 mb-5 rounded-2xl border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-colors font-semibold text-sm"
            >
              <AlertCircle size={16} />
              إعادة الأخطاء فقط ({wrongAnswers.length} سؤال)
            </motion.button>
          )}
        </AnimatePresence>

        {!(wrongAnswers.length > 0 && wrongAnswers.length < result.totalQuestions) && (
          <div className="mb-5" />
        )}

        {/* Filter tabs */}
        {wrongAnswers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex gap-2 mb-4"
          >
            <button
              onClick={() => setShowWrongOnly(false)}
              className={cn(
                "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all",
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
                "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                showWrongOnly
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-card hover:bg-accent text-foreground"
              )}
            >
              <Eye className="inline ml-1" size={13} />
              الأخطاء ({wrongAnswers.length})
            </button>
          </motion.div>
        )}

        {/* Answer cards */}
        <motion.div
          className="space-y-2.5"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: 0.4 } } }}
        >
          {displayAnswers.map((answer, idx) => (
            <motion.div
              key={`${answer.wordId}-${idx}`}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 26 } },
              }}
            >
              <AnswerCard answer={answer} />
            </motion.div>
          ))}
        </motion.div>
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
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
            answer.correct ? "bg-green-500" : "bg-destructive"
          )}
        >
          {answer.correct ? (
            <Check size={12} className="text-white" strokeWidth={3} />
          ) : (
            <X size={12} className="text-white" strokeWidth={3} />
          )}
        </div>
        <span className="font-bold text-foreground flex-1 text-right" dir="ltr">
          {answer.wordText}
        </span>
        {!open && !answer.correct && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[180px]">
            {answer.userAnswer || "(بلا إجابة)"}
          </span>
        )}
        {open ? (
          <ChevronUp size={14} className="flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
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
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {answer.correctMeanings.join(" / ")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
