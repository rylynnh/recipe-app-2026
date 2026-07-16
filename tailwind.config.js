/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F6F2',
        card: '#FFFFFF',
        primary: '#232323',
        secondary: '#7C7C7C',
        divider: '#E9E6DF',
        accent: '#3E4B3C',
        'accent-tint': '#D9E0D8',
        danger: '#7A3B3B',
      },
      fontFamily: {
        display: ['"New York"', 'Georgia', '"Songti SC"', 'serif'],
        sans: ['-apple-system', '"SF Pro"', '"PingFang SC"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        input: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
