# What's wrong — and what will it cost?

Type your symptoms and get the answer people actually need next: **what treating
it costs, and how to pay less for it.** One condition fills the screen with the
cheapest route to treatment, how much the right pharmacy saves you over the
wrong one, and where to go.

**Stack:** React + Vite frontend · FastAPI backend · **Typesense 30.2** doing
semantic search over symptom text with its built-in embedding model.

---

## Run it

Three processes. Each in its own terminal.

```bash
# 1. Typesense
npm run typesense

# 2. Backend  (first run downloads the embedding model + datasets — a few minutes)
python3 -m venv .venv && ./.venv/bin/pip install -r server/requirements.txt
npm run api                       # http://localhost:8000

# 3. Frontend
npm install && npm run dev        # http://localhost:5173
```

The backend indexes on first boot and skips it on every boot after, so only the
first start is slow. `curl localhost:8000/health` reports when it's ready (and how many diseases and
symptom phrases are indexed); the
home page also warns if the API isn't up. Force a rebuild with `REINDEX=1 npm run api`.

There is also a terminal version of the same pipeline:

```bash
./.venv/bin/python server/cli.py
```

---

## How it fits together

```
typing    ──►  Typesense prefix search      ──►  symptom autocomplete
   │            browser → Typesense direct, `symptoms` collection, 911 phrases
   │
symptoms  ──►  Typesense vector search      ──►  condition + symptoms + treatments
   │            (QuyenAnhDE/Diseases_Symptoms, 400 rows, ts/all-MiniLM-L12-v2)
   │
   └────────►  K-Paths pharmaDB lookup      ──►  medications for that condition
                (Tassy24/K-Paths-...-pharmaDB, 1145 usable drug-disease rows)
                                             │
                    costplus.py + pricing.py  ──►  real price per drug
                     (Cost Plus Drugs public API, 875 medications)
```

Typesense is used twice, in the two ways it's good at: **prefix + typo search**
for the typeahead, **vector search** for the diagnosis.

| File | Does |
| --- | --- |
| `server/api.py` | `POST /diagnose`, `GET /health`, ranking, confidence |
| `server/index.py` | Typesense schemas (diseases + symptoms), ingest, search, scoped key |
| `server/pharma.py` | disease → medications, from K-Paths |
| `server/costplus.py` | Cost Plus Drugs catalogue + per-drug quotes, cached |
| `server/pricing.py` | quote → the cost payload the UI renders |
| `src/lib/api.js` | the only frontend file that talks to the backend |
| `src/lib/suggest.js` | autocomplete — talks to Typesense directly |
| `src/components/SymptomSuggest.jsx` | the typeahead dropdown + keyboard handling |

---

## Three things to know before you demo

### 1. Every number on screen comes from a real source

