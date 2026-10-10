import type { Config } from "tailwindcss";

// Tailwind loads this file through jiti (CommonJS), so require is available here.
const animate = require("tailwindcss-animate");

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "hsl(var(--gold) / <alpha-value>)",
          deep: "hsl(var(--gold-deep) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 8px)",
        "2xl": "calc(var(--radius) + 16px)",
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.7) translateY(18px)" },
          "70%": { opacity: "1", transform: "scale(1.04) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // 新揭晓的中奖卡片亮一下金光，只放一次，不在台上循环闪
        "winner-glow": {
          "0%": { boxShadow: "0 0 0 0 hsl(42 70% 68% / 0)" },
          "35%": { boxShadow: "0 0 44px 6px hsl(42 78% 66% / 0.55)" },
          "100%": { boxShadow: "0 0 0 0 hsl(42 70% 68% / 0)" },
        },
      },
      animation: {
        "pop-in": "pop-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 320ms ease-out both",
        // 金光只在卡片入场时闪一次，之后保持静止，不在台上持续闪烁
        "reveal-card":
          "pop-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both, winner-glow 1100ms ease-out both",
      },
    },
  },
  plugins: [animate],
};

export default config;
