import { money } from '../lib/cost.js';

/**
 * The headline answer to "what will this cost me". Sits directly under the
 * condition name, above everything clinical — the price is the point of the
 * app, not a footnote to a diagnosis.
 */
export default function CostBand({ cost }) {
  if (!cost) return null;

  return (
    <div className="costband">
      <div className="costband__stat">
        <span className="costband__label">Cheapest way to treat it</span>
        <span className="costband__value">{money(cost.cheapest)}</span>
        <span className="costband__note">
          {cost.hasRange
            ? `up to ${money(cost.dearest)} depending on what you're prescribed`
            : `at the best-priced pharmacy nearby`}
        </span>
      </div>

      {cost.saving > 0.5 && (
        <div className="costband__stat costband__stat--save">
          <span className="costband__label">You could save</span>
          <span className="costband__value">
            {money(cost.saving)}
            {cost.savingPct > 0 && <em className="costband__pct">{cost.savingPct}% off</em>}
          </span>
          <span className="costband__note">
            on {cost.savingOn} — {money(cost.savingFrom)} at the priciest pharmacy nearby,{' '}
            {money(cost.savingTo)} at the cheapest
          </span>
        </div>
      )}

      <div className="costband__stat costband__stat--meta">
        <span className="costband__label">Priced options</span>
        <span className="costband__value costband__value--sm">
          {cost.priced}
          {cost.unpriced > 0 && <span className="costband__of"> of {cost.priced + cost.unpriced}</span>}
        </span>
        <span className="costband__note">
          {cost.unpriced > 0
            ? `${cost.unpriced} without a published price`
            : 'all with live pharmacy pricing'}
        </span>
      </div>
    </div>
  );
}
