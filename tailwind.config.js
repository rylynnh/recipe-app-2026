/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F2EC',
        card: '#FCFBF8',
        primary: '#1C1C1B',
        secondary: '#716E68',
        divider: '#DED9D0',
        accent: '#A68C62',
        'accent-tint': '#EEE6D8',
        danger: '#7A3B3B',
      },
      fontFamily: {
        display: ['"New York"', 'Georgia', '"Songti SC"', 'serif'],
        sans: ['-apple-system', '"SF Pro"', '"PingFang SC"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '4px',
        input: '4px',
      },
      boxShadow: {
        card: 'none',
        'card-hover': 'none',
      },
    },
  },
  plugins: [],
}
