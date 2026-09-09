import MedIcon from './MedIcon.jsx';
import { money } from '../lib/cost.js';

/**
 * One medication, priced by Cost Plus Drugs.
 *
 * The price is a real total for a stated quantity, and the link goes to the
 * page you can buy it on. No other pharmacy's price is shown, because we have
 * no source for one.
 */
export default function MedicationRow({ med, hue = null }) {
  const { name, form, otc, note, cost, imageUrl } = med;

  return (
    <div className="med">
      <div className="med__head">
        <MedIcon name={name} form={form} imageUrl={imageUrl} hue={hue} />

        <div className="med__ident">
          <h4 className="med__name">
            {name}
            {otc === true && <span className="tag tag--otc">OTC</span>}
            {cost?.generic === false && <span className="tag tag--brand">Brand</span>}
          </h4>
          {note && <p className="med__note">{note}</p>}
        </div>

        {cost && (
          <div className="med__cost">
            <span className="med__unitcost">{money(cost.amount)}</span>
            <span className="med__per">{cost.quantityLabel}</span>
          </div>
        )}
      </div>

      {cost ? (
        <div className="fill">
          <p className="fill__product">
            {[cost.strength, cost.form].filter(Boolean).join(' ')}
            {cost.brandName && <span className="fill__brand">generic for {cost.brandName}</span>}
            <span className="fill__src" title="Price published by Cost Plus Drugs">
              {cost.source}
            </span>
          </p>

          <a className="goodrx-link" href={cost.url} target="_blank" rel="noreferrer">
            Buy at Cost Plus Drugs →
          </a>
        </div>
      ) : (
        <p className="fill__unpriced">Not carried by Cost Plus Drugs.</p>
      )}
    </div>
  );
}
