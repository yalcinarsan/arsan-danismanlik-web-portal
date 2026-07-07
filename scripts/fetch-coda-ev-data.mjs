// Fetches EV data rows from the Coda "Ana Tablo" table and writes src/data/ev-data.json.
// Run manually with `npm run fetch:ev-data` whenever the Coda table changes.
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DOC_ID = 'AVjZG3b0ZN';
const TABLE_ID = 'grid-gzzs8qreVw';

const token = process.env.CODA_API_TOKEN;
if (!token) {
  console.error('CODA_API_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

async function fetchAllRows() {
  const rows = [];
  let url = `https://coda.io/apis/v1/docs/${DOC_ID}/tables/${TABLE_ID}/rows?useColumnNames=true&valueFormat=simple&limit=200`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Coda API error ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    for (const item of json.items) {
      rows.push(item.values);
    }
    url = json.nextPageLink ?? null;
  }
  return rows;
}

function normalizeRow(values) {
  return {
    region: values['Bölge'] ?? null,
    gercekTahmin: values['Gerçek / Tahmin'] ?? null, // e.g. "Gerçek" | "Projection-STEPS"
    metrik: values['Satış / Pazar Payı'] ?? null, // e.g. "Satış" | "Pazar Payı"
    aracTuru: values['Araç Türü'] ?? null, // e.g. "Otomobil" | "Hafif Ticari"
    powertrain: values['Batarya Konf.'] ?? null, // e.g. "BEV" | "PHEV" | "FCEV"
    year: values['Yıl'] ?? null,
    unit: values['Adet / Yüzde'] ?? null,
    value: values['Sayı'] ?? null,
  };
}

async function main() {
  const rawRows = await fetchAllRows();
  const rows = rawRows.map(normalizeRow);

  const output = {
    meta: {
      fetchedAt: new Date().toISOString(),
      sourceDoc: DOC_ID,
      sourceTable: TABLE_ID,
      rowCount: rows.length,
    },
    rows,
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outPath = path.join(__dirname, '..', 'src', 'data', 'ev-data.json');
  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  console.log(`Wrote ${rows.length} rows to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
