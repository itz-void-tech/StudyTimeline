/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          hover: 'var(--bg-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: 'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        importance: {
          critical: 'var(--importance-critical)',
          'very-important': 'var(--importance-very-important)',
          important: 'var(--importance-important)',
          useful: 'var(--importance-useful)',
          optional: 'var(--importance-optional)',
        },
      },
    },
  },
  plugins: [],
}
