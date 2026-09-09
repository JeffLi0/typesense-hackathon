/**
 * Cost maths, shared by everything that quotes a price.
 *
 * The tricky part: a condition's medication list is a set of *options*, not a
 * regimen — nobody takes all twelve diabetes drugs. So we never sum the list.
 * Instead we report:
 *
 *   cheapest   the least you could pay to start treating this
 *   dearest    the most, if you're prescribed the expensive option
 *   saving     the biggest amount pharmacy choice alone can save you, on a
 *              single drug — the number the app exists to surface
 */
export function costSummary(medications = []) {
  let cheapest = Infinity;
  let dearest = 0;
  let saving = 0;
  let savingOn = null;
  let savingFrom = null;
  let savingTo = null;
  let priced = 0;

  for (const med of medications) {
    const prices = (med.goodrx?.pharmacies ?? [])
      .map((p) => p.price)
      .filter((n) => typeof n === 'number' && Number.isFinite(n));

    if (!prices.length) continue;
    priced++;

    const lo = Math.min(...prices);
    const hi = Math.max(...prices);

    cheapest = Math.min(cheapest, lo);
    dearest = Math.max(dearest, lo);

    if (hi - lo > saving) {
      saving = hi - lo;
      savingOn = med.name;
      savingFrom = hi;
      savingTo = lo;
    }
  }

  if (!priced) return null;

  return {
    cheapest,
    dearest,
    // A meaningful spread only exists when several drugs are priced.
    hasRange: dearest - cheapest > 0.01,
    saving,
    savingOn,
    savingFrom,
    savingTo,
    // % off the worst nearby price for the drug with the biggest spread
    savingPct: savingFrom ? Math.round((saving / savingFrom) * 100) : 0,
    priced,
    unpriced: medications.length - priced,
  };
}

export const money = (n) =>
  typeof n === 'number' && Number.isFinite(n)
    ? n >= 100
      ? `$${Math.round(n)}`
      : `$${n.toFixed(2)}`
    : '—';
