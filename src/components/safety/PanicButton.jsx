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
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';

export default function PanicButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const sendSOSAlerts = async () => {
    setSendingAlerts(true);
    try {
      const user = await base44.auth.me();
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
      const contacts = await base44.entities.TrustedContact.filter({ 
        user_email: user.email,
        notify_on_sos: true 
      });

      // Get user's pre-defined emergency message
      const emergencyMessage = user.emergency_message || 
        `🚨 EMERGENCY ALERT from ${user.full_name}: I need help! My last known location: ${locationData.address}`;

      // Send SMS/Email to all trusted contacts
      for (const contact of contacts) {
        try {
          await base44.integrations.Core.SendEmail({
            to: contact.contact_email || 'noreply@hotmess.app',
            subject: '🚨 EMERGENCY ALERT - HOTMESS',
            body: `${emergencyMessage}\n\nTime: ${new Date().toLocaleString()}\nLocation: ${locationData.address}\nGoogle Maps: https://www.google.com/maps?q=${locationData.lat},${locationData.lng}\n\nThis is an automated emergency alert from HOTMESS.`
          });
        } catch (error) {
          console.error('Failed to send alert to:', contact.contact_name);
        }
      }

      // Log SOS event
      await base44.entities.SafetyCheckIn.create({
        user_email: user.email,
        check_in_time: new Date().toISOString(),
        expected_check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: locationData,
        status: 'sos_triggered',
        notes: 'SOS PANIC BUTTON ACTIVATED'
      });

      // Notify admins
      await base44.entities.NotificationOutbox.create({
        user_email: 'admin',
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
    
    // Clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Force immediate redirect
    window.location.replace('https://www.google.com');
  };

  // SAFETY FIRST: Panic button should ALWAYS be visible and accessible
  // This is a critical safety feature - never hide it
  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        variant="ghost"
        size="sm"
        className="flex fixed bottom-20 md:bottom-4 left-4 z-[60] bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 backdrop-blur-sm shadow-lg"
        aria-label="Emergency SOS panic button"
      >
        <AlertTriangle className="w-4 h-4 mr-1" />
        <span className="text-xs font-black uppercase">SOS</span>
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