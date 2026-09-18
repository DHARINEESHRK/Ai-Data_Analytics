/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4fe',
          200: '#bfd0fd',
          300: '#93b4fd',
          400: '#608dfa',
          500: '#3b66f5',
          600: '#2547eb',
          700: '#1d34d8',
          800: '#1e2cb0',
          900: '#1e298a',
          950: '#171c54',
        },
        sidebar: {
          light: '#f8fafc',
          dark: '#090d16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
