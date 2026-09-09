"""
Drug cost, entirely from Cost Plus Drugs.

Everything here is read from their public API (see costplus.py). Nothing is
invented:

    amount        the real total Cost Plus charges for this fill
    quantity      the quantity that total is for
    unit_price    their published per-unit price
    strength      as they list it ("500mg")
    form          as they list it ("Tablet", "Tube of Cream")
    generic       their brand/generic classification
    url           the page you can buy it on

The single assumption is the fill size - 30 for a pill, one package otherwise -
and it is stated on screen next to the price ("30 tablets"), because the total
is quoted for exactly that quantity.

There are still no pharmacy names, addresses, distances, markups or fees. Cost
Plus is one pharmacy publishing its own prices; what any other pharmacy charges
is not in our data and the app doesn't claim it.
"""

import costplus


def price(drug_name):
    """Cost Plus quote for one drug, or None when they don't carry it."""
    quoted = costplus.quote(drug_name)
    if not quoted:
        return None

    product = quoted["product"]
    form = (product.get("form") or "").strip()
    pill = (product.get("pill_nonpill") or "").lower() == "pill"
    quantity = quoted["quantity"]

    # "30 tablets", but "30 mL" — unit abbreviations don't take a plural.
    UNITS = {"ml", "g", "gm", "mg", "mcg", "l", "oz"}
    if not pill:
        label = form or "1 package"
    elif form.lower() in UNITS:
        label = f"{quantity} {form}"
    elif form.lower().endswith("s"):
        label = f"{quantity} {form.lower()}"
    else:
        label = f"{quantity} {form.lower()}s"

    return {
        # Used for the medication artwork and the product line under the name.
        "form": f"{product.get('strength', '')} {form}".strip(),
        # Cost Plus doesn't publish an OTC flag, so we don't show that badge.
        "otc": None,
        "cost": {
            "amount": quoted["amount"],
            "quantity": quantity,
            "quantity_label": label,
            "unit_price": costplus._money(product.get("unit_price")),
            "strength": product.get("strength", ""),
            "form": form,
            "pill": pill,
            "brand_name": product.get("brand_name") or "",
            "generic": (product.get("brand_generic") or "").lower() == "generic",
            "source": "Cost Plus Drugs",
            "url": product.get("url") or "https://costplusdrugs.com",
        },
    }
