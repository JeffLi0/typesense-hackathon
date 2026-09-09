/**
 * Symptom autocomplete, straight from the browser to Typesense.
 *
 * Modelled on typesense/showcase-address-autocomplete: the browser holds a
 * search-only key scoped to one collection and queries Typesense directly, so a
 * keystroke costs a Typesense search (sub-millisecond here) rather than a round
 * trip through Python.
 *
 * The key isn't baked into the bundle - the backend mints it at startup and
 * hands it over at GET /search-config.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

let configPromise = null;

function loadConfig() {
  if (!configPromise) {
    configPromise = fetch(`${API_BASE}/search-config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => (cfg?.api_key ? cfg : null))
      .catch(() => null);
  }
  return configPromise;
}

/**
 * @returns {Promise<{items: {text: string, html: string, count: number}[], searchTimeMs: number|null}>}
 */
export async function suggestSymptoms(query, { signal, limit } = {}) {
  const q = query.trim();
  if (q.length < 2) return { items: [], searchTimeMs: null };

  const cfg = await loadConfig();
  if (!cfg) return { items: [], searchTimeMs: null };

  const params = new URLSearchParams({
    q,
    query_by: 'symptom',
    // Last token is treated as a prefix - the whole point of a typeahead.
    prefix: 'true',
    // Lets "ritis" find "Pericarditis" when a prefix match finds nothing.
    infix: 'fallback',
    num_typos: '2',
    per_page: String(limit || cfg.limit || 8),
    // Relevance first, then how many diseases list the phrase, so "Fever"
    // beats "Fever (in some cases)".
    sort_by: '_text_match:desc,count:desc',
    highlight_full_fields: 'symptom',
    highlight_start_tag: '<mark>',
    highlight_end_tag: '</mark>',
  });

  const url = `${cfg.protocol}://${cfg.host}:${cfg.port}/collections/${cfg.collection}/documents/search?${params}`;

  const res = await fetch(url, {
    headers: { 'x-typesense-api-key': cfg.api_key },
    signal,
  });
  if (!res.ok) return { items: [], searchTimeMs: null };

  const data = await res.json();
  const items = (data.hits ?? []).map((hit) => ({
    text: hit.document.symptom,
    // Typesense marks the matched span for us; we render it as-is.
    html: hit.highlight?.symptom?.snippet ?? escapeHtml(hit.document.symptom),
    count: hit.document.count ?? 0,
  }));

  return { items, searchTimeMs: data.search_time_ms ?? null };
}

// Only reached when Typesense returned no highlight for a hit.
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
