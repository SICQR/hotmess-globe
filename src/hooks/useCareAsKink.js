import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFlag } from '@/hooks/useFlag';

/**
 * Care As Kink — Active surfaces hook
 * Chunk 04a | feat flag: v6_care_as_kink_active
 *
 * Backup contacts stored in trusted_contacts where role='backup', max 2 per user.
 * Decision: docs/v6-decisions/backup-contacts-storage.md (Option B)
 */
export function useCareAsKink() {
  const enabled = useFlag('v6_care_as_kink_active');
  const [coverActive, setCoverActive] = useState(false);
  const [coverCaller, setCoverCaller] = useState(null);

  const saveBackup = useCallback(async (contacts) => {
    if (!enabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthenticated');

    // Replace all existing backup rows with new set (max 2)
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

  return {
    enabled,
    saveBackup,
    loadBackup,
    fireGetOut,
    startCover,
    endCover,
    coverActive,
    coverCaller,
  };
}
