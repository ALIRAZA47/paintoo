import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-deep": "var(--bg-deep)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-4": "var(--ink-4)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        "accent-dim": "var(--accent-dim)",
        danger: "var(--danger)",
        "canvas-bg": "var(--canvas-bg)",
        "check-a": "var(--check-a)",
        "check-b": "var(--check-b)",
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
