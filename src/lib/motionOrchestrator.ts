/**
 * MotionOrchestrator — Spatial Animation Sequencer
 *
 * Prevents competing animation stacks by serializing UI phases:
 *   Enter → Settle → Exit
 *
 * Rules enforced:
 *  - Sheet cannot open while camera is flying
 *  - Camera cannot fly while a modal/interrupt is entering
 *  - Only one phase token can be active per priority domain at a time
 *
 * Usage:
 *   const { request, release, isBlocked } = useMotionOrchestrator();
 *   const token = await request('sheet');    // waits until clear
 *   // ... animate ...
 *   release(token);
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Animation domain — maps to OS layer tiers */
export type MotionDomain =
  | 'camera'    // Globe camera fly / transition
  | 'sheet'     // L2 sheet open / close
  | 'modal'     // Non-emergency modal enter / exit
  | 'interrupt' // L3 SOS / emergency interrupt
  | 'hud';      // L1 HUD micro-animations (never blocks others)

/** A token returned by `request()`. Must be passed to `release()`. */
export interface MotionToken {
  id: string;
  domain: MotionDomain;
  /** Timestamp when the token was granted */
  grantedAt: number;
}

/**
 * Domains that block each other.
 * Higher-priority domains block lower-priority ones from starting.
 *
 * Priority (highest → lowest):
 *   interrupt > modal > sheet > camera > hud
 */
const BLOCKING_MATRIX: Record<MotionDomain, MotionDomain[]> = {
  interrupt: ['modal', 'sheet', 'camera', 'hud'],
  modal:     ['sheet', 'camera'],
  camera:    ['sheet'],  // camera fly blocks sheet from opening
  sheet:     [],         // sheet does NOT block camera (camera is lower priority)
  hud:       [],
};

// ─── Orchestrator singleton ───────────────────────────────────────────────────

class _MotionOrchestrator {
  private active = new Map<string, MotionToken>();
  private listeners = new Set<() => void>();

  /** Returns domains currently animating */
  activeDomains(): MotionDomain[] {
    return Array.from(this.active.values()).map((t) => t.domain);
  }

  /**
   * Returns true if `domain` is currently blocked by a higher-priority
   * animation.
   */
  isBlocked(domain: MotionDomain): boolean {
    const active = this.activeDomains();
    return active.some((activeDomain) =>
      BLOCKING_MATRIX[activeDomain]?.includes(domain),
    );
  }

  /**
   * Request an animation token for `domain`.
   *
   * - If blocked, waits (via polling) until the blocker releases.
   * - Returns a MotionToken that must be passed to `release()`.
   *
   * @param domain - The animation domain to acquire
   * @param timeoutMs - Max wait time before giving up (default 3 s)
   */
  request(domain: MotionDomain, timeoutMs = 3000): Promise<MotionToken> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;

      const attempt = () => {
        if (Date.now() > deadline) {
          reject(
            new Error(
              `[MotionOrchestrator] Timeout waiting for domain "${domain}" — blocked by [${this.activeDomains().join(', ')}]`,
            ),
          );
          return;
        }

        if (!this.isBlocked(domain)) {
          const token: MotionToken = {
            id: `${domain}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            domain,
            grantedAt: Date.now(),
          };
          this.active.set(token.id, token);
          this.notify();
          resolve(token);
        } else {
          // Poll every 50 ms until unblocked
          setTimeout(attempt, 50);
        }
      };

      attempt();
    });
  }

  /**
   * Release a previously acquired MotionToken.
   * Must always be called after the animation completes (even on error).
   */
  release(token: MotionToken): void {
    this.active.delete(token.id);
    this.notify();
  }

  /** Subscribe to orchestrator state changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const MotionOrchestrator = new _MotionOrchestrator();

// ─── React hook ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useSyncExternalStore } from 'react';

function getSnapshot() {
  return MotionOrchestrator.activeDomains().join(',');
}

/**
 * React hook for consuming the MotionOrchestrator.
 *
 * @example
 * ```tsx
 * const { request, release, isBlocked } = useMotionOrchestrator();
 *
 * const openSheet = async () => {
 *   const token = await request('sheet');
 *   try {
 *     await animateSheetOpen();
 *   } finally {
 *     release(token);
 *   }
 * };
 * ```
 */
export function useMotionOrchestrator() {
  // Re-render whenever orchestrator state changes
  useSyncExternalStore(
    useCallback(
      (cb) => MotionOrchestrator.subscribe(cb),
      [],
    ),
    getSnapshot,
  );

  const request = useCallback(
    (domain: MotionDomain, timeoutMs?: number) =>
      MotionOrchestrator.request(domain, timeoutMs),
    [],
  );

  const release = useCallback(
    (token: MotionToken) => MotionOrchestrator.release(token),
    [],
  );

  const isBlocked = useCallback(
    (domain: MotionDomain) => MotionOrchestrator.isBlocked(domain),
    [],
  );

  return { request, release, isBlocked };
}
