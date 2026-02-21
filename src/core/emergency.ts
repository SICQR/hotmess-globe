/**
 * HOTMESS OS — Emergency System
 * 
 * The hard override. Safety first. Always.
 * This is the panic button's authority — not UI, not routing.
 */

import { setSystemState, getSystemState, resolveEmergency as resolveSystemEmergency } from './systemState';
import { supabase } from '@/components/utils/supabaseClient';

// ═══════════════════════════════════════════════════════════════════════════════
// EMERGENCY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EmergencySource = 
  | 'ui_panic_button'      // User tapped panic in app
  | 'hardware_button'      // Volume buttons, shake, etc.
  | 'timer_expired'        // Check-in timer missed
  | 'admin_trigger'        // Admin initiated
  | 'contact_request';     // Trusted contact triggered

export type EmergencyStatus = 
  | 'inactive'
  | 'triggered'
  | 'alerting_contacts'
  | 'sharing_location'
  | 'admin_notified'
  | 'resolved';

export interface EmergencyEvent {
  id: string;
  source: EmergencySource;
  triggeredAt: number;
  location: { lat: number; lng: number } | null;
  status: EmergencyStatus;
  contactsAlerted: string[];
  adminBeaconId: string | null;
  resolvedAt: number | null;
  resolvedBy: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMERGENCY STORE
// ═══════════════════════════════════════════════════════════════════════════════

interface EmergencyStore {
  active: EmergencyEvent | null;
  history: EmergencyEvent[];
  listeners: Set<(event: EmergencyEvent | null) => void>;
}

const store: EmergencyStore = {
  active: null,
  history: [],
  listeners: new Set(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════════

export function isEmergencyActive(): boolean {
  return store.active !== null && store.active.status !== 'resolved';
}

export function getActiveEmergency(): EmergencyEvent | null {
  return store.active;
}

export function getEmergencyHistory(): EmergencyEvent[] {
  return [...store.history];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIGGER PANIC
// ═══════════════════════════════════════════════════════════════════════════════

export interface TriggerPanicOptions {
  source: EmergencySource;
  location?: { lat: number; lng: number } | null;
}

export async function triggerPanic(options: TriggerPanicOptions): Promise<EmergencyEvent> {
  const { source, location = null } = options;
  
  // Get current location if not provided
  let finalLocation = location;
  if (!finalLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });
      finalLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // Location unavailable, continue anyway
    }
  }
  
  const event: EmergencyEvent = {
    id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source,
    triggeredAt: Date.now(),
    location: finalLocation,
    status: 'triggered',
    contactsAlerted: [],
    adminBeaconId: null,
    resolvedAt: null,
    resolvedBy: null,
  };
  
  store.active = event;
  
  // Force system state to emergency
  setSystemState('EMERGENCY_ACTIVE');
  
  // Start the emergency sequence
  await executeEmergencySequence(event);
  
  notifyListeners();
  
  return event;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMERGENCY SEQUENCE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeEmergencySequence(event: EmergencyEvent): Promise<void> {
  // Step 1: Alert trusted contacts
  await alertTrustedContacts(event);
  
  // Step 2: Start location sharing
  await startLocationSharing(event);
  
  // Step 3: Create admin beacon
  await createAdminBeacon(event);
  
  notifyListeners();
}

async function alertTrustedContacts(event: EmergencyEvent): Promise<void> {
  event.status = 'alerting_contacts';
  notifyListeners();
  
  try {
    // Get user's trusted contacts from storage/DB
    const contacts = await getTrustedContacts();
    
    // Send alerts (Telegram, SMS, etc.)
    for (const contact of contacts) {
      try {
        await sendEmergencyAlert(contact, event);
        event.contactsAlerted.push(contact.id);
      } catch (error) {
        console.error(`[Emergency] Failed to alert contact ${contact.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Emergency] Failed to get trusted contacts:', error);
  }
}

async function startLocationSharing(event: EmergencyEvent): Promise<void> {
  event.status = 'sharing_location';
  notifyListeners();
  
  // Start continuous location updates
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        event.location = location;
        await broadcastLocation(event, location);
        notifyListeners();
      },
      (error) => {
        console.error('[Emergency] Location watch error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    
    // Store watch ID for cleanup
    (event as any)._locationWatchId = watchId;
  }
}

async function createAdminBeacon(event: EmergencyEvent): Promise<void> {
  event.status = 'admin_notified';
  notifyListeners();
  
  try {
    // Create a safety beacon visible to admins
    const beaconId = await insertSafetyBeacon(event);
    event.adminBeaconId = beaconId;
    notifyListeners();
  } catch (error) {
    console.error('[Emergency] Failed to create admin beacon:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVE EMERGENCY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolveOptions {
  resolvedBy: 'user' | 'admin' | 'contact' | 'timeout';
  notes?: string;
}

export async function resolveEmergency(options: ResolveOptions): Promise<void> {
  if (!store.active) return;
  
  const event = store.active;
  event.status = 'resolved';
  event.resolvedAt = Date.now();
  event.resolvedBy = options.resolvedBy;
  
  // Stop location watching
  if ((event as any)._locationWatchId && typeof navigator !== 'undefined') {
    navigator.geolocation.clearWatch((event as any)._locationWatchId);
  }
  
  // Archive to history
  store.history.unshift(event);
  if (store.history.length > 50) store.history.pop();
  
  // Clear active
  store.active = null;
  
  // Restore system state
  resolveSystemEmergency();
  
  // Update beacon as resolved
  if (event.adminBeaconId) {
    await markBeaconResolved(event.adminBeaconId);
  }
  
  notifyListeners();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAKE CALL (distraction feature)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FakeCallOptions {
  callerName: string;
  delay: number; // seconds
  ringtoneDuration: number; // seconds
}

export function scheduleFakeCall(options: FakeCallOptions): () => void {
  const { callerName, delay, ringtoneDuration } = options;
  
  const timeoutId = setTimeout(() => {
    // Dispatch fake call event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotmess:fake-call', {
        detail: { callerName, ringtoneDuration }
      }));
    }
  }, delay * 1000);
  
  // Return cancel function
  return () => clearTimeout(timeoutId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTEGRATIONS — Supabase-backed implementations
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustedContact {
  id: string;
  name: string;
  phone?: string;
  telegramId?: string;
}

/** Fetch the current user's trusted contacts from Supabase. */
async function getTrustedContacts(): Promise<TrustedContact[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('id, name, phone, telegram_id')
      .eq('user_id', user.id);
    if (error) {
      console.error('[Emergency] Failed to fetch trusted contacts:', error);
      return [];
    }
    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? undefined,
      telegramId: c.telegram_id ?? undefined,
    }));
  } catch (err) {
    console.error('[Emergency] getTrustedContacts error:', err);
    return [];
  }
}

/** Fire-and-forget alert — calls the /api/safety/alert serverless function. */
async function sendEmergencyAlert(contact: TrustedContact, event: EmergencyEvent): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/safety/alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        contactId: contact.id,
        eventId: event.id,
        location: event.location,
        triggeredAt: event.triggeredAt,
      }),
    });
  } catch (err) {
    console.error(`[Emergency] sendEmergencyAlert to ${contact.id} failed:`, err);
  }
}

/** Write the live location to the emergency_locations realtime channel. */
async function broadcastLocation(event: EmergencyEvent, location: { lat: number; lng: number }): Promise<void> {
  try {
    await supabase
      .from('emergency_locations')
      .upsert(
        {
          emergency_id: event.id,
          lat: location.lat,
          lng: location.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'emergency_id' }
      );
  } catch (err) {
    console.error('[Emergency] broadcastLocation error:', err);
  }
}

/** Insert a safety beacon into the beacons table, visible to admins. */
async function insertSafetyBeacon(event: EmergencyEvent): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('beacons')
      .insert({
        kind: 'safety',
        title: 'SOS Alert',
        lat: event.location?.lat ?? null,
        lng: event.location?.lng ?? null,
        promoter_id: user?.id ?? null,
        metadata: { emergency_id: event.id, source: event.source },
        active: true,
      })
      .select('id')
      .single();
    if (error) {
      console.error('[Emergency] insertSafetyBeacon error:', error);
      return `beacon_${event.id}`;
    }
    return data.id;
  } catch (err) {
    console.error('[Emergency] insertSafetyBeacon error:', err);
    return `beacon_${event.id}`;
  }
}

/** Mark the safety beacon as resolved once the emergency clears. */
async function markBeaconResolved(beaconId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('beacons')
      .update({ active: false })
      .eq('id', beaconId);
    if (error) {
      console.error('[Emergency] markBeaconResolved error:', error);
    }
  } catch (err) {
    console.error('[Emergency] markBeaconResolved error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

export function subscribeToEmergency(listener: (event: EmergencyEvent | null) => void): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function notifyListeners(): void {
  store.listeners.forEach(listener => listener(store.active));
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useEmergency() {
  const [emergency, setEmergency] = useState<EmergencyEvent | null>(getActiveEmergency);
  
  useEffect(() => {
    return subscribeToEmergency(setEmergency);
  }, []);
  
  return {
    active: emergency,
    isActive: emergency !== null && emergency.status !== 'resolved',
    trigger: triggerPanic,
    resolve: resolveEmergency,
    scheduleFakeCall,
  };
}
