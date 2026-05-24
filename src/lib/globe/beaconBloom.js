// Interactive beacon bloom marker (docs/GLOBE_BEACON_REPUTATION... no — the
// beacon-visual brief, interaction-first). Beacons are the globe's PRIMARY
// interactive surface, so this builds a DOM marker where the *hit target* is
// decoupled from the *visual bloom*: a generous transparent hit area (40px)
// around a small category-coloured bloom (8px). Hover/focus brightens + expands +
// shows a label; click/Enter activates (white core + gold ring + onActivate);
// reduced-motion swaps states instantly. Rendered via react-globe.gl htmlElements
// so hover/click/touch/keyboard are native DOM. Returns a raw DOM node.

// Category → colour (salvaged palette): gold venue/event, teal safety/care,
// slate-blue recovery, pink people/promoter, purple radio.
export function categoryColor(kind) {
  const k = String(kind || '').toLowerCase();
  if (/recovery|sober|na_aa|aftercare/.test(k)) return '#6E8BB5'; // slate-blue
  if (/safety|care|sos|help/.test(k)) return '#00C2E0';          // teal
  if (/event|ticket/.test(k)) return '#C8962C';                  // gold
  if (/venue/.test(k)) return '#C8962C';                          // gold
  if (/radio|music/.test(k)) return '#B026FF';                   // purple
  if (/person|people|user|social|chill|meet|hookup|promoter/.test(k)) return '#FF4F9A'; // pink
  return '#C8962C';
}

const GOLD = '#C8962C';

// Build the interactive bloom DOM node for one beacon datum.
// opts: { reducedMotion, selectedRef (useRef holding selected id), onActivate(d) }
export function makeBloomElement(d, opts) {
  const reduced = !!(opts && opts.reducedMotion);
  const selectedRef = opts && opts.selectedRef;
  const onActivate = opts && opts.onActivate;
  const color = categoryColor(d && (d.kind || d.beacon_category || d.type));
  const name = (d && (d.title || d.name)) || 'Signal';
  const cat = (d && (d.kind || d.beacon_category || d.type)) || 'signal';
  const id = d && d.id;

  // Hit target — generous, transparent, keyboard-focusable (decoupled from bloom).
  const hit = document.createElement('div');
  hit.className = 'hm-beacon-hit';
  hit.tabIndex = 0;
  hit.setAttribute('role', 'button');
  hit.setAttribute('aria-label', `${cat}: ${name}`);
  hit.style.cssText = [
    'width:40px', 'height:40px', 'display:flex', 'align-items:center',
    'justify-content:center', 'cursor:pointer', 'transform:translate(-50%,-50%)',
    'pointer-events:auto', 'position:relative', 'outline:none',
  ].join(';');

  // Visual bloom — small core + soft glow.
  const bloom = document.createElement('div');
  const baseShadow = `0 0 8px 2px ${color}`;
  bloom.style.cssText = [
    'width:8px', 'height:8px', 'border-radius:50%', `background:${color}`,
    `box-shadow:${baseShadow}`, reduced ? 'transition:none' : 'transition:all .15s ease',
  ].join(';');
  hit.appendChild(bloom);

  // Hairline label — appears on hover/focus (not on dwell).
  const label = document.createElement('div');
  label.textContent = name;
  label.style.cssText = [
    'position:absolute', 'top:-20px', 'left:50%', 'transform:translateX(-50%)',
    'white-space:nowrap', 'font:600 10px/1 system-ui,sans-serif', 'color:#fff',
    'background:rgba(0,0,0,0.72)', 'padding:3px 7px', 'border-radius:6px',
    'opacity:0', reduced ? 'transition:none' : 'transition:opacity .15s ease',
    'pointer-events:none', 'border:1px solid rgba(255,255,255,0.12)',
  ].join(';');
  hit.appendChild(label);

  const isSelected = () => selectedRef && selectedRef.current === id;

  const enter = () => {
    bloom.style.width = '11px';
    bloom.style.height = '11px';
    bloom.style.filter = 'brightness(1.6)';
    label.style.opacity = '1';
  };
  const leave = () => {
    if (isSelected()) return; // keep selected state visible
    bloom.style.width = '8px';
    bloom.style.height = '8px';
    bloom.style.filter = '';
    label.style.opacity = '0';
  };
  const activate = (e) => {
    if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (x) {} }
    if (selectedRef) selectedRef.current = id;
    // Active state: near-white core + gold hairline ring.
    bloom.style.background = '#ffffff';
    bloom.style.boxShadow = `0 0 10px 3px ${color}, 0 0 0 2px ${GOLD}`;
    bloom.style.width = '11px';
    bloom.style.height = '11px';
    label.style.opacity = '1';
    if (onActivate) { try { onActivate(d); } catch (x) {} }
  };

  hit.addEventListener('mouseenter', enter);
  hit.addEventListener('mouseleave', leave);
  hit.addEventListener('focus', enter);
  hit.addEventListener('blur', leave);
  hit.addEventListener('click', activate);
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') activate(e);
  });

  return hit;
}
