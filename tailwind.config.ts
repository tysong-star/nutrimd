import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf3", 100: "#d1fadf", 200: "#a6f4c5", 300: "#6ce9a6", 400: "#32d583",
          500: "#12b76a", 600: "#039855", 700: "#027a48", 800: "#05603a", 900: "#054f31",
        },
        warm: { 400: "#fdb022", 500: "#f79009", 600: "#dc6803" },
        coral: { 400: "#fd853a", 500: "#f97066", 600: "#e04f16" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
    },
  },
  plugins: [],
};
export default config;
