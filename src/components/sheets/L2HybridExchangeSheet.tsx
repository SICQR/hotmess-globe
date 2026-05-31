/**
 * L2HybridExchangeSheet — Convergence Slice v1, PR 1
 *
 * The hybrid sheet sits between L2ProfileSheet and L2ShopSheet. It is the
 * surface where a beacon-contextualised exchange begins: a user tapped a
 * person beacon ("2 tickets for Fold tonight") and the OS opens this view.
 *
 * PR 1 contract — see docs/doctrine/slices/convergence-v1.md §8 PR 1:
 *   - Beacon context surfaces at the top (Zone A trajectory line)
 *   - Profile + listing coexist in one sheet (Zone B identity, Zone C listing)
 *   - D20 identity boundaries: pseudonymous and disclosed sellers render
 *     identically. NO verification chrome, NO badges, NO tiers, NO online dot.
 *   - D34 trajectory language: "Right here at Eagle" / "Heading to Fold"
 *     surfaces above identity. Static for PR 1 — decay logic ships in PR 4.
 *
 * NOT in PR 1 (deferred):
 *   - Contact paths (BOO / mutual / request / chat) — PR 2
 *   - Handoff completion + resolution language — PR 3
 *   - Trajectory decay + thread expiry + retention enforcement — PR 4
 *
 * Doctrine inheritance:
 *   - D08 Visibility: off-grid sellers' beacons surface here without
 *     emitting any presence signal — no last_active, no online dot, no
 *     typing indicator. (PR 1 covers the absence; PR 4 hardens the flow.)
 *   - D17 Surface Layer: respects existing z-index registry and chrome.
 *   - D19 Marketplace: NO price-forward UI on this surface. NO verified
 *     seller chrome. NO urgency framing.
 *   - D20 Identity: §15 acceptance test — visual symmetry between
 *     pseudonymous and disclosed Presence Identity. Trust badges banned.
 *   - D22 Temporal: this surface is operational Trajectory memory.
 *     Renders state, does not persist a user-facing history record.
 *   - D34 Trajectory: trajectory context above identity. Beacon is the
 *     "shared trajectory" anchor, not a product.
 *
 * Acceptance tests in scope for PR 1:
 *   §5.1 — pseudonymous and disclosed sellers render identically
 *   §5.6 — off-grid seller's beacon discoverable here, no presence emitted
 *
 * Feature flag (PR 1): VITE_CONVERGENCE_HYBRID_SHEET. Default off. The
 * 'hybrid_exchange' sheet route is mounted only when the flag is true.
 */

import React from 'react';
import { useSheet } from '@/contexts/SheetContext';

// PR 1 props are minimal by design. The shape will expand surgically in
// PR 2 (contact paths) and PR 3 (handoff). Do not preemptively add fields.
interface HybridExchangeBeacon {
  id: string;
  kind: 'ticket' | 'preloved' | 'other'; // PR 1 reads kind; PR 2 routes off it
  // Human-facing title of the beacon. "2 spare Fold tickets tonight."
  title: string;
  // Optional brief. "Pickup outside Eagle."
  brief?: string;
  // The trajectory anchor — where this beacon's energy lives.
  // PR 1 surfaces this verbatim as the static D34 trajectory line.
  // PR 4 introduces decay state.
  trajectoryContext?: string;
  // Coarse-grained venue / district label, optional.
  venueLabel?: string;
}

interface HybridExchangeSeller {
  // Presence Identity ONLY (D20 §2). The hybrid sheet never reads or
  // renders Legal / Safety / Recovery layers.
  displayName: string;
  // Pseudonymous handle (e.g. @quietfox) — rendered with no visual
  // distinction from a disclosed legal name. Symmetry is the acceptance
  // test (§5.1).
  handle?: string;
  // Optional avatar — if absent, render the same blank affordance for
  // every seller regardless of identity tier.
  avatarUrl?: string;
  // D08 visibility-state echo. Used ONLY to suppress presence affordances
  // that don't exist in PR 1 anyway. Persisted here so PR 2/PR 4 hardening
  // doesn't drift. PR 1 already renders nothing presence-related.
  visibilityState?: 'public' | 'off_grid' | 'incognito';
}

interface L2HybridExchangeSheetProps {
  beacon: HybridExchangeBeacon;
  seller: HybridExchangeSeller;
}

