/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // "ink" is the app shell surface; in the light theme it maps to a
        // near-white canvas and pure white panels (kept under the old name
        // so existing classes keep working).
        ink: {
          950: "#f1f5f9",
          900: "#ffffff",
          850: "#ffffff",
          800: "#f8fafc",
        },
        // "aurora" is the accent scale — now sky blue.
        aurora: {
          300: "#0284c7",
          400: "#0ea5e9",
          500: "#0284c7",
          600: "#0369a1",
        },
        mint: "#059669",
        amber: "#d97706",
        rose: {
          DEFAULT: "#e11d48",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
        },
      },
      boxShadow: {
        glass: "0 12px 40px rgba(2, 132, 199, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)",
        "glow-sm": "0 4px 16px rgba(14, 165, 233, 0.30)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};
