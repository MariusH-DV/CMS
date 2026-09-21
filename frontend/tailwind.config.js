/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#b8d0ff',
          300: '#8ab0ff',
          400: '#5a8bff',
          500: '#3366ff',
          600: '#254edb',
          700: '#1c3cad',
          800: '#1a3389',
          900: '#1b2e6e',
        },
      },
    },
  },
  plugins: [],
};
