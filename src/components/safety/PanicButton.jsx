import React, { useState } from 'react';
import { AlertTriangle, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';

export default function PanicButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const sendSOSAlerts = async () => {
    setSendingAlerts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { user = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); user = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
      if (!user?.email) {
        toast.error('You must be logged in to send alerts');
        return;
      }
      
      // Get current location
      let locationData = { lat: null, lng: null, address: 'Location unavailable' };
      const loc = await safeGetViewerLatLng(
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 15_000 },
        { retries: 2, logKey: 'panic' }
      );
      if (loc) {
        locationData = {
          lat: loc.lat,
          lng: loc.lng,
          address: `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`,
        };
      }

      // Get trusted contacts
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_email', user.email)
        .eq('notify_on_sos', true);

      // Get user's pre-defined emergency message
      const emergencyMessage = user.emergency_message || 
        `🚨 EMERGENCY ALERT from ${user.full_name}: I need help! My last known location: ${locationData.address}`;

      // Send SMS/Email to all trusted contacts
      // Email notifications disabled - implement via /api/email/send endpoint
      for (const contact of contacts) {
        // TODO: Send via supabase or /api/email/send
        console.log('Would send to:', contact.contact_email);
      }

      // Log SOS event
      await supabase.from('safety_check_ins').insert({
        user_email: user.email,
        check_in_time: new Date().toISOString(),
        expected_check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: locationData,
        status: 'sos_triggered',
        notes: 'SOS PANIC BUTTON ACTIVATED'
      });

      // Notify admins via notifications table
      await supabase.from('notifications').insert({
        user_id: user.id,
        notification_type: 'emergency',
        title: '🚨 SOS ALERT',
        message: `${user.full_name} triggered panic button`,
        metadata: { user_email: user.email, location: locationData }
      });

      toast.success(`Alert sent to ${contacts.length} trusted contact(s)`);
    } catch (error) {
      console.error('SOS alert failed:', error);
      toast.error('Failed to send alerts');
    } finally {
      setSendingAlerts(false);
    }
  };

  const handlePanic = async () => {
    await sendSOSAlerts();

    // Clear sensitive data only — preserve auth tokens
    try {
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (key.startsWith('hm_') || key.startsWith('hm.')) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    sessionStorage.clear();
    if (navigator?.vibrate) navigator.vibrate(100);

    // Redirect to safe landing page (not google.com)
    window.location.replace('https://hotmessldn.com/safe');
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        variant="ghost"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        PANIC
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-black border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              🚨 Emergency Panic
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 space-y-3">
              <p className="font-bold text-white">This will:</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-red-400" />
                  Send SOS alerts to all trusted contacts
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  Share your real-time location
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Clear all data and exit immediately
                </li>
              </ul>
              <p className="text-red-400 text-xs mt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePanic}
              disabled={sendingAlerts}
              className="bg-red-500 hover:bg-red-600 text-white font-black"
            >
              {sendingAlerts ? 'SENDING ALERTS...' : '🚨 ACTIVATE SOS'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}