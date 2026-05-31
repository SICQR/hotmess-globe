/**
 * PreviewHybridOpener — PREVIEW BRANCH ONLY.
 *
 * Convergence Slice v1 PR 1 has no real entry point yet (the marketplace
 * code that emits ticket beacons hasn't been wired). This component
 * exists purely to let Phil eye-test the L2HybridExchangeSheet on a
 * Vercel preview before any real beacon source ships.
 *
 * Activation:
 *   ?_hp=1                  → opens with a pseudonymous seller mock
 *   ?_hp=2                  → opens with a disclosed-name seller mock
 *                              (Acceptance Test §5.1 visual diff pair)
 *   ?_hp=offgrid            → opens with an off-grid seller mock
 *                              (Acceptance Test §5.6 verifies no
 *                              presence affordance renders)
 *
 * Removed before this branch merges anywhere. Do not import this from
 * production code.
 */

import { useEffect } from 'react';
import { useSheet } from '@/contexts/SheetContext';

const MOCK_BEACON_TICKET = {
  id: 'preview-beacon-ticket-1',
  kind: 'ticket' as const,
  title: '2 spare Fold tickets tonight',
  brief: 'Plans changed. Pickup outside Eagle before 11.',
  trajectoryContext: 'Heading to Fold',
  venueLabel: 'Eagle',
};

const MOCK_SELLERS = {
  pseudonymous: {
    displayName: 'quietfox',
    handle: '@quietfox',
    avatarUrl: undefined,
    visibilityState: 'public' as const,
  },
  disclosed: {
    displayName: 'Philip Gizzie',
    handle: '@phil',
    avatarUrl: undefined,
    visibilityState: 'public' as const,
  },
  offgrid: {
    displayName: 'quietfox',
    handle: '@quietfox',
    avatarUrl: undefined,
    visibilityState: 'off_grid' as const,
  },
};

export default function PreviewHybridOpener() {
  const { openSheet } = useSheet();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hp = params.get('_hp');
    if (!hp) return;

    let seller = MOCK_SELLERS.pseudonymous;
    if (hp === '2') seller = MOCK_SELLERS.disclosed;
    if (hp === 'offgrid') seller = MOCK_SELLERS.offgrid;

    // Fire on next tick so any sheet system mount has settled.
    const t = setTimeout(() => {
      openSheet('hybrid_exchange', {
        beacon: MOCK_BEACON_TICKET,
        seller,
      });
    }, 100);

    return () => clearTimeout(t);
  }, [openSheet]);

  return null;
}
