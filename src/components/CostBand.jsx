import { money } from '../lib/cost.js';

/**
 * The money answer, in real dollars from Cost Plus Drugs.
 *
 * The second stat used to read "priciest option costs 4.3× more", which told
 * you nothing you could act on — a ratio with no dollars and no next step. It
 * now names the two drugs and the cash difference between them, which is a
 * question you can put to a prescriber.
 */
export default function CostBand({ cost }) {
  if (!cost) return null;

  // Medications are keyed by name — there's no id on them.
  const showSaving = cost.saving >= 1 && cost.cheapest.name !== cost.dearest.name;
  const showCoverage = cost.unpriced > 0 || cost.priced >= 3;

  return (
    <div className="costband">
      <div className="costband__stat">
        <span className="costband__label">Cheapest option</span>
        <span className="costband__value">{money(cost.cheapest.cost.amount)}</span>
        <span className="costband__note">
          {cost.cheapest.name} · {cost.cheapest.cost.quantity_label ?? cost.cheapest.cost.quantityLabel}
        </span>
      </div>

      {showSaving && (
        <div className="costband__stat costband__stat--save">
          <span className="costband__label">Ask about the cheaper one</span>
          <span className="costband__value">
            {money(cost.saving)}
            <em className="costband__pct">saved</em>
          </span>
          <span className="costband__note">
            {cost.cheapest.name} costs {money(cost.cheapest.cost.amount)}, {cost.dearest.name}{' '}
            {money(cost.dearest.cost.amount)} — both treat this condition, so it's worth
            asking your prescriber which fits.
          </span>
        </div>
      )}

      {showCoverage && (
        <div className="costband__stat costband__stat--meta">
          <span className="costband__label">Priced</span>
          <span className="costband__value costband__value--sm">
            {cost.priced}
            {cost.unpriced > 0 && (
              <span className="costband__of"> of {cost.priced + cost.unpriced}</span>
            )}
          </span>
          <span className="costband__note">
            {cost.source}
            {cost.unpriced > 0 && ` · ${cost.unpriced} not carried`}
          </span>
        </div>
      )}
    </div>
  );
}
