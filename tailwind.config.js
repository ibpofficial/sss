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
        darkBg: '#0B1020',
        elevatedCard: '#121A2B',
        cardBorder: '#1E293B',
        electricBlue: '#3B82F6',
        electricBlueHover: '#2563EB',
        accentCyan: '#06B6D4',
        profitGreen: '#10B981',
        lossRed: '#EF4444',
        warningYellow: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
