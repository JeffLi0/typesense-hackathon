export default function SymptomInput({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  compact = false,
}) {
  return (
    <form
      className={`search ${compact ? 'search--compact' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <svg className="search__icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="9" cy="9" r="6" />
        <line x1="13.5" y1="13.5" x2="18" y2="18" />
      </svg>
      <input
        className="search__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sore throat, fever, tired for 3 days…"
        autoFocus={autoFocus}
        aria-label="Your symptoms"
      />
      <button className="search__submit" type="submit" disabled={!value.trim()}>
        Search
      </button>
    </form>
  );
}
