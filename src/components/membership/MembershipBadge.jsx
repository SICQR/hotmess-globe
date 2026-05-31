import React from 'react';
import { Crown, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * MembershipBadge — renders the user's current tier as a small chip.
 *
 * Doctrine: D35 — Language Operating System §3.4 SurfaceMeta declaration.
 *
 * Phil's classification (D35 2026-05-31 amendment): the consumer tiers
 * (MESS, HOTMESS) and the operator tiers (CONNECTED, PROMOTER, VENUE)
 * carry DIFFERENT emotional meanings even when their visible
 * representation is a similar-shaped pill.
 *
 *   - MESS / HOTMESS read as PARTICIPATION_MARKER — Layer B, energy 3.
 *     Identity-adjacent. "Here is where you are in your relationship
 *     with HOTMESS." Not status, not prestige.
 *   - CONNECTED / PROMOTER / VENUE read as OPERATIONAL_MARKER — Layer A,
 *     energy 2. Verified operator presence. A VENUE badge should
 *     subconsciously read as `verified operator` not as `elite tier`.
 *
 * Two SURFACE_META constants are exported so future tooling (reviewer
 * bot, lint, drift detector) reads the correct contract for the tier
 * being rendered. The visible badge stays minimal — the split is in the
 * metadata, not the chrome.
 *
 * Phil 2026-05-31 — PR #761 also fixes a latent render bug: the prior
 * version defaulted to `tier = 'basic'` and fell back to
 * `TIER_CONFIG.basic`, neither of which exists in TIER_CONFIG. Any
 * caller that did not pass `tier` rendered an empty pill. Now: the
 * default is the canonical free-tier name `'mess'`, and legacy DB
 * values (`'basic'` / `'free'`) are normalised to `'mess'` at the
 * call site of every read.
 */

export const SURFACE_META_CONSUMER_TIER = /** @type {const} */ ({
  tone_layer: 'B',
  energy_level: 3,
  emotional_intent: 'participation_marker',
  inherits: ['D31'],
});

export const SURFACE_META_OPERATOR_TIER = /** @type {const} */ ({
  tone_layer: 'A',
  energy_level: 2,
  emotional_intent: 'operational_marker',
  inherits: ['D31'],
});

/**
 * Per-tier visual configuration. Display name is canonical (D35 §1.5).
 * The colour palette is the same MEMBERSHIP_BADGE identity as before
 * — colour is identity, not hierarchy.
 */
const TIER_CONFIG = {
  mess: {
    name: 'MESS',
    icon: Star,
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20',
    kind: 'consumer',
  },
  hotmess: {
    name: 'HOTMESS',
    icon: Zap,
    color: 'text-[#C8962C]',
    bgColor: 'bg-[#C8962C]/20',
    borderColor: 'border-[#C8962C]',
    kind: 'consumer',
  },
  connected: {
    name: 'CONNECTED',
    icon: Crown,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/20',
    borderColor: 'border-cyan-400',
    kind: 'operator',
  },
  promoter: {
    name: 'PROMOTER',
    icon: Crown,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20',
    borderColor: 'border-purple-400',
    kind: 'operator',
  },
  venue: {
    name: 'VENUE',
    icon: Crown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    kind: 'operator',
  },
};

/**
 * Normalise a raw tier value (which may carry legacy DB strings) to
 * the canonical tier id. The legacy 'basic' and 'free' values map to
 * 'mess'. Unknown values also map to 'mess' so the badge never
 * fails to render.
 */
function normaliseTierId(raw) {
  if (!raw || raw === 'basic' || raw === 'free') return 'mess';
  if (TIER_CONFIG[raw]) return raw;
  return 'mess';
}

/**
 * Read the SurfaceMeta contract for a given tier id. Lets call sites
 * (reviewer tools, lint rules, AI-assisted copy generation) ask
 * "what tone contract does this surface inherit?" without having to
 * re-derive it from the tier string.
 */
export function getMembershipBadgeMeta(tier) {
  const id = normaliseTierId(tier);
  return TIER_CONFIG[id].kind === 'operator'
    ? SURFACE_META_OPERATOR_TIER
    : SURFACE_META_CONSUMER_TIER;
}

export default function MembershipBadge({
  tier = 'mess',
  showIcon = true,
  className = '',
}) {
  const id = normaliseTierId(tier);
  const config = TIER_CONFIG[id];
  const Icon = config.icon;

  return (
    <Badge
      className={`${config.bgColor} ${config.borderColor} ${config.color} border-2 font-black uppercase tracking-wider text-[10px] ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.name}
    </Badge>
  );
}
