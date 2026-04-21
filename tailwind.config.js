/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d9eeff",
          200: "#bce0ff",
          300: "#8bc9ff",
          400: "#52a8ff",
          500: "#2a84ff",
          600: "#1166f5",
          700: "#0f4fdc",
          800: "#1442b2",
          900: "#173d8c"
        }
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        display: ["Sora", "Manrope", "sans-serif"]
      },
      boxShadow: {
        panel: "0 18px 35px -15px rgba(17, 61, 131, 0.45)"
      }
    }
  },
  plugins: []
};