/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      // Color tokens are defined in `assets/css/main.css` via Tailwind v4's
      // `@theme { --color-* }` directive, which also generates the utilities.
    },
  },
  plugins: [],
}
