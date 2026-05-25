import * as THREE from 'three';

// Interaction-first beacon blooms, rendered as three.js SPRITES via react-globe.gl's
// objectsData layer (NOT htmlElements — that layer's isBehindGlobe cull crashed on
// camera moves, and DOM-per-beacon doesn't scale). The objects layer never touches
// that cull path, so it's structurally crash-free, and sprites are cheap at density.
//
// Visual vs hit decoupling: the sprite quad is the (generous) hit target; the visible
// bloom is the texture's bright centre, so the clickable area is larger than the glow.
// sizeAttenuation:false keeps blooms a constant on-screen size at any zoom.
//
// Keyboard / screen-reader interaction is NOT native to a WebGL sprite — it's provided
// by the parallel DOM accessibility overlay (BeaconA11yList) that mirrors selection.

export function categoryColor(kind) {
  const k = String(kind || '').toLowerCase();
  if (/recovery|sober|na_aa|aftercare/.test(k)) return '#6E8BB5'; // slate-blue
  if (/safety|care|sos|help/.test(k)) return '#00C2E0';          // teal
  if (/event|ticket|venue/.test(k)) return '#C8962C';            // gold
  if (/radio|music/.test(k)) return '#B026FF';                   // purple
  if (/person|people|user|social|chill|meet|hookup|promoter/.test(k)) return '#FF4F9A'; // pink
  return '#C8962C';
}

// Shared soft radial-gradient alpha texture (bright centre, soft falloff, transparent
// edge). One texture for all blooms; colour comes from each material's tint.
let _tex = null;
function bloomTexture() {
  if (_tex) return _tex;
  if (typeof document === 'undefined') return null;
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _tex = new THREE.CanvasTexture(cv);
  return _tex;
}

// Screen-space scales (sizeAttenuation:false). Tunable; hit > visible by design.
export const BLOOM_BASE_SCALE = 0.040;   // quad = generous hit target
export const BLOOM_HOVER_SCALE = 0.052;  // hover expand (+30%)

// Build one bloom sprite for a beacon datum. Returns a THREE.Sprite (objectsData).
export function makeBloomSprite(d) {
  const color = categoryColor(d && (d.kind || d.beacon_category || d.type));
  const material = new THREE.SpriteMaterial({
    map: bloomTexture(),
    color: new THREE.Color(color),
    transparent: true,
    sizeAttenuation: false,
    // depthTest:true lets the opaque globe (rendered first) occlude blooms on the
    // far side via the depth buffer — no manual isBehindGlobe cull, so no crash.
    // depthWrite:false keeps these transparent sprites from fighting each other.
    depthTest: true,
    depthWrite: false,
    opacity: 0.95,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(BLOOM_BASE_SCALE, BLOOM_BASE_SCALE, 1);
  sprite.renderOrder = 11;
  sprite.__d = d;            // datum for click/hover handlers
  sprite.__baseColor = color;
  // Reverse bridge: react-globe.gl's onObjectHover/Click hand back the DATUM, not
  // the sprite, so stash the sprite on the datum to reach material/scale later.
  try { if (d) d.__sprite = sprite; } catch (e) { /* frozen datum — non-fatal */ }
  return sprite;
}

// Hover/focus visual: brighten + expand (instant — interaction feedback never lags;
// reduced motion changes nothing here since there's no transition to disable).
export function setBloomHover(sprite, hovered) {
  if (!sprite || !sprite.material) return;
  const s = hovered ? BLOOM_HOVER_SCALE : BLOOM_BASE_SCALE;
  try {
    sprite.scale.set(s, s, 1);
    sprite.material.opacity = hovered ? 1 : 0.95;
  } catch (e) { /* non-fatal */ }
}

// Active/selected visual: near-white core + brighter, until cleared.
export function setBloomActive(sprite, active) {
  if (!sprite || !sprite.material) return;
  try {
    sprite.material.color = new THREE.Color(active ? '#ffffff' : (sprite.__baseColor || '#C8962C'));
    sprite.material.opacity = active ? 1 : 0.95;
    const s = active ? BLOOM_HOVER_SCALE : BLOOM_BASE_SCALE;
    sprite.scale.set(s, s, 1);
  } catch (e) { /* non-fatal */ }
}
