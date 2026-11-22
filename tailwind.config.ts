import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Verde iOS (systemGreen) — folosit cu măsură, doar pentru acțiuni și progres.
        brand: {
          50: "#ecfbf0", 100: "#d3f5dc", 200: "#a9eab9", 300: "#74db8e", 400: "#4cd268",
          500: "#34c759", 600: "#28a745", 700: "#248a3d", 800: "#1d6e31", 900: "#155224",
        },
        ink: { DEFAULT: "#1d1d1f", 2: "#6e6e73", 3: "#aeaeb2" },
        surface: { DEFAULT: "#f5f5f7", 2: "#e8e8ed" },
        warm: { 400: "#fdb022", 500: "#f79009", 600: "#dc6803" },
        coral: { 400: "#fd853a", 500: "#f97066", 600: "#e04f16" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      borderRadius: { "2xl": "1.125rem", "3xl": "1.5rem" },
      boxShadow: { card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)" },
    },
  },
  plugins: [],
};
export default config;
