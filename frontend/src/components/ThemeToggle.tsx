import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Day Mode" : "Switch to Pitch Black Night Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Pitch Black Night Mode"}
      className={`group relative flex items-center gap-2 p-2.5 rounded-2xl transition-all duration-300 transform active:scale-95 focus:outline-none ${
        isDark
          ? "bg-black/85 text-amber-300 border border-white/20 shadow-[0_0_25px_rgba(139,92,246,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(251,191,36,0.35)]"
          : "liquid-tab-item text-slate-700 hover:text-blue-600 hover:bg-white/95 shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-5 h-5 text-amber-300 transition-all duration-500 transform group-hover:-rotate-12 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500 transition-all duration-500 transform group-hover:rotate-90 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-bold whitespace-nowrap pr-1">
          {isDark ? "Night Mode" : "Light Mode"}
        </span>
      )}

      {/* Subtle indicator beacon */}
      <span
        className={`w-2 h-2 rounded-full absolute -top-1 -right-1 shadow-xs transition-colors ${
          isDark
            ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)] animate-pulse"
            : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
        }`}
      />
    </button>
  );
}

/**
 * Floating corner button pinned to the bottom-right corner of the screen
 */
export function FloatingCornerThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-[80] group flex items-center gap-2">
      {/* Tooltip on hover */}
      <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl border backdrop-blur-md transition-all ${
            isDark
              ? "bg-black/90 text-slate-200 border-white/20 shadow-black/80"
              : "bg-white/90 text-slate-800 border-slate-200/80 shadow-slate-900/10"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isDark ? "Pitch Black Active • Switch to Light" : "Switch to Pitch Black Night"}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to Day Mode" : "Switch to Pitch Black Night Mode"}
        className={`p-3.5 rounded-full transition-all duration-300 transform active:scale-90 hover:scale-110 shadow-2xl flex items-center justify-center cursor-pointer border ${
          isDark
            ? "bg-black text-amber-300 border-white/25 shadow-[0_0_30px_rgba(139,92,246,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.25)] hover:border-amber-400/80 hover:shadow-[0_0_35px_rgba(251,191,36,0.45)]"
            : "liquid-glass text-slate-800 border-white/95 shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30"
        }`}
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          {isDark ? (
            <Moon className="w-6 h-6 text-amber-300 transition-all duration-500 transform group-hover:-rotate-45 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          ) : (
            <Sun className="w-6 h-6 text-amber-500 transition-all duration-500 transform group-hover:rotate-180 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          )}
        </div>
      </button>
    </div>
  );
}
