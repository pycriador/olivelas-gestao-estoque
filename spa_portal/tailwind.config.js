/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--portal-primary, #16a34a)',
          accent: 'var(--portal-accent, #f59e0b)',
        },
      },
    },
  },
  plugins: [],
}
