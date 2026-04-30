/**
 * CheckinTimerContext
 *
 * Global provider for the safety check-in timer.
 * Ensures all components (FAB, Hub, Modals) see the same countdown state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const STORAGE_KEY = 'hm_checkin_v1';
const GRACE_MS = 30 * 60 * 1000; // 30 minutes

interface StoredTimer {
  deadline: string;
  durationMinutes: number;
  userId: string;
}

export interface CheckinTimerContextType {
  isActive: boolean;
  secondsLeft: number;
  durationMinutes: number;
  deadline: Date | null;
  setTimer: (minutes: number) => Promise<void>;
  clearTimer: () => void;
}

const CheckinTimerContext = createContext<CheckinTimerContextType | undefined>(undefined);

function readStored(): StoredTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.log('[CheckinTimerContext] readStored raw:', raw);
    if (!raw) return null;
    const parsed: StoredTimer = JSON.parse(raw);
    const expiredMs = Date.now() - new Date(parsed.deadline).getTime();
    if (expiredMs > GRACE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const CheckinTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stored, setStored] = useState<StoredTimer | null>(() => {
    const s = readStored();
    console.log('[CheckinTimerContext] Initial stored state:', s);
    return s;
  });
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
    window.dispatchEvent(new CustomEvent('hm:checkin-expired'));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        } catch { /* ignored */ }
      }

      const locStr = location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Location unavailable';
      const mapsUrl = location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : null;

      await supabase.from('safety_checkins').insert({
        user_email: user.email,
        user_id: user.id,
        trigger_type: 'user_timer',
        status: 'missed',
        escalated_at: new Date().toISOString(),
        note: 'Auto-triggered: user-set check-in timer expired without response',
      });

      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('contact_email, contact_phone, contact_name')
        .eq('user_id', user.id)
        .eq('notify_on_checkin', true);

      const alertMsg = [
        `Your friend missed their HOTMESS safety check-in timer.`,
        `Last known location: ${locStr}`,
        mapsUrl ? `Map: ${mapsUrl}` : null,
      ].filter(Boolean).join('\n');

      for (const contact of contacts || []) {
        // WhatsApp Alert
        if (contact.contact_phone) {
          console.log('[CheckinTimerContext] Sending WhatsApp to:', contact.contact_phone);
          const { error: waErr } = await supabase.from('notification_outbox').insert({
            user_email: contact.contact_email || user.email,
            notification_type: 'trusted_contact_alert',
            title: 'HOTMESS Safety — Check-in missed',
            message: `Your friend ${user.email} missed their safety check-in. Last location: ${locStr}`,
            channel: 'whatsapp',
            metadata: { 
              type: 'timer_missed', 
              user_id: user.id, 
              user_name: user.email, // fallback to email as name for now
              location,
              location_str: locStr,
              contact_phone: contact.contact_phone
            },
          });
          if (waErr) console.error('[CheckinTimerContext] WhatsApp outbox error:', waErr);
          else console.log('[CheckinTimerContext] WhatsApp outbox entry created');
        }

        // Email Fallback
        if (contact.contact_email) {
          await supabase.from('notification_outbox').insert({
            user_email: contact.contact_email,
            notification_type: 'trusted_contact_alert',
            title: 'HOTMESS Safety — Check-in missed',
            message: alertMsg,
            channel: 'email',
            metadata: { type: 'timer_missed', user_id: user.id, location },
          });
        }
      }
    } catch (err) {
      console.error('[CheckinTimerContext] fireAlert error:', err);
    } finally {
      clearTimer();
    }
  }, [clearTimer]);

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
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [stored, fireAlert]);

  const setTimer = useCallback(async (minutes: number) => {
    console.log('[CheckinTimerContext] Setting timer:', minutes);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const deadline = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const timer = { deadline, durationMinutes: minutes, userId: user.id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    setStored(timer);
    firedRef.current = false;
  }, []);

  return (
    <CheckinTimerContext.Provider value={{
      isActive: !!stored,
      secondsLeft,
      durationMinutes: stored?.durationMinutes ?? 0,
      deadline: stored ? new Date(stored.deadline) : null,
      setTimer,
      clearTimer
    }}>
      {children}
    </CheckinTimerContext.Provider>
  );
};

export const useCheckinTimer = () => {
  const context = useContext(CheckinTimerContext);
  if (!context) {
    throw new Error('useCheckinTimer must be used within a CheckinTimerProvider');
  }
  return context;
};
