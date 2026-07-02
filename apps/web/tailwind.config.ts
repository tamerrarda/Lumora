import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface layers — warm cream / off-white light theme
        base: "#f7f3e9", // page background (cream / off-white)
        panel: "#ffffff", // card — pops clean white on cream
        surface: "#f2eee2", // input / inner surface / subtle grid (warm)
        line: "#e7e0d0", // borders & dividers (warm)
        ink: "#ffffff", // text/icon ON lilac buttons (white)
        // Brand — dusty mauve (primary)
        accent: {
          DEFAULT: "#726a86",
          dark: "#5d566e", // hover / active
          soft: "rgba(114,106,134,0.12)",
          ring: "rgba(114,106,134,0.32)",
        },
        // Brand — Yellow (energetic secondary accent; pair with black text)
        yellow: {
          DEFAULT: "#ffc83d",
          dark: "#ebb22a", // hover
          soft: "rgba(255,200,61,0.20)",
        },
        navy: "#3e63dd", // links / secondary nav accents
        // Status
        amber: {
          DEFAULT: "#b48200", // warning / pending
          soft: "rgba(180,130,0,0.12)",
        },
        success: {
          DEFAULT: "#2f8155",
          soft: "rgba(47,129,85,0.12)",
        },
        danger: {
          DEFAULT: "#cb2a2f",
          soft: "rgba(203,42,47,0.10)",
        },
        // Text
        fg: "#15151a", // primary — near-black
        muted: "#6e6a60", // secondary — warm gray
        faint: "#9c988c", // muted — placeholders / hints
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(21,21,26,0.04), 0 1px 3px rgba(21,21,26,0.05)",
        glow: "0 0 0 1px rgba(114,106,134,0.25), 0 10px 30px -12px rgba(114,106,134,0.32)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
