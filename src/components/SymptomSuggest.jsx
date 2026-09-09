import { useEffect, useId, useRef, useState } from 'react';
import { suggestSymptoms } from '../lib/suggest.js';

/**
 * Typeahead over the 911 distinct symptom phrases in the dataset.
 *
 * Renders only the dropdown - the caller owns the <input>, because the home
 * page and the "+ symptom" pill need different-looking inputs over the same
 * behaviour. Give it the current text and it hands back a suggestion list plus
 * the keyboard handler to attach.
 */
export function useSymptomSuggest({ value, onAccept, enabled = true }) {
  const [items, setItems] = useState([]);
  const [timing, setTiming] = useState(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const requestRef = useRef(null);
  // Set while we're applying a suggestion, so the resulting value change
  // doesn't immediately re-open the dropdown.
  const acceptedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    if (acceptedRef.current) {
      acceptedRef.current = false;
      setItems([]);
      setOpen(false);
      return undefined;
    }

    const query = value.trim();
    if (query.length < 2) {
      setItems([]);
      setOpen(false);
      return undefined;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    // No debounce on purpose: Typesense answers these in under a millisecond,
    // and showing that is the point.
    suggestSymptoms(query, { signal: controller.signal })
      .then(({ items: found, searchTimeMs }) => {
        if (controller.signal.aborted) return;
        setItems(found);
        setTiming(searchTimeMs);
        setActive(-1);
        setOpen(found.length > 0);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [value, enabled]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const accept = (item) => {
    acceptedRef.current = true;
    setOpen(false);
    setItems([]);
    onAccept(item.text);
  };

  /** Attach to the input. Returns true when it handled the key. */
  const onKeyDown = (event) => {
    if (!open || !items.length) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
      return true;
    }
    if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      accept(items[active]);
      return true;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      return true;
    }
    return false;
  };

  return {
    open: open && items.length > 0,
    items,
    active,
    timing,
    listId,
    accept,
    onKeyDown,
    close: () => setOpen(false),
  };
}

export default function SuggestionList({ suggest, compact = false }) {
  if (!suggest.open) return null;

  return (
    <ul className={`suggest ${compact ? 'suggest--compact' : ''}`} id={suggest.listId} role="listbox">
      {suggest.items.map((item, i) => (
        <li key={item.text} role="option" aria-selected={i === suggest.active}>
          <button
            type="button"
            className={`suggest__item ${i === suggest.active ? 'is-active' : ''}`}
            // Fires before blur, so the click isn't lost when the input closes.
            onMouseDown={(e) => {
              e.preventDefault();
              suggest.accept(item);
            }}
          >
            <span
              className="suggest__text"
              dangerouslySetInnerHTML={{ __html: item.html }}
            />
            {item.count > 1 && (
              <span className="suggest__count">{item.count} conditions</span>
            )}
          </button>
        </li>
      ))}

      {suggest.timing != null && (
        <li className="suggest__foot" aria-hidden="true">
          <span>
            {suggest.items.length} suggestion{suggest.items.length === 1 ? '' : 's'} in{' '}
            <strong>{suggest.timing < 1 ? '<1' : suggest.timing} ms</strong>
          </span>
          <span className="suggest__brand">Typesense</span>
        </li>
      )}
    </ul>
  );
}
