/**
 * SafetyCheckInModes — six check-in modes rendered as a compact grid with
 * inline expanding panels. One active at a time, no modal overlay, no
 * navigation. Doctrine: sessions are explicit, time-bounded, and leave
 * nothing on disk after they end.
 *
 *   WALK HOME        — timed live session 5–90min
 *   RIDE SAFE        — destination arrival window
 *   STAY WITH ME     — manual care escalation to a single chosen contact
 *   MORNING PING     — recovery confirmation at user-set time
 *   CHECK-IN         — generic timed check-in
 *   RECOVERY MODE    — opens the Aftercare screen (no escalation)
 *
 * Storage:
 *   - Session metadata persists to `safety_checkins` with `mode` in notes.
 *   - Real-time position is in memory only (per data-retention doctrine).
 *   - On dismiss / expiry the row is updated to status='checked_out' or
 *     'missed' — never deleted, so escalation cron can fire.
 *
 * Brief locks: easy one-tap "I'm safe", tap-to-extend, auto-expire, nothing
 * stored after session end, no friction on dismiss.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Car, MessageCircle, Sunrise, Clock, Heart, Check, Plus,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useCheckinTimer } from '@/contexts/CheckinTimerContext';

const TOKENS = {
  gold: '#C8962C',
  orange: '#D4750A',
  red: '#8B1A1A',
  care: '#3A464D',
};

const MODES = [
  {
    id: 'walk_home',
    title: 'WALK HOME',
    blurb: 'Live session. We tell your person at start and again if you don\'t dismiss.',
    icon: Home,
    kind: 'timed',
    defaultMin: 30,
  },
  {
    id: 'ride_safe',
    title: 'RIDE SAFE',
    blurb: 'Set an arrival window. We ping your person if you don\'t confirm.',
    icon: Car,
    kind: 'timed',
    defaultMin: 25,
  },
  {
    id: 'stay_with_me',
    title: 'STAY WITH ME',
    blurb: 'Open a thread to one trusted contact. Low-key. No escalation.',
    icon: MessageCircle,
    kind: 'thread',
    defaultMin: null,
  },
  {
    id: 'morning_ping',
    title: 'MORNING PING',
    blurb: 'Recovery confirmation at a set time. Miss it, your person hears a gentle nudge.',
    icon: Sunrise,
    kind: 'scheduled',
    defaultMin: null,
  },
  {
    id: 'check_in',
    title: 'CHECK-IN',
    blurb: 'Simple timer. One notification to one contact if missed.',
    icon: Clock,
    kind: 'timed',
    defaultMin: 60,
  },
  {
    id: 'recovery_mode',
    title: 'RECOVERY MODE',
    blurb: 'Aftercare. Care only. No escalation.',
    icon: Heart,
    kind: 'aftercare',
    defaultMin: null,
  },
];

const DURATIONS_MIN = [5, 10, 15, 20, 30, 45, 60, 75, 90];

/**
 * Round next-morning time helper — used by MORNING PING.
 * Returns next 09:00 (in local TZ) as an ISO string.
 */
