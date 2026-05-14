import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quiz, WordEntry, QuizAnswer, QuizResult } from "../types";
import { shuffle, nanoid } from "../lib/utils";
import { checkAnswer, normalizeArabic, splitMeanings } from "../lib/arabic";
import { cn } from "../lib/utils";
import { ArrowRight, Check, X, ChevronLeft } from "lucide-react";

interface QuizPageProps {
  quiz: Quiz;
  onBack: () => void;
  onFinish: (result: QuizResult) => void;
}

interface QuizQuestion {
  word: WordEntry;
  choices?: string[];
  correctChoiceLabel?: string;
}

interface QuizSession {
  quizId: string;
  questions: QuizQuestion[];
  currentIdx: number;
  answers: QuizAnswer[];
}

function getSessionKey(quizId: string) {
  return `quiz_progress_${quizId}`;
}

function saveQuizSession(quizId: string, session: QuizSession) {
  try {
    sessionStorage.setItem(getSessionKey(quizId), JSON.stringify(session));
  } catch {}
}

function loadQuizSession(quizId: string): QuizSession | null {
  try {
    const raw = sessionStorage.getItem(getSessionKey(quizId));
    if (!raw) return null;
    return JSON.parse(raw) as QuizSession;
  } catch {
    return null;
  }
}

function clearQuizSession(quizId: string) {
  try {
    sessionStorage.removeItem(getSessionKey(quizId));
  } catch {}
}

function meaningLabel(meanings: string[]): string {
  return meanings.join(" / ");
}

function sharesMeaning(a: WordEntry, b: WordEntry): boolean {
  const aNorm = a.meanings.flatMap((m) => splitMeanings(m)).map(normalizeArabic);
  const bNorm = b.meanings.flatMap((m) => splitMeanings(m)).map(normalizeArabic);
  return aNorm.some((na) => na && bNorm.includes(na));
}

function buildMcqQuestions(
  selected: WordEntry[],
  allWords: WordEntry[],
  shuffleChoices: boolean
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let prevChoiceLabels = new Set<string>();

  for (const word of selected) {
    const correctLabel = meaningLabel(word.meanings);
    const distractorPool = allWords.filter(
      (w) => w.id !== word.id && !sharesMeaning(w, word)
    );
    const shuffledPool = shuffle(distractorPool);
    const usedLabels = new Set<string>([correctLabel]);
    const wrongs: string[] = [];

    for (const w of shuffledPool) {
      if (wrongs.length >= 3) break;
      const label = meaningLabel(w.meanings);
      if (!usedLabels.has(label) && !prevChoiceLabels.has(label)) {
        usedLabels.add(label);
        wrongs.push(label);
      }
    }

    if (wrongs.length < 3) {
      for (const w of shuffledPool) {
        if (wrongs.length >= 3) break;
        const label = meaningLabel(w.meanings);
        if (!usedLabels.has(label)) {
          usedLabels.add(label);
          wrongs.push(label);
        }
      }
    }

    let choices = [correctLabel, ...wrongs];
    if (shuffleChoices) choices = shuffle(choices);
    prevChoiceLabels = new Set(choices);
    questions.push({ word, choices, correctChoiceLabel: correctLabel });
  }

  return questions;
}

