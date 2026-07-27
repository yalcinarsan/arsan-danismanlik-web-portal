import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://arsandanismanlik.com.tr',
  integrations: [tailwind(), react(), sitemap()],
  markdown: {
    remarkRehype: {
      footnoteLabel: 'Dipnotlar',
      footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
        'Metne dön ' + (referenceIndex + 1) + (rereferenceIndex > 1 ? '-' + rereferenceIndex : ''),
    },
  },
});
