/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './extension/index.html',
    './App.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

