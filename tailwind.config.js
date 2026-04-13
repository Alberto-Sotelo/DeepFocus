/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backdropBlur: {
        xs: "2px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "40px",
      },
      animation: {
        "breath-in": "breathe 4s ease-in-out infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.5)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};