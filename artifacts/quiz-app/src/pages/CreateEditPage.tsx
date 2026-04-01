import React, { useState, useRef, useCallback } from "react";
import { Quiz, WordEntry, QuizSettings, QuizType, GradingMode } from "../types";
import { parsePdfFile } from "../lib/pdf-parser";
import { saveQuiz } from "../lib/storage";
import { nanoid } from "../lib/utils";
import { splitMeanings } from "../lib/arabic";
import {
  ArrowRight,
  Upload,
  Plus,
  Trash2,
  Save,
  FileText,
  Loader2,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "../lib/utils";

interface CreateEditPageProps {
  existingQuiz?: Quiz;
  onBack: () => void;
  onSaved: (quiz: Quiz) => void;
}

const DEFAULT_SETTINGS: QuizSettings = {
  type: "mcq",
  shuffleQuestions: true,
  shuffleChoices: true,
  gradingMode: "final",
  wordCount: 250,
};

export default function CreateEditPage({
  existingQuiz,
  onBack,
  onSaved,
}: CreateEditPageProps) {
  const [name, setName] = useState(existingQuiz?.name ?? "");
  const [words, setWords] = useState<WordEntry[]>(existingQuiz?.words ?? []);
  const [settings, setSettings] = useState<QuizSettings>(
    existingQuiz?.settings ?? DEFAULT_SETTINGS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = useCallback(async (file: File) => {
    if (!file.type.includes("pdf")) {
      setError("يرجى رفع ملف PDF فقط");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const extracted = await parsePdfFile(file);
      if (extracted.length === 0) {
        setError(
          "لم يتم العثور على كلمات في الملف. تأكد من أن الملف يحتوي على كلمات إنجليزية ومعاني عربية."
        );
      } else {
        setWords((prev) => {
          const existingWords = new Set(prev.map((w) => w.word.toLowerCase()));
          const newWords = extracted.filter(
            (w) => !existingWords.has(w.word.toLowerCase())
          );
          return [...prev, ...newWords];
        });
        if (!name && extracted.length > 0) {
          setName(file.name.replace(".pdf", "").replace(/[_-]/g, " "));
        }
      }
    } catch (e) {
      setError("حدث خطأ أثناء قراءة الملف");
    } finally {
      setLoading(false);
    }
  }, [name]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
  }

  function addWord() {
    const id = nanoid();
    setWords((prev) => [...prev, { id, word: "", meanings: [""] }]);
    setExpandedIds((prev) => new Set([...prev, id]));
  }

  function updateWord(id: string, word: string) {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, word } : w)));
  }

  function updateMeaning(wordId: string, idx: number, value: string) {
    setWords((prev) =>
      prev.map((w) => {
        if (w.id !== wordId) return w;
        const meanings = [...w.meanings];
        meanings[idx] = value;
        return { ...w, meanings };
      })
    );
  }

  function addMeaning(wordId: string) {
    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId ? { ...w, meanings: [...w.meanings, ""] } : w
      )
    );
  }

  function removeMeaning(wordId: string, idx: number) {
    setWords((prev) =>
      prev.map((w) => {
        if (w.id !== wordId) return w;
        const meanings = w.meanings.filter((_, i) => i !== idx);
        return { ...w, meanings: meanings.length > 0 ? meanings : [""] };
      })
    );
  }

  function removeWord(id: string) {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) {
      setError("يرجى إدخال اسم للاختبار");
      return;
    }
    if (words.length === 0) {
      setError("يرجى إضافة كلمات للاختبار");
      return;
    }
    const validWords = words.filter(
      (w) => w.word.trim() && w.meanings.some((m) => m.trim())
    );
    if (validWords.length === 0) {
      setError("لا توجد كلمات صالحة");
      return;
    }

    const quiz: Quiz = {
      id: existingQuiz?.id ?? nanoid(),
      name: name.trim(),
      words: validWords.map((w) => ({
        ...w,
        word: w.word.trim(),
        meanings: w.meanings.filter((m) => m.trim()),
      })),
      settings: {
        ...settings,
        wordCount: Math.min(settings.wordCount, validWords.length),
      },
      createdAt: existingQuiz?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    saveQuiz(quiz);
    onSaved(quiz);
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight size={18} />
            العودة
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
          >
            <Save size={16} />
            حفظ الاختبار
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6">
          {existingQuiz ? "تعديل الاختبار" : "إنشاء اختبار جديد"}
        </h1>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">اسم الاختبار</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: Unit 7 – Long Lives"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* PDF Upload */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mb-6 border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-card"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={36} />
              <p className="text-muted-foreground">جاري استخراج الكلمات...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="text-muted-foreground" size={36} />
              <div>
                <p className="font-medium text-foreground">
                  اسحب ملف PDF هنا أو انقر للاختيار
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  يدعم ملفات المفردات الإنجليزية-العربية
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Settings */}
        <div className="mb-6 bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">إعدادات الاختبار</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Quiz type */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">
                نوع الاختبار
              </label>
              <div className="flex rounded-lg overflow-hidden border border-border">
                {(["mcq", "essay"] as QuizType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setSettings((s) => ({ ...s, type: t }))
                    }
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      settings.type === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-accent"
                    )}
                  >
                    {t === "mcq" ? "اختيار متعدد" : "مقالي"}
                  </button>
                ))}
              </div>
            </div>

            {/* Grading mode */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">
                طريقة التصحيح
              </label>
              <div className="flex rounded-lg overflow-hidden border border-border">
                {(["immediate", "final"] as GradingMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() =>
                      setSettings((s) => ({ ...s, gradingMode: m }))
                    }
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      settings.gradingMode === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-accent"
                    )}
                  >
                    {m === "immediate" ? "فوري" : "نهائي"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
              {[
                {
                  key: "shuffleQuestions",
                  label: "ترتيب عشوائي للأسئلة",
                },
                ...(settings.type === "mcq"
                  ? [{ key: "shuffleChoices", label: "ترتيب عشوائي للاختيارات" }]
                  : []),
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        [key]: !s[key as keyof QuizSettings],
                      }))
                    }
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors",
                      (settings as Record<string, unknown>)[key]
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                        (settings as Record<string, unknown>)[key]
                          ? "right-0.5"
                          : "left-0.5"
                      )}
                    />
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              ))}
          </div>
        </div>

        {/* Words List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              الكلمات ({words.length})
            </h2>
            <button
              onClick={addWord}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <Plus size={14} />
              إضافة كلمة
            </button>
          </div>

          {words.map((word, idx) => (
            <div
              key={word.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                <span className="text-muted-foreground text-sm w-6 text-center">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={word.word}
                  onChange={(e) => updateWord(word.id, e.target.value)}
                  placeholder="English word"
                  className="flex-1 bg-transparent text-foreground font-medium focus:outline-none"
                  dir="ltr"
                />
                <span className="text-muted-foreground text-sm">
                  {word.meanings.filter(Boolean).join(" • ")}
                </span>
                <button
                  onClick={() => toggleExpand(word.id)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedIds.has(word.id) ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                <button
                  onClick={() => removeWord(word.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {expandedIds.has(word.id) && (
                <div className="border-t border-border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    المعاني (يمكن إضافة أكثر من معنى):
                  </p>
                  {word.meanings.map((meaning, midx) => (
                    <div key={midx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={meaning}
                        onChange={(e) =>
                          updateMeaning(word.id, midx, e.target.value)
                        }
                        placeholder={`المعنى ${midx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {word.meanings.length > 1 && (
                        <button
                          onClick={() => removeMeaning(word.id, midx)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addMeaning(word.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                  >
                    <Plus size={12} />
                    إضافة معنى آخر
                  </button>
                </div>
              )}
            </div>
          ))}

          {words.length > 0 && (
            <button
              onClick={addWord}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              إضافة كلمة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
