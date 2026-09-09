import { useCallback, useEffect, useRef, useState } from 'react';
import { diagnose, USING_MOCK_DATA } from './lib/api.js';
import SymptomPills from './components/SymptomPills.jsx';
import SpeedStat, { TypesenseMark } from './components/SpeedStat.jsx';
import ResultStage from './components/ResultStage.jsx';
import CandidateGrid from './components/CandidateGrid.jsx';

// Above this, we're confident enough to hand the whole page to one condition.
// Below it, we show the contenders side by side instead of faking certainty.
const TAKEOVER_CONFIDENCE = 0.7;

const EXAMPLES = [
  ['sore throat', 'fever', 'swollen glands'],
  ['headache', 'nausea', 'light sensitivity'],
  ['runny nose', 'sneezing', 'itchy eyes'],
  ['heartburn', 'chest pain'],
];

// "sore throat, fever and chills" -> ["sore throat", "fever", "chills"]
const parseSymptoms = (text) =>
  text
    .split(/,|\band\b|\+|;/i)
    .map((s) => s.trim())
    .filter(Boolean);

export default function App() {
  const [symptoms, setSymptoms] = useState([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [results, setResults] = useState([]);
  const [timing, setTiming] = useState(null);
  const [error, setError] = useState('');
  const [pinnedId, setPinnedId] = useState(null); // a candidate the user opened
  const requestRef = useRef(null);

  const key = symptoms.join('|');

  const run = useCallback(async (list) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setStatus('loading');
    setError('');

    try {
      const { results: found, searchTimeMs } = await diagnose(list, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResults(found);
      setTiming(searchTimeMs);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted || err.name === 'AbortError') return;
      setError(err.message || 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  // Any change to the pills re-runs the search. Editing symptoms *is* the
  // interaction — there's no second search button to press.
  useEffect(() => {
    if (!symptoms.length) return;
    setPinnedId(null);
    run(symptoms);
  }, [key, run]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => requestRef.current?.abort(), []);

  function start(list) {
    if (!list.length) return;
    setSymptoms(list);
    setDraft('');
  }

  function reset() {
    requestRef.current?.abort();
    setSymptoms([]);
    setResults([]);
    setTiming(null);
    setStatus('idle');
    setError('');
    setPinnedId(null);
  }

  // Removing the last pill returns you to the opening screen.
  useEffect(() => {
    if (!symptoms.length && status !== 'idle') reset();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!symptoms.length) {
    return (
      <Home
        draft={draft}
        setDraft={setDraft}
        onSubmit={() => start(parseSymptoms(draft))}
        onExample={start}
      />
    );
  }

  const top = results[0];
  const pinned = pinnedId ? results.find((r) => r.id === pinnedId) : null;
  const hero = pinned ?? (top && (top.confidence ?? 0) >= TAKEOVER_CONFIDENCE ? top : null);

  return (
    <div className="screen">
      <header className="bar">
        <SymptomPills symptoms={symptoms} onChange={setSymptoms} />
        <div className="bar__right">
          {status === 'done' && (
            <SpeedStat count={results.length} searchTimeMs={timing} />
          )}
          {USING_MOCK_DATA && <span className="tag tag--demo">demo data</span>}
        </div>
      </header>

      <main className="screen__body">
        {status === 'loading' && <Searching />}

        {status === 'error' && (
          <div className="notice">
            <strong>Couldn't reach the backend.</strong>
            <span>{error}</span>
          </div>
        )}

        {status === 'done' &&
          (results.length === 0 ? (
            <div className="notice">
              <strong>Nothing matched those symptoms.</strong>
              <span>Try describing them a different way.</span>
            </div>
          ) : hero ? (
            <ResultStage
              key={hero.id}
              result={hero}
              isTopMatch={hero.id === top.id}
              alternatives={results.filter((r) => r.id !== hero.id)}
              onSelect={setPinnedId}
            />
          ) : (
            <CandidateGrid results={results} onSelect={setPinnedId} />
          ))}
      </main>

      <footer className="screen__foot">
        <span>
          Informational only — not a diagnosis. Prices are GoodRx estimates.
        </span>
        <TypesenseMark prefix="Search powered by" />
      </footer>
    </div>
  );
}

function Home({ draft, setDraft, onSubmit, onExample }) {
  return (
    <div className="screen screen--home">
      <main className="home">
        <span className="home__kicker">
          <svg className="home__bolt" viewBox="0 0 12 16" aria-hidden="true">
            <path d="M7 0 L1 9 h4 l-1 7 6-9 h-4 z" />
          </svg>
          Real search of real data — <strong>not an AI guess</strong>
        </span>
        <h1 className="home__title">
          What's wrong — and<br />what will it cost?
        </h1>
        <p className="home__sub">
          Describe your symptoms. We'll match the condition, then show what treats
          it, what each pharmacy near you charges, and where to fill it for less.
        </p>

        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            className="search__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sore throat, fever, tired for 3 days…"
            aria-label="Your symptoms"
            autoFocus
          />
          <button className="search__submit" type="submit" disabled={!draft.trim()}>
            Diagnose
          </button>
        </form>

        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.join()}
              type="button"
              className="example"
              onClick={() => onExample(ex)}
            >
              {ex.join(', ')}
            </button>
          ))}
        </div>

        <div className="home__claims">
          <Claim title="The price before the counter">
            Every medication comes with what nearby pharmacies actually charge,
            so the cost isn't a surprise when you go to fill it.
          </Claim>
          <Claim title="The same drug, for less">
            Prices for one prescription can differ by hundreds between pharmacies
            a mile apart. We show you which one to walk into.
          </Claim>
          <Claim title="Real data, in milliseconds">
            Conditions and medications are retrieved from an indexed dataset by
            Typesense — matched by search, never invented by a language model.
          </Claim>
        </div>

        <div className="home__ts">
          <TypesenseMark />
        </div>
      </main>
    </div>
  );
}

function Claim({ title, children }) {
  return (
    <div className="claim">
      <h2 className="claim__title">{title}</h2>
      <p className="claim__body">{children}</p>
    </div>
  );
}

function Searching() {
  return (
    <div className="searching">
      <div className="searching__pulse" />
      <span>Searching</span>
    </div>
  );
}
