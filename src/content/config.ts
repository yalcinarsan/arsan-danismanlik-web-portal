import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tarih: z.date(),
    kaynak: z.string(),
    url: z.string().url().optional(),
    dil: z.enum(['tr', 'en']),
    kategori: z.string(),
    seri: z.enum(['otomotivde-elektrifikasyon', 'beyond-the-balance-sheet']),
    seriNo: z.number().int().min(1),
    seriBaslik: z.string().optional(),
    durum: z.enum(['taslak', 'yayında', 'arşiv']).default('taslak'),
    ozet: z.string().optional(),
  }),
});

const jobs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    lokasyon: z.string(),
    calismaSekli: z.enum(['tam-zamanli', 'yari-zamanli', 'staj', 'proje-bazli']).optional(),
    yayinTarihi: z.date(),
    sonBasvuruTarihi: z.date().optional(),
    durum: z.enum(['acik', 'kapandi']).default('acik'),
    basvuruFormUrl: z.string().url(),
    ozet: z.string().optional(),
  }),
});

export const collections = { articles, jobs };
