// DEV SEED — populate Typesense with the Diseases_Symptoms dataset so the
// frontend has data to render during development.
//
// In production, the Python backend owns ingestion. This script just mirrors
// the same collection schema (see the "SCHEMA CONTRACT" in the README) so the
// two stay in sync. Run it with:  npm run seed
//
//   HuggingFace (QuyenAnhDE/Diseases_Symptoms)  ->  Typesense "diseases" collection

import Typesense from 'typesense';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const DATASET = 'QuyenAnhDE/Diseases_Symptoms';
const CONFIG = 'default';
const SPLIT = 'train';
const PAGE = 100;
const COLLECTION = 'diseases';

const HOST = process.env.TYPESENSE_HOST || 'localhost';
const PORT = Number(process.env.TYPESENSE_PORT || 8108);
const PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'http';
const ADMIN_KEY = process.env.TYPESENSE_API_KEY || 'xyz';

const client = new Typesense.Client({
  nodes: [{ host: HOST, port: PORT, protocol: PROTOCOL }],
  apiKey: ADMIN_KEY,
  connectionTimeoutSeconds: 5,
});

// ---- SCHEMA CONTRACT (must match the Python backend) --------------------
const schema = {
  name: COLLECTION,
  fields: [
    { name: 'name', type: 'string' },
    { name: 'symptoms', type: 'string[]', facet: true },
    { name: 'treatments', type: 'string[]', facet: true },
    { name: 'symptoms_text', type: 'string' },
    { name: 'treatments_text', type: 'string' },
    { name: 'code', type: 'int32' },
  ],
};
// -------------------------------------------------------------------------

// Split a comma-separated field into a clean list.
// - Ignores commas *inside* parentheses, e.g. "Care (oxygen, fluids), rest"
//   -> ["Care (oxygen, fluids)", "rest"] instead of splitting the parenthetical.
// - Capitalizes the first letter so case-variant duplicates ("fatigue" /
//   "Fatigue") collapse into one facet value.
const splitList = (s) =>
  (s || '')
    .split(/,(?![^(]*\))/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));

async function fetchPage(offset, length) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(
    DATASET
  )}&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HuggingFace API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function waitForTypesense(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await client.health.retrieve();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `Typesense not reachable at ${PROTOCOL}://${HOST}:${PORT}. Start it first (see README).`
  );
}

async function main() {
  console.log(`Connecting to Typesense at ${PROTOCOL}://${HOST}:${PORT} ...`);
  await waitForTypesense();

  try {
    await client.collections(COLLECTION).delete();
    console.log(`Dropped existing "${COLLECTION}" collection.`);
  } catch {
    /* first run */
  }
  await client.collections().create(schema);
  console.log(`Created "${COLLECTION}" collection.`);

  const first = await fetchPage(0, 1);
  const total = first?.num_rows_total ?? 400;
  console.log(`Fetching ${total} rows from "${DATASET}"...`);

  const docs = [];
  for (let offset = 0; offset < total; offset += PAGE) {
    const length = Math.min(PAGE, total - offset);
    const page = await fetchPage(offset, length);
    for (const { row } of page.rows || []) {
      const symptoms = splitList(row.Symptoms);
      const treatments = splitList(row.Treatments);
      docs.push({
        id: String(row.Code),
        code: Number(row.Code) || 0,
        name: row.Name || 'Unknown',
        symptoms,
        treatments,
        symptoms_text: symptoms.join(', '),
        treatments_text: treatments.join(', '),
      });
    }
  }

  const results = await client
    .collections(COLLECTION)
    .documents()
    .import(docs, { action: 'upsert' });
  const failures = results.filter((r) => !r.success);
  console.log(`Indexed ${docs.length - failures.length}/${docs.length} diseases.`);
  if (failures.length) console.warn('Failures:', failures.slice(0, 3));

  // Create a search-only key for the browser and write it to .env.local.
  let searchKey = ADMIN_KEY;
  try {
    const key = await client.keys().create({
      description: 'Search-only key for the frontend',
      actions: ['documents:search'],
      collections: [COLLECTION],
    });
    searchKey = key.value;
    console.log('Created a search-only API key for the frontend.');
  } catch (e) {
    console.warn('Could not create search key, falling back to admin key:', e.message);
  }

  // Merge into .env.local rather than overwriting it, so unrelated settings
  // (notably VITE_API_BASE_URL, which points the UI at the Python backend)
  // survive a re-seed.
  const updates = {
    VITE_TYPESENSE_HOST: HOST,
    VITE_TYPESENSE_PORT: String(PORT),
    VITE_TYPESENSE_PROTOCOL: PROTOCOL,
    VITE_TYPESENSE_SEARCH_KEY: searchKey,
    VITE_TYPESENSE_COLLECTION: COLLECTION,
  };

  const existing = existsSync('.env.local')
    ? readFileSync('.env.local', 'utf8').split('\n')
    : [];

  const seen = new Set();
  const lines = existing
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const key = line.split('=')[0].trim();
      if (key in updates) {
        seen.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }

  writeFileSync('.env.local', lines.join('\n') + '\n');
  console.log('Updated .env.local. Now run:  npm run dev');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
