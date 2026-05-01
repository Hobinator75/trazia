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
          light: '#F9FAFB',
        },
        surface: {
          dark: '#111827',
          light: '#FFFFFF',
        },
        border: {
          dark: '#1F2937',
          light: '#E5E7EB',
        },
        text: {
          light: '#F9FAFB',
          muted: '#9CA3AF',
          dark: '#0A0E1A',
          'muted-light': '#4B5563',
        },
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
