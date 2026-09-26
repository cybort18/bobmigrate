/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ibm: {
          blue: '#0f62fe',
          dark: '#0a0d14',
          surface: '#111827',
          card: '#1e293b',
          border: '#334155',
          purple: '#8a3ffc',
          cyan: '#06b6d4',
          emerald: '#10b981',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
