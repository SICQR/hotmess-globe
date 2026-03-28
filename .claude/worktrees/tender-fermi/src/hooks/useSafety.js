/**
 * useSafety Hook
 * 
 * Manages safety features: panic button, check-ins, trusted contacts, fake calls.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from './useUserContext';

export function useSafety() {
  const { user, email } = useUserContext();
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch trusted contacts
  useEffect(() => {
    async function fetchTrustedContacts() {
      if (!email) return;

      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setTrustedContacts(data);
      }
    }

    fetchTrustedContacts();
  }, [email]);

  // Fetch active check-in
  useEffect(() => {
    async function fetchActiveCheckIn() {
      if (!email) return;

      const { data, error } = await supabase
        .from('safety_checkins')
        .select('*')
        .eq('user_email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setActiveCheckIn(data);
      }
    }

    fetchActiveCheckIn();
  }, [email]);

  // Add trusted contact
  const addTrustedContact = useCallback(async (contact) => {
    if (!email) return { error: 'Not logged in' };

    const { data, error } = await supabase
      .from('trusted_contacts')
      .insert({
        user_email: email,
        contact_name: contact.name,
        contact_phone: contact.phone,
        contact_email: contact.email,
        notify_on_panic: contact.notifyOnPanic ?? true,
        notify_on_checkin: contact.notifyOnCheckIn ?? false
      })
      .select()
      .single();

    if (!error && data) {
      setTrustedContacts(prev => [...prev, data]);
    }

    return { data, error };
  }, [email]);

  // Remove trusted contact
  const removeTrustedContact = useCallback(async (contactId) => {
    const { error } = await supabase
      .from('trusted_contacts')
      .delete()
      .eq('id', contactId);

    if (!error) {
      setTrustedContacts(prev => prev.filter(c => c.id !== contactId));
    }

    return { error };
  }, []);

  // Start a safety check-in timer
  const startCheckIn = useCallback(async (durationMinutes = 60, note = '') => {
    if (!email) return { error: 'Not logged in' };

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('safety_checkins')
      .insert({
        user_email: email,
        status: 'active',
        expected_end: expiresAt.toISOString(),
        note,
        trigger_type: 'manual'
      })
      .select()
      .single();

    if (!error && data) {
      setActiveCheckIn(data);
    }

    return { data, error };
  }, [email]);

  // End/respond to check-in
  const respondToCheckIn = useCallback(async (checkInId, response) => {
    const validResponses = ['all_good', 'need_minute', 'help'];
    if (!validResponses.includes(response)) {
      return { error: 'Invalid response' };
    }

    const { data, error } = await supabase
      .from('safety_checkins')
      .update({
        status: 'responded',
        response,
        responded_at: new Date().toISOString()
      })
      .eq('id', checkInId)
      .select()
      .single();

    if (!error) {
      setActiveCheckIn(null);
      
      // If help requested, could trigger additional notifications
      if (response === 'help') {
        await notifyTrustedContacts('help_requested');
      }
    }

    return { data, error };
  }, []);

  // Cancel active check-in
  const cancelCheckIn = useCallback(async () => {
    if (!activeCheckIn?.id) return { error: 'No active check-in' };

    const { error } = await supabase
      .from('safety_checkins')
      .update({ status: 'cancelled' })
      .eq('id', activeCheckIn.id);

    if (!error) {
      setActiveCheckIn(null);
    }

    return { error };
  }, [activeCheckIn]);

  // Trigger panic button
  const triggerPanic = useCallback(async (location = null) => {
    if (!email) return { error: 'Not logged in' };

    setLoading(true);

    try {
      // Log panic event
      await supabase
        .from('safety_checkins')
        .insert({
          user_email: email,
          status: 'panic',
          trigger_type: 'panic_button',
          note: 'Panic button activated',
          location: location ? JSON.stringify(location) : null
        });

      // Notify trusted contacts
      await notifyTrustedContacts('panic', location);

      // Create notification for admin review
      await supabase
        .from('notification_outbox')
        .insert({
          user_email: 'admin',
          notification_type: 'panic_alert',
          title: 'Panic Button Triggered',
          message: `User ${email} triggered panic button`,
          metadata: { user_email: email, location }
        });

      return { success: true };
    } catch (err) {
      console.error('Panic trigger error:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, [email]);

  // Notify trusted contacts
  const notifyTrustedContacts = useCallback(async (type, data = {}) => {
    const contactsToNotify = trustedContacts.filter(c => 
      type === 'panic' ? c.notify_on_panic : c.notify_on_checkin
    );

    if (contactsToNotify.length === 0) return;

    const messages = {
      panic: 'URGENT: Your friend needs help. They triggered their safety button on HOTMESS.',
      help_requested: 'Your friend requested help during a safety check-in on HOTMESS.',
      missed_checkin: 'Your friend missed their safety check-in on HOTMESS.'
    };

    for (const contact of contactsToNotify) {
      // In production, this would send SMS/email via a notification service
      await supabase
        .from('notification_outbox')
        .insert({
          user_email: contact.contact_email || 'system',
          notification_type: `safety_${type}`,
          title: 'HOTMESS Safety Alert',
          message: messages[type] || 'Safety notification',
          channel: contact.contact_email ? 'email' : 'in_app',
          metadata: { contact, type, ...data }
        });
    }
  }, [trustedContacts]);

  // Request fake call
  const requestFakeCall = useCallback(async (delaySeconds = 30) => {
    // This would integrate with a service to trigger a phone call
    // For now, we'll set up a local notification
    return new Promise((resolve) => {
      setTimeout(() => {
        // Trigger browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Incoming Call', {
            body: 'Mom is calling...',
            icon: '/favicon.svg',
            tag: 'fake-call'
          });
        }
        resolve({ success: true });
      }, delaySeconds * 1000);
    });
  }, []);

  // Get crisis resources
  const getCrisisResources = useCallback(() => {
    return {
      emergency: { name: 'Emergency Services', phone: '999' },
      switchboard: { name: 'Switchboard LGBT+', phone: '0300 330 0630', hours: '10am-10pm' },
      samaritans: { name: 'Samaritans', phone: '116 123', hours: '24/7' },
      galop: { name: 'Galop (anti-violence)', phone: '0800 999 5428' },
      mindout: { name: 'MindOut (mental health)', url: 'mindout.org.uk' }
    };
  }, []);

  return {
    // State
    trustedContacts,
    activeCheckIn,
    loading,

    // Contact management
    addTrustedContact,
    removeTrustedContact,

    // Check-in management
    startCheckIn,
    respondToCheckIn,
    cancelCheckIn,

    // Emergency features
    triggerPanic,
    requestFakeCall,

    // Resources
    getCrisisResources,

    // Helpers
    hasTrustedContacts: trustedContacts.length > 0,
    hasActiveCheckIn: !!activeCheckIn
  };
}

export default useSafety;
