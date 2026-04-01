import React, { useState, useEffect } from "react";
import { Quiz, WordEntry, QuizAnswer, QuizResult } from "../types";
import { shuffle, nanoid } from "../lib/utils";
import { checkAnswer, normalizeArabic, splitMeanings } from "../lib/arabic";
import { cn } from "../lib/utils";
import { ArrowRight, Check, X } from "lucide-react";

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

/**
 * Build display label for a word's meanings:
 * e.g. ["عذر", "مبرر"] → "عذر / مبرر"
 */
function meaningLabel(meanings: string[]): string {
  return meanings.join(" / ");
}

/**
 * Check whether two word entries share any semantically equivalent meaning
 * (after normalization). Used to avoid putting synonymous choices together.
 */
function sharesMeaning(a: WordEntry, b: WordEntry): boolean {
  const aNorm = a.meanings.flatMap((m) => splitMeanings(m)).map(normalizeArabic);
  const bNorm = b.meanings.flatMap((m) => splitMeanings(m)).map(normalizeArabic);
  return aNorm.some((na) => na && bNorm.includes(na));
}

/**
 * Build MCQ questions with full anti-repetition logic:
 * - Wrong choices are drawn from all available words randomly
 * - Choices that appeared in the previous question are deprioritized
 * - Similar meanings (synonyms) are kept together as one choice, not split
 */
function buildMcqQuestions(
  selected: WordEntry[],
  allWords: WordEntry[],
  shuffleChoices: boolean
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let prevChoiceLabels = new Set<string>();

  for (const word of selected) {
    const correctLabel = meaningLabel(word.meanings);

    // Pool: all OTHER words that don't share any meaning with this word
    const distractorPool = allWords.filter(
      (w) => w.id !== word.id && !sharesMeaning(w, word)
    );

    const shuffledPool = shuffle(distractorPool);
    const usedLabels = new Set<string>([correctLabel]);
    const wrongs: string[] = [];

    // First pass: prefer distractors NOT used in the previous question
    for (const w of shuffledPool) {
      if (wrongs.length >= 3) break;
      const label = meaningLabel(w.meanings);
      if (!usedLabels.has(label) && !prevChoiceLabels.has(label)) {
        usedLabels.add(label);
        wrongs.push(label);
      }
    }

    // Second pass: fill remaining slots from any available distractor
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

    // Track all labels used in this question for the next iteration
    prevChoiceLabels = new Set(choices);

    questions.push({ word, choices, correctChoiceLabel: correctLabel });
  }

  return questions;
}

export default function QuizPage({ quiz, onBack, onFinish }: QuizPageProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [userInput, setUserInput] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentCorrect, setCurrentCorrect] = useState(false);

  useEffect(() => {
    let wordPool = [...quiz.words];
    if (quiz.settings.shuffleQuestions) wordPool = shuffle(wordPool);
    const count = Math.min(quiz.settings.wordCount, wordPool.length);
    const selected = wordPool.slice(0, count);

    if (quiz.settings.type === "mcq") {
      setQuestions(
        buildMcqQuestions(selected, quiz.words, quiz.settings.shuffleChoices)
      );
    } else {
      setQuestions(selected.map((word) => ({ word })));
    }
  }, [quiz]);

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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">جاري تحميل الأسئلة...</div>
      </div>
    );
  }

  const progress =
    ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:py-8 sm:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight size={18} />
            إنهاء
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>

        {/* Progress */}
        <div className="w-full h-2 bg-muted rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">ما معنى الكلمة التالية؟</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground" dir="ltr">
            {currentQ.word.word}
          </h2>
        </div>

        {/* MCQ Choices */}
        {quiz.settings.type === "mcq" && currentQ.choices && (
          <div className="space-y-3">
            {currentQ.choices.map((choice, idx) => {
              const isSelected = selectedChoice === choice;
              const isCorrectChoice = choice === currentQ.correctChoiceLabel;
              let btnStyle = "border-border bg-card hover:bg-accent";
              if (showFeedback) {
                if (isCorrectChoice)
                  btnStyle =
                    "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300";
                else if (isSelected && !isCorrectChoice)
                  btnStyle =
                    "border-destructive bg-destructive/10 text-destructive";
                else btnStyle = "border-border bg-card opacity-60";
              } else if (isSelected) {
                btnStyle = "border-primary bg-primary/10";
              }

              return (
                <button
                  key={idx}
                  disabled={showFeedback}
                  onClick={() => {
                    if (!showFeedback) setSelectedChoice(choice);
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-right transition-all font-medium text-sm sm:text-base",
                    btnStyle
                  )}
                >
                  <span className="text-muted-foreground ml-3">
                    {String.fromCharCode(0x0661 + idx)}
                  </span>
                  {choice}
                  {showFeedback && isCorrectChoice && (
                    <Check
                      className="inline-block mr-2 text-green-500"
                      size={16}
                    />
                  )}
                  {showFeedback && isSelected && !isCorrectChoice && (
                    <X
                      className="inline-block mr-2 text-destructive"
                      size={16}
                    />
                  )}
                </button>
              );
            })}

            {selectedChoice && !showFeedback && (
              <button
                onClick={() => submitAnswer(selectedChoice)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity mt-2"
              >
                تأكيد الإجابة
              </button>
            )}
          </div>
        )}

        {/* Essay Input */}
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
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={showFeedback}
              placeholder="اكتب المعنى بالعربية..."
              autoFocus
              className={cn(
                "w-full px-4 py-4 rounded-xl border-2 text-foreground text-lg focus:outline-none transition-colors",
                showFeedback
                  ? currentCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-destructive bg-destructive/10"
                  : "border-border bg-card focus:border-primary"
              )}
            />
            {!showFeedback && (
              <button
                type="submit"
                disabled={!userInput.trim()}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تأكيد الإجابة
              </button>
            )}
          </form>
        )}

        {/* Immediate Feedback */}
        {showFeedback && quiz.settings.gradingMode === "immediate" && (
          <div
            className={cn(
              "mt-4 p-4 rounded-xl border",
              currentCorrect
                ? "bg-green-50 dark:bg-green-950/50 border-green-500"
                : "bg-destructive/10 border-destructive/50"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {currentCorrect ? (
                <Check className="text-green-500" size={18} />
              ) : (
                <X className="text-destructive" size={18} />
              )}
              <span
                className={cn(
                  "font-medium",
                  currentCorrect
                    ? "text-green-700 dark:text-green-300"
                    : "text-destructive"
                )}
              >
                {currentCorrect ? "إجابة صحيحة!" : "إجابة خاطئة"}
              </span>
            </div>
            {!currentCorrect && (
              <p className="text-sm text-muted-foreground">
                الإجابة الصحيحة:{" "}
                <span className="font-medium text-foreground">
                  {currentQ.word.meanings.join(" / ")}
                </span>
              </p>
            )}
            <button
              onClick={() => moveNext(answers)}
              className="mt-3 w-full py-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity text-sm"
            >
              {currentIdx + 1 >= questions.length
                ? "عرض النتائج"
                : "السؤال التالي"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
