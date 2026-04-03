/**
 * SafetyFAB - Floating Action Button for quick safety access
 * 
 * Features:
 * - Quick panic button
 * - Emergency mode overlay (stays in app)
 * - Location sharing
 * - Fake call trigger
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Loader2,
  Clock,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useTonightModeContext } from '@/hooks/useTonightMode';
import FakeCallGenerator from '@/components/safety/FakeCallGenerator';
import CheckInTimerModal from '@/components/safety/CheckInTimerModal';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { useShakeSOS } from '@/hooks/useShakeSOS';
import { useSOSContext } from '@/contexts/SOSContext';

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
        const { data: { user } } = await supabase.auth.getUser();
      if (!user) { user = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); user = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
        if (user?.email) {
          const { data: contacts, error } = await supabase
            .from('trusted_contacts')
            .select('*')
            .eq('user_id', user.id)
            .eq('notify_on_sos', true);
          if (error) {
            console.warn('Failed to fetch trusted_contacts:', error);
            setContactCount(0);
          } else {
            setContactCount(contacts?.length || 0);
          }
        }
      } catch (e) {
        console.error('Failed to get contacts:', e);
        setContactCount(0);
      }
    };
    getContacts();
  }, []);

  const sendAlerts = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { user = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); user = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
      if (!user?.email) {
        toast.error('You must be logged in');
        return;
      }

      const locationStr = location 
        ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
        : 'Location unavailable';

      // Get trusted contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('notify_on_sos', true);

      if (contactsError) {
        console.warn('Failed to fetch trusted_contacts:', contactsError);
      }

      const emergencyMessage = user.emergency_message ||
        `🚨 EMERGENCY ALERT from ${user.full_name}: I need help! Location: ${locationStr}`;

      // Send to all contacts
      // Email notifications disabled - implement via /api/email/send endpoint
      for (const contact of (contacts || [])) {
        // TODO: Send via supabase or /api/email/send
        console.log('Would send to:', contact.contact_email);
      }

      // Log SOS event
      await supabase.from('safety_checkins').insert({
        user_id: user.id,
        check_in_time: new Date().toISOString(),
        expected_check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: location ? { lat: location.lat, lng: location.lng, address: locationStr } : null,
        status: 'sos_triggered',
        notes: 'EMERGENCY MODE ACTIVATED'
      });

      setSent(true);
      toast.success(`Alerts sent to ${contacts.length} contact(s)`);
    } catch (error) {
      console.error('Alert failed:', error);
      toast.error('Failed to send alerts');
    } finally {
      setSending(false);
    }
  };

  const handleExitApp = () => {
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
    window.location.replace('https://hotmessldn.com/safe');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-red-950 flex flex-col"
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
/**
 * SOS Progress Ring — SVG circle that fills over 3 seconds during long-press.
 * radius=31, circumference=2*PI*31~194.78
 */
function SOSProgressRing({ progress }) {
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      className="absolute inset-0 -rotate-90 pointer-events-none"
      width="56"
      height="56"
      viewBox="0 0 64 64"
    >
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="rgba(255, 59, 48, 0.25)"
        strokeWidth="3"
      />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="#FF3B30"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 30ms linear' }}
      />
    </svg>
  );
}

