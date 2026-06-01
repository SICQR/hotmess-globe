/**
 * UsernameClaimSheet — forced username gate (Phil 2026-06-01, Task #510)
 *
 * Doctrinal context:
 * Today (2026-06-01) we watched three failure classes hit live users in the
 * same hour: Paul created a duplicate account because nothing forced him to
 * claim a stable identity. Dean asked "what counts as a completed profile?"
 * because the system never told him. Phil couldn't message either because
 * neither had a username we could route to.
 *
 * Phil locked the rule: every member must have a username. No exceptions.
 * Force it on the next render after auth, before any other surface is
 * interactive. 87 of 138 currently READY members are missing one — they
 * see this sheet on their next session.
 *
 * Architecture:
 * - Mounts at the top of Layout.jsx, INSIDE the providers but OUTSIDE the
 *   page router, so it covers every page including /pulse.
 * - Reads `profile` + `refetchProfile` from BootGuard. Does NOT touch the
 *   bootState machine (doctrine: "onboarding_completed === true → READY.
 *   Always" stays intact). This is a post-READY blocking surface, not a
 *   demotion to NEEDS_ONBOARDING.
 * - Cannot be dismissed: no close button, no overlay click-out, no swipe,
 *   no escape key. The only way out is a successful username claim.
 * - Live availability check against profiles_username_lower_unique index.
 * - On unique violation (Postgres 23505) shows "taken" instead of a
 *   generic failure — same telemetry-visible pattern as #513.
 *
 * Validation:
 *   3-20 chars · lowercase a-z 0-9 underscore dot · no leading/trailing dot
 *   reserved words blocked (hotmess, admin, root, support, system, anon)
 *   case-insensitive uniqueness via lower(username) unique index
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { supabase } from '@/components/utils/supabaseClient';
import { trackError, trackEvent } from '@/components/utils/analytics';

const MIN_LEN = 3;
const MAX_LEN = 20;
const ALLOWED = /^[a-z0-9_.]+$/;
const NO_EDGE_DOT = /^[^.](?:.*[^.])?$/; // no leading or trailing dot
const RESERVED = new Set([
  'hotmess', 'hotmessldn', 'admin', 'root', 'support', 'system', 'anon', 'anonymous',
  'me', 'you', 'we', 'us', 'hnh', 'hnhmess', 'staff', 'team', 'official', 'help',
  'safety', 'sos', 'pulse', 'ghosted', 'market', 'profile', 'settings',
]);

type AvailState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved';

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

function validateShape(name: string): { ok: boolean; reason?: string } {
  if (name.length < MIN_LEN) return { ok: false, reason: `at least ${MIN_LEN} characters` };
  if (name.length > MAX_LEN) return { ok: false, reason: `at most ${MAX_LEN} characters` };
  if (!ALLOWED.test(name)) return { ok: false, reason: 'lowercase letters, numbers, _ or .' };
  if (!NO_EDGE_DOT.test(name)) return { ok: false, reason: 'no leading or trailing dot' };
  if (name.includes('..')) return { ok: false, reason: 'no double dots' };
  if (RESERVED.has(name)) return { ok: false, reason: 'reserved' };
  return { ok: true };
}

export default function UsernameClaimSheet() {
  const { profile, bootState, refetchProfile } = useBootGuard() as {
    profile: { id?: string; username?: string | null; display_name?: string | null } | null;
    bootState: string;
    refetchProfile: () => Promise<void> | void;
  };

  const [value, setValue] = useState('');
  const [avail, setAvail] = useState<AvailState>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Gate: only render when authenticated AND profile loaded AND username missing.
  // Notably we do NOT block on bootState === 'READY' — we want to catch users
  // in NEEDS_ONBOARDING who finish the legacy flow before username existed.
  const shouldGate = useMemo(() => {
    if (!profile || !profile.id) return false;
    if (bootState === 'UNAUTHENTICATED' || bootState === 'LOADING') return false;
    return !profile.username || profile.username.trim() === '';
  }, [profile, bootState]);

  // Fire a "saw the gate" telemetry event exactly once per mount so we can
  // measure how many sessions hit it.
  useEffect(() => {
    if (shouldGate) {
      trackEvent('username_gate_shown', {
        user_id: profile?.id,
        had_display_name: !!profile?.display_name,
      });
    }
  }, [shouldGate, profile?.id, profile?.display_name]);

  // Live availability check, 300ms debounce, latest-wins via abort flag.
  useEffect(() => {
    if (!shouldGate) return undefined;
    setError(null);
    const normalized = normalize(value);

    if (normalized.length === 0) {
      setAvail('idle');
      return undefined;
    }

    const shape = validateShape(normalized);
    if (!shape.ok) {
      setAvail(RESERVED.has(normalized) ? 'reserved' : 'invalid');
      return undefined;
    }

    setAvail('checking');
    const abortToken = { cancelled: false };
    checkAbortRef.current.cancelled = true;
    checkAbortRef.current = abortToken;

    const handle = setTimeout(async () => {
      try {
        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', normalized)
          .neq('id', profile?.id || '')
          .limit(1)
          .maybeSingle();
        if (abortToken.cancelled) return;
        if (qErr && qErr.code !== 'PGRST116') {
          // PGRST116 = no rows, that's the happy path
          console.error('[UsernameClaim] availability query failed:', qErr.message, qErr);
          trackError(qErr as unknown as Error, {
            surface: 'username_availability_check',
            user_id: profile?.id,
          });
          setAvail('idle');
          return;
        }
        setAvail(data ? 'taken' : 'available');
      } catch (e) {
        if (abortToken.cancelled) return;
        console.error('[UsernameClaim] availability threw:', e);
        setAvail('idle');
      }
    }, 300);

    return () => {
      abortToken.cancelled = true;
      clearTimeout(handle);
    };
  }, [value, shouldGate, profile?.id]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting || !profile?.id) return;

    const normalized = normalize(value);
    const shape = validateShape(normalized);
    if (!shape.ok) {
      setError(shape.reason || 'invalid');
      return;
    }
    if (avail === 'taken') {
      setError('that one is taken');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ username: normalized })
      .eq('id', profile.id)
      .select('id')
      .single();

    if (updErr) {
      const code = (updErr as { code?: string }).code;
      console.error('[UsernameClaim] update failed:', updErr.message, { code, updErr });
      trackError(updErr as unknown as Error, {
        surface: 'username_claim',
        user_id: profile.id,
        attempted: normalized,
        code,
      });
      trackEvent('username_claim_failed', {
        error_code: code,
        error_message: updErr.message,
        attempted_length: normalized.length,
      });
      if (code === '23505') {
        // Unique-index violation — race condition, someone took it
        // between availability check and submit.
        setAvail('taken');
        setError('that one was just taken — try another');
      } else {
        setError('could not save — try again');
      }
      setSubmitting(false);
      return;
    }

    trackEvent('username_claimed', {
      user_id: profile.id,
      had_display_name: !!profile.display_name,
    });
    await refetchProfile();
    // shouldGate flips to false on next render; component unmounts naturally.
  }, [submitting, profile, value, avail, refetchProfile]);

  if (!shouldGate) return null;

  const normalized = normalize(value);
  const shape = normalized.length > 0 ? validateShape(normalized) : { ok: false };
  const canSubmit = !submitting && avail === 'available' && shape.ok;

  // Visual: luxury brutalism, black + amber, full-cover, no escape.
  // Sits at z-[1000] above every sheet, drawer, modal, and chrome layer.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-gate-title"
      className="fixed inset-0 z-[1000] flex flex-col items-stretch justify-center"
      style={{
        background: 'rgba(0,0,0,0.96)',
        backdropFilter: 'blur(18px) saturate(120%)',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      onKeyDown={(e) => {
        // Block Escape: this gate is non-dismissible
        if (e.key === 'Escape') e.stopPropagation();
      }}
    >
      <div className="w-full max-w-md mx-auto px-6">
        <div
          className="text-[10px] font-black uppercase tracking-[0.22em] mb-3"
          style={{ color: 'rgba(255, 188, 70, 0.86)' }}
        >
          ONE LAST THING
        </div>

        <h2
          id="username-gate-title"
          className="text-white text-2xl font-black italic tracking-tight leading-none mb-2"
          style={{ letterSpacing: -0.4 }}
        >
          Claim your handle.
        </h2>

        <p className="text-white/65 text-sm leading-snug mb-6">
          This is how people find you and how you sign in next time.
          Lowercase letters, numbers, underscore or dot. Three to twenty characters.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 select-none pointer-events-none"
              aria-hidden
            >
              @
            </span>
            <input
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              maxLength={MAX_LEN}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder="yourhandle"
              aria-label="Username"
              aria-invalid={avail === 'taken' || avail === 'invalid' || avail === 'reserved'}
              className="w-full pl-9 pr-12 py-4 rounded-2xl bg-white/5 border text-white text-lg font-medium tracking-tight focus:outline-none focus:bg-white/8"
              style={{
                borderColor:
                  avail === 'available' ? 'rgba(140, 220, 140, 0.6)'
                  : avail === 'taken' || avail === 'invalid' || avail === 'reserved' ? 'rgba(220, 100, 100, 0.6)'
                  : 'rgba(255,255,255,0.12)',
              }}
              disabled={submitting}
              autoFocus
            />
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest"
              style={{
                color:
                  avail === 'available' ? 'rgba(140, 220, 140, 0.86)'
                  : avail === 'taken' || avail === 'invalid' || avail === 'reserved' ? 'rgba(220, 100, 100, 0.86)'
                  : 'rgba(255,255,255,0.32)',
              }}
            >
              {avail === 'checking' ? '…' : avail === 'available' ? '✓' : avail === 'taken' ? 'taken' : ''}
            </div>
          </div>

          {/* Inline validation + error message */}
          <div className="min-h-[20px] mt-2 text-xs">
            {normalized.length > 0 && !shape.ok && (
              <span className="text-red-300">{validateShape(normalized).reason}</span>
            )}
            {avail === 'reserved' && (
              <span className="text-red-300">that one is reserved</span>
            )}
            {error && (
              <span className="text-red-300">{error}</span>
            )}
            {avail === 'available' && !error && (
              <span style={{ color: 'rgba(140, 220, 140, 0.86)' }}>@{normalized} is yours</span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full mt-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors"
            style={{
              background: canSubmit ? 'rgba(255, 188, 70, 0.96)' : 'rgba(255, 188, 70, 0.18)',
              color: canSubmit ? '#0A0A0B' : 'rgba(255,255,255,0.4)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Claiming…' : 'Claim'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-white/30 uppercase tracking-widest">
          Required to continue
        </p>
      </div>
    </div>
  );
}
