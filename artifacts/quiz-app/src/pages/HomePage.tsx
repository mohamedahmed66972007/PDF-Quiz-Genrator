import React, { useState, useRef, useEffect } from "react";
import { Quiz } from "../types";
import { loadQuizzes, deleteQuiz, loadResultsByQuizId, saveQuiz } from "../lib/storage";
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
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface HomePageProps {
  onCreateQuiz: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onStartQuiz: (quiz: Quiz) => void;
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

export default function HomePage({
  onCreateQuiz,
  onEditQuiz,
  onStartQuiz,
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

  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeSuccess, setMergeSuccess] = useState(false);

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

    // Combine words, deduplicate by wordId
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
      settings: {
        ...base.settings,
        wordCount: combinedWords.length,
      },
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
          {/* Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <BookOpen className="text-primary flex-shrink-0" size={20} />
            <span className="font-bold text-base text-foreground truncate">عمك محمد عبدالوهاااب</span>
          </div>

          {/* Right-side action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Mode toggle */}
            <button
              onClick={toggleMode}
              title={theme.mode === "dark" ? "وضع نهاري" : "وضع ليلي"}
              className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center active:scale-95 transition-transform"
            >
              {theme.mode === "dark" ? (
                <Sun size={17} className="text-yellow-400" />
              ) : (
                <Moon size={17} className="text-foreground" />
              )}
            </button>

            {/* Color picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => setColorPickerOpen((v) => !v)}
                title="تغيير اللون"
                className={cn(
                  "w-9 h-9 rounded-xl bg-card border flex items-center justify-center active:scale-95 transition-transform",
                  colorPickerOpen ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <Palette size={17} className="text-primary" />
              </button>

              {colorPickerOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 flex flex-col gap-1 bg-card border border-border rounded-2xl p-2 shadow-xl min-w-[150px]">
                  {(COLORS as ThemeColor[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setColorPickerOpen(false); }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-right w-full",
                        theme.color === c
                          ? "bg-primary/10 text-primary"
                          : "text-foreground active:bg-accent"
                      )}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLOR_DOTS[c] }}
                      />
                      {c === "blue" ? "أزرق" : c === "violet" ? "بنفسجي" : c === "green" ? "أخضر" : c === "orange" ? "برتقالي" : c === "red" ? "أحمر" : c === "yellow" ? "أصفر" : c === "teal" ? "أزرق مائي" : "وردي"}
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
                </div>
              )}
            </div>

            {/* Merge mode toggle (only shown when 2+ quizzes) */}
            {quizzes.length >= 2 && (
              <button
                onClick={toggleMergeMode}
                title={mergeMode ? "إلغاء الدمج" : "دمج اختبارات"}
                className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all",
                  mergeMode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                )}
              >
                {mergeMode ? <X size={17} /> : <GitMerge size={17} />}
              </button>
            )}

            {/* Import */}
            {!mergeMode && (
              <button
                onClick={onImport}
                title="استيراد اختبار"
                className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center active:scale-95 transition-transform"
              >
                <Download size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Desktop Header ── */}
      <div className="hidden sm:block max-w-4xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="text-primary" size={30} />
              عمك محمد عبدالوهاااب
            </h1>
          </div>
          <div className="flex gap-2">
            {!mergeMode && (
              <>
                <button
                  onClick={onImport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  استيراد
                </button>
                {quizzes.length >= 2 && (
                  <button
                    onClick={toggleMergeMode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
                  >
                    <GitMerge size={16} />
                    دمج اختبارات
                  </button>
                )}
                <button
                  onClick={onCreateQuiz}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
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
                <X size={16} />
                إلغاء الدمج
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Merge mode banner ── */}
      {mergeMode && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-2">
          <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <GitMerge size={18} className="text-primary flex-shrink-0" />
            <p className="text-sm text-foreground flex-1">
              اختر <span className="font-bold text-primary">اختبارَين أو أكثر</span> لدمجهما في اختبار واحد
            </p>
            {selectedCount >= 2 && (
              <span className="text-xs text-primary font-semibold bg-primary/20 px-2 py-0.5 rounded-full">
                {selectedCount} محدد
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-10">

        {quizzes.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 bg-card rounded-3xl border border-border mt-2">
            <BookOpen className="mx-auto text-muted-foreground mb-4" size={48} />
            <h2 className="text-xl font-bold text-foreground mb-6">
              لا توجد اختبارات بعد
            </h2>
            <button
              onClick={onCreateQuiz}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold"
            >
              <Plus size={18} />
              إنشاء اختبار جديد
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4">
              {quizzes.map((quiz) => {
                const lastResult = loadResultsByQuizId(quiz.id)[0];
                const resultCount = loadResultsByQuizId(quiz.id).length;
                const scoreColor = !lastResult
                  ? ""
                  : lastResult.score >= 80
                  ? "text-green-600 dark:text-green-400"
                  : lastResult.score >= 60
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-destructive";

                const isSelected = selectedIds.has(quiz.id);

                return (
                  <div
                    key={quiz.id}
                    onClick={mergeMode ? () => toggleSelect(quiz.id) : undefined}
                    className={cn(
                      "bg-card border rounded-2xl overflow-hidden transition-all",
                      mergeMode
                        ? "cursor-pointer select-none"
                        : "hover:border-primary/40",
                      mergeMode && isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border"
                    )}
                  >
                    {/* Card body */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        {/* Merge mode checkbox */}
                        {mergeMode && (
                          <div className="flex-shrink-0 mt-0.5">
                            {isSelected ? (
                              <CheckSquare size={20} className="text-primary" />
                            ) : (
                              <Square size={20} className="text-muted-foreground" />
                            )}
                          </div>
                        )}

                        <h3 className="font-bold text-foreground text-base leading-tight flex-1 min-w-0 truncate">
                          {quiz.name}
                        </h3>

                        {/* Desktop action buttons (hidden in merge mode) */}
                        {!mergeMode && (
                          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                            <ActionButton
                              onClick={() => handleShare(quiz)}
                              title="مشاركة"
                              active={copied === quiz.id}
                            >
                              {copied === quiz.id ? <Check size={15} /> : <Share2 size={15} />}
                            </ActionButton>
                            <ActionButton onClick={() => onEditQuiz(quiz)} title="تعديل">
                              <Edit size={15} />
                            </ActionButton>
                            <ActionButton
                              onClick={() => setHistoryQuiz(quiz)}
                              title="النتائج السابقة"
                              badge={resultCount > 0 ? resultCount : undefined}
                            >
                              <History size={15} />
                            </ActionButton>
                            <ActionButton
                              onClick={() => setDeleteTargetId(quiz.id)}
                              title="حذف"
                              danger
                            >
                              <Trash2 size={15} />
                            </ActionButton>
                            <button
                              onClick={() => onStartQuiz(quiz)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold mr-1"
                            >
                              <Play size={14} />
                              ابدأ
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>{quiz.words.length} كلمة</span>
                        <span>•</span>
                        <span>
                          {quiz.settings.type === "mcq" ? "اختيار من متعدد" : "مقالي"}
                        </span>
                        <span>•</span>
                        <span>{new Date(quiz.updatedAt).toLocaleDateString("ar")}</span>
                      </div>

                      {/* Last score */}
                      {lastResult && (
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-background rounded-lg px-2.5 py-1 border border-border/60">
                          <span className="text-xs text-muted-foreground">آخر نتيجة:</span>
                          <span className={cn("text-xs font-bold", scoreColor)}>
                            {lastResult.score}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({lastResult.correctCount}/{lastResult.totalQuestions})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Mobile action bar (hidden in merge mode) */}
                    {!mergeMode && (
                      <div className="sm:hidden flex items-center border-t border-border/60 divide-x divide-x-reverse divide-border/60">
                        <MobileAction onClick={() => handleShare(quiz)} active={copied === quiz.id}>
                          {copied === quiz.id ? <Check size={16} /> : <Share2 size={16} />}
                        </MobileAction>
                        <MobileAction onClick={() => onEditQuiz(quiz)}>
                          <Edit size={16} />
                        </MobileAction>
                        <MobileAction
                          onClick={() => setHistoryQuiz(quiz)}
                          badge={resultCount > 0 ? resultCount : undefined}
                        >
                          <History size={16} />
                        </MobileAction>
                        <MobileAction onClick={() => setDeleteTargetId(quiz.id)} danger>
                          <Trash2 size={16} />
                        </MobileAction>
                        <button
                          onClick={() => onStartQuiz(quiz)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-bold text-sm"
                        >
                          <Play size={16} />
                          ابدأ الاختبار
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!mergeMode && quizzes.length > 1 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleShareAll}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border hover:bg-accent transition-colors text-sm font-medium",
                    copied === "all" && "border-green-500 text-green-500"
                  )}
                >
                  <Users size={15} />
                  {copied === "all" ? "تم النسخ!" : "مشاركة جميع الاختبارات"}
                </button>
              </div>
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
          <button
            onClick={onCreateQuiz}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity font-bold text-sm"
          >
            <Plus size={20} />
            اختبار جديد
          </button>
        </div>
      )}

      {/* ── Merge action bar (floating bottom) ── */}
      {mergeMode && (
        <div
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
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <GitMerge size={16} />
              دمج
            </button>
          </div>
        </div>
      )}

      {/* Copy toast */}
      {copied && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          تم نسخ الرابط!
        </div>
      )}

      {/* Merge success toast */}
      {mergeSuccess && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-lg z-50 flex items-center gap-2"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Check size={16} />
          تم إنشاء الاختبار المجمع!
        </div>
      )}

      {/* History Modal */}
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

      {/* ── Footer ── */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        جميع الحقوق محفوظة لـ صالح محمد احمد عبد الوهاب
      </footer>

      {/* Delete confirmation */}
      <AlertDialog.Root
        open={deleteTargetId !== null}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <AlertDialog.Content
            dir="rtl"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-card border border-border rounded-3xl shadow-2xl p-5"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="text-destructive" size={20} />
              </div>
              <div>
                <AlertDialog.Title className="text-base font-bold text-foreground mb-1">
                  حذف الاختبار
                </AlertDialog.Title>
                <AlertDialog.Description className="text-muted-foreground text-sm leading-relaxed">
                  هل أنت متأكد من حذف{" "}
                  <span className="font-semibold text-foreground">"{deleteTargetName}"</span>؟
                  {" "}لا يمكن التراجع عن هذا الإجراء.
                </AlertDialog.Description>
              </div>
            </div>
            <div className="flex gap-2">
              <AlertDialog.Cancel asChild>
                <button className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-accent transition-colors text-sm font-semibold">
                  إلغاء
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-white hover:opacity-90 transition-opacity text-sm font-semibold"
                >
                  حذف
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

/* ── Helper components ── */

function ActionButton({
  children,
  onClick,
  title,
  danger,
  active,
  badge,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
  active?: boolean;
  badge?: number;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        title={title}
        className={cn(
          "p-2 rounded-xl border transition-colors",
          danger
            ? "border-border hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
            : active
            ? "border-green-500 text-green-500 bg-green-50 dark:bg-green-950/20"
            : "border-border hover:bg-accent"
        )}
      >
        {children}
      </button>
      {badge !== undefined && (
        <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );
}

function MobileAction({
  children,
  onClick,
  danger,
  active,
  badge,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  badge?: number;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          "w-12 h-12 flex items-center justify-center transition-colors",
          danger
            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            : active
            ? "text-green-500"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        {children}
      </button>
      {badge !== undefined && (
        <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );
}