/**
 * The trajectory line is the emotional differentiator. PR 1 renders it
 * static, derived from beacon.trajectoryContext or beacon.venueLabel.
 *
 * D34 §4.5 binding: the line softens over time (PR 4 decay). For PR 1,
 * the line either renders verbatim or doesn't render at all. No mid-state
 * yet — PR 1 proves the slot exists.
 */
function TrajectoryContextLine({ beacon }: { beacon: HybridExchangeBeacon }) {
  const text = beacon.trajectoryContext
    || (beacon.venueLabel ? `Near ${beacon.venueLabel}` : null);
  if (!text) return null;
  return (
    <div className="px-5 pt-4 pb-2">
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60"
        // The trajectory line carries human gravity, not navigation gravity
        // (D34 §3.6). Render quietly — no icon, no chrome, no animation.
      >
        {text}
      </div>
    </div>
  );
}

/**
 * Identity strip — D20 §2.1 Presence Identity only.
 *
 * SYMMETRY ACCEPTANCE TEST (§5.1): pseudonymous "@quietfox" and disclosed
 * "Philip Gizzie" must render identically. Same font, same weight, same
 * spacing. No badge, no tier, no pip, no "verified" chrome of any kind.
 *
 * Off-grid suppression: visibilityState !== 'public' renders no presence
 * indicators. PR 1 already renders none — this is a forward-compatibility
 * note for PR 4 hardening.
 */
