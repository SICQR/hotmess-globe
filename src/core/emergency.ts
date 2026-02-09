/**
 * HOTMESS OS — Emergency System
 * 
 * The hard override. Safety first. Always.
 * This is the panic button's authority — not UI, not routing.
 */

import { setSystemState, getSystemState, resolveEmergency as resolveSystemEmergency } from './systemState';

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
// SERVICE INTEGRATIONS (stubs - implement with real services)
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustedContact {
  id: string;
  name: string;
  phone?: string;
  telegramId?: string;
}

async function getTrustedContacts(): Promise<TrustedContact[]> {
  // TODO: Fetch from Supabase
  // const { data } = await supabase.from('trusted_contacts').select('*').eq('user_id', userId);
  return [];
}

async function sendEmergencyAlert(contact: TrustedContact, event: EmergencyEvent): Promise<void> {
  // TODO: Send via Telegram bot, SMS, etc.
  console.log(`[Emergency] Alerting ${contact.name}`, event);
}

async function broadcastLocation(event: EmergencyEvent, location: { lat: number; lng: number }): Promise<void> {
  // TODO: Update Supabase realtime channel
  console.log(`[Emergency] Broadcasting location`, location);
}

async function insertSafetyBeacon(event: EmergencyEvent): Promise<string> {
  // TODO: Insert into beacons table with type='safety'
  console.log(`[Emergency] Creating admin beacon`, event);
  return `beacon_${event.id}`;
}

async function markBeaconResolved(beaconId: string): Promise<void> {
  // TODO: Update beacon status
  console.log(`[Emergency] Marking beacon resolved`, beaconId);
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
