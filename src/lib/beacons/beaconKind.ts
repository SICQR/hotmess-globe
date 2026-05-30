/**
 * Beacon kind / intent — canonical reader.
 *
 * D12 Slice 2 / #303 — Phase A dual-read.
 *
 * Phil-locked 2026-05-30: this is the single point of truth for reading
 * `entity_kind` + `intent` off a beacon-like row. Prefer the first-class
 * columns added in the migration; fall back to the legacy `metadata.intent` /
 * `metadata.kind` shim and the legacy `beacon_category` for rows that haven't
 * been backfilled yet OR realtime payloads received mid-migration.
 *
 * The shim fallback stays in place through Phase D — Phil's lock: "do not
 * retire the shim in the same breath unless production proves clean."
 *
 * Doctrine:
 *  - D12 §"Four entities, never conflated" — entity_kind ∈ {beacon, venue, event}.
 *    `presence` is a runtime layer (LiveModeContext / useLiveMoment), NEVER
 *    persisted to `beacons`. The DB CHECK rejects accidental presence creep.
 *  - D12 §"The intent set (locked)" — 9 allowed intents.
 *  - D14 §5 + Sacred Invariant #6 — `aftercare` always reaches the public
 *    care render path, regardless of how the row stores its kind.
 *
 * No emojis. No throws. Returns null gracefully for unknown shapes — callers
 * must handle that (none of the three current call sites crash on null).
 */

export type EntityKind = 'beacon' | 'venue' | 'event';
// Note: 'presence' is intentionally NOT in this union. Presence is a runtime
// layer (LiveModeContext / useLiveMoment) and is never persisted to `beacons`.
// The CHECK constraint on the table rejects 'presence' to enforce this at
// the data layer.

export type Intent =
  | 'looking' | 'hosting' | 'arriving' | 'cruising'
  | 'aftercare' | 'quiet_hold' | 'market'
  | 'radio' | 'music_moment';

const KNOWN_KINDS: ReadonlySet<EntityKind> = new Set<EntityKind>([
  'beacon', 'venue', 'event',
]);

const KNOWN_INTENTS: ReadonlySet<Intent> = new Set<Intent>([
  'looking', 'hosting', 'arriving', 'cruising',
  'aftercare', 'quiet_hold', 'market',
  'radio', 'music_moment',
]);

// Legacy beacon_category values that historically denoted a venue.
const LEGACY_VENUE_CATEGORIES: ReadonlySet<string> = new Set([
  'venue', 'club', 'sauna', 'gym', 'cafe', 'clinic', 'leather',
]);

// Care override (D14 §5 + mapboxLayerStack PUBLIC_CARE_OVERRIDE).
// Stays in place through Phase D — Phil-locked stale-PWA safety.
const PUBLIC_CARE_CATEGORIES: ReadonlySet<string> = new Set([
  'aftercare', 'recovery', 'clinic',
]);

function pickMetaField(b: any, key: string): string | null {
  try {
    const m = b && (b.metadata || b.meta);
    if (!m) return null;
    const parsed = typeof m === 'string' ? JSON.parse(m) : m;
    const v = parsed?.[key];
    return v == null ? null : String(v);
  } catch (_) {
    return null;
  }
}

/**
 * Read the first-class entity_kind column, falling back to legacy derivation.
 * Never throws. Default is 'beacon' to match the DB column default.
 */
export function readEntityKind(b: any): EntityKind {
  if (!b) return 'beacon';
  if (b.entity_kind && KNOWN_KINDS.has(b.entity_kind)) return b.entity_kind;
  // Pulse_signals view mirrors entity_kind into metadata (Phase A view update)
  const metaKind = pickMetaField(b, 'entity_kind');
  if (metaKind && KNOWN_KINDS.has(metaKind as EntityKind)) return metaKind as EntityKind;
  // Legacy fallback — derive from existing columns.
  if (b.event_start_at) return 'event';
  const cat = String(b.beacon_category || b.category || '').toLowerCase();
  if (LEGACY_VENUE_CATEGORIES.has(cat)) return 'venue';
  return 'beacon';
}

/**
 * Read the first-class intent column, falling back to metadata.intent.
 * Returns null when no intent is set on the row.
 */
export function readIntent(b: any): Intent | null {
  if (!b) return null;
  if (b.intent && KNOWN_INTENTS.has(b.intent)) return b.intent;
  const shim = pickMetaField(b, 'intent');
  if (shim && KNOWN_INTENTS.has(shim as Intent)) return shim as Intent;
  return null;
}

/**
 * The canonical "is this row aftercare?" check. Reads first-class intent,
 * then legacy beacon_category — PUBLIC_CARE_OVERRIDE preserved through
 * Phase D per Phil's lock.
 */
export function isAftercare(b: any): boolean {
  if (readIntent(b) === 'aftercare') return true;
  const cat = String(b?.beacon_category || b?.category || '').toLowerCase();
  return PUBLIC_CARE_CATEGORIES.has(cat);
}

/**
 * Is this row curated editorial (district pulse / hotmess broadcast)?
 * Reads metadata.curated — first-class curated column is a possible Phase C
 * follow-up but not in scope for Phase A.
 */
export function isCuratedEditorial(b: any): boolean {
  const curatedShim = pickMetaField(b, 'curated');
  if (curatedShim !== 'true' && curatedShim !== '1') return false;
  // Curated AND kind=district|hotmess → editorial. Curated care is care, not editorial.
  const metaKind = pickMetaField(b, 'kind');
  return metaKind === 'district' || metaKind === 'hotmess';
}
