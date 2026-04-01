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
  /** For MCQ: the 4 display labels (each may be "معنى١ / معنى٢") */
  choices?: string[];
  /** The display label for the correct answer */
  correctChoiceLabel?: string;
}

/**
 * Build the display label for a word's meanings:
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

    const qs: QuizQuestion[] = selected.map((word) => {
      if (quiz.settings.type === "mcq") {
        const correctLabel = meaningLabel(word.meanings);

        // Build distractor pool: all OTHER word entries that share no meaning with this word
        const distractorPool = quiz.words.filter(
          (w) => w.id !== word.id && !sharesMeaning(w, word)
        );

        // Shuffle and pick 3 unique distractors (by label to avoid duplicates)
        const usedLabels = new Set<string>([correctLabel]);
        const wrongs: string[] = [];
        for (const w of shuffle(distractorPool)) {
          if (wrongs.length >= 3) break;
          const label = meaningLabel(w.meanings);
          if (!usedLabels.has(label)) {
            usedLabels.add(label);
            wrongs.push(label);
          }
        }

        let choices = [correctLabel, ...wrongs];
        if (quiz.settings.shuffleChoices) choices = shuffle(choices);

        return { word, choices, correctChoiceLabel: correctLabel };
      }
      return { word };
    });

    setQuestions(qs);
  }, [quiz]);

  const currentQ = questions[currentIdx];

  function submitAnswer(answer: string) {
    if (!currentQ) return;
    // For MCQ the answer is a display label; check if it equals the correct label
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
      <div className="max-w-2xl mx-auto px-4 py-8">
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
        <div className="bg-card border border-border rounded-2xl p-8 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">ما معنى الكلمة التالية؟</p>
          <h2 className="text-4xl font-bold text-foreground" dir="ltr">
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
                    "w-full p-4 rounded-xl border-2 text-right transition-all font-medium",
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
