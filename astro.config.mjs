import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://arsandanismanlik.com.tr',
  integrations: [tailwind(), react()],
});
