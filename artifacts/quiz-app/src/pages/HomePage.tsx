import React, { useState } from "react";
import { Quiz } from "../types";
import { loadQuizzes, deleteQuiz } from "../lib/storage";
import { encodeQuizToUrl, encodeAllQuizzesToUrl, copyToClipboard } from "../lib/share";
import { cn } from "../lib/utils";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Share2,
  Play,
  Users,
  AlertTriangle,
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="text-primary" size={32} />
              مولّد الاختبارات
            </h1>
            <p className="text-muted-foreground mt-1">
              ارفع ملف PDF لإنشاء اختبارات تفاعلية
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors text-sm"
            >
              <Share2 size={16} />
              استيراد
            </button>
            <button
              onClick={onCreateQuiz}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium text-sm"
            >
              <Plus size={16} />
              اختبار جديد
            </button>
          </div>
        </div>

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <BookOpen className="mx-auto text-muted-foreground mb-4" size={48} />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              لا توجد اختبارات بعد
            </h2>
            <p className="text-muted-foreground mb-6">
              ابدأ بإنشاء اختبار جديد أو استيراد اختبار مشارك
            </p>
            <button
              onClick={onCreateQuiz}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
            >
              <Plus size={18} />
              إنشاء اختبار جديد
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg truncate">
                      {quiz.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{quiz.words.length} كلمة</span>
                      <span>•</span>
                      <span>
                        {quiz.settings.type === "mcq"
                          ? "اختيار من متعدد"
                          : "مقالي"}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(quiz.updatedAt).toLocaleDateString("ar")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleShare(quiz)}
                      title="مشاركة"
                      className={cn(
                        "p-2 rounded-lg border border-border hover:bg-accent transition-colors",
                        copied === quiz.id && "border-green-500 text-green-500"
                      )}
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => onEditQuiz(quiz)}
                      title="تعديل"
                      className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(quiz.id)}
                      title="حذف"
                      className="p-2 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => onStartQuiz(quiz)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      <Play size={15} />
                      ابدأ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {quizzes.length > 1 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleShareAll}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm",
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

        {copied && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 transition-all">
            تم نسخ الرابط!
          </div>
        )}
      </div>

      {/* Custom delete confirmation dialog */}
      <AlertDialog.Root
        open={deleteTargetId !== null}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content
            dir="rtl"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="text-destructive" size={20} />
              </div>
              <div>
                <AlertDialog.Title className="text-lg font-bold text-foreground mb-1">
                  حذف الاختبار
                </AlertDialog.Title>
                <AlertDialog.Description className="text-muted-foreground text-sm leading-relaxed">
                  هل أنت متأكد من حذف اختبار{" "}
                  <span className="font-semibold text-foreground">
                    "{deleteTargetName}"
                  </span>
                  ؟ لا يمكن التراجع عن هذا الإجراء.
                </AlertDialog.Description>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className="px-5 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors text-sm font-medium">
                  إلغاء
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2 rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity text-sm font-medium"
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
