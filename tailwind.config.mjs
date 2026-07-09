import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: '#2c2620',
        accent: '#b5623c',
        paper: '#faf7f2',
        sand: '#f1e9dd',
        'warm-border': '#e7ddcf',
        'warm-700': '#4a4238',
        'warm-600': '#5f5648',
        'warm-500': '#857a69',
        'warm-400': '#a89d8b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [typography],
};
