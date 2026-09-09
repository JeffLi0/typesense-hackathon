"""
Typesense collection: schema, ingestion, and search.

The collection embeds the symptom text with Typesense's built-in model, so a
plain-language query ("burning when I pee, lower back ache") is matched
semantically rather than by keyword. The model is downloaded by the Typesense
server the first time it's used, which makes the first startup slow and every
one after that fast.
"""

import re
import typesense

from config import (
    COLLECTION_NAME,
    SYMPTOM_COLLECTION,
    EMBED_MODEL,
    REINDEX,
    TYPESENSE_API_KEY,
    TYPESENSE_HOST,
    TYPESENSE_PORT,
    TYPESENSE_PROTOCOL,
)

client = typesense.Client(
    {
        "nodes": [
            {
                "host": TYPESENSE_HOST,
                "port": TYPESENSE_PORT,
                "protocol": TYPESENSE_PROTOCOL,
            }
        ],
        "api_key": TYPESENSE_API_KEY,
        # Embedding the query server-side takes a moment on a cold model.
        "connection_timeout_seconds": 120,
    }
)

SCHEMA = {
    "name": COLLECTION_NAME,
    "fields": [
        {"name": "disease", "type": "string"},
        {"name": "symptoms", "type": "string"},
        {"name": "treatments", "type": "string"},
        {
            "name": "symptoms_vec",
            "type": "float[]",
            "embed": {
                "from": ["symptoms"],
                "model_config": {"model_name": EMBED_MODEL},
            },
        },
    ],
}


def split_list(text):
    """
    Split the dataset's comma-separated fields, ignoring commas inside
    parentheses so "Care (oxygen, fluids), rest" stays two items, not three.
    """
    if not text:
        return []
    parts = re.split(r",(?![^(]*\))", str(text))
    out = []
    for part in parts:
        cleaned = part.strip()
        if cleaned:
            out.append(cleaned[0].upper() + cleaned[1:])
    return out


# Autocomplete source: one document per distinct symptom phrase.
SYMPTOM_SCHEMA = {
    "name": SYMPTOM_COLLECTION,
    "fields": [
        # infix lets "ritis" match "Pericarditis"; the collection is tiny so the
        # extra index costs nothing.
        {"name": "symptom", "type": "string", "infix": True},
        # How many diseases list this symptom - the popularity tiebreak, so
        # "Fever" outranks "Fever of unknown origin" at equal text relevance.
        {"name": "count", "type": "int32"},
    ],
    "default_sorting_field": "count",
}


def collection_ready(name=None, schema=None):
    """
    True when the collection exists, holds documents, AND has the schema this
    code expects. The schema check matters: an older collection under the same
    name (say, one built by a previous version) would otherwise be kept and
    every search would fail on a missing field.
    """
    name = name or COLLECTION_NAME
    schema = schema or SCHEMA

    try:
        info = client.collections[name].retrieve()
    except Exception:
        return False

    if info.get("num_documents", 0) <= 0:
        return False

    fields = {f["name"] for f in info.get("fields", [])}
    expected = {f["name"] for f in schema["fields"]}
    if not expected.issubset(fields):
        print(
            f"[index] existing '{name}' has an incompatible schema "
            f"(missing {sorted(expected - fields)}) - rebuilding"
        )
        return False
    return True


def build(documents, schema=None):
    """(Re)create a collection and index the given documents."""
    schema = schema or SCHEMA
    name = schema["name"]

    try:
        client.collections[name].delete()
    except Exception:
        pass  # first run

    client.collections.create(schema)
    result = client.collections[name].documents.import_(
        documents, {"action": "create"}
    )
    errors = [r for r in result if not r.get("success", True)]
    return len(documents) - len(errors), errors


def ensure_index(load_rows):
    """
    Index on first run only. `load_rows` is a callable so the (slow) dataset
    download is skipped entirely when the collection is already populated.
    """
    if collection_ready() and not REINDEX:
        count = client.collections[COLLECTION_NAME].retrieve()["num_documents"]
        print(f"[index] '{COLLECTION_NAME}' already holds {count} documents - skipping ingest")
        return count

    print(f"[index] building '{COLLECTION_NAME}' (first run downloads the embedding model)")
    documents = load_rows()
    indexed, errors = build(documents)
    print(f"[index] indexed {indexed} diseases" + (f" ({len(errors)} errors)" if errors else ""))
    if errors:
        print("[index] first error:", errors[0])
    return indexed


def search(query, limit):
    """Semantic search over symptom text. Returns (hits, search_time_ms)."""
    response = client.collections[COLLECTION_NAME].documents.search(
        {
            "q": query,
            "query_by": "symptoms_vec",
            "per_page": limit,
            "exclude_fields": "symptoms_vec",  # keep the payload small
        }
    )
    return response.get("hits", []), response.get("search_time_ms", 0)


def ensure_symptom_index(load_rows):
    """Build the autocomplete collection on first run only."""
    if collection_ready(SYMPTOM_COLLECTION, SYMPTOM_SCHEMA) and not REINDEX:
        count = client.collections[SYMPTOM_COLLECTION].retrieve()["num_documents"]
        print(f"[index] '{SYMPTOM_COLLECTION}' already holds {count} phrases - skipping ingest")
        return count

    print(f"[index] building '{SYMPTOM_COLLECTION}' for autocomplete")
    indexed, errors = build(load_rows(), SYMPTOM_SCHEMA)
    print(f"[index] indexed {indexed} symptom phrases" + (f" ({len(errors)} errors)" if errors else ""))
    return indexed


SEARCH_KEY_DESCRIPTION = "symptom autocomplete (search-only, browser)"


def search_only_key():
    """
    A search-only key scoped to the autocomplete collection, for the browser.

    Typesense returns a key's value only at creation time, so we clear out any
    key we made on a previous run and mint a fresh one each startup rather than
    accumulating them.
    """
    try:
        for key in client.keys.retrieve().get("keys", []):
            if key.get("description") == SEARCH_KEY_DESCRIPTION:
                client.keys[key["id"]].delete()
    except Exception as exc:
        print("[index] could not clean up old search keys:", exc)

    created = client.keys.create(
        {
            "description": SEARCH_KEY_DESCRIPTION,
            "actions": ["documents:search"],
            "collections": [SYMPTOM_COLLECTION],
        }
    )
    return created["value"]
