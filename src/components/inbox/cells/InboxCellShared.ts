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

/** D266 + LOCKS.md — safe display of counterpart name. Never email. */
export function counterpartName(c: InboxCounterpart | undefined | null): string {
  const raw = (c?.display_name || '').trim();
  if (raw && !raw.includes('@')) return raw;
  return 'Member';
}
