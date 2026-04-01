import React, { useState, useEffect } from "react";
import { Quiz, QuizResult } from "./types";
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

export default function App() {
  const [page, setPage] = useState<Page>({ name: "home" });

  // Check URL for import params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const single = params.get("import");
    const all = params.get("importAll");
    if (single) {
      setPage({ name: "import", encoded: single });
    } else if (all) {
      setPage({ name: "import", encodedAll: all });
    }
  }, []);

  function goHome() {
    // Clear import params from URL
    const url = window.location.pathname;
    window.history.replaceState({}, "", url);
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
            onFinish={(result) =>
              setPage({ name: "results", result, quiz: page.quiz })
            }
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
