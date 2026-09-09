import { useState } from 'react';
import MedicationRow from './MedicationRow.jsx';
import { paletteFor } from './MedIcon.jsx';
import CostBand from './CostBand.jsx';
import { costSummary, money } from '../lib/cost.js';

// Long medication lists get collapsed — some conditions carry a dozen, and they
// would otherwise bury everything else on the page.
const MEDS_BEFORE_COLLAPSE = 4;

/**
 * The whole page *is* the answer, and the answer leads with money: what the
 * cheapest route to treatment costs, and how much choosing the right pharmacy
 * saves. The condition is how we get there, not the destination.
 *
 * Left column is about the disease (symptoms, treatment approach, other
 * candidates — each with its own starting price); right column is the priced
 * medication shelf.
 */
export default function ResultStage({ result, alternatives, onSelect, isTopMatch }) {
  const [showAllMeds, setShowAllMeds] = useState(false);
  const { name, summary, confidence, symptoms, matchedSymptoms, treatments, medications } = result;

  const matched = new Set(matchedSymptoms.map((s) => s.toLowerCase()));
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const hues = paletteFor(medications.map((m) => m.name));
  const cost = costSummary(medications);
  const overflowing = medications.length > MEDS_BEFORE_COLLAPSE;
  const visible = showAllMeds ? medications : medications.slice(0, MEDS_BEFORE_COLLAPSE);

  return (
    <div className="stage">
      <header className="stage__head">
        <div className="stage__eyebrow">
          {isTopMatch ? 'Most likely' : 'Possible match'}
          {pct != null && (
            <>
              <span className="dot" aria-hidden="true" />
              <span className="stage__pct">{pct}% match</span>
            </>
          )}
        </div>
        <h1 className="stage__name">{name}</h1>
        {summary && <p className="stage__summary">{summary}</p>}
      </header>

      <CostBand cost={cost} />

      <div className="stage__body">
        <div className="stage__col">
          <div className="col__scroll">
            <section className="panel">
              <h2 className="panel__label">
                Known symptoms
                {matchedSymptoms.length > 0 && (
                  <span className="panel__count">
                    {matchedSymptoms.length} of {symptoms.length} match yours
                  </span>
                )}
              </h2>
              <div className="chips">
                {symptoms.map((s) => {
                  const hit = matched.has(s.toLowerCase());
                  return (
                    <span key={s} className={`chip ${hit ? 'chip--match' : ''}`}>
                      {hit && (
                        <svg className="chip__tick" viewBox="0 0 12 12" aria-hidden="true">
                          <polyline points="2,6.5 4.8,9 10,3" />
                        </svg>
                      )}
                      {s}
                    </span>
                  );
                })}
              </div>
            </section>

            {treatments.length > 0 && (
              <section className="panel treat">
                <h2 className="panel__label">How it&apos;s treated</h2>
                <ul className="treat__list">
                  {treatments.map((t) => (
                    <li key={t} className="treat__item">{t}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {alternatives.length > 0 && (
            <section className="panel panel--alts">
              <h2 className="panel__label">Also possible</h2>
              <div className="altlist">
                {alternatives.map((alt) => {
                  const p = alt.confidence != null ? Math.round(alt.confidence * 100) : null;
                  const altCost = costSummary(alt.medications);
                  return (
                    <button
                      key={alt.id}
                      type="button"
                      className="altrow"
                      onClick={() => onSelect(alt.id)}
                    >
                      <span className="altrow__name">{alt.name}</span>
                      <span className="altrow__cost">
                        {altCost ? `from ${money(altCost.cheapest)}` : 'no pricing'}
                      </span>
                      {p != null && <span className="altrow__pct">{p}%</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <section className="panel panel--meds">
          <h2 className="panel__label">
            What to take &amp; what it costs
            {medications.length > 0 && (
              <span className="panel__count">
                {medications.length} option{medications.length === 1 ? '' : 's'}
              </span>
            )}
          </h2>

          {medications.length === 0 ? (
            <NoMedications name={name} hasTreatments={treatments.length > 0} />
          ) : (
            <div className="meds">
              {visible.map((med, i) => (
                <MedicationRow key={med.name} med={med} hue={hues[i]} />
              ))}

              {overflowing && (
                <button
                  type="button"
                  className="meds__more"
                  aria-expanded={showAllMeds}
                  onClick={() => setShowAllMeds((v) => !v)}
                >
                  {showAllMeds
                    ? 'Show fewer medications'
                    : `Show all ${medications.length} medications`}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * The symptom index and the medication index don't cover the same conditions,
 * so a match with no drug data is normal rather than an error. Say that plainly
 * instead of leaving a blank column.
 */
function NoMedications({ name, hasTreatments }) {
  return (
    <div className="nomeds">
      <svg className="nomeds__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="7.5" width="17" height="13" rx="3" />
        <path d="M8 7.5V6a4 4 0 0 1 8 0v1.5" />
        <path d="M12 11.5v5M9.5 14h5" />
      </svg>
      <h3 className="nomeds__title">Nothing to price for {name}</h3>
      <p className="nomeds__body">
        Our medication database doesn&apos;t cover this condition, so there are no
        pharmacy prices to compare — which often means it isn&apos;t treated with a
        prescription at all.
        {hasTreatments && ' The treatment approach is on the left.'}
      </p>
    </div>
  );
}
