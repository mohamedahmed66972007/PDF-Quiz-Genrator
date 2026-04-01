import React, { useState, useRef, useEffect } from "react";
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
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!colorPickerOpen) return;
    function handleOutside(e: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [colorPickerOpen]);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2 sm:flex-col sm:top-4 sm:bottom-auto">
      {/* Mode toggle */}
      <button
        onClick={toggleMode}
        title={theme.mode === "dark" ? "وضع نهاري" : "وضع ليلي"}
        className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center transition-colors shadow-sm active:scale-95"
      >
        {theme.mode === "dark" ? (
          <Sun size={18} className="text-yellow-400" />
        ) : (
          <Moon size={18} className="text-foreground" />
        )}
      </button>

      {/* Color picker */}
      <div className="relative" ref={colorPickerRef}>
        <button
          onClick={() => setColorPickerOpen((v) => !v)}
          title="تغيير اللون"
          className={cn(
            "w-10 h-10 rounded-xl bg-card border flex items-center justify-center transition-colors shadow-sm active:scale-95",
            colorPickerOpen ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          <Palette size={18} className="text-primary" />
        </button>

        {colorPickerOpen && (
          <div
            className="
              absolute left-12 bottom-0
              sm:left-12 sm:bottom-auto sm:top-0
              flex flex-col gap-1.5
              bg-card border border-border rounded-xl p-2 shadow-lg min-w-[140px]
              z-50
            "
          >
            {(COLORS as ThemeColor[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setColorPickerOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right w-full",
                  theme.color === c
                    ? "bg-primary/10 text-primary"
                    : "active:bg-accent text-foreground sm:hover:bg-accent"
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
                    : "text-muted-foreground sm:hover:bg-accent active:bg-accent"
                )}
              >
                <RefreshCw size={12} />
                تغيير تلقائي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
