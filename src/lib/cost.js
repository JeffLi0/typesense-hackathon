/**
 * Cost maths over Cost Plus Drugs quotes.
 *
 * Every figure is a real total that pharmacy charges for a stated fill — no
 * pharmacy markups, no invented retail prices.
 *
 * The comparison that matters: for a condition with a dozen treatment options,
 * what each one costs. Pills and non-pills aren't comparable (30 tablets vs one
 * tube of cream), so the summary compares within the larger group and labels
 * what it compared.
 */
export function costSummary(medications = []) {
  const priced = medications.filter((m) => m.cost && typeof m.cost.amount === 'number');
  if (!priced.length) return null;

  const pills = priced.filter((m) => m.cost.pill);
  const others = priced.filter((m) => !m.cost.pill);
  const comparable = pills.length >= others.length ? pills : others;
  const sorted = [...comparable].sort((a, b) => a.cost.amount - b.cost.amount);

  const cheapest = sorted[0];
  const dearest = sorted[sorted.length - 1];
  const saving = sorted.length > 1 ? dearest.cost.amount - cheapest.cost.amount : 0;

  return {
    cheapest,
    dearest,
    // Real money, not a ratio: what you keep by taking the cheaper option.
    saving,
    savingPct: dearest.cost.amount > 0 ? Math.round((saving / dearest.cost.amount) * 100) : 0,
    comparableCount: comparable.length,
    priced: priced.length,
    unpriced: medications.length - priced.length,
    source: priced[0].cost.source || 'Cost Plus Drugs',
  };
}

export function money(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n >= 100 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}
