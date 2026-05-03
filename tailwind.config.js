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
      colors: {
        background: '#F4F2EE',
        card: '#FAF8F4',
        'card-border': '#E7E2DA',
        'text-main': '#2B2B2B',
        'text-secondary': '#6B6B6B',
        'text-weak': '#9A9A9A',
        accent: '#4B5B6B',
        'accent-hover': '#3F4E5D',
        'status-available': '#7C8B7A',
        'status-registered': '#7A7F8C',
        'status-expiring': '#A08C7C',
        'status-dropping': '#8C6F6F',
        'status-unknown': '#8A8780',
      }
    },
  },
  plugins: [],
}
