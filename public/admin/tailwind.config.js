export default {
  content: [
    "./*.html",
    "./src/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark-primary': '#0C0C0C',
        'brand-dark-secondary': '#1A1A1A',
        'brand-accent': '#E7762E',
        'brand-accent-hover': '#F97316',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
