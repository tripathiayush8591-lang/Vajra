/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        civic: "#1D4ED8",
        "civic-hover": "#1E40AF",
        "civic-soft": "#EFF6FF",
        "civic-border": "#BFDBFE",
        ok: "#059669",
        warn: "#D97706",
        crit: "#DC2626",
        ink: "#0F172A",
        muted: "#64748B",
        surface: "#FFFFFF",
        "surface-subtle": "#F8FAFC",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        cinematic: ["'Syncopate'", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 8px 20px -4px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
        drawer: "-4px 0 32px rgba(15, 23, 42, 0.12)",
        subtle: "0 2px 8px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