function IdentityStrip({ seller }: { seller: HybridExchangeSeller }) {
  const initials = seller.displayName.slice(0, 2).toUpperCase();
  return (
    <div className="px-5 pt-1 pb-4 flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden flex items-center justify-center"
        aria-hidden={true}
      >
        {seller.avatarUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={seller.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[12px] font-bold text-white/40">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-white leading-tight truncate">
          {seller.displayName}
        </div>
        {seller.handle && (
          <div className="text-[12px] text-white/40 leading-tight truncate">
            {seller.handle}
          </div>
        )}
        {/* D20 §5.3 — no verification chrome rendered, even conditionally.
            Future contributors: do NOT add a "verified seller" affordance here.
            The visual symmetry between pseudonymous and disclosed sellers is
            the acceptance test for this PR. */}
      </div>
    </div>
  );
}

/**
 * Listing context — what the beacon offers. Renders the beacon title and
 * brief in the Zone B / Zone C decision region. PR 1 is read-only.
 *
 * D19 §6.10 binding: no price-forward UI here. The beacon title may name
 * the item; price (if any) lives inside the dedicated commerce sheet that
 * PR 2/PR 3 will surface, not on the hybrid sheet.
 */
function ListingContext({ beacon }: { beacon: HybridExchangeBeacon }) {
  return (
    <div className="px-5 pt-2 pb-6">
      <div className="text-[17px] font-bold text-white leading-snug">
        {beacon.title}
      </div>
      {beacon.brief && (
        <div className="mt-1 text-[14px] text-white/65 leading-relaxed">
          {beacon.brief}
        </div>
      )}
    </div>
  );
}

/**
 * QuietContactPanel — PR 2.
 *
 * Three D34-ladder contact paths. Priority order is doctrinal, not visual
 * convenience. Per D34 §3.5 (chat is not a destination) the convergence
 * affordance is more prominent than chat itself. Per D34 §3.6 (routes
 * are social, not navigational) "Heading there too?" reads as human
 * gravity, not navigation. Per D34 §4.1 first-contact openers are
 * context-aware — never "hey" — so each affordance carries an opener
 * string that seeds the chat composer downstream.
 *
 * Off-grid sellers receive contact privately (D08 + D19 §1). The panel
 * renders identically regardless of seller.visibilityState because
 * presence is never reconstructed through commerce surfaces.
 */
function QuietContactPanel({
  beacon,
  seller,
}: {
  beacon: HybridExchangeBeacon;
  seller: HybridExchangeSeller;
}) {
  const { openSheet } = useSheet();

  // Derive opener text from beacon kind + venue when present. Static for
  // PR 2 (D34 §4.1 binding); intelligent context inference is a later
  // optimisation, not slice scope.
  const venueLabel = beacon.venueLabel || 'there';
  const headedThereCopy = beacon.kind === 'ticket'
    ? `Heading to ${venueLabel} too?`
    : `Picking up near ${venueLabel}?`;
  const quietHelloCopy = 'Still available?';
  const askAfterCopy = beacon.kind === 'ticket' ? 'Need one?' : 'Passing this on?';

  // openChatWithContext — every path inherits trajectory context (D34 §3.2
  // context survives surface changes). The chat sheet receives the full
  // convergenceContext and renders the opener row + convergence banner
  // above the composer.
  const openChatWithContext = (opener: string) => {
    openSheet('chat', {
      // recipientId field is the existing chat sheet's expected handle
      // for opening a conversation. For PR 2 the hybrid sheet does not
      // yet have a real seller id (mock data); the chat will surface
      // the convergence context regardless. PR 3 wires real recipients.
      recipientId: seller.handle || seller.displayName,
      context: beacon.title,
      // New prop — chat sheet's PR 2 banner reads from this.
      convergenceContext: {
        beacon: {
          id: beacon.id,
          title: beacon.title,
          kind: beacon.kind,
          venueLabel: beacon.venueLabel,
          trajectoryContext: beacon.trajectoryContext,
        },
        seller: {
          displayName: seller.displayName,
          handle: seller.handle,
        },
        // openers shape matches L2ChatSheet's existing wingmanSuggestions
        // expectation so the same render path renders them as tappable.
        openers: [
          { text: opener, type: 'convergence' },
          { text: quietHelloCopy, type: 'soft' },
          { text: askAfterCopy, type: 'request' },
        ],
        // Primary affordance the chat surface renders above the composer
        // (D34 §3.5 — chat resolves back into movement).
        primaryAffordance: { text: headedThereCopy, kind: 'convergence' },
      },
    });
  };

  return (
    <div className="mx-5 mb-6 space-y-2">
      {/* Primary — D34 convergence-first. The biggest, quietest affordance.
          Doctrinal weight = social resolution > commercial resolution
          (D34 §4.2 mutual-first routing). */}
      <button
        type="button"
        onClick={() => openChatWithContext(headedThereCopy)}
        className="w-full rounded-2xl border border-[#C8962C]/35 bg-[#C8962C]/[0.04] px-4 py-3 text-left active:scale-[0.98] transition-transform"
      >
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#C8962C]/70 font-semibold mb-1">
          Convergence
        </div>
        <div className="text-[15px] text-white font-medium leading-snug">
          {headedThereCopy}
        </div>
      </button>

      {/* Secondary — soft contact. Quiet hello, no pressure. */}
      <button
        type="button"
        onClick={() => openChatWithContext(quietHelloCopy)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left active:scale-[0.98] transition-transform"
      >
        <div className="text-[13px] text-white/75 leading-snug">
          {quietHelloCopy}
        </div>
      </button>

      {/* Tertiary — minimal text-link affordance. Lowest weight. */}
      <button
        type="button"
        onClick={() => openChatWithContext(askAfterCopy)}
        className="w-full px-4 py-2 text-left text-[12px] text-white/45 hover:text-white/65 transition-colors"
      >
        {askAfterCopy}
      </button>
    </div>
  );
}

/**
 * Hybrid sheet root. Keep this component declarative and shallow — the
 * shape of PR 1 is the contract every later PR will extend without
 * rewriting.
 */
export default function L2HybridExchangeSheet({ beacon, seller }: L2HybridExchangeSheetProps) {
  return (
    <div className="h-full flex flex-col bg-[#050507]">
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Zone A — trajectory context (D34) */}
        <TrajectoryContextLine beacon={beacon} />
        {/* Zone B — identity (D20, symmetric render) */}
        <IdentityStrip seller={seller} />
        {/* Divider — quiet, no chrome */}
        <div className="mx-5 h-px bg-white/[0.06]" />
        {/* Zone C — listing context (D19, read-only in PR 1) */}
        <ListingContext beacon={beacon} />
        {/* Zone D — D34 escalation ladder. Convergence-first by visual
            weight. Contact-paths panel hands off to L2ChatSheet with
            convergenceContext so the chat composer surfaces the same
            opener row above its input (D34 §3.5 + §4.1). */}
        <QuietContactPanel beacon={beacon} seller={seller} />
      </div>
    </div>
  );
}
