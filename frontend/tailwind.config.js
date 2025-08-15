/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}", // no ts/tsx since using JS
  ],
  theme: {
    extend: {
      fontSize: {
        sm: '0.9rem', // default is 0.875rem
        base: '1rem', // default is 1rem
      },
    },
  },
  plugins: [],
}
