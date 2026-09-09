"""
Disease -> medications, from the K-Paths pharmaDB dataset.

Two things to know about this data:

1. It covers ~97 diseases, while the symptom dataset has ~392. Most conditions
   therefore have NO medication rows. That is expected, not a failure - the
   frontend has a first-class state for it.

2. `label` is one of "Disease-modifying", "Palliates" or "Non indications", and
   the last one means the drug explicitly *neither treats nor palliates* the
   disease. Those rows must never be shown as treatment options, so they are
   filtered out here.
"""

import re

import pandas as pd

# Rows we're willing to present as medication options.
TREATS = ("Disease-modifying", "Palliates")

# How each surviving label reads in the UI.
LABEL_NOTE = {
    "Disease-modifying": "Treats the underlying condition",
    "Palliates": "Relieves symptoms",
}

_df = None
_lower_names = None


def normalize_name(name):
    """
    Put the two datasets' disease names into the same shape before comparing.

    They disagree on punctuation and qualifiers - "Parkinson Disease" vs
    "parkinson's disease", "Gastroesophageal Reflux Disease (GERD)" vs
    "gastroesophageal reflux disease" - and each mismatch silently costs a
    condition all of its medications.
    """
    text = str(name or "").lower().strip()
    text = re.sub(r"\([^)]*\)", " ", text)   # drop "(GERD)" style qualifiers
    text = text.replace("&", " and ")
    text = re.sub(r"[\u2018\u2019']s\b", "", text)  # possessives
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load(dataframe):
    """Install the dataset and pre-compute the normalized name column once."""
    global _df, _lower_names
    _df = dataframe[dataframe["label"].isin(TREATS)].reset_index(drop=True)
    _lower_names = _df["disease_name"].map(normalize_name)
    dropped = len(dataframe) - len(_df)
    print(f"[pharma] {len(_df)} usable drug-disease rows ({dropped} 'Non indications' filtered out)")
    print(f"[pharma] covering {_df['disease_name'].nunique()} diseases")


def _word_overlap(a, b):
    """True when one disease name contains the other as whole words."""
    if a == b:
        return True
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    if len(shorter) < 4:
        return False
    return re.search(rf"\b{re.escape(shorter)}\b", longer) is not None


def find_rows(disease_name):
    """
    Drug rows for a disease name. Exact case-insensitive match first, then a
    whole-word containment match, because the two datasets don't share a naming
    convention ("Psoriasis" vs "psoriatic arthritis").
    """
    if _df is None:
        return pd.DataFrame()

    name = normalize_name(disease_name)
    if not name:
        return _df.iloc[0:0]

    exact = _df[_lower_names == name]
    if not exact.empty:
        return exact

    mask = _lower_names.apply(lambda d: _word_overlap(d, name))
    return _df[mask]


def _clean_desc(text, limit=150):
    """First sentence of a drug description, trimmed for a one-line note."""
    text = str(text or "").strip()
    if not text or text.lower() == "nan":
        return ""
    sentence = re.split(r"(?<=[.!?])\s+", text)[0]
    if len(sentence) > limit:
        sentence = sentence[: limit - 1].rsplit(" ", 1)[0] + "..."
    return sentence


def medications_for(disease_name, price_lookup, limit=12):
    """
    Medications for a disease, deduplicated by drug name and priced.

    Disease-modifying drugs are listed before palliative ones, and within each
    group the cheapest comes first - this is a cost tool, so the order is the
    order someone would actually consider them in.
    """
    rows = find_rows(disease_name)
    if rows.empty:
        return []

    seen = {}
    for _, row in rows.iterrows():
        drug = str(row["drug_name"]).strip()
        if not drug or drug.lower() in seen:
            continue

        # Cost Plus supplies the price, the strength/form and the brand it is a
        # generic for. It does not publish an OTC flag, so we don't show one.
        priced = price_lookup(drug)
        seen[drug.lower()] = {
            "name": drug,
            "form": priced["form"] if priced else "",
            "otc": priced["otc"] if priced else None,
            "note": _clean_desc(row.get("drug_desc")) or LABEL_NOTE.get(row["label"], ""),
            "label": row["label"],
            "image_url": None,
            "cost": priced["cost"] if priced else None,
        }

    meds = list(seen.values())
    meds.sort(
        key=lambda m: (
            0 if m["label"] == "Disease-modifying" else 1,
            m["cost"]["amount"] if m.get("cost") else float("inf"),
        )
    )
    for m in meds:
        m.pop("label", None)
    return meds[:limit]


def description_for(disease_name):
    """
    Real disease description from the dataset - exact name matches only.

    The looser containment match is fine for medications (drugs for "psoriatic
    arthritis" are reasonable to show under "Arthritis") but not for prose: it
    would print psoriatic arthritis's definition under plain Arthritis, which is
    simply wrong on screen. No description beats a wrong one.
    """
    if _df is None:
        return ""
    name = normalize_name(disease_name)
    exact = _df[_lower_names == name]
    if exact.empty:
        return ""
    return _clean_desc(exact.iloc[0].get("disease_desc"), limit=240)


def drug_names():
    """Every drug we could ever show, for warming the price cache."""
    if _df is None:
        return []
    return sorted(set(_df["drug_name"].astype(str).str.strip()))
