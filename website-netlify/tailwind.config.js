/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        agri: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 500: "#16a34a", 600: "#15803d", 700: "#1e3a2f", 900: "#0f1419" },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Playfair Display", "serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
