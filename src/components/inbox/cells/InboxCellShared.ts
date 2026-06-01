/**
 * Shared types + utilities used across the six dedicated inbox cells.
 *
 * D266 Invariant I-3 — there is no shared base `<InboxRow />`. This file
 * does NOT export a component. Each cell owns its own composition.
 * What's shared here is types + the counterpart map shape + an avatar
 * helper that's a pure render utility (not a wrapper component).
 */

import type { InboxItem } from '@/hooks/useInbox';
import type { InboxCounterpart } from '@/hooks/useInboxCounterparts';

export interface CellProps {
  item: InboxItem;
  counterparts: Map<string, InboxCounterpart>;
}

/**
 * D266 + LOCKS.md — safe display of counterpart name. Never email.
 *
 * Phil 2026-06-01 Task #520 — fallback ladder updated to match D485
 * (UserProfile name doctrine):
 *   display_name -> username -> 'Anonymous'
 * Previous fallback was 'Member' which (a) Phil ratified as wrong, and
 * (b) collided with the literal user-tier word "member" so users saw
 * "Member" on every conversation row whose counterpart map hadn't
 * resolved yet. Anonymous is the dignity-preserving floor.
 */
export function counterpartName(c: InboxCounterpart | undefined | null): string {
  const dn = (c?.display_name || '').trim();
  if (dn && !dn.includes('@')) return dn;
  const un = (c?.username || '').trim();
  if (un && !un.includes('@')) return un;
  return 'Anonymous';
}
