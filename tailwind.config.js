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
        danger: '#C41E3A',
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        input: '10px',
      },
    },
  },
  plugins: [],
}
