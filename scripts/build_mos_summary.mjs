#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src/data/mos_data.json');
const OUT = resolve(__dirname, '../src/data/mos_summary.json');

const MAX_OVERVIEW_CHARS = 400;

function truncate(str, max) {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

function pickArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((s) => String(s).trim());
  return [];
}

async function main() {
  const raw = await readFile(SRC, 'utf8');
  const mos = JSON.parse(raw);
  if (!Array.isArray(mos)) throw new Error('mos_data.json is not an array');

  const summary = mos
    .filter((m) => m && m.moscode && m.mos_title)
    .map((m) => ({
      moscode: m.moscode,
      mos_title: m.mos_title,
      category: m.category || '',
      group: m.group || '',
      position_type: m.position_type || '',
      mos_description_short: truncate(m.mos_description_short, MAX_OVERVIEW_CHARS),
      mos_job_overview: truncate(m['MOS job overview'], MAX_OVERVIEW_CHARS),
      skills: pickArray(m.Skills),
      legacy_soft_skills: pickArray(m['Legacy Soft Skills']),
      url: m.url_path_nextgen || m.url_path_legacy || m.english_url || '',
    }));

  await writeFile(OUT, JSON.stringify(summary, null, 2));
  const bytes = (await readFile(OUT)).length;
  console.log(`Wrote ${summary.length} MOS entries to ${OUT} (${(bytes / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
