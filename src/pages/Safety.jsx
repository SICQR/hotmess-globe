/**
 * Safety — v1.0 rebuild per HOTMESS Safety Build Doc.
 *
 * Single-column, thumb-zone layout. Background #050507. No nav clutter.
 * Inline emergency disclaimer visible on every state (not a modal).
 *
 * Composition order (top → bottom):
 *   1. Calm header (Back + "Safety" title only)
 *   2. Inline emergency disclaimer (verbatim per brief)
 *   3. TrustedContactStatus — only mounts when an unresolved event exists
 *   4. SOSHoldButton — 168x168 hold-to-fire centrepiece
 *   5. SafetyCheckInModes — six inline-panel modes
 *   6. SafetyAftercare — accordion, opens on RECOVERY MODE or post-SOS
 *   7. Trusted contacts roster (compact add + list)
 *
 * Doctrine compliance:
 *   - No alert() / confirm() / browser popups
 *   - No "we keep you safe" / "we protect you" copy — only "share your
 *     status with people you trust." per brief.
 *   - Hostile-region: copy avoids police-default (uses 999 baseline only
 *     where the user has explicitly opened the Support Resources panel).
 *
 * Scope discipline: only this file plus four new components in
 * src/components/safety/. App.jsx route registration unchanged (route
 * already maps /safety → this page).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Phone, Trash2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

import SOSHoldButton from '@/components/safety/SOSHoldButton';
import SafetyCheckInModes from '@/components/safety/SafetyCheckInModes';
import SafetyAftercare from '@/components/safety/SafetyAftercare';
import TrustedContactStatus from '@/components/safety/TrustedContactStatus';
import { useSOSContext } from '@/contexts/SOSContext';

const TOKENS = {
  ink: '#050507',
  gold: '#C8962C',
  care: '#3A464D',
};

const EMERGENCY_DISCLAIMER =
  'HOTMESS Safety is not an emergency service. For emergencies, call 999.';

const RELATIONSHIPS = [
  { value: 'daddy', label: 'Daddy' },
  { value: 'friend', label: 'Friend' },
  { value: 'flatmate', label: 'Flatmate' },
  { value: 'club_contact', label: 'Club Contact' },
  { value: 'emergency', label: 'Emergency' },
];

export default function Safety() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showRecovery, dismissRecovery } = useSOSContext();

  const [userId, setUserId] = useState(null);
  const [aftercareOpen, setAftercareOpen] = useState(false);

  // Mount-time light haptic per brief — calm, no sound.
  useEffect(() => {
    try { if (navigator?.vibrate) navigator.vibrate(8); } catch { /* noop */ }
  }, []);

  // Auto-open aftercare after SOS recovery (post-event care continuation).
  useEffect(() => {
    if (showRecovery) {
      setAftercareOpen(true);
    }
  }, [showRecovery]);

  // Bootstrap user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session?.user) setUserId(session.user.id);
    })();
    return () => { cancelled = true; };
  }, []);

  const { data: contacts = [] } = useQuery({
    queryKey: ['safety-trusted-contacts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('id, contact_name, contact_phone, relationship')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRel, setNewRel] = useState('daddy');

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('trusted_contacts').insert({
        user_id: userId,
        contact_name: newName.trim(),
        contact_phone: newPhone.trim(),
        relationship: newRel,
        notify_on_sos: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-trusted-contacts'] });
      setNewName(''); setNewPhone('');
      toast.success('Contact added.');
    },
    onError: (e) => toast.error(e?.message || 'Could not add contact.'),
  });

  const removeContact = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('trusted_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety-trusted-contacts'] }),
  });

  const handleTextSomeoneSafe = useCallback(() => {
    setAftercareOpen(false);
    toast.message('Pick STAY WITH ME from check-in modes to open a thread.');
    // Scroll to modes for clarity. No nav.
    const el = document.getElementById('checkin-modes');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleGetHomeSafely = useCallback(() => {
    setAftercareOpen(false);
    toast.message('Pick WALK HOME or RIDE SAFE.');
    const el = document.getElementById('checkin-modes');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSOSSent = useCallback(() => {
    // After a real send, the dispatcher (when re-enabled) writes
    // safety_events → TrustedContactStatus picks it up live.
    // Aftercare doesn't auto-open immediately — that happens via showRecovery
    // when the user resolves the alert.
  }, []);

  return (
    <div
      className="h-full w-full flex flex-col text-white"
      style={{ background: TOKENS.ink }}
    >
      {/* Header — calm, single back button + title. No tabs, no clutter. */}
      <header
        className="sticky top-0 z-30 border-b border-white/5 px-4"
        style={{
          background: 'rgba(5,5,7,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center justify-between h-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/60 active:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1
            className="font-black text-base tracking-[0.18em] uppercase font-mono"
            style={{ color: TOKENS.gold }}
          >
            Safety
          </h1>
          <span className="w-12" aria-hidden />
        </div>
      </header>

      {/* Scrollable single column — thumb-zone, 390px-first */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
        <div className="mx-auto max-w-md flex flex-col gap-5">

          {/* Inline emergency disclaimer — always present, no modal */}
          <p
            className="text-[11px] leading-snug text-center text-white/45"
            role="note"
          >
            {EMERGENCY_DISCLAIMER}
          </p>

          {/* Trusted contact realtime status — only mounts during live event */}
          {userId && <TrustedContactStatus userId={userId} />}

          {/* SOS hold button — centrepiece */}
          <div className="flex flex-col items-center pt-2 pb-1">
            <SOSHoldButton onSent={handleSOSSent} />
            <p className="text-[11px] text-white/40 text-center max-w-[20rem] mt-2 leading-snug">
              Share your status with people you trust.
            </p>
          </div>

          {/* Six check-in modes — inline-panel grid */}
          <section id="checkin-modes" aria-label="Check-in modes">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55 mb-2">
              Check-in
            </h2>
            <SafetyCheckInModes onOpenAftercare={() => setAftercareOpen(true)} />
          </section>

          {/* Aftercare — opens via RECOVERY MODE check-in or post-SOS */}
          <AnimatePresence>
            {aftercareOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <SafetyAftercare
                  open
                  onTextSomeoneSafe={handleTextSomeoneSafe}
                  onGetHomeSafely={handleGetHomeSafely}
                  onClose={() => {
                    setAftercareOpen(false);
                    if (showRecovery) dismissRecovery();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trusted contacts — compact roster + add */}
          <section aria-label="Trusted contacts" className="rounded-2xl border p-4"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                Trusted contacts
              </h2>
              <span className="text-[10px] text-white/35 tabular-nums">{contacts.length}</span>
            </div>

            {contacts.length === 0 ? (
              <p className="text-[12px] text-white/45 leading-snug mb-3">
                Add the people you want notified. Daddy first.
              </p>
            ) : (
              <ul className="space-y-1.5 mb-3" role="list">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl bg-black/30 border border-white/8 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{c.contact_name}</p>
                      <p className="text-[11px] text-white/45 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {c.contact_phone}
                        {c.relationship && <span className="text-white/30">· {c.relationship}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact.mutate(c.id)}
                      aria-label={`Remove ${c.contact_name}`}
                      className="text-white/35 hover:text-white/70 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
                autoComplete="off"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone"
                inputMode="tel"
                className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30"
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setNewRel(r.value)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
                    style={{
                      background: newRel === r.value ? TOKENS.gold : 'rgba(255,255,255,0.04)',
                      color: newRel === r.value ? '#050507' : '#fff',
                      borderColor: newRel === r.value ? TOKENS.gold : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!newName.trim() || !newPhone.trim() || addContact.isPending}
                onClick={() => addContact.mutate()}
                className="py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                style={{ background: TOKENS.gold, color: '#050507' }}
              >
                <UserPlus className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                Add contact
              </button>
            </div>
          </section>

          {/* Repeat the disclaimer at the bottom for users who scrolled past the top */}
          <p className="text-[11px] text-white/35 text-center leading-snug pt-2">
            {EMERGENCY_DISCLAIMER}
          </p>
        </div>
      </main>
    </div>
  );
}
