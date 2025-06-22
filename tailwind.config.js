// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // for app directory
    "./pages/**/*.{js,ts,jsx,tsx}", // for pages directory
    "./components/**/*.{js,ts,jsx,tsx}", // for your components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}