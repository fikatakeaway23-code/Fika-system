/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:      '#6BCB77',
        'primary-light': '#C6F6D5',
        'primary-dark':  '#4AAD56',
        secondary:    '#2D6A4F',
        'secondary-light': '#4A9470',
        surface:      '#F7F9F7',
        danger:       '#E53E3E',
        warning:      '#F6AD55',
        success:      '#6BCB77',
        muted:        '#718096',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