Drug prices come from the **[Cost Plus Drugs public API](https://costplusdrugs.github.io/apidocs/)**
(`us-central1-costplusdrugs-publicapi.cloudfunctions.net/main`) — no key, no
auth. `server/costplus.py` pulls their catalogue (2,381 products / 875
medications) and a **quote per drug**, cached to `data/`.

The quote matters: their total is **not** unit price × quantity, because their
published formula folds in markup, a pharmacy fee and shipping. Metformin is
$0.009 a unit but **$5.31 for thirty tablets**. Only the quote endpoint knows
the real number, so that's the one shown — and each price links to the page you
buy it on.

Unmodified from their API: the amount, the strength, the form, the brand it's a
generic for, and the URL. The single assumption is fill size — 30 for a pill,
one package otherwise — and it's printed next to every price ("30 tablets"),
because the total is quoted for exactly that quantity.

**There are no pharmacy names, addresses, distances, markups or fees anywhere in
this app.** Cost Plus is one pharmacy publishing its own prices; what any other
pharmacy charges isn't in our data, and the UI doesn't pretend otherwise.

Coverage: **35% of K-Paths drugs are carried by Cost Plus** — but because priced
drugs sort first and most conditions have more than twelve candidate drugs, the
big conditions still come out **12 of 12 priced**. Anything not carried says so.

### 2. Most conditions have no medications, by design

The symptom dataset has 392 conditions; the drug dataset covers 91. After name
normalization, **49 conditions (12%) have medications.** That isn't a bug and
the UI treats it as a first-class state: it explains the gap, leans on the
`treatments` text (which every condition has), and offers a one-click jump to
the nearest condition that *is* priced.

The home page examples are chosen to land on priced conditions. If the datasets
change, re-check them.

### 3. Ranking is honest, not cost-biased

It's tempting to float conditions we can price to the top. That makes the page
show a 90%-match headline above a 99%-match alternative, and that number is
exactly what a user reads to decide whether the diagnosis fits. So results stay
in semantic order, and the empty-medication panel offers the priced neighbour
instead. Set `PRIORITIZE_PRICED=1` to rank by pricing anyway.

---

## Symptom autocomplete

Both inputs — the home search bar and the `+ symptom` pill — complete against
the **911 distinct symptom phrases** in the dataset, deduplicated
case-insensitively and counted by how many diseases list each one.

Following [typesense/showcase-address-autocomplete](https://github.com/typesense/showcase-address-autocomplete),
**the browser queries Typesense directly** rather than proxying through Python:
a keystroke costs one Typesense search (`<1 ms`) instead of a round trip. The
backend mints a **search-only key scoped to the `symptoms` collection** at
startup and serves it from `GET /search-config` — so it isn't baked into the
bundle, and it can't write or read any other collection. Both restrictions are
enforced by Typesense, not by us.

Query parameters, and why:

| Parameter | Why |
| --- | --- |
| `prefix=true` | Last token is a prefix — "sore thr" → "Sore throat" |
| `num_typos=2` | "hedache" → "Headache" |
| `infix=fallback` | "ritis" → "Pericarditis" when a prefix match finds nothing |
| `sort_by=_text_match:desc,count:desc` | Relevance first, then popularity, so "Fever" beats "Fever (in some cases)" |
| `highlight_start_tag=<mark>` | Typesense marks the matched span; the dropdown renders it as-is |

There's no debounce — Typesense answers in under a millisecond and the dropdown
prints that time, which is rather the point. The home bar completes only the
segment after the last comma, so "fever, sore thr" completes "sore thr" alone.

Arrow keys move, Enter accepts, Escape dismisses, click selects.

## The contract

### `POST /diagnose`

```json
{ "symptoms": ["wheezing", "shortness of breath"] }
```

### Response

```json
{
  "search_time_ms": 4,
  "results": [
    {
      "id": "asthma",
      "name": "Asthma",
      "confidence": 0.90,
      "summary": "A bronchial disease characterized by chronic inflammation...",
      "symptoms": ["Recurrent episodes of wheezing", "Shortness of breath"],
      "matched_symptoms": ["Recurrent episodes of wheezing"],
      "treatments": ["Long-term control medications", "Avoidance of triggers"],
      "medications": [
        {
          "name": "Metformin",
          "form": "500mg Tablet",
          "otc": null,
          "note": "A biguanide used to treat type 2 diabetes.",
          "image_url": null,
          "cost": {
            "amount": 5.31,
            "quantity": 30,
            "quantity_label": "30 tablets",
            "unit_price": 0.009,
            "strength": "500mg",
            "form": "Tablet",
            "pill": true,
            "brand_name": "Glucophage",
            "generic": true,
            "source": "Cost Plus Drugs",
            "url": "https://www.costplusdrugs.com/medications/metformin-500mg-tablet/"
          }
        }
      ]
    }
  ]
}
```

| Field | Notes |
| --- | --- |
| `search_time_ms` | Typesense's own timing — the UI puts it on screen, so pass the real number |
| `confidence` | `0..1`. **≥ 0.7 gives the condition the whole page**, below that the UI shows candidates side by side |
| `symptoms` / `matched_symptoms` | Full list, and the subset the user described (ticked green) |
| `treatments` | Dataset treatment text — present even when `medications` is empty |
| `medications` | May be empty; may be a dozen (the UI collapses after 4) |
| `goodrx.estimated` | `true` makes the UI label the price an estimate |
| `medications[].otc` | `true`/`false` for an OTC badge; `null` shows none. Cost Plus doesn't publish this, so we send `null` |
| `cost.amount` / `quantity_label` | The real total and what it's for ("$5.31 · 30 tablets") |
| `cost.url` / `source` | Provenance — every price links to the page you buy it on |
| `medications[].image_url` | Product photo; omit and we draw the dosage form |

`normalize()` in `src/lib/api.js` accepts snake_case or camelCase, so write
whatever is natural in Python.

---

## If it breaks mid-demo

- **Vite is pinned to port 5173** (`strictPort`). It used to slide to the next
  free port when 5173 was busy, which then failed CORS against the backend and
  reported "backend unreachable" — while the backend was fine. It now refuses to
  start instead, so you find out immediately. If it won't start, an old dev
  server is still running: `lsof -nP -iTCP:5173 -sTCP:LISTEN`.
- **The backend accepts any localhost port** (`CORS_ORIGIN_REGEX`), so even a
  shifted frontend port keeps working.
- **The error message can tell the two apart.** If the backend is down you get
  "start it with `npm run api`"; if it's up but the browser blocked the response
  you get the CORS message naming the origin. It probes with a `no-cors` request
  to distinguish them.
- **Nothing is fetched at demo time.** Datasets, embedding model, the Cost Plus
  catalogue and every price quote are cached after the first run.

## Details worth knowing

- **`label` is filtered.** K-Paths rows are `Disease-modifying`, `Palliates` or
  `Non indications` — the last means the drug *neither treats nor palliates* the
  disease. All 243 of those rows are dropped in `pharma.py`; showing them as
  treatment options would be actively wrong.
- **Confidence is calibrated to this data.** Cosine similarity 0.42–0.92 maps
  onto 0–1, because a recital of real symptoms scores ~0.85–1.00, a good
  plain-language description ~0.67, and a vague one ~0.45. A light symptom-
  coverage term nudges ties. Without the mapping everything reads "99% match".
- **Disease names are normalized before matching** ("Parkinson Disease" vs
  "parkinson's disease", "Reflux Disease (GERD)"). Parkinson's went from 0 drugs
  to 28 on that fix alone.
- **Summaries require an exact name match.** The looser match is fine for drugs,
  but it would print psoriatic arthritis's definition under plain "Arthritis".
  No description beats a wrong one.
- **Quotes are prefetched at startup**, eight at a time, and cached to disk —
  one quote takes up to two seconds, so fetching them per search would make the
  first search for every condition crawl. Writes are behind a lock; without it
  the parallel prefetch corrupts the cache mid-serialise.
- **Cost Plus name matching** falls back to a distinctive whole word, since they
  list salts and combinations ("Abacavir Sulfate", "Amoxicillin / Clavulanate").
- **Duplicate disease rows** exist in the dataset; results are deduplicated by
  name before being trimmed to the result limit.

## UI behaviour

- Cost leads: a band under the condition name gives the cheapest option and, in
  dollars, what you'd save by asking about it instead of the priciest one
  (`src/lib/cost.js`). It used to print "4.3× more", which named no drug, no
  amount and no next step.
- Prices are never summed — a medication list is a set of *options*, not a
  regimen — and pills are only compared against pills, since 30 tablets and one
  tube of cream aren't the same purchase.
- Symptoms are pills: hover strikes one through, click removes it, `+ symptom`
  adds, `Clear all` resets. Every change re-runs the search.
- One screen, no page scrolling; long medication lists scroll in their panel.
