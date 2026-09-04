/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        surface: {
          bg: 'var(--surface-bg)',
          panel: 'var(--surface-panel)',
          subtle: 'var(--surface-subtle)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
        },
        text: {
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          base: 'var(--border-base)',
          focus: 'var(--border-focus)',
        },
        action: {
          'primary-bg': 'var(--action-primary-bg)',
          'primary-text': 'var(--action-primary-text)',
          'primary-hover': 'var(--action-primary-hover)',
          'secondary-bg': 'var(--action-secondary-bg)',
          'secondary-text': 'var(--action-secondary-text)',
          'secondary-hover': 'var(--action-secondary-hover)',
        },
        status: {
          active: 'var(--status-active)',
          'active-bg': 'var(--status-active-bg)',
          danger: 'var(--status-danger)',
          'danger-bg': 'var(--status-danger-bg)',
        },
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};
