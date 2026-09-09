# Symptom checker (frontend)

Type your symptoms, get one answer: the most likely condition filling the whole
screen — its known symptoms, the medications that treat it, and where to fill
them and for how much (GoodRx). No result list to wade through.

**React + Vite.** Search is powered by **Typesense 30.2**, owned by the Python
backend.

> **Status:** proof of concept. The UI runs on dummy data
> (`src/lib/mockData.js`) until the backend endpoint exists. Flip one env var to
> switch over — see [Wiring up the backend](#wiring-up-the-backend).

---

## Quick start

```bash
npm install
npm run dev           # http://localhost:5173
```

That's it for frontend work — no Typesense needed while we're on dummy data.
A "demo data" badge shows in the header whenever the app is running on fixtures.

<details>
<summary>Running Typesense locally (only needed for backend work)</summary>

```bash
# 1. Install Typesense 30.2 (macOS, Apple Silicon)
curl -O https://dl.typesense.org/releases/30.2/typesense-server-30.2-darwin-arm64.tar.gz
mkdir -p typesense && tar -xzf typesense-server-30.2-darwin-arm64.tar.gz -C typesense
rm typesense-server-30.2-darwin-arm64.tar.gz

# 2. Start it (keep running in its own terminal)
mkdir -p typesense/data
npm run typesense

# 3. Seed the dev dataset (prod ingestion belongs to the Python backend)
npm run seed
```

`npm run seed` pulls [QuyenAnhDE/Diseases_Symptoms](https://huggingface.co/datasets/QuyenAnhDE/Diseases_Symptoms)
(400 conditions) into a `diseases` collection and writes a **search-only** API
key into `.env.local`, merging with whatever is already in there.

</details>

---

## How the UI behaves

- **One screen, no scrolling.** The viewport is locked; the answer is laid out
  to fit. Long medication lists scroll inside their own panel.
- **One pharmacy, with a reason.** Rather than listing every price, the UI picks
  the pharmacy to actually use and says why ("Cheapest nearby — $6.53 less than
  Walgreens"). If somewhere closer is only slightly dearer, that shows as a
  single alternative line. The rest hide behind "N other pharmacies".
- **Treatment sits next to the symptoms.** The left column is about the disease
  — known symptoms, how it's treated, then the other candidates. The right
  column is purely the medication shelf.
- **Medications are illustrated.** Send `image_url` and we show it; otherwise
  the dosage form (capsule, tablet, inhaler, spray, syrup) is drawn from the
  `form` string, coloured per drug — no network images needed.
- **Confidence decides the layout.** If the top result scores **≥ 0.7**, it takes
  over the entire page and the rest become a one-line "also possible" strip that
  swaps into the stage on click. Below 0.7 the app doesn't fake certainty — it
  shows the contenders as a grid, and opening one promotes it to the full stage.
  The threshold is `TAKEOVER_CONFIDENCE` in [`src/App.jsx`](src/App.jsx).
  "Also possible" sits under the symptom list with a percentage on each row —
  that's where someone checks whether the diagnosis actually fits.
- **Symptoms are pills you can drop.** Hovering a pill strikes it through;
  clicking it removes that symptom. There's no × inside the pill, so nothing
  shifts position as the pointer moves along the row. `+ symptom` adds (commas
  split into several), and `Clear all` appears once there's more than one. Every
  change re-runs the search immediately — there is no second search box.
  Removing the last symptom returns to the opening screen.
- **Speed is on display.** Every search shows `N conditions in X ms` next to a
  "Powered by Typesense" mark, so **send back the real `search_time_ms`** —
  that number is the demo.

---

## Wiring up the backend

Everything the backend touches lives in **[`src/lib/api.js`](src/lib/api.js)**.
No component knows where the data comes from.

```bash
echo "VITE_API_BASE_URL=http://localhost:8000" >> .env.local
```

With that set, the app stops using fixtures and does:

### `POST /diagnose`

Symptoms arrive as an **array** — one entry per pill the user sees.

```json
{ "symptoms": ["sore throat", "fever", "swollen glands"] }
```

### Response

```json
{
  "search_time_ms": 6,
  "results": [
    {
      "id": "strep-throat",
      "name": "Strep Throat",
      "confidence": 0.86,
      "summary": "A bacterial throat infection caused by group A Streptococcus.",
      "symptoms": ["Sore throat", "Fever", "Swollen lymph nodes"],
      "matched_symptoms": ["Sore throat", "Fever"],
      "treatments": "Antibiotics, supportive care (fluids, rest)",
      "medications": [
        {
          "name": "Amoxicillin",
          "form": "500mg capsule · 20 capsules",
          "otc": false,
          "note": "Typical 10-day course.",
          "image_url": null,
          "goodrx": {
            "url": "https://www.goodrx.com/amoxicillin",
            "lowest_price": 8.42,
            "pharmacies": [
              {
                "name": "Costco Pharmacy",
                "price": 8.42,
                "distance_mi": 2.1,
                "address": "1900 S Coast Hwy"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

| Field                  | Required | Notes                                                          |
| ---------------------- | -------- | -------------------------------------------------------------- |
| `search_time_ms`       | ⭐       | Typesense's own timing. Shown prominently — pass the real value |
| `name`                 | ✅       | Disease name — the page heading                                 |
| `symptoms`             | ✅       | Full known-symptom list for the condition                       |
| `treatments`           | ✅       | Dataset treatment text. Shown as "How it's treated"              |
| `confidence`           | ⭐       | `0..1`. **≥ 0.7 triggers the full-page takeover**               |
| `matched_symptoms`     |          | Subset of `symptoms` the user typed; ticked green in the UI     |
| `summary`              |          | One or two sentences under the heading                          |
| `medications[].otc`    |          | `true` → OTC badge, `false` → Rx badge, omit → no badge         |
| `medications`          |          | **May be empty** — see the note below                           |
| `medications[].image_url` |       | Product photo. Omit and we draw the dosage form ourselves       |
| `medications[].goodrx` |          | Omit and the medication renders without pricing                 |
| `goodrx.pharmacies[]`  |          | The "where to fill it" list; cheapest row is highlighted        |

Notes for the backend side:

- **`treatments` is separate from `medications`.** Every condition in the
  dataset has treatment text, so always send it — it's what fills the page when
  the medication lookup misses. Send it as the raw comma string
  (`"Antibiotics, supportive care (fluids, rest)"`) or a list; we split on commas
  and leave parentheses intact. Earlier this field doubled as a medication
  fallback — it no longer does.
- **An empty `medications` list is expected, not an error.** The symptom→disease
  index and the disease→medication index don't cover the same conditions. Send
  `[]` and the UI explains the gap and leans on `treatments`; don't invent drugs
  to fill it.
- **A dozen medications is fine.** The list collapses after 4 behind "Show all N
  medications" (`MEDS_BEFORE_COLLAPSE` in `ResultStage.jsx`), so send everything
  you have.
- **snake_case or camelCase both work** — `normalize()` in `api.js` accepts
  either, so write whatever is natural in Python.
- If `search_time_ms` is missing, the UI falls back to the measured round trip —
  which includes network time and will look much slower than Typesense really is.
- `medications` may also be a plain list of strings (`["Amoxicillin"]`); they'll
  render as names with no pricing. Useful as a first integration step before
  GoodRx is hooked up.
- Results render in the order you send them, except the first one is treated as
  the top match. The UI does no re-ranking.
- Non-2xx responses surface as an error message, so a plain HTTP error is fine.

---

## Layout

```
src/
├── App.jsx                       # search state machine + takeover threshold
├── lib/
│   ├── api.js                    # ← the only file the backend swap touches
│   └── mockData.js               # dummy conditions + naive keyword matcher
├── components/
│   ├── SymptomPills.jsx          # editable/removable symptom pills
│   ├── SpeedStat.jsx             # "N conditions in X ms" + Typesense mark
│   ├── ResultStage.jsx           # the full-page answer
│   ├── MedIcon.jsx               # drawn medication artwork + colour palette
│   ├── CandidateGrid.jsx         # fallback when nothing scores high enough
│   └── MedicationRow.jsx         # medication + GoodRx pharmacy pricing
└── styles.css                    # design tokens, light only
```

`scripts/seed.mjs` is dev-only convenience for loading Typesense; production
ingestion is the backend's job.
