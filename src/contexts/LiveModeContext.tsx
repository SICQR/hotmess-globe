/**
 * LiveModeContext — Stateful layer that fuses Pulse + Ghosted + Radio + Travel
 * into a unified "who is in my moment" experience.
 *
 * Not a new route — an overlay/state that enhances existing surfaces.
 *
 * Provider sits inside RadioProvider but outside OSArchitecture so it has
 * access to radio state and is available to all OS surfaces.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { trackEvent } from '@/components/utils/analytics';

// ── Types ────────────────────────────────────────────────────────────────────

export type LiveContextType = 'global' | 'venue' | 'area' | 'radio';
export type PresenceState = 'at_venue' | 'moving' | 'listening' | 'nearby' | 'aftercare';

export interface LiveContext {
  type: LiveContextType;
  venueId?: string;
  venueName?: string;
  venueSlug?: string;
  areaLabel?: string;
  radioShowId?: string;
  radioShowName?: string;
  lat?: number;
  lng?: number;
}

export interface LiveModeValue {
  isLive: boolean;
  liveContext: LiveContext | null;
  presenceState: PresenceState | null;
  enterLive: (context: LiveContext) => void;
  exitLive: () => void;
}

const LiveModeCtx = createContext<LiveModeValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function LiveModeProvider({ children }: { children: React.ReactNode }) {
  const [liveContext, setLiveContext] = useState<LiveContext | null>(null);
  const [presenceState, setPresenceState] = useState<PresenceState | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLive = liveContext !== null;

  // Derive presence state from context type
  const derivePresence = useCallback((ctx: LiveContext): PresenceState => {
    switch (ctx.type) {
      case 'venue': return 'at_venue';
      case 'radio': return 'listening';
      case 'area': return 'nearby';
      default: return 'nearby';
    }
  }, []);

  const enterLive = useCallback((context: LiveContext) => {
    setLiveContext(context);
    setPresenceState(derivePresence(context));
    trackEvent('live_mode_enter', { type: context.type, venue: context.venueName });

    // Write presence to user_presence table
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        await supabase.from('user_presence').upsert({
          user_id: session.user.id,
          live_mode: true,
          live_context_type: context.type,
          live_venue_slug: context.venueSlug || null,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch { /* best-effort */ }
    })();
  }, [derivePresence]);

  const exitLive = useCallback(() => {
    trackEvent('live_mode_exit', { type: liveContext?.type });
    setLiveContext(null);
    setPresenceState(null);

    // Clear live flag in presence
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        await supabase.from('user_presence').update({
          live_mode: false,
          live_context_type: null,
          live_venue_slug: null,
          last_seen: new Date().toISOString(),
        }).eq('user_id', session.user.id);
      } catch { /* best-effort */ }
    })();
  }, [liveContext]);

  // Heartbeat: update last_seen every 60s while live
  useEffect(() => {
    if (!isLive) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    heartbeatRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        await supabase.from('user_presence').update({
          last_seen: new Date().toISOString(),
        }).eq('user_id', session.user.id);
      } catch { /* best-effort */ }
    }, 60_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isLive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return (
    <LiveModeCtx.Provider value={{ isLive, liveContext, presenceState, enterLive, exitLive }}>
      {children}
    </LiveModeCtx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveMode(): LiveModeValue {
  const ctx = useContext(LiveModeCtx);
  if (!ctx) {
    return {
      isLive: false,
      liveContext: null,
      presenceState: null,
      enterLive: () => {},
      exitLive: () => {},
    };
  }
  return ctx;
}
