"""
HTTP API for the symptom -> condition -> cost frontend.

    POST /diagnose   {"symptoms": ["sore throat", "fever"]}
    GET  /health

Run it with:  ./.venv/bin/uvicorn api:app --app-dir server --reload --port 8000
"""

import re
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import costplus
import index
import pharma
import pricing
from config import (
    CORS_ORIGIN_REGEX,
    CORS_ORIGINS,
    NEAR_TIE,
    PRIORITIZE_PRICED,
    RESULT_LIMIT,
    SUGGEST_LIMIT,
    SYMPTOM_COLLECTION,
    TYPESENSE_HOST,
    TYPESENSE_PORT,
    TYPESENSE_PROTOCOL,
)

STATE = {"ready": False, "diseases": 0, "symptoms": 0, "search_key": None, "prices": {}, "error": None}


_DATASET = {}


def _diseases_dataframe():
    """The symptom dataset, loaded at most once per process."""
    if "df" not in _DATASET:
        from datasets import load_dataset

        df = load_dataset("QuyenAnhDE/Diseases_Symptoms")["train"].to_pandas()
        print(f"[index] loaded {len(df)} rows from Diseases_Symptoms")
        _DATASET["df"] = df
    return _DATASET["df"]


def _load_disease_rows():
    """Dataset -> Typesense documents. Only called when an ingest is needed."""
    return [
        {
            "disease": str(row.get("Name", "")),
            "symptoms": str(row.get("Symptoms", "")),
            "treatments": str(row.get("Treatments", "")),
        }
        for _, row in _diseases_dataframe().iterrows()
    ]


def _load_symptom_rows():
    """
    Every distinct symptom phrase in the dataset, with how many diseases list
    it. That count is the popularity signal behind the autocomplete ordering.

    Phrases are deduplicated case-insensitively, keeping the spelling that
    appears most often so the dropdown shows "Shortness of breath", not
    "shortness of breath".
    """
    tally = {}
    for _, row in _diseases_dataframe().iterrows():
        for phrase in index.split_list(row.get("Symptoms")):
            key = phrase.lower()
            entry = tally.setdefault(key, {"count": 0, "spellings": {}})
            entry["count"] += 1
            entry["spellings"][phrase] = entry["spellings"].get(phrase, 0) + 1

    rows = []
    for key, entry in tally.items():
        best = max(entry["spellings"].items(), key=lambda kv: kv[1])[0]
        rows.append({"symptom": best, "count": entry["count"]})

    rows.sort(key=lambda r: (-r["count"], r["symptom"]))
    print(f"[index] {len(rows)} distinct symptom phrases for autocomplete")
    return rows


