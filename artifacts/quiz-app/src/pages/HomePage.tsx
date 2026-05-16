import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quiz } from "../types";
import { loadQuizzes, deleteQuiz, loadResultsByQuizId, saveQuiz, saveQuizzesOrder } from "../lib/storage";
import { encodeQuizToUrl, encodeAllQuizzesToUrl, copyToClipboard } from "../lib/share";
import { cn } from "../lib/utils";
import HistoryModal from "../components/HistoryModal";
import { useTheme, COLORS } from "../context/ThemeContext";
import { ThemeColor, QuizResult } from "../types";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Share2,
  Play,
  Users,
  AlertTriangle,
  Download,
  History,
  Check,
  Moon,
  Sun,
  Palette,
  RefreshCw,
  GitMerge,
  X,
  CheckSquare,
  Square,
  Zap,
  GripVertical,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface HomePageProps {
  onCreateQuiz: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onStartQuiz: (quiz: Quiz) => void;
  onFlashcards: (quiz: Quiz) => void;
  onImport: () => void;
  onRetryWrong: (result: QuizResult) => void;
}

const COLOR_DOTS: Record<ThemeColor, string> = {
  blue: "#3b82f6",
  violet: "#7c3aed",
  green: "#16a34a",
  orange: "#f97316",
  red: "#ef4444",
  yellow: "#eab308",
  teal: "#0d9488",
  pink: "#ec4899",
};

const COLOR_LABELS: Record<ThemeColor, string> = {
  blue: "أزرق",
  violet: "بنفسجي",
  green: "أخضر",
  orange: "برتقالي",
  red: "أحمر",
  yellow: "أصفر",
  teal: "أزرق مائي",
  pink: "وردي",
};

const cardVariants = {
  initial: { opacity: 0, y: 18 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: "spring", stiffness: 260, damping: 26 },
  }),
};

const COVER_PALETTES = [
  { a: "#4f46e5", b: "#7c3aed" },
  { a: "#0ea5e9", b: "#2563eb" },
  { a: "#059669", b: "#0d9488" },
  { a: "#dc2626", b: "#db2777" },
  { a: "#d97706", b: "#ea580c" },
  { a: "#7c3aed", b: "#db2777" },
  { a: "#0891b2", b: "#0f766e" },
  { a: "#b45309", b: "#92400e" },
];

function QuizCover({
  name,
  quizId,
  wordCount,
  index,
}: {
  name: string;
  quizId: string;
  wordCount: number;
  index: number;
}) {
  const palette = COVER_PALETTES[index % COVER_PALETTES.length];
  const gid = `g${quizId.replace(/\W/g, "").slice(0, 12)}`;
  const pid = `p${gid}`;
  const H = 130;

  const isArabic = /[\u0600-\u06FF]/.test(name);
  const fontFamily = isArabic
    ? "'Tajawal', sans-serif"
    : "'Montserrat', sans-serif";

  return (
    <div className="w-full relative overflow-hidden rounded-t-2xl" style={{ height: H }}>
      {/* Gradient SVG background */}
      <svg width="100%" height={H} xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.a} />
            <stop offset="100%" stopColor={palette.b} />
          </linearGradient>
          <pattern id={pid} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="white" fillOpacity="0.08" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gid})`} />
        <rect width="100%" height="100%" fill={`url(#${pid})`} />
        <circle cx="92%" cy="-10%" r="90" fill="white" fillOpacity="0.06" />
        <circle cx="-4%" cy="110%" r="70" fill="white" fillOpacity="0.05" />
        <circle cx="50%" cy="50%" r="120" fill="white" fillOpacity="0.03" />
      </svg>

      {/* Text overlay using real fonts */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-3 pb-4"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <p
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: "1.15rem",
            color: "white",
            textAlign: "center",
            lineHeight: 1.3,
            letterSpacing: isArabic ? "0" : "0.04em",
            textTransform: isArabic ? "none" : "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.45)",
            wordBreak: "break-word",
          }}
        >
          {name}
        </p>
      </div>

      {/* Word count badge */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span
          style={{
            fontFamily: isArabic ? "'Tajawal', sans-serif" : "'Inter', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.68)",
            letterSpacing: "0.03em",
          }}
        >
          {wordCount} كلمة
        </span>
      </div>
    </div>
  );
}

