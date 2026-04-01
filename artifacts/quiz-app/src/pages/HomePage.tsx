import React, { useState } from "react";
import { Quiz } from "../types";
import { loadQuizzes, deleteQuiz, loadResultsByQuizId } from "../lib/storage";
import { encodeQuizToUrl, encodeAllQuizzesToUrl, copyToClipboard } from "../lib/share";
import { cn } from "../lib/utils";
import HistoryModal from "../components/HistoryModal";
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
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface HomePageProps {
  onCreateQuiz: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onStartQuiz: (quiz: Quiz) => void;
  onImport: () => void;
}

export default function HomePage({
  onCreateQuiz,
  onEditQuiz,
  onStartQuiz,
  onImport,
}: HomePageProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => loadQuizzes());
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [historyQuiz, setHistoryQuiz] = useState<Quiz | null>(null);

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

  const deleteTargetName = quizzes.find((q) => q.id === deleteTargetId)?.name ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">

      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary flex-shrink-0" size={22} />
            <span className="font-bold text-lg text-foreground">مولّد الاختبارات</span>
          </div>
          <button
            onClick={onImport}
            title="استيراد اختبار"
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <Download size={18} />
          </button>
        </div>
      </header>

      {/* ── Desktop Header ── */}
      <div className="hidden sm:block max-w-4xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="text-primary" size={30} />
              مولّد الاختبارات
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              ارفع ملف PDF لإنشاء اختبارات تفاعلية
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
            >
              <Download size={16} />
              استيراد
            </button>
            <button
              onClick={onCreateQuiz}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
            >
              <Plus size={16} />
              اختبار جديد
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-10">

        {quizzes.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 bg-card rounded-3xl border border-border mt-2">
            <BookOpen className="mx-auto text-muted-foreground mb-4" size={48} />
            <h2 className="text-xl font-bold text-foreground mb-2">
              لا توجد اختبارات بعد
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              ابدأ بإنشاء اختبار جديد أو استيراد اختبار مشارك
            </p>
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

                return (
                  <div
                    key={quiz.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-colors"
                  >
                    {/* Card body */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-foreground text-base leading-tight flex-1 min-w-0 truncate">
                          {quiz.name}
                        </h3>
                        {/* Desktop action buttons */}
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

                    {/* Mobile action bar */}
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
                  </div>
                );
              })}
            </div>

            {quizzes.length > 1 && (
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

      {/* ── Mobile FAB (New Quiz) ── */}
      <div className="sm:hidden fixed bottom-20 left-4 z-30">
        <button
          onClick={onCreateQuiz}
          className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity font-bold text-sm"
        >
          <Plus size={20} />
          اختبار جديد
        </button>
      </div>

      {/* Copy toast */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          تم نسخ الرابط!
        </div>
      )}

      {/* History Modal */}
      {historyQuiz && (
        <HistoryModal
          quizId={historyQuiz.id}
          quizName={historyQuiz.name}
          onClose={() => setHistoryQuiz(null)}
        />
      )}

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
