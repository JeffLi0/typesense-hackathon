/**
 * The backend call. One endpoint, one shape.
 *
 *   POST {VITE_API_BASE_URL}/diagnose   {"symptoms": ["sore throat", "fever"]}
 *
 * VITE_API_BASE_URL defaults to http://localhost:8000, which is where
 * `npm run api` puts the Python server. See server/api.py for the other end.
 *
 * ---- RESPONSE ----  (normalize() below tolerates snake_case or camelCase)
 * {
 *   "search_time_ms": 4,                   // Typesense's own timing; shown in the UI
 *   "results": [
 *     {
 *       "id": "asthma",
 *       "name": "Asthma",
 *       "confidence": 0.90,                // 0..1 - drives the full-page takeover
 *       "summary": "A bronchial disease ...",
 *       "symptoms": ["Wheezing", "Shortness of breath"],
 *       "matched_symptoms": ["Wheezing"],  // subset of `symptoms`
 *       "treatments": ["Inhaled corticosteroids", "..."],
 *       "medications": [                   // MAY BE EMPTY - the drug dataset
 *         {                                // covers far fewer conditions
 *           "name": "Metformin",
 *           "form": "500mg Tablet",
 *           "otc": null,                   // Cost Plus doesn't publish this
 *           "note": "A glucocorticoid ...",
 *           "image_url": null,             // null => we draw the dosage form
 *           "cost": {                      // null when Cost Plus doesn't carry it
 *             "amount": 5.31,              // the real total they charge
 *             "quantity": 30,
 *             "quantity_label": "30 tablets",
 *             "unit_price": 0.009,
 *             "strength": "500mg",
 *             "form": "Tablet",
 *             "pill": true,
 *             "brand_name": "Glucophage",
 *             "generic": true,
 *             "source": "Cost Plus Drugs",
 *             "url": "https://www.costplusdrugs.com/medications/metformin-500mg-tablet/"
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

/**
 * @param {string[]} symptoms
 * @returns {Promise<{results: object[], searchTimeMs: number|null, roundTripMs: number}>}
 */
export async function diagnose(symptoms, { signal } = {}) {
  const list = symptoms.map((s) => s.trim()).filter(Boolean);
  if (!list.length) return { results: [], searchTimeMs: null, roundTripMs: 0 };

  const started = performance.now();

  let res;
  try {
    res = await fetch(`${BASE_URL}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms: list }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error(await describeNetworkFailure());
  }

  if (!res.ok) {
    throw new Error(`Backend returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const roundTripMs = performance.now() - started;

  // The backend reports this while it's still downloading datasets on first run.
  if (data.error) throw new Error(data.error);

  const results = Array.isArray(data) ? data : data.results ?? data.diseases ?? [];

  return {
    results: results.map(normalize),
    // Prefer Typesense's own timing; fall back to what we measured.
    searchTimeMs: num(data.search_time_ms ?? data.searchTimeMs ?? data.took_ms) ?? roundTripMs,
    roundTripMs,
  };
}

/** Ask the backend whether it has finished indexing. */
export async function health() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) return { ok: false, reason: `Backend replied ${res.status}.` };
    return await res.json();
  } catch {
    return { ok: false, unreachable: true, reason: await describeNetworkFailure() };
  }
}

/**
 * Work out *why* a request failed.
 *
 * A CORS rejection and a dead server both surface as the same opaque
 * TypeError, and reporting "backend not running" when it is running sends you
 * restarting the wrong thing. A no-cors probe resolves (opaquely) whenever
 * something is actually listening, which tells the two apart.
 */
async function describeNetworkFailure() {
  try {
    await fetch(`${BASE_URL}/health`, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    return `Can't reach the search backend at ${BASE_URL}. Start it with \`npm run api\`.`;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'this page';
  return (
    `The backend at ${BASE_URL} is running, but your browser blocked its response. ` +
    `This page is served from ${origin} — restart the API so it allows that origin.`
  );
}

// Accepts either snake_case (Python-friendly) or camelCase, so the backend can
// hand back whatever is natural on its side without breaking the UI.
function normalize(raw, i) {
  const costOf = (med) => {
    const c = med.cost ?? med.price ?? null;
    if (!c) return null;
    return {
      amount: num(c.amount ?? c.price ?? c.total),
      quantity: num(c.quantity),
      quantityLabel: c.quantity_label ?? c.quantityLabel ?? '',
      unitPrice: num(c.unit_price ?? c.unitPrice),
      strength: c.strength ?? '',
      form: c.form ?? '',
      pill: c.pill ?? true,
      brandName: c.brand_name ?? c.brandName ?? '',
      generic: c.generic ?? null,
      source: c.source ?? 'Cost Plus Drugs',
      url: c.url ?? null,
    };
  };

  return {
    id: String(raw.id ?? raw.code ?? raw.name ?? i),
    name: raw.name ?? 'Unknown condition',
    summary: raw.summary ?? raw.description ?? '',
    confidence: num(raw.confidence ?? raw.score ?? raw.match_score),
    symptoms: raw.symptoms ?? [],
    matchedSymptoms: raw.matched_symptoms ?? raw.matchedSymptoms ?? [],
    // Treatment approach from the disease dataset — present even when the
    // medication lookup comes back empty.
    treatments: toList(raw.treatments ?? raw.treatments_text ?? raw.treatment),
    medications: (raw.medications ?? []).map((med) =>
      typeof med === 'string'
        ? { name: med, form: '', otc: null, note: '', imageUrl: null, cost: null }
        : {
            name: med.name ?? 'Medication',
            form: med.form ?? med.dosage ?? '',
            otc: med.otc ?? null,
            note: med.note ?? '',
            imageUrl: med.image_url ?? med.imageUrl ?? null,
            cost: costOf(med),
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
