import { costSummary, money } from '../lib/cost.js';

/**
 * Shown when nothing scores high enough to take over the page. Rather than
 * pretending to be sure, lay the contenders side by side — with what each one
 * would cost to treat, so the money question stays answerable even while the
 * diagnosis is uncertain. One click promotes any of them to the full stage.
 */
export default function CandidateGrid({ results, onSelect }) {
  return (
    <div className="candidates">
      <header className="candidates__head">
        <h1 className="candidates__title">A few things could fit</h1>
        <p className="candidates__sub">
          Add another symptom to narrow it down, or open one to see what it costs to treat.
        </p>
      </header>

      <div className="candidates__grid">
        {results.map((r) => {
          const cost = costSummary(r.medications);
          return (
            <button key={r.id} type="button" className="candidate" onClick={() => onSelect(r.id)}>
              <div className="candidate__top">
                <h2 className="candidate__name">{r.name}</h2>
                {r.confidence != null && (
                  <span className="candidate__pct">{Math.round(r.confidence * 100)}%</span>
                )}
              </div>

              {r.matchedSymptoms.length > 0 && (
                <div className="chips chips--tight">
                  {r.matchedSymptoms.slice(0, 4).map((s) => (
                    <span key={s} className="chip chip--match chip--sm">{s}</span>
                  ))}
                </div>
              )}

              <div className="candidate__cost">
                {cost ? (
                  <>
                    <span className="candidate__from">
                      from <strong>{money(cost.cheapest)}</strong>
                    </span>
                    {cost.saving > 0.5 && (
                      <span className="candidate__save">save {money(cost.saving)}</span>
                    )}
                  </>
                ) : (
                  <span className="candidate__from">no pricing available</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
