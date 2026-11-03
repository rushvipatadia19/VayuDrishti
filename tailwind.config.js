/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#237a3b',
        'primary-hover': '#1b5e2d',
        accent: '#3aa347',
        tint: '#ecf9ee',
        'dark-accent': '#14532d',
        surface: '#ffffff',
        bg: '#f3f4f6',
        border: '#e5e7eb',
        'aqi-good': '#1a7a1a',
        'aqi-satisfactory': '#4caf50',
        'aqi-moderate': '#f59e0b',
        'aqi-poor': '#f97316',
        'aqi-very-poor': '#ef4444',
        'aqi-severe': '#7b0000',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

