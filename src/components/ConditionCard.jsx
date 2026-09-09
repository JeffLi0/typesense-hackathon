import { useState } from 'react';
import MedicationRow from './MedicationRow.jsx';

export default function ConditionCard({ condition, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const { name, summary, confidence, symptoms, matchedSymptoms, medications } = condition;
  const matched = new Set(matchedSymptoms.map((s) => s.toLowerCase()));

  return (
    <article className={`card ${open ? 'card--open' : ''}`}>
      <button
        className="card__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        type="button"
      >
        <div className="card__title">
          <h2>{name}</h2>
          {matchedSymptoms.length > 0 && (
            <span className="card__matchcount">
              {matchedSymptoms.length} of your symptoms
            </span>
          )}
        </div>
        {confidence != null && <Confidence value={confidence} />}
        <svg className="card__chevron" viewBox="0 0 16 16" aria-hidden="true">
          <polyline points="4,6 8,10 12,6" />
        </svg>
      </button>

      {open && (
        <div className="card__body">
          {summary && <p className="card__summary">{summary}</p>}

          <section className="section">
            <h3 className="section__label">Known symptoms</h3>
            <div className="chips">
              {symptoms.map((s) => (
                <span
                  key={s}
                  className={`chip ${matched.has(s.toLowerCase()) ? 'chip--match' : ''}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section className="section">
            <h3 className="section__label">Medication &amp; pricing</h3>
            <div className="meds">
              {medications.length ? (
                medications.map((med) => <MedicationRow key={med.name} med={med} />)
              ) : (
                <p className="muted">No medications listed.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

function Confidence({ value }) {
  const pct = Math.round(value * 100);
  return (
    <div className="confidence" title={`${pct}% match`}>
      <div className="confidence__track">
        <div className="confidence__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="confidence__pct">{pct}%</span>
    </div>
  );
}
