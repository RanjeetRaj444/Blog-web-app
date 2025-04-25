/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f8f5f2',
          100: '#f1eae0',
          200: '#e3d5c1',
          300: '#d3b99d',
          400: '#c49a76',
          500: '#b78154',
          600: '#a96a44',
          700: '#8c5339',
          800: '#734433',
          900: '#5f392c',
          950: '#331d16',
        },
        secondary: {
          50: '#f9f6f1',
          100: '#f4eee3',
          200: '#e5d9c0',
          300: '#d7bd96',
          400: '#c79d68',
          500: '#bc8446',
          600: '#ad723e',
          700: '#905a34',
          800: '#774832',
          900: '#633c2d',
          950: '#351e16',
        },
        accent: {
          50: '#fff9ed',
          100: '#ffefd0',
          200: '#ffdca0',
          300: '#ffc366',
          400: '#ffa836',
          500: '#ff8c10',
          600: '#fa6f06',
          700: '#cc5207',
          800: '#a2400e',
          900: '#83360f',
          950: '#471a05',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 6px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};