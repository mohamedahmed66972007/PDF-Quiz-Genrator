import React, { useState, useEffect } from "react";
import { Quiz } from "../types";
import { decodeQuizFromUrl, decodeAllQuizzesFromUrl } from "../lib/share";
import { saveQuiz } from "../lib/storage";
import { nanoid } from "../lib/utils";
import { ArrowRight, Download, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface ImportPageProps {
  onBack: () => void;
  initialEncoded?: string;
  initialEncodedAll?: string;
}

export default function ImportPage({
  onBack,
  initialEncoded,
  initialEncodedAll,
}: ImportPageProps) {
  const [input, setInput] = useState("");
  const [importedQuizzes, setImportedQuizzes] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (initialEncoded) {
      const quiz = decodeQuizFromUrl(initialEncoded);
      if (quiz) {
        setImportedQuizzes([quiz]);
        setSelected(new Set([quiz.id]));
      }
    } else if (initialEncodedAll) {
      const quizzes = decodeAllQuizzesFromUrl(initialEncodedAll);
      if (quizzes) {
        setImportedQuizzes(quizzes);
        setSelected(new Set(quizzes.map((q) => q.id)));
      }
    }
  }, [initialEncoded, initialEncodedAll]);

  function handleParse() {
    setError("");
    try {
      const url = new URL(input.trim());
      const single = url.searchParams.get("import");
      const all = url.searchParams.get("importAll");

      if (single) {
        const quiz = decodeQuizFromUrl(single);
        if (!quiz) throw new Error("رابط غير صالح");
        setImportedQuizzes([quiz]);
        setSelected(new Set([quiz.id]));
      } else if (all) {
        const quizzes = decodeAllQuizzesFromUrl(all);
        if (!quizzes) throw new Error("رابط غير صالح");
        setImportedQuizzes(quizzes);
        setSelected(new Set(quizzes.map((q) => q.id)));
      } else {
        setError("الرابط لا يحتوي على بيانات اختبار صالحة");
      }
    } catch {
      setError("الرجاء إدخال رابط صالح");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleImport() {
    const toImport = importedQuizzes.filter((q) => selected.has(q.id));
    for (const quiz of toImport) {
      saveQuiz({ ...quiz, id: nanoid() });
    }
    setImported(true);
    setTimeout(onBack, 1500);
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowRight size={18} />
          العودة
        </button>

        <h1 className="text-2xl font-bold mb-6">استيراد اختبار</h1>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            الصق رابط المشاركة
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
            <button
              onClick={handleParse}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
            >
              تحميل
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {importedQuizzes.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-semibold text-foreground">
              اختر الاختبارات للاستيراد:
            </h2>
            {importedQuizzes.map((quiz) => (
              <label
                key={quiz.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                  selected.has(quiz.id)
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(quiz.id)}
                  onChange={() => toggleSelect(quiz.id)}
                  className="w-4 h-4 accent-primary"
                />
                <div className="flex-1">
                  <div className="font-medium">{quiz.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {quiz.words.length} كلمة •{" "}
                    {quiz.settings.type === "mcq" ? "اختيار من متعدد" : "مقالي"}
                  </div>
                </div>
              </label>
            ))}

            <button
              onClick={handleImport}
              disabled={selected.size === 0 || imported}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
                imported
                  ? "bg-green-500 text-white"
                  : selected.size === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              {imported ? (
                <>
                  <Check size={18} />
                  تم الاستيراد!
                </>
              ) : (
                <>
                  <Download size={18} />
                  استيراد {selected.size} اختبار
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
