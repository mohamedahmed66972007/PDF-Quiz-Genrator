import React, { useState, useEffect } from "react";
import { Quiz, QuizResult } from "./types";
import { saveResult, getQuizById } from "./lib/storage";
import { ThemeProvider } from "./context/ThemeContext";
import ThemePanel from "./components/ThemePanel";
import HomePage from "./pages/HomePage";
import CreateEditPage from "./pages/CreateEditPage";
import QuizPage from "./pages/QuizPage";
import ResultsPage from "./pages/ResultsPage";
import ImportPage from "./pages/ImportPage";

type Page =
  | { name: "home" }
  | { name: "create" }
  | { name: "edit"; quiz: Quiz }
  | { name: "quiz"; quiz: Quiz }
  | { name: "results"; result: QuizResult; quiz: Quiz }
  | { name: "import"; encoded?: string; encodedAll?: string };

const SESSION_KEY = "quiz_app_current_page";

type SavedSession =
  | { page: "home" }
  | { page: "create" }
  | { page: "edit"; quizId: string }
  | { page: "quiz"; quizId: string }
  | { page: "import" };

function saveSession(page: Page) {
  try {
    if (page.name === "quiz") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ page: "quiz", quizId: page.quiz.id }));
    } else if (page.name === "edit") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ page: "edit", quizId: page.quiz.id }));
    } else if (page.name === "create") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ page: "create" }));
    } else if (page.name === "import") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ page: "import" }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

function restoreSession(): Page | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    if (data.page === "quiz") {
      const quiz = getQuizById(data.quizId);
      if (quiz) return { name: "quiz", quiz };
    } else if (data.page === "edit") {
      const quiz = getQuizById(data.quizId);
      if (quiz) return { name: "edit", quiz };
    } else if (data.page === "create") {
      return { name: "create" };
    } else if (data.page === "import") {
      return { name: "import" };
    }
    return null;
  } catch {
    return null;
  }
}

function getInitialPage(): Page {
  const params = new URLSearchParams(window.location.search);
  const single = params.get("import");
  const all = params.get("importAll");
  if (single) return { name: "import", encoded: single };
  if (all) return { name: "import", encodedAll: all };

  const restored = restoreSession();
  if (restored) return restored;

  return { name: "home" };
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);

  useEffect(() => {
    saveSession(page);
  }, [page]);

  function goHome() {
    const url = window.location.pathname;
    window.history.replaceState({}, "", url);
    sessionStorage.removeItem(SESSION_KEY);
    setPage({ name: "home" });
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <ThemePanel />

        {page.name === "home" && (
          <HomePage
            onCreateQuiz={() => setPage({ name: "create" })}
            onEditQuiz={(quiz) => setPage({ name: "edit", quiz })}
            onStartQuiz={(quiz) => setPage({ name: "quiz", quiz })}
            onImport={() => setPage({ name: "import" })}
          />
        )}

        {page.name === "create" && (
          <CreateEditPage
            onBack={goHome}
            onSaved={goHome}
          />
        )}

        {page.name === "edit" && (
          <CreateEditPage
            existingQuiz={page.quiz}
            onBack={goHome}
            onSaved={goHome}
          />
        )}

        {page.name === "quiz" && (
          <QuizPage
            quiz={page.quiz}
            onBack={goHome}
            onFinish={(result) => {
              saveResult(result);
              setPage({ name: "results", result, quiz: page.quiz });
            }}
          />
        )}

        {page.name === "results" && (
          <ResultsPage
            result={page.result}
            onRetry={() =>
              setPage({ name: "quiz", quiz: page.quiz })
            }
            onHome={goHome}
          />
        )}

        {page.name === "import" && (
          <ImportPage
            onBack={goHome}
            initialEncoded={page.encoded}
            initialEncodedAll={page.encodedAll}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
