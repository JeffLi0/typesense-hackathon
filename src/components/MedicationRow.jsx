import { useState } from 'react';
import MedIcon from './MedIcon.jsx';
import { money } from '../lib/cost.js';

const miles = (n) => (typeof n === 'number' ? `${n} mi` : null);

/**
 * Picks the one pharmacy to actually recommend, and works out *why* — the point
 * is to answer "which do I pick", not to hand back a price list. Cheapest wins;
 * if somewhere closer is only slightly dearer we surface that as a single
 * alternative line rather than making the user compare a table.
 */
function recommend(pharmacies) {
  const byPrice = [...pharmacies].sort((a, b) => a.price - b.price);
  const best = byPrice[0];
  const dearest = byPrice[byPrice.length - 1];

  const located = pharmacies.filter((p) => typeof p.distanceMi === 'number');
  const closest = located.length
    ? located.reduce((a, b) => (b.distanceMi < a.distanceMi ? b : a))
    : null;

  const savings = dearest.price - best.price;
  const savingPct = dearest.price ? Math.round((savings / dearest.price) * 100) : 0;
  const bestIsClosest = closest && closest.name === best.name;

  let reason;
  if (byPrice.length === 1) reason = 'Only pharmacy nearby';
  else if (bestIsClosest) reason = `Cheapest and closest — ${money(savings)} less than ${dearest.name}`;
  else if (savings >= 0.5) reason = `Cheapest nearby — ${money(savings)} less than ${dearest.name}`;
  else reason = 'Cheapest nearby';

  // Worth mentioning a closer option only when the premium is genuinely small.
  let closerPick = null;
  if (closest && !bestIsClosest && typeof best.distanceMi === 'number') {
    const premium = closest.price - best.price;
    const nearer = best.distanceMi - closest.distanceMi;
    if (nearer > 0.3 && (premium <= 3 || premium / best.price <= 0.25)) {
      closerPick = { pharmacy: closest, premium, nearer };
    }
  }

  return { best, reason, closerPick, savings, savingPct, rest: byPrice.slice(1) };
}

export default function MedicationRow({ med, hue = null }) {
  const [showAll, setShowAll] = useState(false);
  const { name, form, otc, note, goodrx, imageUrl } = med;
  const pharmacies = goodrx?.pharmacies ?? [];
  const pick = pharmacies.length ? recommend(pharmacies) : null;

  return (
    <div className="med">
      <div className="med__head">
        <MedIcon name={name} form={form} imageUrl={imageUrl} hue={hue} />

        <div className="med__ident">
          <h4 className="med__name">
            {name}
            {otc != null && (
              <span className={`tag ${otc ? 'tag--otc' : 'tag--rx'}`}>{otc ? 'OTC' : 'Rx'}</span>
            )}
          </h4>
          {form && <p className="med__form">{form}</p>}
          {note && <p className="med__note">{note}</p>}
        </div>
      </div>

      {pick && (
        <div className="fill">
          <div className="fill__pick">
            <div className="fill__where">
              <span className="fill__badge">Best pick</span>
              <span className="fill__name">{pick.best.name}</span>
              <span className="fill__meta">
                {[miles(pick.best.distanceMi), pick.best.address].filter(Boolean).join(' · ')}
              </span>
            </div>
            <span className="fill__pricebox">
              <span className="fill__price">{money(pick.best.price)}</span>
              {pick.savings > 0.5 && (
                <span className="fill__save">save {money(pick.savings)}</span>
              )}
            </span>
          </div>

          <p className="fill__reason">{pick.reason}</p>

          {pick.closerPick && (
            <p className="fill__alt">
              Closer: <strong>{pick.closerPick.pharmacy.name}</strong> at{' '}
              {miles(pick.closerPick.pharmacy.distanceMi)} for{' '}
              {money(pick.closerPick.pharmacy.price)}
              {pick.closerPick.premium > 0 && ` (+${money(pick.closerPick.premium)})`}
            </p>
          )}

          {pick.rest.length > 0 && (
            <>
              <button
                type="button"
                className="fill__more"
                aria-expanded={showAll}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? 'Hide other pharmacies'
                  : `${pick.rest.length} other ${pick.rest.length === 1 ? 'pharmacy' : 'pharmacies'}`}
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <polyline points="3,4.5 6,7.5 9,4.5" />
                </svg>
              </button>

              {showAll && (
                <div className="fill__list">
                  {pick.rest.map((p) => (
                    <div className="fill__row" key={p.name}>
                      <div className="fill__where">
                        <span className="fill__name">{p.name}</span>
                        <span className="fill__meta">
                          {[miles(p.distanceMi), p.address].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <span className="fill__rowprice">
                        {money(p.price)}
                        <span className="fill__delta">+{money(p.price - pick.best.price)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {goodrx?.url && (
            <a className="goodrx-link" href={goodrx.url} target="_blank" rel="noreferrer">
              Get the GoodRx coupon →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
