/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#F97316',
        ocean: '#06B6D4',
        background: {
          dark: '#0A0E1A',
        },
        surface: {
          dark: '#111827',
        },
        text: {
          light: '#F9FAFB',
          muted: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
