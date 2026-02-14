/**
 * SafetyFAB - Floating Action Button for quick safety access
 * 
 * Features:
 * - Quick panic button
 * - Emergency mode overlay (stays in app)
 * - Location sharing
 * - Fake call trigger
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  X, 
  Send,
  Users,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useTonightModeContext } from '@/hooks/useTonightMode';
import logger from '@/utils/logger';

/**
 * Emergency Mode Overlay - Full screen red theme safety UI
 */
function EmergencyModeOverlay({ onDismiss, onExit }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState(null);
  const [contactCount, setContactCount] = useState(0);

  // Get location on mount
  useEffect(() => {
    const getLocation = async () => {
      const loc = await safeGetViewerLatLng(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        { retries: 2, logKey: 'emergency' }
      );
      if (loc) setLocation(loc);
    };
    getLocation();
  }, []);

  // Get trusted contacts count
  useEffect(() => {
    const getContacts = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.email) {
          const contacts = await base44.entities.TrustedContact.filter({ 
            user_email: user.email,
            notify_on_sos: true 
          });
          setContactCount(contacts?.length || 0);
        }
      } catch (e) {
        logger.error('Failed to get contacts:', e);
      }
    };
    getContacts();
  }, []);

  const sendAlerts = async () => {
    setSending(true);
    try {
      const user = await base44.auth.me();
      if (!user?.email) {
        toast.error('You must be logged in');
        return;
      }

      const locationStr = location 
        ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
        : 'Location unavailable';

      // Get trusted contacts
      const contacts = await base44.entities.TrustedContact.filter({ 
        user_email: user.email,
        notify_on_sos: true 
      });

      const emergencyMessage = user.emergency_message || 
        `🚨 EMERGENCY ALERT from ${user.full_name}: I need help! Location: ${locationStr}`;

      // Send to all contacts
      for (const contact of contacts) {
        try {
          await base44.integrations.Core.SendEmail({
            to: contact.contact_email || 'noreply@hotmess.app',
            subject: '🚨 EMERGENCY ALERT - HOTMESS',
            body: `${emergencyMessage}\n\nTime: ${new Date().toLocaleString()}\nLocation: ${locationStr}${location ? `\nGoogle Maps: https://www.google.com/maps?q=${location.lat},${location.lng}` : ''}\n\nThis is an automated emergency alert.`
          });
        } catch (error) {
          logger.error('Failed to send to:', contact.contact_name);
        }
      }

      // Log SOS event
      await base44.entities.SafetyCheckIn.create({
        user_email: user.email,
        check_in_time: new Date().toISOString(),
        expected_check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: location ? { lat: location.lat, lng: location.lng, address: locationStr } : null,
        status: 'sos_triggered',
        notes: 'EMERGENCY MODE ACTIVATED'
      });

      setSent(true);
      toast.success(`Alerts sent to ${contacts.length} contact(s)`);
    } catch (error) {
      logger.error('Alert failed:', error);
      toast.error('Failed to send alerts');
    } finally {
      setSending(false);
    }
  };

  const handleExitApp = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('https://www.google.com');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-red-950 flex flex-col"
    >
      {/* Red gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/50 via-red-950 to-black" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">EMERGENCY MODE</h1>
              <p className="text-red-300 text-sm">You are safe here</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Status */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          {/* Location status */}
          <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-lg">
            <MapPin className={`w-5 h-5 ${location ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`} />
            <span className="text-white/80 text-sm">
              {location ? 'Location acquired' : 'Getting your location...'}
            </span>
          </div>

          {/* Contacts status */}
          <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-lg">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-white/80 text-sm">
              {contactCount} trusted contact{contactCount !== 1 ? 's' : ''} ready
            </span>
          </div>

          {/* Main action */}
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-white mb-2">Alerts Sent</p>
              <p className="text-white/60 text-sm">Your contacts have been notified</p>
            </div>
          ) : (
            <Button
              onClick={sendAlerts}
              disabled={sending}
              className="w-64 h-20 bg-red-500 hover:bg-red-600 text-white font-black text-xl rounded-2xl"
            >
              {sending ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  SENDING...
                </>
              ) : (
                <>
                  <Send className="w-6 h-6 mr-3" />
                  SEND SOS ALERTS
                </>
              )}
            </Button>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1 border-white/30 text-white hover:bg-white/10"
          >
            I'm OK - Go Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleExitApp}
            className="flex-1 bg-red-700 hover:bg-red-800"
          >
            Exit & Clear Data
          </Button>
        </div>

        {/* Emergency numbers */}
        <div className="mt-6 text-center">
          <p className="text-white/40 text-xs mb-2">Emergency Services</p>
          <div className="flex justify-center gap-4">
            <a href="tel:999" className="text-white/60 hover:text-white text-sm">
              <Phone className="w-4 h-4 inline mr-1" /> 999 (UK)
            </a>
            <a href="tel:112" className="text-white/60 hover:text-white text-sm">
              <Phone className="w-4 h-4 inline mr-1" /> 112 (EU)
            </a>
            <a href="tel:911" className="text-white/60 hover:text-white text-sm">
              <Phone className="w-4 h-4 inline mr-1" /> 911 (US)
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * SafetyFAB - The floating safety button
 */
export default function SafetyFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmergencyMode, setShowEmergencyMode] = useState(false);
  const tonightMode = useTonightModeContext();

  // More prominent during Tonight hours
  const isTonight = tonightMode?.isTonight ?? false;

  const triggerFakeCall = () => {
    // Simple fake call - vibrate and show notification
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    toast('📱 Incoming call...', {
      duration: 5000,
      description: 'Tap to answer',
      action: {
        label: 'Answer',
        onClick: () => {
          window.open('tel:+441onal', '_self');
        },
      },
    });
    setIsExpanded(false);
  };

  return (
    <>
      {/* FAB */}
      <div className={`fixed z-50 transition-all duration-300 ${
        isTonight ? 'bottom-24 right-4' : 'bottom-20 right-4'
      }`}>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-16 right-0 bg-black/90 border border-white/20 rounded-xl p-3 min-w-[200px]"
            >
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-red-500/20 hover:text-red-400"
                  onClick={() => {
                    setShowEmergencyMode(true);
                    setIsExpanded(false);
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-3 text-red-500" />
                  Emergency Mode
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-cyan-500/20 hover:text-cyan-400"
                  onClick={triggerFakeCall}
                >
                  <Phone className="w-4 h-4 mr-3 text-cyan-500" />
                  Fake Call
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-purple-500/20 hover:text-purple-400"
                  asChild
                >
                  <a href="/safety">
                    <Shield className="w-4 h-4 mr-3 text-purple-500" />
                    Safety Hub
                  </a>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`rounded-full w-14 h-14 shadow-lg transition-all ${
            isTonight 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-white/10 hover:bg-white/20 border border-white/20'
          }`}
        >
          <Shield className={`w-6 h-6 ${isTonight ? 'text-white' : 'text-white/80'}`} />
        </Button>
      </div>

      {/* Emergency Mode Overlay */}
      <AnimatePresence>
        {showEmergencyMode && (
          <EmergencyModeOverlay 
            onDismiss={() => setShowEmergencyMode(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
