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
        navy: {
          950: '#070A0F',
          900: '#0B0F19',
          850: '#0F1524',
          800: '#141C2E',
          750: '#192339',
          700: '#1F2C47',
          600: '#2A3B5F',
          500: '#3B4E7A',
        },
        electric: {
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
        risk: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#EAB308',
          low: '#10B981',
          info: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

