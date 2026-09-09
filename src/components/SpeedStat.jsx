const fmt = (ms) =>
  ms == null ? '—' : ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;

/**
 * The Google-style "N results in X seconds" line — except Typesense answers in
 * single-digit milliseconds, so the number is the point.
 */
export default function SpeedStat({ count, searchTimeMs }) {
  return (
    <div className="speed">
      <span className="speed__count">
        {count} {count === 1 ? 'condition' : 'conditions'}
      </span>
      <span className="speed__in">in</span>
      <span className="speed__time">{fmt(searchTimeMs)}</span>
      <span className="speed__sep" aria-hidden="true" />
      <TypesenseMark />
    </div>
  );
}

export function TypesenseMark({ prefix = 'Powered by' }) {
  return (
    <span className="ts">
      <svg className="ts__bolt" viewBox="0 0 12 16" aria-hidden="true">
        <path d="M7 0 L1 9 h4 l-1 7 6-9 h-4 z" />
      </svg>
      <span className="ts__prefix">{prefix}</span>
      <span className="ts__name">Typesense</span>
    </span>
  );
}