export default function HomePage({
  onCreateQuiz,
  onEditQuiz,
  onStartQuiz,
  onFlashcards,
  onImport,
  onRetryWrong,
}: HomePageProps) {
  const { theme, toggleMode, setColor, setAutoChange } = useTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => loadQuizzes());
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [historyQuiz, setHistoryQuiz] = useState<Quiz | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeSuccess, setMergeSuccess] = useState(false);

  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const reordered = [...quizzes];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);
    saveQuizzesOrder(reordered);
    setQuizzes(reordered);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  useEffect(() => {
    if (!colorPickerOpen) return;
    function handleOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [colorPickerOpen]);

  function confirmDelete() {
    if (!deleteTargetId) return;
    deleteQuiz(deleteTargetId);
    setQuizzes(loadQuizzes());
    setDeleteTargetId(null);
  }

  async function handleShare(quiz: Quiz) {
    const url = encodeQuizToUrl(quiz);
    await copyToClipboard(url);
    setCopied(quiz.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleShareAll() {
    const url = encodeAllQuizzesToUrl(quizzes);
    await copyToClipboard(url);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }

  function toggleMergeMode() {
    setMergeMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMerge() {
    const selected = quizzes.filter((q) => selectedIds.has(q.id));
    if (selected.length < 2) return;

    const seenIds = new Set<string>();
    const combinedWords = selected.flatMap((q) =>
      q.words.filter((w) => {
        if (seenIds.has(w.id)) return false;
        seenIds.add(w.id);
        return true;
      })
    );

    const names = selected.map((q) => q.name).join(" + ");
    const base = selected[0];

    const mergedQuiz: Quiz = {
      id: `merged_${Date.now()}`,
      name: `مجمع: ${names}`,
      words: combinedWords,
      settings: { ...base.settings, wordCount: combinedWords.length },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveQuiz(mergedQuiz);
    setQuizzes(loadQuizzes());
    setMergeMode(false);
    setSelectedIds(new Set());
    setMergeSuccess(true);
    setTimeout(() => setMergeSuccess(false), 2500);
  }

  const deleteTargetName = quizzes.find((q) => q.id === deleteTargetId)?.name ?? "";
  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">

      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-base text-foreground truncate">MO En Word Exam</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={toggleMode}
              className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center active:scale-95 transition-transform"
            >
              {theme.mode === "dark" ? (
                <Sun size={16} className="text-yellow-400" />
              ) : (
                <Moon size={16} className="text-foreground" />
              )}
            </button>

            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => setColorPickerOpen((v) => !v)}
                className={cn(
                  "w-9 h-9 rounded-xl bg-card border flex items-center justify-center active:scale-95 transition-all",
                  colorPickerOpen ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <Palette size={16} className="text-primary" />
              </button>

              <AnimatePresence>
                {colorPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute top-full mt-2 left-0 z-50 flex flex-col gap-1 bg-card border border-border rounded-2xl p-2 shadow-xl min-w-[160px]"
                  >
                    {(COLORS as ThemeColor[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => { setColor(c); setColorPickerOpen(false); }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-right w-full",
                          theme.color === c
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground active:bg-accent"
                        )}
                      >
                        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLOR_DOTS[c] }} />
                        {COLOR_LABELS[c]}
                        {theme.color === c && <Check size={13} className="mr-auto" />}
                      </button>
                    ))}
                    <div className="border-t border-border mt-0.5 pt-1">
                      <button
                        onClick={() => setAutoChange(!theme.autoChange)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs w-full text-right transition-colors",
                          theme.autoChange ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-accent"
                        )}
                      >
                        <RefreshCw size={11} />
                        تغيير تلقائي
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {quizzes.length >= 2 && (
              <button
                onClick={toggleMergeMode}
                className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all",
                  mergeMode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                )}
              >
                {mergeMode ? <X size={16} /> : <GitMerge size={16} />}
              </button>
            )}

            {!mergeMode && (
              <button
                onClick={onImport}
                className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center active:scale-95 transition-transform"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Desktop Header ── */}
      <div className="hidden sm:block max-w-4xl mx-auto px-6 pt-8 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
              <BookOpen size={22} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground leading-tight">
                MO En Word Exam
              </h1>
              <p className="text-xs text-muted-foreground">
                {quizzes.length > 0 ? `${quizzes.length} اختبار محفوظ` : "لا توجد اختبارات بعد"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {!mergeMode && (
              <>
                <button
                  onClick={onImport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
                >
                  <Download size={15} />
                  استيراد
                </button>
                {quizzes.length >= 2 && (
                  <button
                    onClick={toggleMergeMode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
                  >
                    <GitMerge size={15} />
                    دمج
                  </button>
                )}
                <button
                  onClick={onCreateQuiz}
                  className="btn-primary-glow flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all text-sm font-semibold shadow-sm"
                >
                  <Plus size={16} />
                  اختبار جديد
                </button>
              </>
            )}
            {mergeMode && (
              <button
                onClick={toggleMergeMode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
              >
                <X size={15} />
                إلغاء الدمج
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Merge mode banner ── */}
      <AnimatePresence>
        {mergeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-4xl mx-auto px-4 sm:px-6 mt-4 mb-0"
          >
            <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 flex items-center gap-3">
              <GitMerge size={17} className="text-primary flex-shrink-0" />
              <p className="text-sm text-foreground flex-1">
                اختر <span className="font-bold text-primary">اختبارَين أو أكثر</span> لدمجهما
              </p>
              {selectedCount >= 2 && (
                <span className="text-xs text-primary font-bold bg-primary/20 px-2.5 py-1 rounded-full">
                  {selectedCount} محدد
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5 pb-28 sm:pb-10">

        {quizzes.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="text-center py-20 bg-card rounded-3xl border border-border mt-3"
          >
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="text-primary" size={32} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">لا توجد اختبارات بعد</h2>
            <p className="text-sm text-muted-foreground mb-7">أنشئ اختبارك الأول أو استورد من PDF</p>
            <button
              onClick={onCreateQuiz}
              className="btn-primary-glow inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-all font-bold shadow-sm"
            >
              <Plus size={18} />
              إنشاء اختبار جديد
            </button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-2">
              {quizzes.map((quiz, i) => {
                const results = loadResultsByQuizId(quiz.id);
                const lastResult = results[0];
                const resultCount = results.length;
                const scoreColor = !lastResult
                  ? ""
                  : lastResult.score >= 80
                  ? "text-green-600 dark:text-green-400"
                  : lastResult.score >= 60
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-destructive";
                const scoreBg = !lastResult
                  ? ""
                  : lastResult.score >= 80
                  ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
                  : lastResult.score >= 60
                  ? "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800"
                  : "bg-destructive/5 border-destructive/30";

                const isSelected = selectedIds.has(quiz.id);

                return (
                  <motion.div
                    key={quiz.id}
                    custom={i}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    draggable={!mergeMode}
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    onClick={mergeMode ? () => toggleSelect(quiz.id) : undefined}
                    className={cn(
                      "bg-card border rounded-2xl overflow-hidden transition-all",
                      mergeMode
                        ? "cursor-pointer select-none"
                        : "hover:shadow-lg hover:border-primary/30",
                      mergeMode && isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border",
                      !mergeMode && dragOverIndex === i
                        ? "ring-2 ring-primary border-primary scale-[1.01]"
                        : ""
                    )}
                  >
                    {/* Cover banner */}
                    <div className="relative">
                      <QuizCover
                        name={quiz.name}
                        quizId={quiz.id}
                        wordCount={quiz.words.length}
                        index={i}
                      />
                      {/* merge checkbox overlay */}
                      {mergeMode && (
                        <div className="absolute top-2 right-2">
                          {isSelected
                            ? <CheckSquare size={22} className="text-white drop-shadow" />
                            : <Square size={22} className="text-white/80 drop-shadow" />}
                        </div>
                      )}
                      {/* drag handle overlay */}
                      {!mergeMode && (
                        <div
                          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-white/60 hover:text-white transition-colors touch-none"
                          title="اسحب لإعادة الترتيب"
                        >
                          <GripVertical size={18} />
                        </div>
                      )}
                    </div>

                    {/* Card body — metadata + last result */}
                    <div className="px-4 pt-3 pb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{quiz.settings.type === "mcq" ? "اختيار متعدد" : "مقالي"}</span>
                        <span className="text-border">•</span>
                        <span>{new Date(quiz.updatedAt).toLocaleDateString("ar")}</span>
                      </div>

                      {lastResult && (
                        <div className={cn(
                          "mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-xs font-semibold",
                          scoreBg
                        )}>
                          <Zap size={11} className={scoreColor} />
                          <span className="text-muted-foreground">آخر نتيجة:</span>
                          <span className={scoreColor}>{lastResult.score}%</span>
                          <span className="text-muted-foreground opacity-70">
                            ({lastResult.correctCount}/{lastResult.totalQuestions})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Unified action bar */}
                    {!mergeMode && (
                      <div className="flex items-center border-t border-border/60">
                        {/* ابدأ — RIGHT (start in RTL), takes most space */}
                        <button
                          onClick={() => onStartQuiz(quiz)}
                          className="btn-primary-glow flex items-center justify-center gap-1.5 flex-1 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-bold text-sm"
                        >
                          <Play size={14} fill="currentColor" />
                          ابدأ
                        </button>

                        {/* Divider */}
                        <div className="w-px h-10 bg-border/60" />

                        {/* حفظ */}
                        <button
                          onClick={() => onFlashcards(quiz)}
                          title="حفظ"
                          className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <BookOpen size={16} />
                        </button>

                        {/* History */}
                        <div className="relative">
                          <button
                            onClick={() => setHistoryQuiz(quiz)}
                            title="النتائج السابقة"
                            className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <History size={16} />
                          </button>
                          {resultCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none">
                              {resultCount > 9 ? "9+" : resultCount}
                            </span>
                          )}
                        </div>

                        {/* Share */}
                        <button
                          onClick={() => handleShare(quiz)}
                          title="مشاركة"
                          className={cn(
                            "flex items-center justify-center w-11 h-11 transition-colors",
                            copied === quiz.id
                              ? "text-green-500"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {copied === quiz.id ? <Check size={16} /> : <Share2 size={16} />}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEditQuiz(quiz)}
                          title="تعديل"
                          className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Edit size={16} />
                        </button>

                        {/* Delete — far LEFT (end in RTL) */}
                        <button
                          onClick={() => setDeleteTargetId(quiz.id)}
                          title="حذف"
                          className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {!mergeMode && quizzes.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3 } }}
                className="mt-5 flex justify-center"
              >
                <button
                  onClick={handleShareAll}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border hover:bg-accent transition-colors text-sm font-medium",
                    copied === "all" && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                  )}
                >
                  {copied === "all" ? <Check size={15} /> : <Users size={15} />}
                  {copied === "all" ? "تم النسخ!" : "مشاركة جميع الاختبارات"}
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ── Mobile FAB ── */}
      {!mergeMode && (
        <div
          className="sm:hidden fixed right-4 z-30"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <motion.button
            onClick={onCreateQuiz}
            whileTap={{ scale: 0.94 }}
            className="btn-primary-glow flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity font-bold text-sm"
          >
            <Plus size={20} />
            اختبار جديد
          </motion.button>
        </div>
      )}

      {/* ── Merge floating bar ── */}
      <AnimatePresence>
        {mergeMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 z-40 flex justify-center px-4"
            style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-muted-foreground flex-1">
                {selectedCount === 0
                  ? "اختر اختبارات للدمج"
                  : selectedCount === 1
                  ? "اختر اختبار آخر على الأقل"
                  : `${selectedCount} اختبارات محددة`}
              </span>
              <button
                onClick={toggleMergeMode}
                className="px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleMerge}
                disabled={selectedCount < 2}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  selectedCount >= 2
                    ? "bg-primary text-primary-foreground hover:opacity-90 btn-primary-glow"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <GitMerge size={15} />
                دمج
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy toast */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            className="fixed left-1/2 bottom-24 sm:bottom-8 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 flex items-center gap-2"
          >
            <Check size={14} />
            تم نسخ الرابط
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge success toast */}
      <AnimatePresence>
        {mergeSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            className="fixed left-1/2 bottom-24 sm:bottom-8 bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 flex items-center gap-2"
          >
            <Check size={14} />
            تم الدمج بنجاح!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete dialog */}
      <AlertDialog.Root
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <AlertDialog.Content
            dir="rtl"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-2xl p-6 w-[90vw] max-w-sm shadow-2xl"
          >
            <AlertDialog.Title className="font-bold text-lg text-foreground mb-2">
              حذف الاختبار
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-5">
              هل أنت متأكد من حذف <span className="font-semibold text-foreground">"{deleteTargetName}"</span>؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-semibold">
                  إلغاء
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity text-sm font-semibold"
                >
                  حذف
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {historyQuiz && (
        <HistoryModal
          quizId={historyQuiz.id}
          quizName={historyQuiz.name}
          onClose={() => setHistoryQuiz(null)}
          onRetryWrong={(result) => {
            setHistoryQuiz(null);
            onRetryWrong(result);
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  danger,
  active,
  badge,
  children,
}: {
  onClick: () => void;
  title: string;
  danger?: boolean;
  active?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        title={title}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm",
          active
            ? "bg-green-50 dark:bg-green-950/50 text-green-600"
            : danger
            ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        {children}
      </button>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );
}

function MobileAction({
  onClick,
  active,
  danger,
  badge,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1">
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center justify-center py-3 transition-colors",
          active
            ? "text-green-600"
            : danger
            ? "text-muted-foreground active:text-destructive"
            : "text-muted-foreground active:bg-accent"
        )}
      >
        {children}
      </button>
      {badge !== undefined && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );
}
