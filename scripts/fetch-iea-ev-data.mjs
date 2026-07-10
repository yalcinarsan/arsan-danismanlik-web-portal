#!/usr/bin/env node
/**
 * Fetches the electric-vehicle series behind the IEA Global EV Data Explorer
 * and writes them to src/data/ev-data.json for build-time chart rendering.
 *
 * Source:  IEA (2026), Global EV Data Explorer
 *          https://www.iea.org/data-and-statistics/data-tools/global-ev-data-explorer
 * Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
 *
 * The price series (price_mean_2025USD and siblings) are deliberately NOT
 * fetched: the Data Explorer attributes that data to S&P Global Mobility, a
 * third party, and third-party components are outside IEA's CC licence.
 *
 * Run with: npm run fetch:ev-data
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.iea.org/evs';
const SOURCE_URL = 'https://www.iea.org/data-and-statistics/data-tools/global-ev-data-explorer';

const REGIONS = ['World', 'Europe', 'Turkiye'];
const PARAMETERS = ['EV sales', 'EV sales share', 'EV stock', 'EV stock share'];

const KEEP_MODES = new Set(['Cars', 'Vans']);
const KEEP_POWERTRAINS = new Set(['BEV', 'PHEV', 'FCEV', 'EV']);
const KEEP_CATEGORIES = new Set(['Historical', 'Projection-STEPS']);

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/ev-data.json');

async function fetchSeries(region, parameter) {
  const url = `${API}?${new URLSearchParams({ region, parameter })}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error(`Unexpected payload shape for ${url}`);
  return json;
}

/** IEA returns float noise on percentages (0.01600000075995922). */
function normaliseValue(parameter, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return parameter.includes('share') ? Math.round(value * 1000) / 1000 : value;
}

function keep(row) {
  return (
    KEEP_CATEGORIES.has(row.category) &&
    KEEP_MODES.has(row.mode) &&
    KEEP_POWERTRAINS.has(row.powertrain) &&
    typeof row.year === 'number'
  );
}

async function main() {
  const seen = new Set();
  const rows = [];

  for (const region of REGIONS) {
    for (const parameter of PARAMETERS) {
      const batch = await fetchSeries(region, parameter);
      let kept = 0;
      for (const row of batch) {
        if (!keep(row)) continue;
        const value = normaliseValue(row.parameter, row.value);
        if (value === null) continue;
        const key = [row.region, row.category, row.parameter, row.mode, row.powertrain, row.year].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          region: row.region,
          category: row.category,
          parameter: row.parameter,
          mode: row.mode,
          powertrain: row.powertrain,
          year: row.year,
          unit: row.unit,
          value,
        });
        kept++;
      }
      console.log(`  ${region.padEnd(8)} ${parameter.padEnd(16)} ${String(kept).padStart(4)} satır`);
    }
  }

  rows.sort(
    (a, b) =>
      a.region.localeCompare(b.region) ||
      a.parameter.localeCompare(b.parameter) ||
      a.mode.localeCompare(b.mode) ||
      a.powertrain.localeCompare(b.powertrain) ||
      a.year - b.year
  );

  const payload = {
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'IEA (2026), Global EV Data Explorer',
      sourceUrl: SOURCE_URL,
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      modifiedBy: 'Arsan Danışmanlık',
      excluded: 'Araç fiyat serileri (kaynak: S&P Global Mobility) dahil edilmemiştir.',
      rowCount: rows.length,
    },
    rows,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`\n✓ ${rows.length} satır → src/data/ev-data.json`);
}

main().catch((err) => {
  console.error('✗ IEA verisi çekilemedi:', err.message);
  process.exitCode = 1;
});
