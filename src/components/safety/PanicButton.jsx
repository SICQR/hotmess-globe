import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, MapPin, Send, Mic, Phone, Shield, Vibrate } from 'lucide-react';
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
import { motion } from 'framer-motion';

// Quick-exit keyboard shortcut: Press Escape 3 times rapidly
const QUICK_EXIT_KEY = 'Escape';
const QUICK_EXIT_COUNT = 3;
const QUICK_EXIT_WINDOW = 1500; // ms

export default function PanicButton({ variant = 'floating' }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [quickExitPresses, setQuickExitPresses] = useState([]);

  // Vibration feedback
  const triggerVibration = useCallback((pattern = [100, 50, 100]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Quick-exit keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== QUICK_EXIT_KEY) return;
      
      const now = Date.now();
      const recentPresses = quickExitPresses.filter(t => now - t < QUICK_EXIT_WINDOW);
      const newPresses = [...recentPresses, now];
      setQuickExitPresses(newPresses);
      
      if (newPresses.length >= QUICK_EXIT_COUNT) {
        // Triple Escape - immediate exit
        triggerVibration([200, 100, 200, 100, 200]);
        handleQuickExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickExitPresses, triggerVibration]);

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        setAudioChunks(chunks);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      triggerVibration([50]);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendSOSAlerts = async () => {
    setSendingAlerts(true);
    triggerVibration([100, 50, 100, 50, 100]);
    
    try {
      const user = await base44.auth.me();
      if (!user?.email) {
        toast.error('You must be logged in to send alerts');
        return;
      }
      
      // Get current location with high accuracy for emergencies
      let locationData = { lat: null, lng: null, address: 'Location unavailable' };
      const loc = await safeGetViewerLatLng(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        { retries: 3, logKey: 'panic' }
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

      const mapsUrl = locationData.lat 
        ? `https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`
        : 'Location unavailable';

      // Send alerts to all trusted contacts
      for (const contact of contacts) {
        try {
          await base44.integrations.Core.SendEmail({
            to: contact.contact_email || 'noreply@hotmess.app',
            subject: '🚨 EMERGENCY ALERT - HOTMESS',
            body: `${emergencyMessage}\n\nTime: ${new Date().toLocaleString()}\nLocation: ${locationData.address}\nGoogle Maps: ${mapsUrl}\n\nThis is an automated emergency alert from HOTMESS.`
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
        notes: 'SOS PANIC BUTTON ACTIVATED',
        metadata: {
          has_audio: audioChunks.length > 0,
          triggered_at: new Date().toISOString(),
        }
      });

      // Notify admins
      await base44.entities.NotificationOutbox.create({
        user_email: 'admin',
        notification_type: 'emergency',
        title: '🚨 SOS ALERT',
        message: `${user.full_name} triggered panic button`,
        metadata: { 
          user_email: user.email, 
          location: locationData,
          contacts_notified: contacts.length,
        }
      });

      toast.success(`Alert sent to ${contacts.length} trusted contact(s)`);
    } catch (error) {
      console.error('SOS alert failed:', error);
      toast.error('Failed to send alerts');
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleQuickExit = () => {
    // Immediate exit without confirmation
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('https://www.google.com');
  };

  const handlePanic = async () => {
    stopRecording();
    await sendSOSAlerts();
    
    // Clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Force immediate redirect to a safe page
    window.location.replace('https://www.google.com');
  };

  const handleOpenConfirm = () => {
    triggerVibration([50, 30, 50]);
    setShowConfirm(true);
  };

  // Floating button variant
  if (variant === 'floating') {
    return (
      <>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-20 right-4 z-[60] flex flex-col gap-2"
        >
          {/* Quick exit hint */}
          <div className="text-[8px] text-white/30 text-right uppercase tracking-wider">
            ESC×3 = Quick Exit
          </div>
          
          <Button
            onClick={handleOpenConfirm}
            variant="ghost"
            size="sm"
            className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-500 hover:text-white shadow-lg shadow-red-500/20"
          >
            <Shield className="w-4 h-4 mr-2" />
            SAFETY
          </Button>
        </motion.div>

        <PanicDialog 
          open={showConfirm}
          onOpenChange={setShowConfirm}
          onPanic={handlePanic}
          onQuickExit={handleQuickExit}
          sendingAlerts={sendingAlerts}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
      </>
    );
  }

  // Inline button variant
  return (
    <>
      <Button
        onClick={handleOpenConfirm}
        variant="destructive"
        className="w-full bg-red-500 hover:bg-red-600 text-white font-black"
      >
        <AlertTriangle className="w-5 h-5 mr-2" />
        EMERGENCY SOS
      </Button>

      <PanicDialog 
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onPanic={handlePanic}
        onQuickExit={handleQuickExit}
        sendingAlerts={sendingAlerts}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    </>
  );
}

// Separated dialog for reuse
function PanicDialog({ 
  open, 
  onOpenChange, 
  onPanic, 
  onQuickExit, 
  sendingAlerts,
  isRecording,
  onStartRecording,
  onStopRecording
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-black border-2 border-red-500 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500 flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6" />
            Emergency Safety
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/80 space-y-4">
            <p className="font-bold text-white text-base">Choose an action:</p>
            
            {/* Quick Exit Button */}
            <button
              onClick={onQuickExit}
              className="w-full p-4 bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white">Quick Exit</div>
                  <div className="text-xs text-white/50">Leave immediately (no alerts)</div>
                </div>
              </div>
            </button>

            {/* Audio Recording */}
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`w-full p-4 border rounded-lg transition-colors text-left ${
                isRecording 
                  ? 'bg-red-500/20 border-red-500/50' 
                  : 'bg-white/5 border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/10'
                }`}>
                  <Mic className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-white'}`} />
                </div>
                <div>
                  <div className="font-bold text-white">
                    {isRecording ? 'Recording...' : 'Record Audio'}
                  </div>
                  <div className="text-xs text-white/50">
                    {isRecording ? 'Tap to stop' : 'Record evidence before sending'}
                  </div>
                </div>
              </div>
            </button>

            {/* SOS Alert Info */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-300 font-medium mb-2">FULL SOS WILL:</p>
              <ul className="space-y-1 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <Send className="w-3 h-3 text-red-400" />
                  Alert all trusted contacts
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-red-400" />
                  Share precise location
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-red-400" />
                  Notify safety team
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  Clear data & exit app
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onPanic}
            disabled={sendingAlerts}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 text-lg"
          >
            {sendingAlerts ? (
              <>
                <Vibrate className="w-5 h-5 mr-2 animate-pulse" />
                SENDING ALERTS...
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                ACTIVATE FULL SOS
              </>
            )}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full bg-white/10 border-white/20 text-white">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}