/**
 * useCheckinTimer
 *
 * Client-side safety check-in timer backed by localStorage.
 * Survives page refreshes. Auto-alerts trusted contacts via
 * notification_outbox when deadline passes without user responding.
 *
 * Storage key: hm_checkin_v1
 * Shape: { deadline: ISOString, durationMinutes: number, userId: string }
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const STORAGE_KEY = 'hm_checkin_v1';
// How long after expiry we still fire (user may have had the tab closed)
const GRACE_MS = 30 * 60 * 1000; // 30 minutes

interface StoredTimer {
  deadline: string;
  durationMinutes: number;
  userId: string;
}

export interface CheckinTimerState {
  isActive: boolean;
  secondsLeft: number;
  durationMinutes: number;
  deadline: Date | null;
  setTimer: (minutes: number) => Promise<void>;
  clearTimer: () => void;
}

function readStored(): StoredTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredTimer = JSON.parse(raw);
    const expiredMs = Date.now() - new Date(parsed.deadline).getTime();
    // Discard if expired beyond grace window (stale from a previous session)
    if (expiredMs > GRACE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useCheckinTimer(): CheckinTimerState {
  const [stored, setStored] = useState<StoredTimer | null>(() => readStored());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStored(null);
    firedRef.current = false;
  }, []);

  const fireAlert = useCallback(async () => {
    if (firedRef.current) return;
    firedRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get GPS
      let location: { lat: number; lng: number } | null = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 60000,
              enableHighAccuracy: false,
            })
          );
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch { /* GPS unavailable — alert still fires */ }
      }

      const locStr = location
        ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
        : 'Location unavailable';
      const mapsUrl = location
        ? `https://maps.google.com/?q=${location.lat},${location.lng}`
        : null;

      // Create audit record
      await supabase.from('safety_checkins').insert({
        user_email: user.email,
        user_id: user.id,
        trigger_type: 'user_timer',
        status: 'missed',
        escalated_at: new Date().toISOString(),
        note: 'Auto-triggered: user-set check-in timer expired without response',
      });

      // Get trusted contacts
      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('contact_email, contact_name')
        .eq('user_id', user.id)
        .eq('notify_on_checkin', true);

      const alertMsg = [
        `Your friend missed their HOTMESS safety check-in timer.`,
        `Last known location: ${locStr}`,
        mapsUrl ? `Map: ${mapsUrl}` : null,
        `Please check on them.`,
      ].filter(Boolean).join('\n');

      // Alert each trusted contact
      for (const contact of contacts || []) {
        if (!contact.contact_email) continue;
        await supabase.from('notification_outbox').insert({
          user_email: contact.contact_email,
          notification_type: 'trusted_contact_alert',
          title: 'HOTMESS Safety — Check-in missed',
          message: alertMsg,
          channel: 'email',
          metadata: {
            type: 'timer_missed',
            user_id: user.id,
            user_email: user.email,
            location,
          },
        });
      }

      // Self notification (in-app)
      await supabase.from('notification_outbox').insert({
        user_email: user.email,
        notification_type: 'safety_checkin_urgent',
        title: 'Check-in timer expired',
        message: `Your check-in timer expired. ${(contacts || []).length} trusted contact(s) have been alerted.`,
        channel: 'in_app',
        metadata: { trigger: 'user_timer_expired', location },
      });
    } catch (err) {
      console.error('[useCheckinTimer] fireAlert error:', err);
    } finally {
      clearTimer();
    }
  }, [clearTimer]);

  // Countdown tick
  useEffect(() => {
    if (!stored) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const remaining = Math.floor((new Date(stored.deadline).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        fireAlert();
      } else {
        setSecondsLeft(remaining);
      }
    };

    update(); // immediate first tick
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [stored, fireAlert]);

  const setTimer = useCallback(async (minutes: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const deadline = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const timer: StoredTimer = { deadline, durationMinutes: minutes, userId: user.id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    setStored(timer);
    firedRef.current = false;
  }, []);

  return {
    isActive: !!stored,
    secondsLeft,
    durationMinutes: stored?.durationMinutes ?? 0,
    deadline: stored ? new Date(stored.deadline) : null,
    setTimer,
    clearTimer,
  };
}
