"""
The original terminal demo, kept working against the same code the API uses.

    ./.venv/bin/python server/cli.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import costplus
import index
import pharma
import pricing
from api import _load_disease_rows, _load_pharma, _confidence, _coverage


def main():
    costplus.load()
    index.ensure_index(_load_disease_rows)
    pharma.load(_load_pharma())

    query = input("Input symptoms: ")
    hits, ms = index.search(query, 3)
    print(f'\nQuery: "{query}"  ({ms} ms in Typesense)\n')

    phrases = [p.strip() for p in query.split(",") if p.strip()]
    for hit in hits:
        doc = hit["document"]
        name = doc["disease"]
        confidence = _confidence(hit, _coverage(phrases, index.split_list(doc["symptoms"])))
        print(f"  {name}  ({confidence:.0%} match)" if confidence else f"  {name}")
        print(f"    Treatments: {doc['treatments']}")

        meds = pharma.medications_for(name, pricing.price)
        if not meds:
            print("    No medication data for this condition")
        for med in meds:
            cost = med["cost"]
            amount = (
                f"${cost['amount']:.2f} for {cost['quantity_label']}"
                if cost
                else "not carried by Cost Plus"
            )
            print(f"    - {med['name']:<28} {amount}")
        print()


if __name__ == "__main__":
    main()
