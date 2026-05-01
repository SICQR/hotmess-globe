import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFlag } from '@/hooks/useFlag';

/**
 * Care As Kink hook — Chunks 04a + 04b
 * Flag: v6_care_as_kink_active
 *
 * Backup contacts: trusted_contacts where role='backup', max 2 per user
 * Sessions: user_sessions table
 * Outcomes: meet_outcomes table
 */
export function useCareAsKink() {
  const enabled = useFlag('v6_care_as_kink_active');
  const [coverActive, setCoverActive] = useState(false);
  const [coverCaller, setCoverCaller] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // ── Backup contacts ──────────────────────────────────────────────────────

  const saveBackup = useCallback(async (contacts) => {
    if (!enabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthenticated');

    const limited = contacts.slice(0, 2);

    await supabase
      .from('trusted_contacts')
      .delete()
      .eq('user_id', user.id)
      .eq('role', 'backup');

    if (limited.length === 0) return;

    const rows = limited.map(c => ({
      user_id: user.id,
      role: 'backup',
      contact_name: c.name,
      contact_phone: c.phone,
      notify_on_sos: true,
      notify_on_checkout: true,
    }));

    const { error } = await supabase.from('trusted_contacts').insert(rows);
    if (error) throw error;
  }, [enabled]);

  const loadBackup = useCallback(async () => {
    if (!enabled) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('contact_name, contact_phone')
      .eq('user_id', user.id)
      .eq('role', 'backup')
      .limit(2);

    if (error) throw error;
    return (data || []).map(r => ({ name: r.contact_name, phone: r.contact_phone }));
  }, [enabled]);

  // ── GET OUT ──────────────────────────────────────────────────────────────

  const fireGetOut = useCallback(async () => {
    if (!enabled) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('unauthenticated');

    const res = await fetch('/api/safety/get-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!res.ok) throw new Error(`get-out failed: ${res.status}`);
    return res.json();
  }, [enabled]);

  // ── COVER ────────────────────────────────────────────────────────────────

  const startCover = useCallback((callerName = 'Dean') => {
    if (!enabled) return;
    setCoverCaller(callerName);
    setCoverActive(true);
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }
  }, [enabled]);

  const endCover = useCallback(() => {
    setCoverActive(false);
    setCoverCaller(null);
  }, []);

  // ── LAND TIME (04b) ──────────────────────────────────────────────────────

  const setLandTime = useCallback(async (minutesFromNow) => {
    if (!enabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthenticated');

    const landTime = new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
    const expiresAt = new Date(Date.now() + (minutesFromNow + 30) * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        land_time: landTime,
        expires_at: expiresAt,
        meta: { source: 'care_land_time' },
      })
      .select('id')
      .single();

    if (error) throw error;
    setActiveSessionId(data.id);
    return data.id;
  }, [enabled]);

  // ── CLEAN EXIT (04b) ─────────────────────────────────────────────────────

  const cancelSession = useCallback(async () => {
    if (!enabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthenticated');

    // Mark all active sessions expired
    const { error } = await supabase
      .from('user_sessions')
      .update({ expires_at: new Date().toISOString(), meta: { cancelled: true } })
      .eq('user_id', user.id)
      .is('meta->>cancelled', null)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    // Record outcome
    if (activeSessionId) {
      await supabase.from('meet_outcomes').insert({
        session_id: activeSessionId,
        user_id: user.id,
        outcome_type: 'cancelled',
      });
    }

    setActiveSessionId(null);
  }, [enabled, activeSessionId]);

  // ── HOW DID IT LAND (04b) ────────────────────────────────────────────────

  const recordOutcome = useCallback(async (outcomeType) => {
    if (!enabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthenticated');

    const { error } = await supabase.from('meet_outcomes').insert({
      session_id: activeSessionId || null,
      user_id: user.id,
      outcome_type: outcomeType,
    });

    if (error) throw error;
    setActiveSessionId(null);
  }, [enabled, activeSessionId]);

  return {
    enabled,
    // 04a
    saveBackup,
    loadBackup,
    fireGetOut,
    startCover,
    endCover,
    coverActive,
    coverCaller,
    // 04b
    setLandTime,
    cancelSession,
    recordOutcome,
    activeSessionId,
  };
}
