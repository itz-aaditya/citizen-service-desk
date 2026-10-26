/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        divider: 'var(--divider)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        ink: 'var(--ink)',
        'on-ink': 'var(--on-ink)',
        alert: 'var(--alert)',
        late: 'var(--late)',
        'due-soon': 'var(--due-soon)',
        'on-track': 'var(--on-track)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        none: 'none',
      }
    },
  },
  plugins: [],
}