const questionVariants = {
  initial: { opacity: 0, y: 40, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 26 },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.96,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const choiceContainerVariants = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const choiceVariants = {
  initial: { opacity: 0, x: 24 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

const feedbackVariants = {
  initial: { opacity: 0, scale: 0.9, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 340, damping: 24 },
  },
};

export default function QuizPage({ quiz, onBack, onFinish }: QuizPageProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [userInput, setUserInput] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentCorrect, setCurrentCorrect] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const saved = loadQuizSession(quiz.id);
    if (saved && saved.questions.length > 0) {
      setQuestions(saved.questions);
      setCurrentIdx(saved.currentIdx);
      setAnswers(saved.answers);
      return;
    }

    let wordPool = [...quiz.words];
    if (quiz.settings.shuffleQuestions) wordPool = shuffle(wordPool);
    const count = Math.min(quiz.settings.wordCount, wordPool.length);
    const selected = wordPool.slice(0, count);

    let built: QuizQuestion[];
    if (quiz.settings.type === "mcq") {
      built = buildMcqQuestions(selected, quiz.words, quiz.settings.shuffleChoices);
    } else {
      built = selected.map((word) => ({ word }));
    }
    setQuestions(built);
  }, [quiz]);

  useEffect(() => {
    if (questions.length === 0) return;
    saveQuizSession(quiz.id, { quizId: quiz.id, questions, currentIdx, answers });
  }, [quiz.id, questions, currentIdx, answers]);

  const currentQ = questions[currentIdx];

  function submitAnswer(answer: string) {
    if (!currentQ) return;
    const isCorrect =
      quiz.settings.type === "mcq"
        ? answer === currentQ.correctChoiceLabel
        : checkAnswer(answer, currentQ.word.meanings);

    const qa: QuizAnswer = {
      wordId: currentQ.word.id,
      wordText: currentQ.word.word,
      userAnswer: answer,
      correct: isCorrect,
      correctMeanings: currentQ.word.meanings,
    };

    setCurrentCorrect(isCorrect);

    if (quiz.settings.gradingMode === "immediate") {
      setShowFeedback(true);
      setAnswers((prev) => [...prev, qa]);
    } else {
      const updated = [...answers, qa];
      setAnswers(updated);
      moveNext(updated);
    }
  }

  function moveNext(currentAnswers: QuizAnswer[]) {
    setShowFeedback(false);
    setUserInput("");
    setSelectedChoice(null);

    if (currentIdx + 1 >= questions.length) {
      clearQuizSession(quiz.id);
      finishQuiz(currentAnswers);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  function finishQuiz(finalAnswers: QuizAnswer[]) {
    const correctCount = finalAnswers.filter((a) => a.correct).length;
    const result: QuizResult = {
      quizId: quiz.id,
      quizName: quiz.name,
      answers: finalAnswers,
      totalQuestions: finalAnswers.length,
      correctCount,
      score: Math.round((correctCount / finalAnswers.length) * 100),
      completedAt: Date.now(),
    };
    onFinish(result);
  }

  // ── Enter key handler ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      // Essay input while not in feedback: let the form handle it
      if (activeTag === "INPUT" && !showFeedback) return;
      e.preventDefault();
      if (showFeedback) {
        moveNext(answers);
      } else if (quiz.settings.type === "mcq" && selectedChoice) {
        submitAnswer(selectedChoice);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFeedback, selectedChoice, answers, quiz.settings.type, currentIdx]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground"
        >
          جاري تحميل الأسئلة...
        </motion.div>
      </div>
    );
  }

  const progress = ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100;
  const isLast = currentIdx + 1 >= questions.length;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:py-8 sm:pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <ArrowRight size={17} />
            إنهاء
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {currentIdx + 1}
            </span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{questions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-7 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Question card (animated per question) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${currentIdx}`}
            variants={questionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Word card */}
            <div className="quiz-word-card bg-card border border-border rounded-2xl p-7 sm:p-9 mb-5 text-center">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                ما معنى الكلمة التالية؟
              </p>
              <h2
                className="text-4xl sm:text-5xl font-black text-foreground tracking-tight"
                dir="ltr"
              >
                {currentQ.word.word}
              </h2>
            </div>

            {/* MCQ choices */}
            {quiz.settings.type === "mcq" && currentQ.choices && (
              <motion.div
                className="space-y-3"
                variants={choiceContainerVariants}
                initial="initial"
                animate="animate"
              >
                {currentQ.choices.map((choice, idx) => {
                  const isSelected = selectedChoice === choice;
                  const isCorrectChoice = choice === currentQ.correctChoiceLabel;

                  let btnStyle =
                    "border-border bg-card hover:bg-accent hover:border-primary/40 cursor-pointer";
                  if (showFeedback) {
                    if (isCorrectChoice)
                      btnStyle =
                        "border-green-500 bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 cursor-default";
                    else if (isSelected && !isCorrectChoice)
                      btnStyle =
                        "border-destructive bg-destructive/10 text-destructive cursor-default";
                    else btnStyle = "border-border bg-card opacity-50 cursor-default";
                  } else if (isSelected) {
                    btnStyle =
                      "border-primary bg-primary/10 text-foreground shadow-sm cursor-pointer";
                  }

                  return (
                    <motion.button
                      key={idx}
                      variants={choiceVariants}
                      disabled={showFeedback}
                      onClick={() => {
                        if (!showFeedback) setSelectedChoice(choice);
                      }}
                      className={cn(
                        "quiz-choice-btn w-full p-4 rounded-xl border-2 text-right transition-all font-medium text-sm sm:text-base",
                        btnStyle
                      )}
                      whileTap={showFeedback ? {} : { scale: 0.98 }}
                    >
                      <span className="text-muted-foreground ml-3 font-bold">
                        {String.fromCharCode(0x0661 + idx)}
                      </span>
                      {choice}
                      {showFeedback && isCorrectChoice && (
                        <Check className="inline-block mr-2 text-green-500" size={15} />
                      )}
                      {showFeedback && isSelected && !isCorrectChoice && (
                        <X className="inline-block mr-2 text-destructive" size={15} />
                      )}
                    </motion.button>
                  );
                })}

                {/* Confirm button for MCQ */}
                <AnimatePresence>
                  {selectedChoice && !showFeedback && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      onClick={() => submitAnswer(selectedChoice)}
                      className="quiz-action-btn btn-primary-glow w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all mt-1 text-sm"
                      whileTap={{ scale: 0.98 }}
                    >
                      تأكيد الإجابة
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Essay input */}
            {quiz.settings.type === "essay" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!showFeedback && userInput.trim()) {
                    submitAnswer(userInput.trim());
                  }
                }}
                className="space-y-3"
              >
                <motion.input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={showFeedback}
                  placeholder="اكتب المعنى بالعربية..."
                  autoFocus
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                  className={cn(
                    "w-full px-4 py-4 rounded-xl border-2 text-foreground text-lg focus:outline-none transition-all",
                    showFeedback
                      ? currentCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300"
                        : "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-card focus:border-primary focus:shadow-sm"
                  )}
                />
                {!showFeedback && (
                  <motion.button
                    type="submit"
                    disabled={!userInput.trim()}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.18 } }}
                    whileTap={{ scale: 0.98 }}
                    className="quiz-action-btn btn-primary-glow w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  >
                    تأكيد الإجابة
                  </motion.button>
                )}
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Feedback panel (immediate mode) */}
        <AnimatePresence>
          {showFeedback && quiz.settings.gradingMode === "immediate" && (
            <motion.div
              variants={feedbackVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className={cn(
                "quiz-feedback-card mt-4 p-4 rounded-xl border-2",
                currentCorrect
                  ? "bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-700"
                  : "bg-destructive/8 border-destructive/50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: { type: "spring", stiffness: 400, damping: 20, delay: 0.1 } }}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    currentCorrect ? "bg-green-500" : "bg-destructive"
                  )}
                >
                  {currentCorrect ? (
                    <Check size={15} className="text-white" strokeWidth={3} />
                  ) : (
                    <X size={15} className="text-white" strokeWidth={3} />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "font-bold text-base",
                    currentCorrect
                      ? "text-green-700 dark:text-green-300"
                      : "text-destructive"
                  )}
                >
                  {currentCorrect ? "إجابة صحيحة!" : "إجابة خاطئة"}
                </span>
              </div>

              {!currentCorrect && (
                <p className="text-sm text-muted-foreground mb-3 pr-9">
                  الإجابة الصحيحة:{" "}
                  <span className="font-semibold text-foreground">
                    {currentQ.word.meanings.join(" / ")}
                  </span>
                </p>
              )}

              <motion.button
                onClick={() => moveNext(answers)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "quiz-action-btn btn-primary-glow mt-1 w-full py-3 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2",
                  "bg-foreground text-background hover:opacity-85"
                )}
              >
                {isLast ? "عرض النتائج" : "السؤال التالي"}
                <ChevronLeft size={16} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard hint */}
        <p className="hidden sm:block text-center text-xs text-muted-foreground/60 mt-5">
          {showFeedback
            ? "اضغط Enter للمتابعة"
            : quiz.settings.type === "mcq" && selectedChoice
            ? "اضغط Enter لتأكيد الإجابة"
            : null}
        </p>
      </div>
    </div>
  );
}
