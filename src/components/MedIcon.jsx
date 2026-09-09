/**
 * Medication artwork. The backend can send an `image_url` per medication and it
 * wins; until then we draw the dosage form from its description (capsule,
 * tablet, inhaler, spray, syrup) in a colour derived from the drug name, so
 * every medication looks distinct and nothing depends on a network image.
 */

const HUES = [188, 258, 12, 148, 32, 212, 330, 96];

// FNV-1a: mixes short, similar drug names far better than a naive sum, so
// medications sitting next to each other don't come out the same colour.
const hueFor = (name) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return HUES[h % HUES.length];
};

/**
 * Colours for a whole medication list at once. Each drug keeps its own
 * hash-derived hue where it can; anything that collides with one already taken
 * steps to the next free slot — so two medications shown together are never the
 * same colour (up to the palette size).
 */
export function paletteFor(names) {
  const used = new Set();
  return names.map((name) => {
    let hue = hueFor(name);
    let guard = 0;
    while (used.has(hue) && guard < HUES.length) {
      hue = HUES[(HUES.indexOf(hue) + 1) % HUES.length];
      guard++;
    }
    used.add(hue);
    return hue;
  });
}

function formOf(text) {
  const t = text.toLowerCase();
  if (t.includes('inhaler')) return 'inhaler';
  if (t.includes('spray')) return 'spray';
  if (t.includes('syrup') || t.includes('ml') || t.includes('liquid')) return 'syrup';
  if (t.includes('capsule')) return 'capsule';
  return 'tablet';
}

export default function MedIcon({ name, form = '', imageUrl = null, hue = null }) {
  if (imageUrl) {
    return <img className="medart medart--photo" src={imageUrl} alt="" loading="lazy" />;
  }

  const shape = formOf(`${name} ${form}`);
  const tone = hue ?? hueFor(name);
  const solid = `hsl(${tone} 58% 52%)`;
  const light = `hsl(${tone} 62% 88%)`;
  const deep = `hsl(${tone} 55% 38%)`;

  return (
    <span className="medart" style={{ background: `hsl(${tone} 60% 96%)` }}>
      <svg viewBox="0 0 48 48" role="img" aria-label={`${name}, ${shape}`}>
        {shape === 'capsule' && (
          <g transform="rotate(-38 24 24)">
            <rect x="12" y="17" width="24" height="14" rx="7" fill={light} />
            <path d="M19 17h5v14h-5a7 7 0 0 1 0-14z" fill={solid} />
            <rect x="12" y="17" width="24" height="14" rx="7" fill="none" stroke={deep} strokeOpacity="0.25" />
          </g>
        )}

        {shape === 'tablet' && (
          <g>
            <circle cx="24" cy="24" r="11" fill={light} stroke={deep} strokeOpacity="0.25" />
            <path d="M24 14.5v19" stroke={solid} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="20" cy="20" r="2.4" fill="#fff" fillOpacity="0.75" />
          </g>
        )}

        {shape === 'inhaler' && (
          <g>
            <rect x="16" y="10" width="13" height="8" rx="2.5" fill={deep} />
            <rect x="15" y="17" width="15" height="20" rx="4" fill={solid} />
            <rect x="28" y="26" width="9" height="8" rx="2.5" fill={light} stroke={deep} strokeOpacity="0.25" />
            <rect x="18" y="21" width="9" height="3" rx="1.5" fill="#fff" fillOpacity="0.5" />
          </g>
        )}

        {shape === 'spray' && (
          <g>
            <path d="M20 9h8v5h-8z" fill={deep} />
            <rect x="27" y="10" width="7" height="3" rx="1.5" fill={deep} />
            <path d="M17 16h14a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z" fill={solid} />
            <rect x="17.5" y="24" width="13" height="8" rx="2" fill="#fff" fillOpacity="0.7" />
          </g>
        )}

        {shape === 'syrup' && (
          <g>
            <rect x="20" y="8" width="8" height="5" rx="1.5" fill={deep} />
            <path d="M16 15h16a2 2 0 0 1 2 2v19a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V17a2 2 0 0 1 2-2z" fill={light} stroke={deep} strokeOpacity="0.22" />
            <path d="M14 27h20v9a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill={solid} />
            <rect x="18" y="18" width="12" height="6" rx="1.5" fill="#fff" fillOpacity="0.85" />
          </g>
        )}
      </svg>
    </span>
  );
}
