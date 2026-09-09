"""
Real consumer prices from Cost Plus Drugs.

Source: the public API documented at https://costplusdrugs.github.io/apidocs/
        https://us-central1-costplusdrugs-publicapi.cloudfunctions.net/main

Why this beats an acquisition-cost dataset for this app: a NADAC figure is what
a pharmacy paid, which nobody can actually walk in and pay. A Cost Plus quote is
what a person is charged, from a pharmacy that publishes its whole formula
(cost + markup + pharmacy fee + shipping) - and every price links to the page
you buy it on.

TWO CALLS, TWO PURPOSES
-----------------------
1. The full catalogue (one request, ~2400 products) gives us every medication
   they carry with its unit price, strength, form and URL.
2. A *quote* for a given quantity. This one matters: the total is NOT unit price
   x quantity, because their fees are folded in. Metformin is $0.009 a unit but
   $5.31 for thirty. Only the quote endpoint knows the real number, so that is
   what we show - one call per drug, cached to disk.
"""

import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor

DATA_DIR = os.environ.get("COSTPLUS_DIR", "data")
CATALOG_PATH = os.path.join(DATA_DIR, "costplus_catalog.json")
QUOTES_PATH = os.path.join(DATA_DIR, "costplus_quotes.json")

API = "https://us-central1-costplusdrugs-publicapi.cloudfunctions.net/main"

# A month of a pill; a single package of anything else. Cost Plus prices the
# exact quantity we ask for, so this is the only assumption in the file - and
# it's stated on screen ("30 tablets").
PILL_QUANTITY = 30
NONPILL_QUANTITY = 1

_by_name = {}
_quotes = {}
_meta = {}
# prefetch() fills the cache from several threads at once; without this, a
# thread writing an entry while another serialises the dict raises
# "dictionary changed size during iteration".
_lock = threading.Lock()


def _money(text):
    try:
        return round(float(str(text).replace("$", "").replace(",", "").strip()), 2)
    except (TypeError, ValueError):
        return None


def _fetch_catalog():
    import requests

    print("[costplus] downloading the medication catalogue")
    response = requests.get(API, timeout=120)
    response.raise_for_status()
    results = response.json().get("results", [])
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CATALOG_PATH, "w") as handle:
        json.dump(results, handle)
    return results


def _index(products):
    """
    name -> the product we'd quote.

    Prefer a pill: it's the form most prescriptions come in, and it makes the
    per-condition comparison apples-to-apples. Within a form, cheapest per unit.
    """
    grouped = {}
    for product in products:
        name = (product.get("medication_name") or "").strip().lower()
        if not name:
            continue
        grouped.setdefault(name, []).append(product)

    chosen = {}
    for name, items in grouped.items():
        items.sort(
            key=lambda p: (
                0 if (p.get("pill_nonpill") or "").lower() == "pill" else 1,
                _money(p.get("unit_price")) if _money(p.get("unit_price")) is not None else 1e9,
            )
        )
        chosen[name] = items[0]
    return chosen


def load(force=False):
    """Load the catalogue, downloading it on first run."""
    global _by_name, _quotes, _meta

    products = None
    if not force and os.path.exists(CATALOG_PATH):
        with open(CATALOG_PATH) as handle:
            products = json.load(handle)
    if products is None:
        products = _fetch_catalog()

    _by_name = _index(products)

    if os.path.exists(QUOTES_PATH):
        with open(QUOTES_PATH) as handle:
            _quotes = json.load(handle)

    _meta = {
        "source": "Cost Plus Drugs",
        "url": "https://costplusdrugs.com",
        "api": API,
        "products": len(products),
        "medications": len(_by_name),
        "quotes_cached": len(_quotes),
    }
    print(f"[costplus] {len(_by_name)} medications, {len(_quotes)} quotes cached")
    return _meta


def meta():
    return dict(_meta)


def find(drug_name):
    """The Cost Plus product for a drug name, or None."""
    if not _by_name:
        return None
    key = str(drug_name or "").strip().lower()
    if not key:
        return None

    product = _by_name.get(key)
    if product:
        return product

    # Their names carry salts and combinations ("Abacavir Sulfate",
    # "Amoxicillin / Clavulanate"), so fall back to a distinctive whole word.
    for token in sorted((t for t in key.replace("-", " ").split() if len(t) >= 6), key=len, reverse=True):
        if token in _by_name:
            return _by_name[token]
        for name, candidate in _by_name.items():
            if token in name.replace("/", " ").split():
                return candidate
    return None


def _quantity_for(product):
    return PILL_QUANTITY if (product.get("pill_nonpill") or "").lower() == "pill" else NONPILL_QUANTITY


def quote(drug_name, persist=True):
    """
    The real total Cost Plus charges for one fill, cached to disk.

    Returns None when they don't carry the drug or the quote fails.
    """
    product = find(drug_name)
    if not product:
        return None

    ndc = product.get("ndc")
    quantity = _quantity_for(product)
    key = f"{ndc}:{quantity}"

    with _lock:
        cached = _quotes.get(key, "miss")
    if cached != "miss":
        return None if cached is None else {**cached, "product": product}

    import requests

    try:
        response = requests.get(API, params={"ndc": ndc, "quantity_units": quantity}, timeout=45)
        response.raise_for_status()
        results = response.json().get("results", [])
        amount = _money(results[0].get("requested_quote")) if results else None
    except Exception:
        return None  # don't cache a transient failure

    entry = None if amount is None else {"amount": amount, "quantity": quantity}
    with _lock:
        _quotes[key] = entry
    if persist:
        _save_quotes()
    return None if entry is None else {**entry, "product": product}


def _save_quotes():
    os.makedirs(DATA_DIR, exist_ok=True)
    with _lock:
        snapshot = dict(_quotes)
    with open(QUOTES_PATH, "w") as handle:
        json.dump(snapshot, handle)


def prefetch(drug_names, workers=8):
    """
    Warm the quote cache.

    One quote takes up to a couple of seconds, so doing this on demand would
    make the first search for every condition crawl. Done once at startup and
    cached to disk, searches stay instant.
    """
    wanted = []
    for name in drug_names:
        product = find(name)
        if not product:
            continue
        key = f"{product.get('ndc')}:{_quantity_for(product)}"
        if key not in _quotes:
            wanted.append(name)

    if not wanted:
        print(f"[costplus] quote cache warm ({len(_quotes)} quotes)")
        return 0

    print(f"[costplus] fetching {len(wanted)} quotes (once; cached afterwards)")
    with ThreadPoolExecutor(max_workers=workers) as pool:
        # persist=False: write the file once at the end, not 330 times from
        # eight threads.
        list(pool.map(lambda name: quote(name, persist=False), wanted))
    _save_quotes()
    print(f"[costplus] quote cache now holds {len(_quotes)} entries")
    return len(wanted)
