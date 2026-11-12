import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // Koyu tema (Kasım 2026): zemin Otomotiv İnsanı'nın koyu kahvesi, yazı kırık beyaz/bej.
      // Adlar eski açık temadan kaldı: ink = ana yazı rengi, paper = sayfa zemini.
      colors: {
        // Üst şerit (logo + menü) açık kalır; logo beyaz zemin için çizildi.
        serit: { zemin: '#faf7f2', cizgi: '#e7ddcf', metin: '#5f5648', vurgu: '#a5532f' },
        ink: '#faf7f2',
        accent: '#e8a07a',
        // Mavi = veri ve kaynak. Logodaki mavinin açık tonu.
        veri: '#88afdd',
        paper: '#453629',
        sand: '#3c2f24',
        // Kartlar ve kutular (eski bg-white): zeminden bir ton açık.
        kart: '#4f3e30',
        'warm-border': '#6a5540',
        'warm-700': '#ddd0ba',
        'warm-600': '#cdbfa7',
        'warm-500': '#c0b49f',
        'warm-400': '#b0a38c',
      },
      typography: () => {
        const koyu = {
          '--tw-prose-body': '#ddd0ba', '--tw-prose-headings': '#faf7f2', '--tw-prose-lead': '#cdbfa7',
          '--tw-prose-links': '#e8a07a', '--tw-prose-bold': '#faf7f2', '--tw-prose-counters': '#b5a994',
          '--tw-prose-bullets': '#7c6448', '--tw-prose-hr': '#6a5540', '--tw-prose-quotes': '#faf7f2',
          '--tw-prose-quote-borders': '#7c6448', '--tw-prose-captions': '#b5a994', '--tw-prose-code': '#faf7f2',
          '--tw-prose-pre-code': '#ddd0ba', '--tw-prose-pre-bg': '#3c2f24', '--tw-prose-th-borders': '#7c6448',
          '--tw-prose-td-borders': '#5c4a39',
        };
        return { DEFAULT: { css: koyu }, stone: { css: koyu } };
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [typography],
};