def _load_pharma():
    from datasets import load_dataset
    import pandas as pd

    ds = load_dataset("Tassy24/K-Paths-inductive-reasoning-pharmaDB")
    return pd.concat([ds[s].to_pandas() for s in ds.keys()], ignore_index=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        STATE["prices"] = costplus.load()
        STATE["diseases"] = index.ensure_index(_load_disease_rows)
        STATE["symptoms"] = index.ensure_symptom_index(_load_symptom_rows)
        STATE["search_key"] = index.search_only_key()
        pharma.load(_load_pharma())
        # Quotes are one API call each, so warm them once instead of making the
        # first search for every condition wait on the network.
        costplus.prefetch(pharma.drug_names())
        STATE["prices"] = costplus.meta()
        STATE["ready"] = True
        print("[api] ready")
    except Exception as exc:  # keep /health useful instead of dying silently
        STATE["error"] = str(exc)
        print("[api] startup failed:", exc)
    yield


app = FastAPI(title="Symptom cost search", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DiagnoseRequest(BaseModel):
    symptoms: list[str] | str = []


def _slug(text):
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-") or "condition"


def _tokens(text):
    return {w for w in re.findall(r"[a-z]{3,}", str(text).lower())}


STOP = {"the", "and", "with", "for", "have", "has", "pain", "feeling", "felt"}


def _matched_symptoms(user_symptoms, disease_symptoms):
    """
    Which of the condition's symptoms the user actually described. Word-level
    overlap, so "sore throat" matches "Throat soreness".
    """
    wanted = set()
    for phrase in user_symptoms:
        wanted |= _tokens(phrase) - STOP
    if not wanted:
        return []

    matched = []
    for symptom in disease_symptoms:
        words = _tokens(symptom) - STOP
        if words & wanted:
            matched.append(symptom)
    return matched


def _confidence(hit, coverage):
    """
    Vector distance -> 0..1 confidence.

    Typesense returns cosine distance (0 = identical, 2 = opposite). Measured
    against this dataset, a recital of real symptoms scores 0.85-1.00 similarity,
    a good plain-language description ~0.67, and a vague one ~0.45 - so we map
    the 0.42-0.92 window onto the full range instead of reporting 99% for
    everything.

    Symptom coverage (how many of the user's phrases the condition explains) is
    a light nudge only: on a one-phrase query it is either 0 or 1, so weighting
    it heavily would let a weak semantic match outrank a strong one.
    """
    distance = hit.get("vector_distance")
    if distance is None:
        return None
    similarity = 1.0 - float(distance)
    scaled = (similarity - 0.42) / 0.50
    blended = 0.85 * scaled + 0.15 * coverage
    return round(max(0.05, min(0.99, blended)), 3)


def _coverage(user_symptoms, disease_symptoms):
    """Fraction of the user's phrases this condition explains."""
    phrases = [p for p in user_symptoms if _tokens(p) - STOP]
    if not phrases:
        return 0.0
    explained = 0
    for phrase in phrases:
        words = _tokens(phrase) - STOP
        if any(words & (_tokens(s) - STOP) for s in disease_symptoms):
            explained += 1
    return explained / len(phrases)


def _prioritize_priced(results):
    """
    Among results that are within a hair of the best score, put the ones we can
    actually price first.

    The disease dataset has ~392 conditions and the drug dataset covers ~91, so
    the top semantic hit often has no medications while a near-identical
    condition just below it has twelve. This is a cost tool: given two matches
    that the model rates the same, the useful one is the one with prices. Every
    other candidate still appears under "also possible", in order.

    Set PRIORITIZE_PRICED=0 to rank purely by semantic score.
    """
    if not results or not PRIORITIZE_PRICED:
        return results

    best = max((r["confidence"] or 0) for r in results)
    window = best - NEAR_TIE

    def key(item):
        i, r = item
        near_top = (r["confidence"] or 0) >= window
        has_meds = bool(r["medications"])
        return (0 if (near_top and has_meds) else 1, i)

    return [r for _, r in sorted(enumerate(results), key=key)]


@app.get("/health")
def health():
    return {
        "ok": STATE["ready"],
        "diseases_indexed": STATE["diseases"],
        "symptoms_indexed": STATE["symptoms"],
        "prices": STATE["prices"],
        "error": STATE["error"],
    }


@app.get("/search-config")
def search_config():
    """
    What the browser needs to query Typesense directly for autocomplete.

    The key is search-only and scoped to the symptoms collection, so it is safe
    in the client - the same arrangement the Typesense address-autocomplete
    showcase uses. Going straight to Typesense also keeps keystroke latency at
    Typesense's own speed instead of adding a Python hop to every character.
    """
    return {
        "host": TYPESENSE_HOST,
        "port": TYPESENSE_PORT,
        "protocol": TYPESENSE_PROTOCOL,
        "collection": SYMPTOM_COLLECTION,
        "api_key": STATE["search_key"],
        "limit": SUGGEST_LIMIT,
    }


@app.post("/diagnose")
def diagnose(req: DiagnoseRequest):
    symptoms = [req.symptoms] if isinstance(req.symptoms, str) else list(req.symptoms)
    symptoms = [s.strip() for s in symptoms if s and s.strip()]

    if not symptoms:
        return {"results": [], "search_time_ms": 0}
    if not STATE["ready"]:
        return {"results": [], "search_time_ms": 0, "error": STATE["error"] or "starting up"}

    query = ", ".join(symptoms)
    started = time.perf_counter()
    # Over-fetch: the dataset contains duplicate disease rows, and we drop them
    # before trimming to the result limit.
    hits, search_time_ms = index.search(query, RESULT_LIMIT * 3)
    round_trip_ms = (time.perf_counter() - started) * 1000

    results = []
    seen = set()
    for hit in hits:
        doc = hit["document"]
        name = doc.get("disease", "Unknown condition")
        if name.lower() in seen:
            continue
        seen.add(name.lower())

        disease_symptoms = index.split_list(doc.get("symptoms"))

        results.append(
            {
                "id": _slug(name),
                "name": name,
                # Real description from pharmaDB where we have one; never invented.
                "summary": pharma.description_for(name),
                "confidence": _confidence(hit, _coverage(symptoms, disease_symptoms)),
                "symptoms": disease_symptoms,
                "matched_symptoms": _matched_symptoms(symptoms, disease_symptoms),
                "treatments": index.split_list(doc.get("treatments")),
                "medications": pharma.medications_for(name, pricing.price),
            }
        )
        if len(results) >= RESULT_LIMIT:
            break

    # Sort by the score we actually display, so the headline match is always the
    # highest percentage and "also possible" reads top-down.
    results.sort(key=lambda r: r["confidence"] or 0, reverse=True)
    results = _prioritize_priced(results)

    return {
        # Typesense's own timing - this is the number the UI puts on screen.
        "search_time_ms": search_time_ms,
        "round_trip_ms": round(round_trip_ms, 1),
        "results": results,
    }
