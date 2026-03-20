import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SPZ – Dunkelgrün, Dunkelgrau, Korall
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#1B4332", // Dunkelgrün – Hauptakzent
          600: "#163a2b",
          700: "#122e22",
          800: "#0d221a",
          900: "#091611",
          950: "#040b08",
        },
        landhaus: {
          // Dunkelgrün als Hauptfarbe
          green: "#1B4332",         // Tiefes Dunkelgrün
          "green-light": "#2D6A4F", // Etwas helleres Grün (Hover)
          // Korall als Akzentfarbe (ersetzt Gold)
          gold: "#FF6B6B",          // Korall
          "gold-light": "#FF8585",  // Helles Korall (Hover)
          // Grautöne statt Braun/Creme
          cream: "#F3F4F6",         // Helles Grau (Hintergrund)
          "cream-dark": "#D1D5DB",  // Mittleres Grau (Borders)
          brown: "#1F2937",         // Dunkelgrau (Text)
          "brown-light": "#6B7280", // Mittelgrau (Sekundärtext)
          burgundy: "#DC2626",      // Rot (Fehler/Destruktiv)
          ivory: "#FFFFFF",         // Weiß
        },
        christmas: {
          red: "#FF6B6B",        // Korall
          green: "#1B4332",      // Dunkelgrün
          gold: "#FF6B6B",       // Korall
          dark: "#1F2937",       // Dunkelgrau
        },
        coral: {
          DEFAULT: "#FF6B6B",    // Hauptkorall
          light: "#FF8585",      // Hell-Korall
          dark: "#E85555",       // Dunkel-Korall
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      gridTemplateColumns: {
        "15": "repeat(15, minmax(0, 1fr))",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
