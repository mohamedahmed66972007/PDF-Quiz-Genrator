import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quiz } from "../types";
import { cn } from "../lib/utils";
import {
  ArrowRight,
  Volume2,
  ChevronLeft,
  ChevronRight,
  List,
  Check,
  X,
  BookOpen,
  RotateCcw,
} from "lucide-react";

interface FlashcardsPageProps {
  quiz: Quiz;
  onBack: () => void;
}

let currentAudio: HTMLAudioElement | null = null;

function speakWord(word: string, onDone?: () => void) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  const gttsUrl =
    `https://translate.google.com/translate_tts?ie=UTF-8` +
    `&q=${encodeURIComponent(word)}&tl=en-US&client=tw-ob`;

  const audio = new Audio(gttsUrl);
  currentAudio = audio;
  audio.volume = 1;
  audio.playbackRate = 0.92;

  const finish = () => { if (onDone) onDone(); };
  audio.addEventListener("ended", finish);
  audio.addEventListener("error", () => {
    fallbackSpeak(word);
    finish();
  });

  audio.play().catch(() => {
    fallbackSpeak(word);
    finish();
  });
}

function fallbackSpeak(word: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = "en-US";
  utter.rate = 0.88;
  utter.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /google/i.test(v.name) && /en.US/i.test(v.lang)) ||
    voices.find((v) => /microsoft/i.test(v.name) && /en.US/i.test(v.lang)) ||
    voices.find((v) => /en.US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang));
  if (pick) utter.voice = pick;

  window.speechSynthesis.speak(utter);
}

export default function FlashcardsPage({ quiz, onBack }: FlashcardsPageProps) {
  const words = quiz.words;
  const [index, setIndex] = useState(0);
  const [memorized, setMemorized] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);
  const [showMeanings, setShowMeanings] = useState(true);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const current = words[index];
  const isMemorized = memorized.has(current.id);
  const memorizedCount = memorized.size;

  function goTo(newIndex: number) {
    setDirection(newIndex > index ? 1 : -1);
    setIndex(newIndex);
    setShowMeanings(true);
  }

  function goPrev() {
    if (index > 0) goTo(index - 1);
  }

  function goNext() {
    if (index < words.length - 1) goTo(index + 1);
  }

  function toggleMemorized() {
    setMemorized((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
    if (index < words.length - 1) {
      setTimeout(() => goTo(index + 1), 300);
    }
  }

  function handleSpeak() {
    setSpeaking(true);
    speakWord(current.word, () => setSpeaking(false));
  }

  function resetMemorized() {
    setMemorized(new Set());
    setIndex(0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (showList) return;
      if (e.code === "KeyA") goNext();
      if (e.code === "KeyD") goPrev();
      if (e.code === "Space") { e.preventDefault(); handleSpeak(); }
      if (e.code === "Enter") toggleMemorized();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const allDone = memorizedCount === words.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowRight size={17} />
          العودة
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{quiz.name}</p>
          <p className="text-xs text-muted-foreground">
            {memorizedCount} / {words.length} محفوظة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {memorizedCount > 0 && (
            <button
              onClick={resetMemorized}
              title="إعادة التعيين"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm"
          >
            <List size={15} />
            القائمة
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${((index + 1) / words.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      {/* All done state */}
      {allDone ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5"
        >
          <div className="w-20 h-20 rounded-3xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
            <Check size={40} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground mb-1">أحسنت!</h2>
            <p className="text-muted-foreground text-sm">لقد حفظت جميع الكلمات الـ {words.length}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetMemorized}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-accent transition-colors text-sm font-semibold"
            >
              <RotateCcw size={15} />
              مراجعة مرة أخرى
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              العودة للرئيسية
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5 max-w-lg mx-auto w-full">

          {/* Counter */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{index + 1}</span>
            <span>/</span>
            <span>{words.length}</span>
          </div>

          {/* Card */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "w-full rounded-3xl border-2 p-7 shadow-sm transition-colors",
                isMemorized
                  ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20"
                  : "border-border bg-card"
              )}
            >
              {/* English word */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-3xl font-black text-foreground tracking-tight" dir="ltr">
                  {current.word}
                </h2>
                <button
                  onClick={handleSpeak}
                  className={cn(
                    "flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                    speaking
                      ? "bg-primary text-primary-foreground scale-95"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                  title="استمع للنطق"
                >
                  <Volume2 size={20} />
                </button>
              </div>

              {/* Meanings */}
              <div className="space-y-2">
                {current.meanings.filter(Boolean).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/70 border border-border/50"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-foreground text-base font-medium">{m}</span>
                  </div>
                ))}
              </div>

              {isMemorized && (
                <div className="mt-4 flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold">
                  <Check size={15} />
                  محفوظة
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation + action buttons */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-accent transition-colors flex-shrink-0"
            >
              <ChevronRight size={20} />
            </button>

            <button
              onClick={toggleMemorized}
              className={cn(
                "flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                isMemorized
                  ? "bg-muted text-muted-foreground border border-border hover:bg-accent"
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
              )}
            >
              {isMemorized ? (
                <>
                  <X size={16} />
                  إلغاء الحفظ
                </>
              ) : (
                <>
                  <Check size={16} />
                  حفظت ✓
                </>
              )}
            </button>

            <button
              onClick={goNext}
              disabled={index === words.length - 1}
              className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-accent transition-colors flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Hint */}
          <p className="text-xs text-muted-foreground/60 text-center">
            Space للاستماع • Enter للحفظ • A للتالي • D للسابق
          </p>
        </div>
      )}

      {/* Word list modal */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            dir="rtl"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowList(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full sm:max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <BookOpen size={17} className="text-primary flex-shrink-0" />
                <h3 className="font-bold text-foreground flex-1">
                  قائمة الكلمات
                </h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {memorizedCount}/{words.length}
                </span>
                <button
                  onClick={() => setShowList(false)}
                  className="p-1.5 rounded-xl hover:bg-accent transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {words.map((w, i) => (
                  <button
                    key={w.id}
                    onClick={() => { goTo(i); setShowList(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-accent transition-colors border-b border-border/40 last:border-0",
                      i === index && "bg-primary/5"
                    )}
                  >
                    <span className="w-6 text-center text-xs text-muted-foreground flex-shrink-0 font-mono">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-semibold text-foreground text-sm" dir="ltr">
                      {w.word}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {w.meanings[0]}
                    </span>
                    {memorized.has(w.id) && (
                      <Check size={13} className="text-green-500 flex-shrink-0" />
                    )}
                    {i === index && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
