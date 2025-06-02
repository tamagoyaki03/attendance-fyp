/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,html,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          background: "#121212",
          foreground: "#f4f4f5",
        },
        secondary: {
          background: "#18181b",
          foreground: "#fafafa",
        },
        accent: {
          background: "#27272a",
          foreground: "#a1a1aa",
        },
        success: {
          background: "#22c55e",
          foreground: "#18181b",
        },
        dark: {
          background: "#09090b",
          foreground: "#fafafa",
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'custom': '0px 1px 2px rgba(0,0,0,0.05)',
        'custom-dark': '0px 2px 5px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
