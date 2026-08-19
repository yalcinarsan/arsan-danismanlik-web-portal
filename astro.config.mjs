import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://arsandanismanlik.com.tr',
  integrations: [
    tailwind(),
    react(),
    // Sunumlar ve giriş gerektiren iç sayfalar listelenmez.
    // kurum-demo davetli bir sayfa; sitemap'te durması adresini arama
    // motorlarına duyurmak demekti (sayfanın kendisi noindex olsa bile).
    // adaylar = maskesiz yönetici listesi, profilim = adayın kendi profili,
    // dogrula = auth dönüş sayfası. Hiçbirinin dizinde işi yok; ikisinde
    // sayfa düzeyinde noindex de eksik (ayrıca eklenecek).
    sitemap({
      filter: (page) =>
        !/\/(sunumlar|kariyer\/(kurum-demo|adaylar|profilim|dogrula))\//.test(page),
    }),
  ],
  markdown: {
    remarkRehype: {
      footnoteLabel: 'Dipnotlar',
      footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
        'Metne dön ' + (referenceIndex + 1) + (rereferenceIndex > 1 ? '-' + rereferenceIndex : ''),
    },
  },
});