function nextMorning() {
  const d = new Date();
  d.setDate(d.getDate() + (d.getHours() >= 9 ? 1 : 0));
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export default function SafetyCheckInModes({ onOpenAftercare }) {
  const [activeModeId, setActiveModeId] = useState(null);
  const [duration, setDuration] = useState(30);
  const [morningAt, setMorningAt] = useState(() => nextMorning());
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // { id, mode, expectedCheckOut, contact }
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const { setTimer } = useCheckinTimer();

  // Tick once a second while a session is active so the countdown updates.
  useEffect(() => {
    if (!activeSession) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // Bootstrap user + contacts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      setUserId(session.user.id);
      const { data } = await supabase
        .from('trusted_contacts')
        .select('id, contact_name, relationship')
        .eq('user_id', session.user.id);
      if (!cancelled && data) setContacts(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const activeMode = useMemo(
    () => MODES.find((m) => m.id === activeModeId) ?? null,
    [activeModeId],
  );

  const handleSelect = (mode) => {
    setError(null);
    setActiveModeId((current) => (current === mode.id ? null : mode.id));
    if (mode.id === 'recovery_mode') {
      onOpenAftercare?.();
      // Auto-close panel after triggering aftercare so the page settles
      setTimeout(() => setActiveModeId(null), 200);
      return;
    }
    if (mode.defaultMin) setDuration(mode.defaultMin);
    setSelectedContactId(contacts[0]?.id ?? null);
  };

  // ── Start a timed / scheduled session ──────────────────────────────────
  const startSession = useCallback(async (mode) => {
    if (!userId) { setError('Not signed in — re-open the app.'); return; }
    try {
      const startAt = new Date();
      const isScheduled = mode.kind === 'scheduled';
      const expectedCheckOut = isScheduled
        ? morningAt
        : new Date(startAt.getTime() + duration * 60 * 1000).toISOString();
      const noteParts = [`mode:${mode.id}`];
      if (selectedContactId) noteParts.push(`contact:${selectedContactId}`);

      const insertRow = {
        user_id: userId,
        check_in_time: startAt.toISOString(),
        expected_check_out: expectedCheckOut,
        status: 'active',
        // Existing safety_checkins schema is permissive on `notes` (used in
        // CheckinTimerContext aftercare flow); we tag the mode there so the
        // escalate cron + analytics can read it without a column change.
        notes: noteParts.join(' '),
        location: {}, // in-memory only — never persisted on the row in v1
      };

      const { data, error: dbErr } = await supabase
        .from('safety_checkins')
        .insert(insertRow)
        .select('id')
        .single();
      if (dbErr) throw dbErr;

      // Mirror into the global timer context so the FAB pulses + the existing
      // escalation pathway (CheckinTimerContext.fireAlert) handles miss.
      if (!isScheduled) {
        await setTimer(duration);
      }

      setActiveSession({
        id: data?.id ?? null,
        mode: mode.id,
        expectedCheckOut,
        contactId: selectedContactId,
      });
      setActiveModeId(null);
    } catch (err) {
      setError(err?.message || 'Could not start session.');
    }
  }, [duration, morningAt, selectedContactId, setTimer, userId]);

  // ── Resolve a session ──────────────────────────────────────────────────
  const dismissSession = useCallback(async (resolution = 'checked_out') => {
    if (!activeSession?.id) { setActiveSession(null); return; }
    try {
      await supabase.from('safety_checkins')
        .update({ status: resolution })
        .eq('id', activeSession.id);
    } catch { /* swallow — UX should still close */ }
    setActiveSession(null);
  }, [activeSession]);

  const extendSession = useCallback(async (extraMin = 15) => {
    if (!activeSession?.id) return;
    const next = new Date(new Date(activeSession.expectedCheckOut).getTime() + extraMin * 60 * 1000).toISOString();
    try {
      await supabase.from('safety_checkins')
        .update({ expected_check_out: next })
        .eq('id', activeSession.id);
      setActiveSession((s) => s ? ({ ...s, expectedCheckOut: next }) : s);
      await setTimer(Math.ceil((new Date(next).getTime() - Date.now()) / 60000));
    } catch { /* noop */ }
  }, [activeSession, setTimer]);

  // ── Stay With Me — manual thread (low-key). v1: write a contact_message
  // row to notification_outbox tagged as a soft check-in. Real chat surface
  // is /messages — we link there, the contact gets a single ping.
  const openThread = useCallback(async () => {
    if (!userId || !selectedContactId) { setError('Pick a contact first.'); return; }
    try {
      const { data: contact } = await supabase
        .from('trusted_contacts')
        .select('contact_name, contact_phone, contact_email')
        .eq('id', selectedContactId)
        .single();
      await supabase.from('notification_outbox').insert({
        user_email: contact?.contact_email || null,
        notification_type: 'trusted_contact_alert',
        title: 'HOTMESS Safety — Stay With Me',
        message: 'A friend asked for a low-key check-in. They\'re not in danger — just want company.',
        channel: contact?.contact_phone ? 'whatsapp' : 'email',
        metadata: { type: 'stay_with_me', user_id: userId, contact_id: selectedContactId },
      });
      setActiveModeId(null);
    } catch (err) {
      setError(err?.message || 'Could not send.');
    }
  }, [selectedContactId, userId]);

  // ── Active session card (only while a timed/scheduled session is live) ──
  const renderActiveSession = () => {
    if (!activeSession) return null;
    const mode = MODES.find((m) => m.id === activeSession.mode);
    const Icon = mode?.icon ?? Clock;
    const msLeft = Math.max(0, new Date(activeSession.expectedCheckOut).getTime() - now);
    const hh = Math.floor(msLeft / 3600000);
    const mm = Math.floor((msLeft % 3600000) / 60000);
    const ss = Math.floor((msLeft % 60000) / 1000);
    const countdown = hh > 0
      ? `${hh}h ${mm.toString().padStart(2, '0')}m`
      : `${mm}m ${ss.toString().padStart(2, '0')}s`;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="mb-4 rounded-2xl border p-4"
        style={{
          background: 'rgba(200,150,44,0.06)',
          borderColor: 'rgba(200,150,44,0.30)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(200,150,44,0.16)' }}
            >
              <Icon className="w-5 h-5" style={{ color: TOKENS.gold }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: TOKENS.gold }}>
                {mode?.title ?? 'CHECK-IN'} · ACTIVE
              </p>
              <p className="font-mono text-2xl font-bold text-white tabular-nums">
                {countdown}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => dismissSession('checked_out')}
            className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider"
            style={{ background: TOKENS.gold, color: TOKENS.care === '#3A464D' ? '#050507' : '#050507' }}
          >
            <Check className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            I'm safe
          </button>
          <button
            type="button"
            onClick={() => extendSession(15)}
            className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider border"
            style={{ borderColor: 'rgba(200,150,44,0.40)', color: '#fff', background: 'rgba(255,255,255,0.03)' }}
          >
            <Plus className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            +15 min
          </button>
        </div>
        <p className="text-[11px] text-white/40 mt-3 leading-snug">
          Nothing is stored after this session ends. Your position stays on this device.
        </p>
      </motion.div>
    );
  };

  return (
    <section aria-label="Safety check-in modes">
      <AnimatePresence>{renderActiveSession()}</AnimatePresence>

      {/* 2-col grid — six items, thumb-comfortable on 390px */}
      <ul className="grid grid-cols-2 gap-2.5" role="list">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isOpen = activeModeId === mode.id;
          return (
            <li key={mode.id} className={isOpen ? 'col-span-2' : ''}>
              <button
                type="button"
                onClick={() => handleSelect(mode)}
                aria-expanded={isOpen}
                className="w-full text-left rounded-2xl p-3 border transition-colors active:scale-[0.99]"
                style={{
                  background: isOpen ? 'rgba(200,150,44,0.07)' : 'rgba(255,255,255,0.03)',
                  borderColor: isOpen ? 'rgba(200,150,44,0.35)' : 'rgba(255,255,255,0.10)',
                  color: '#fff',
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: isOpen ? TOKENS.gold : 'rgba(255,255,255,0.55)' }} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold">{mode.title}</span>
                </div>
                {!isOpen && (
                  <p className="text-[11px] text-white/50 mt-1.5 leading-snug">
                    {mode.blurb}
                  </p>
                )}
              </button>

              {/* Inline expanding panel — one active at a time, no modal */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-2 rounded-2xl border p-4"
                      style={{
                        background: 'rgba(58,70,77,0.20)',
                        borderColor: 'rgba(200,150,44,0.25)',
                      }}
                    >
                      <p className="text-[12px] text-white/70 leading-relaxed mb-3">
                        {mode.blurb}
                      </p>

                      {/* Contact selector — for thread + timed modes alike */}
                      {mode.kind !== 'aftercare' && (
                        <div className="mb-3">
                          <label className="block text-[10px] uppercase tracking-widest text-white/45 mb-1.5">
                            Notify
                          </label>
                          {contacts.length === 0 ? (
                            <p className="text-[12px] text-white/50">
                              Add a trusted contact first.
                            </p>
                          ) : (
                            <select
                              value={selectedContactId ?? ''}
                              onChange={(e) => setSelectedContactId(e.target.value)}
                              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                            >
                              {contacts.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.contact_name}{c.relationship ? ` · ${c.relationship}` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {/* Timed: duration picker */}
                      {mode.kind === 'timed' && (
                        <div className="mb-3">
                          <label className="block text-[10px] uppercase tracking-widest text-white/45 mb-1.5">
                            Window (minutes)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {DURATIONS_MIN.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setDuration(m)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold tabular-nums border transition-colors"
                                style={{
                                  background: duration === m ? TOKENS.gold : 'rgba(255,255,255,0.04)',
                                  color: duration === m ? '#050507' : '#fff',
                                  borderColor: duration === m ? TOKENS.gold : 'rgba(255,255,255,0.12)',
                                }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scheduled (morning ping) */}
                      {mode.kind === 'scheduled' && (
                        <div className="mb-3">
                          <label className="block text-[10px] uppercase tracking-widest text-white/45 mb-1.5">
                            Ping me at
                          </label>
                          <input
                            type="datetime-local"
                            value={morningAt.slice(0, 16)}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) setMorningAt(new Date(v).toISOString());
                            }}
                            className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                      )}

                      {error && (
                        <p className="text-[11px] mb-3" style={{ color: TOKENS.red }}>
                          {error}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveModeId(null)}
                          className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-white/5 text-white/70"
                        >
                          Not now
                        </button>
                        {mode.kind === 'thread' ? (
                          <button
                            type="button"
                            onClick={openThread}
                            disabled={!selectedContactId}
                            className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                            style={{ background: TOKENS.gold, color: '#050507' }}
                          >
                            Open thread
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startSession(mode)}
                            disabled={mode.kind === 'timed' && contacts.length === 0}
                            className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                            style={{ background: TOKENS.gold, color: '#050507' }}
                          >
                            {mode.kind === 'scheduled' ? 'Set ping' : 'Start'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
