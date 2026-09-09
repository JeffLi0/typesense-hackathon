import { useCallback, useEffect, useRef, useState } from 'react';
import { diagnose, health } from './lib/api.js';
import SymptomPills from './components/SymptomPills.jsx';
import SpeedStat, { TypesenseMark } from './components/SpeedStat.jsx';
import SuggestionList, { useSymptomSuggest } from './components/SymptomSuggest.jsx';
import ResultStage from './components/ResultStage.jsx';
import CandidateGrid from './components/CandidateGrid.jsx';

// Above this, we're confident enough to hand the whole page to one condition.
// Below it, we show the contenders side by side instead of faking certainty.
const TAKEOVER_CONFIDENCE = 0.7;

// Chosen because they land on conditions the medication dataset actually
// covers, so the cost story is on screen in one click. Verified against the
// live backend — re-check these if the datasets change.
const EXAMPLES = [
  ['joint pain', 'morning stiffness', 'swollen joints'],
  ['tremor', 'slow movement', 'stiffness'],
  ['itchy scaly skin patches', 'red plaques'],
  ['frequent urination', 'excessive thirst', 'fatigue'],
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
        </div>
      </header>

      <main className="screen__body">
        {status === 'loading' && <Searching />}

        {status === 'error' && (
          <div className="notice">
            <strong>Search is unavailable.</strong>
            <span>{error}</span>
            <button type="button" className="notice__retry" onClick={() => run(symptoms)}>
              Try again
            </button>
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
          Informational only — not a diagnosis. Prices from Cost Plus Drugs;
          other pharmacies will differ.
        </span>
        <TypesenseMark prefix="Search powered by" />
      </footer>
    </div>
  );
}

// "fever, sore thr" -> ["fever, ", "sore thr"] so the typeahead completes only
// what's being typed right now.
function splitTrailing(text) {
  const at = text.lastIndexOf(',');
  return at === -1 ? ['', text] : [text.slice(0, at + 1), text.slice(at + 1)];
}

function Home({ draft, setDraft, onSubmit, onExample }) {
  const [backend, setBackend] = useState(null);
  const [head, tail] = splitTrailing(draft);

  const suggest = useSymptomSuggest({
    value: tail.trimStart(),
    onAccept: (text) => setDraft(`${head}${head ? ' ' : ''}${text}, `),
  });

  // One quiet check on load: if the API is down or still building its index,
  // say so here rather than after the user types.
  useEffect(() => {
    let live = true;
    health().then((h) => live && setBackend(h));
    return () => {
      live = false;
    };
  }, []);

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
          it and what each option actually costs — so you can ask for the cheaper
          one.
        </p>

        <form
          className="searchwrap"
          onSubmit={(e) => {
            e.preventDefault();
            if (suggest.open && suggest.active >= 0) return;
            suggest.close();
            onSubmit();
          }}
        >
          <div className="search">
            <input
              className="search__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={suggest.onKeyDown}
              onBlur={suggest.close}
              placeholder="sore throat, fever, tired for 3 days…"
              aria-label="Your symptoms"
              aria-autocomplete="list"
              aria-controls={suggest.listId}
              autoComplete="off"
              autoFocus
            />
            <button className="search__submit" type="submit" disabled={!draft.trim()}>
              Diagnose
            </button>
          </div>
          <SuggestionList suggest={suggest} />
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
          <Claim title="A real price, not an estimate">
            Every drug is quoted from Cost Plus Drugs — the actual total they
            charge, linked to the page you can buy it on.
          </Claim>
          <Claim title="The cheaper equivalent">
            Treatments for the same condition can differ a hundredfold in cost.
            We rank them, so you know what to ask about.
          </Claim>
          <Claim title="Real data, in milliseconds">
            Conditions and medications are retrieved from an indexed dataset by
            Typesense — matched by search, never invented by a language model.
          </Claim>
        </div>

        {backend && !backend.ok && (
          <p className="home__warn">
            {backend.reason ||
              'Search backend is still building its index. Give it a moment.'}
          </p>
        )}

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
