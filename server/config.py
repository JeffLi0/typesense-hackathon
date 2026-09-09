import os

TYPESENSE_HOST = os.environ.get("TYPESENSE_HOST", "localhost")
TYPESENSE_PORT = os.environ.get("TYPESENSE_PORT", "8108")
TYPESENSE_PROTOCOL = os.environ.get("TYPESENSE_PROTOCOL", "http")
TYPESENSE_API_KEY = os.environ.get("TYPESENSE_API_KEY", "xyz")

COLLECTION_NAME = os.environ.get("TYPESENSE_COLLECTION", "diseases")
# Distinct symptom phrases, used for the search-bar autocomplete. The browser
# queries this one directly (see /search-config), the way the Typesense
# address-autocomplete showcase does.
SYMPTOM_COLLECTION = os.environ.get("TYPESENSE_SYMPTOM_COLLECTION", "symptoms")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "ts/all-MiniLM-L12-v2")

# Force a rebuild of the collection even if it already holds documents.
REINDEX = os.environ.get("REINDEX", "").lower() in ("1", "true", "yes")

# Where the frontend runs, for CORS.
#
# Vite moves to the next free port when its default is taken (5173 -> 5174 ->
# ...), and an allowlist pinned to one port turns that into a dead app with a
# misleading "backend unreachable" error. So allow any localhost port; this is a
# local dev backend and the browser's origin check is not what protects it.
CORS_ORIGIN_REGEX = os.environ.get(
    "CORS_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1)(:\d+)?"
)

# Extra explicit origins (e.g. a deployed frontend). Empty by default.
CORS_ORIGINS = [o for o in os.environ.get("CORS_ORIGINS", "").split(",") if o]

RESULT_LIMIT = int(os.environ.get("RESULT_LIMIT", "5"))

# Opt-in: among near-identical matches, surface the ones we can price first
# (see _prioritize_priced in api.py). OFF by default, because reordering makes
# the UI show a 90%-match hero above a 99%-match alternative, and that number is
# exactly what a user reads to judge whether the diagnosis fits. Instead the
# frontend keeps honest ranking and offers a one-click jump to the nearest
# priced condition. Set PRIORITIZE_PRICED=1 to rank by pricing anyway.
PRIORITIZE_PRICED = os.environ.get("PRIORITIZE_PRICED", "0").lower() not in ("0", "false", "no")

# How close to the top score counts as "near-identical".
NEAR_TIE = float(os.environ.get("NEAR_TIE", "0.15"))

# How many autocomplete suggestions to return.
SUGGEST_LIMIT = int(os.environ.get("SUGGEST_LIMIT", "8"))
