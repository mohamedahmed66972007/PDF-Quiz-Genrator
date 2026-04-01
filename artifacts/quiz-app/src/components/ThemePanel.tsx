import React from "react";
import { useTheme, COLORS } from "../context/ThemeContext";
import { ThemeColor } from "../types";
import { Moon, Sun, Palette, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

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

export default function ThemePanel() {
  const { theme, toggleMode, setColor, setAutoChange } = useTheme();

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
      {/* Mode toggle */}
      <button
        onClick={toggleMode}
        title={theme.mode === "dark" ? "وضع نهاري" : "وضع ليلي"}
        className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
      >
        {theme.mode === "dark" ? (
          <Sun size={18} className="text-yellow-400" />
        ) : (
          <Moon size={18} className="text-foreground" />
        )}
      </button>

      {/* Color picker */}
      <div className="group relative">
        <button
          title="تغيير اللون"
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
        >
          <Palette size={18} className="text-primary" />
        </button>
        <div className="absolute left-12 top-0 hidden group-hover:flex flex-col gap-1.5 bg-card border border-border rounded-xl p-2 shadow-lg min-w-[140px]">
          {(COLORS as ThemeColor[]).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-right w-full",
                theme.color === c
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent text-foreground"
              )}
            >
              <div
                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLOR_DOTS[c] }}
              />
              {COLOR_LABELS[c]}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => setAutoChange(!theme.autoChange)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-right transition-colors",
                theme.autoChange
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent text-muted-foreground"
              )}
            >
              <RefreshCw size={12} />
              تغيير تلقائي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
