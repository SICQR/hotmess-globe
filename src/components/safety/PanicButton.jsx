import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, MapPin, Send } from 'lucide-react';
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

/**
 * PanicButton - Discrete SOS trigger using hardware volume buttons
 * 
 * Trigger: Press volume button 5 times quickly (within 2 seconds)
 * This is discrete - no visible button on screen
 */

// Number of rapid presses needed to trigger
const REQUIRED_PRESSES = 5;
// Time window for presses (ms)
const TIME_WINDOW = 2000;

export default function PanicButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  
  // Track volume button presses
  const pressTimesRef = useRef([]);
  const toastShownRef = useRef(false);
  
  // Listen for volume button presses (detected via volume change events)
  const handleVolumePress = useCallback(() => {
    const now = Date.now();
    pressTimesRef.current.push(now);
    
    // Filter to only recent presses within the time window
    pressTimesRef.current = pressTimesRef.current.filter(
      (time) => now - time < TIME_WINDOW
    );
    
    // Check if we have enough presses
    if (pressTimesRef.current.length >= REQUIRED_PRESSES) {
      pressTimesRef.current = []; // Reset
      setShowConfirm(true);
    } else if (pressTimesRef.current.length >= 3 && !toastShownRef.current) {
      // Show hint after 3 presses
      toastShownRef.current = true;
      toast.info(`${REQUIRED_PRESSES - pressTimesRef.current.length} more for SOS`, {
        duration: 2000,
        icon: '🆘',
      });
      setTimeout(() => { toastShownRef.current = false; }, 2000);
    }
  }, []);
  
  useEffect(() => {
    // Method 1: Listen for keyboard volume keys (desktop/laptop)
    const handleKeyDown = (e) => {
      if (e.key === 'AudioVolumeUp' || e.key === 'AudioVolumeDown' || 
          e.code === 'VolumeUp' || e.code === 'VolumeDown') {
        handleVolumePress();
      }
    };
    
    // Method 2: Listen for volume change events (mobile)
    // Note: This works when the page is focused on mobile browsers
    let lastVolume = null;
    const checkVolume = () => {
      if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator) {
        // Try to detect volume changes via audio context
        try {
          const audio = new Audio();
          if (lastVolume !== null && audio.volume !== lastVolume) {
            handleVolumePress();
          }
          lastVolume = audio.volume;
        } catch {
          // Ignore
        }
      }
    };
    
    // Method 3: Use a hidden video element to detect hardware volume changes
    const setupMediaVolumeListener = () => {
      const video = document.createElement('video');
      video.style.display = 'none';
      video.muted = true;
      document.body.appendChild(video);
      
      video.addEventListener('volumechange', handleVolumePress);
      
      return () => {
        video.removeEventListener('volumechange', handleVolumePress);
        video.remove();
      };
    };
    
    window.addEventListener('keydown', handleKeyDown);
    const cleanupMedia = setupMediaVolumeListener();
    const volumeCheckInterval = setInterval(checkVolume, 100);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanupMedia();
      clearInterval(volumeCheckInterval);
    };
  }, [handleVolumePress]);

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

  return (
    <>
      {/* No visible button - SOS triggered by pressing volume button 5 times quickly */}
      
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-black border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              🚨 Emergency SOS
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

/**
 * Export a helper to allow manual triggering from other components (e.g., Settings)
 */
export function usePanicTrigger() {
  const [show, setShow] = useState(false);
  return { showPanic: show, triggerPanic: () => setShow(true), closePanic: () => setShow(false) };
}