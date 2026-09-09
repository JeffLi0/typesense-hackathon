import { useEffect, useRef, useState } from 'react';

/**
 * The symptoms the user entered, as pills. Hovering a pill strikes it through
 * and clicking it removes that symptom — no × button, so nothing inside the
 * pill shifts position as you move across the row. Adding or removing re-runs
 * the search immediately.
 */
export default function SymptomPills({ symptoms, onChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const addRef = useRef(null);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const remove = (i) => onChange(symptoms.filter((_, idx) => idx !== i));

  const commitAdd = () => {
    const additions = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setAdding(false);
    setDraft('');
    if (additions.length) onChange([...symptoms, ...additions]);
  };

  return (
    <div className="pills">
      <span className="pills__label">Symptoms</span>

      {symptoms.map((symptom, i) => (
        <button
          key={`${symptom}-${i}`}
          type="button"
          className="pill"
          title="Click to remove"
          aria-label={`Remove ${symptom}`}
          onClick={() => remove(i)}
        >
          {symptom}
        </button>
      ))}

      {adding ? (
        <input
          ref={addRef}
          className="pill__input"
          value={draft}
          size={Math.max(draft.length, 10)}
          placeholder="add a symptom"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitAdd();
            if (e.key === 'Escape') {
              setAdding(false);
              setDraft('');
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="pill pill--add"
          onClick={() => {
            setDraft('');
            setAdding(true);
          }}
        >
          + symptom
        </button>
      )}

      {symptoms.length > 1 && (
        <button type="button" className="pills__clear" onClick={() => onChange([])}>
          Clear all
        </button>
      )}
    </div>
  );
}
