/**
 * BACKEND INTEGRATION POINT
 * =========================
 * This is the *only* file that needs to change when the Python backend is ready.
 *
 * Set VITE_API_BASE_URL in .env.local (e.g. http://localhost:8000) and this
 * module POSTs to `${VITE_API_BASE_URL}/diagnose` instead of using mock data.
 * Leave it unset and the UI runs entirely on the fixtures in ./mockData.js.
 *
 * ---- REQUEST ----
 * POST /diagnose
 * { "symptoms": ["sore throat", "fever", "swollen glands"] }
 *
 * ---- RESPONSE ----  (see normalize() below for the tolerated variations)
 * {
 *   "search_time_ms": 6,                   // Typesense's own timing — surfaced
 *                                          // prominently in the UI, so pass the
 *                                          // real number through
 *   "results": [
 *     {
 *       "id": "strep-throat",
 *       "name": "Strep Throat",
 *       "confidence": 0.86,                  // 0..1 — drives the hero takeover
 *       "summary": "Bacterial infection ...", // optional
 *       "symptoms": ["Sore throat", "Fever", "Swollen lymph nodes"],
 *       "matched_symptoms": ["Sore throat", "Fever"],   // subset of `symptoms`
 *       "treatments": "Antibiotics, rest, fluids",      // dataset text or list;
 *                                                       // shown as "How it's treated"
 *       "medications": [ ... ]   // MAY BE EMPTY — see note below
 *       "medications": [
 *         {
 *           "name": "Amoxicillin",
 *           "form": "500mg capsule",         // optional
 *           "otc": false,                    // prescription vs over-the-counter
 *           "note": "10-day course",         // optional
 *           "image_url": "https://.../pill.png",  // optional; drawn if absent
 *           "goodrx": {
 *             "url": "https://www.goodrx.com/amoxicillin",
 *             "lowest_price": 11.28,
 *             "pharmacies": [
 *               { "name": "CVS Pharmacy", "price": 11.28, "distance_mi": 0.4 }
 *             ]
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { mockDiagnose } from './mockData.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const USING_MOCK_DATA = !BASE_URL;

/**
 * @param {string[]} symptoms
 * @returns {Promise<{results: object[], searchTimeMs: number|null, roundTripMs: number}>}
 */
export async function diagnose(symptoms, { signal } = {}) {
  const list = symptoms.map((s) => s.trim()).filter(Boolean);
  if (!list.length) return { results: [], searchTimeMs: null, roundTripMs: 0 };

  const started = performance.now();

  if (USING_MOCK_DATA) {
    const mock = await mockDiagnose(list);
    return {
      results: mock.results,
      searchTimeMs: mock.searchTimeMs,
      roundTripMs: performance.now() - started,
    };
  }

  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms: list }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Backend returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const roundTripMs = performance.now() - started;
  const results = Array.isArray(data) ? data : data.results ?? data.diseases ?? [];

  return {
    results: results.map(normalize),
    // Prefer Typesense's own timing; fall back to what we measured.
    searchTimeMs: num(data.search_time_ms ?? data.searchTimeMs ?? data.took_ms) ?? roundTripMs,
    roundTripMs,
  };
}

// Accepts either snake_case (Python-friendly) or camelCase, so the backend can
// hand back whatever is natural on its side without breaking the UI.
function normalize(raw, i) {
  const goodrxOf = (med) => {
    const g = med.goodrx ?? med.good_rx ?? null;
    if (!g) return null;
    return {
      url: g.url ?? null,
      lowestPrice: num(g.lowest_price ?? g.lowestPrice ?? g.price),
      pharmacies: (g.pharmacies ?? []).map((p) => ({
        name: p.name ?? 'Pharmacy',
        price: num(p.price),
        distanceMi: num(p.distance_mi ?? p.distanceMi),
        address: p.address ?? null,
      })),
    };
  };

  return {
    id: String(raw.id ?? raw.code ?? raw.name ?? i),
    name: raw.name ?? 'Unknown condition',
    summary: raw.summary ?? raw.description ?? '',
    confidence: num(raw.confidence ?? raw.score ?? raw.match_score),
    symptoms: raw.symptoms ?? [],
    matchedSymptoms: raw.matched_symptoms ?? raw.matchedSymptoms ?? [],
    // Treatment approach from the disease dataset — every condition has this,
    // even when the medication lookup comes back empty.
    treatments: toList(raw.treatments ?? raw.treatments_text ?? raw.treatment),
    // Deliberately NOT falling back to `treatments`: the two are different
    // things now. A condition the medication database doesn't cover should send
    // an empty list, and the UI says so rather than inventing drugs.
    medications: (raw.medications ?? []).map((med) =>
      typeof med === 'string'
        ? { name: med, form: '', otc: null, note: '', imageUrl: null, goodrx: null }
        : {
            name: med.name ?? 'Medication',
            form: med.form ?? med.dosage ?? '',
            otc: med.otc ?? null,
            note: med.note ?? '',
            // Optional product photo. Without one we draw the dosage form
            // ourselves — see components/MedIcon.jsx.
            imageUrl: med.image_url ?? med.imageUrl ?? null,
            goodrx: goodrxOf(med),
          }
    ),
  };
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Treatments arrive either already split, or as the dataset's raw comma string
// ("Antibiotics, supportive care (fluids, rest)"). Commas inside parentheses are
// part of the phrase, not separators.
function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/,(?![^(]*\))/)
    .map((v) => v.trim())
    .filter(Boolean);
}