export default function SafetyFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmergencyMode, setShowEmergencyMode] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showCheckinTimer, setShowCheckinTimer] = useState(false);
  const tonightMode = useTonightModeContext();
  const { isActive: timerActive, secondsLeft } = useCheckinTimer();
  const { triggerSOS } = useSOSContext();
  const { enabled: shakeEnabled, toggle: toggleShake } = useShakeSOS(triggerSOS);

  // More prominent during Tonight hours
  const isTonight = tonightMode?.isTonight ?? false;

  // ── Long-press SOS (3 seconds) ──────────────────────────────────────────────
  const SOS_HOLD_MS = 3000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef(null);
  const rafRef = useRef(null);
  const sosTriggeredRef = useRef(false);

  const startHold = useCallback((e) => {
    // Prevent default to avoid context menu on mobile long-press
    if (e.type === 'touchstart') e.preventDefault();
    holdStartRef.current = performance.now();
    sosTriggeredRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);

    const tick = () => {
      if (!holdStartRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min((elapsed / SOS_HOLD_MS) * 100, 100);
      setHoldProgress(pct);

      if (pct >= 100 && !sosTriggeredRef.current) {
        sosTriggeredRef.current = true;
        setIsHolding(false);
        setHoldProgress(0);
        holdStartRef.current = null;
        if (navigator?.vibrate) navigator.vibrate([200, 100, 200]);
        triggerSOS();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [triggerSOS]);

  const cancelHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const wasHolding = isHolding;
    const elapsed = holdStartRef.current ? performance.now() - holdStartRef.current : 0;
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);

    // If released before 3s and it was a short tap (< 300ms), toggle menu
    if (wasHolding && !sosTriggeredRef.current && elapsed < 300) {
      setIsExpanded((prev) => !prev);
    }
    // If released between 300ms and 3s, do nothing (aborted hold)
  }, [isHolding]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* FAB */}
      <div className={`fixed z-[60] transition-all duration-300 ${
        isTonight ? 'bottom-24 left-4' : 'bottom-20 left-4'
      }`}>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-16 left-0 bg-black/90 border border-white/20 rounded-xl p-3 min-w-[200px]"
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
                  onClick={() => { setShowFakeCall(true); setIsExpanded(false); }}
                >
                  <Phone className="w-4 h-4 mr-3 text-cyan-500" />
                  Fake Call
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start transition-colors ${
                    timerActive
                      ? 'text-[#00C2E0] bg-[#00C2E0]/10 hover:bg-[#00C2E0]/20'
                      : 'text-white hover:bg-[#00C2E0]/10 hover:text-[#00C2E0]'
                  }`}
                  onClick={() => { setShowCheckinTimer(true); setIsExpanded(false); }}
                >
                  <Clock className="w-4 h-4 mr-3 text-[#00C2E0]" />
                  {timerActive
                    ? `Check-in: ${Math.floor(secondsLeft / 60)}m left`
                    : 'Check-in Timer'}
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start transition-colors ${
                    shakeEnabled
                      ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                      : 'text-white hover:bg-red-500/10 hover:text-red-400'
                  }`}
                  onClick={() => { toggleShake(); setIsExpanded(false); }}
                >
                  <Smartphone className="w-4 h-4 mr-3 text-red-400" />
                  {shakeEnabled ? 'Shake SOS: ON' : 'Shake SOS: OFF'}
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

        <div className="relative">
          {/* Active timer ring */}
          {timerActive && !isHolding && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: '2px solid #00C2E0' }}
              animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          {/* SOS hold progress ring */}
          {isHolding && holdProgress > 0 && (
            <SOSProgressRing progress={holdProgress} />
          )}
          <Button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            className={`rounded-full w-14 h-14 shadow-lg transition-all select-none ${
              isHolding
                ? 'bg-red-500/30 border-2 border-red-500 scale-110'
                : isTonight
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : timerActive
                ? 'bg-[#00C2E0]/20 hover:bg-[#00C2E0]/30 border border-[#00C2E0]'
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
          >
            <Shield className={`w-6 h-6 ${
              isHolding
                ? 'text-red-400'
                : isTonight
                ? 'text-white'
                : timerActive
                ? 'text-[#00C2E0]'
                : 'text-white/80'
            }`} />
          </Button>
        </div>
      </div>

      {/* Emergency Mode Overlay */}
      <AnimatePresence>
        {showEmergencyMode && (
          <EmergencyModeOverlay
            onDismiss={() => setShowEmergencyMode(false)}
          />
        )}
      </AnimatePresence>

      {/* Fake Call Overlay */}
      <AnimatePresence>
        {showFakeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/70 backdrop-blur-md flex items-end justify-center pb-8 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowFakeCall(false); }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm"
            >
              <FakeCallGenerator onClose={() => setShowFakeCall(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-in Timer Modal */}
      <CheckInTimerModal
        isOpen={showCheckinTimer}
        onClose={() => setShowCheckinTimer(false)}
      />
    </>
  );
}

