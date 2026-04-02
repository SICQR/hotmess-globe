/**
 * SOSOverlay — full-screen emergency interrupt
 *
 * Triggered by the SOS button (long-press 2s) or shake.
 * Features:
 *   - Share location (writes to location_shares + right_now_status)
 *   - Fake call — fully convincing 2-phase fake call:
 *       Phase 1 (ringing):  platform-matched incoming call screen
 *       Phase 2 (connected): live timer + call controls
 *   - PIN-protected dismiss (4-digit PIN)
 *   - Hold-to-dismiss fallback (3s hold) if no PIN set
 *   - Text emergency contact (SMS deeplink)
 *   - Call 999 (emergency services)
 *   - Exit & clear data (emergency disappearance)
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Phone,
  PhoneOff,
  MessageSquare,
  UserPlus,
  MapPin,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { useGlobe } from '@/contexts/GlobeContext';

// ── Platform detection ─────────────────────────────────────────────────────────

function detectPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface SOSOverlayProps {
  onClose: () => void;
}

// ── PIN hashing ────────────────────────────────────────────────────────────────

function hashPIN(pin: string): string {
  const combined = `hotmess_${pin}_salt`;
  return [...combined].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(36);
}

// ── Call timer formatter ───────────────────────────────────────────────────────

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── iOS Fake Call ──────────────────────────────────────────────────────────────
//
// Phase 1 — Ringing:
//   Full-screen dark with subtle gradient, large avatar, pulsing ring,
//   caller name, iOS-style swipe actions replaced by two big circles.
// Phase 2 — Connected:
//   Calls controls: mute, speaker, end.

function IOSFakeCall({
  callerName,
  onEnd,
}: {
  callerName: string;
  onEnd: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ring vibration on mount
  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }
  }, []);

  // Start elapsed timer when accepted
  useEffect(() => {
    if (!accepted) return;
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [accepted]);

  // Auto-end after 3 minutes (fake calls shouldn't go on forever)
  useEffect(() => {
    if (elapsed >= 180) onEnd();
  }, [elapsed, onEnd]);

  const initial = callerName.charAt(0).toUpperCase();

  return (
    <motion.div
      key="ios-fake-call"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[210] flex flex-col"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d14 60%, #050507 100%)' }}
    >
      {/* Top section: caller info */}
      <div className="flex flex-col items-center pt-16 px-6 flex-1">
        {/* App label */}
        <p
          className="text-[12px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: '#8E8E93' }}
        >
          {accepted ? 'HOTMESS · Calling' : 'HOTMESS · Incoming Call'}
        </p>

        {/* Avatar with pulse ring when ringing */}
        <div className="relative mb-6">
          {!accepted && (
            <div
              className="absolute -inset-4 rounded-full animate-ping opacity-30"
              style={{ background: 'rgba(52, 199, 89, 0.4)' }}
            />
          )}
          <div
            className="w-32 h-32 rounded-full border-4 overflow-hidden flex items-center justify-center"
            style={{ borderColor: accepted ? '#C8962C' : '#34C759', background: '#2C2C2E' }}
          >
            <span className="text-white font-black" style={{ fontSize: 52 }}>
              {initial}
            </span>
          </div>
          {/* Online dot when connected */}
          {accepted && (
            <div
              className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-[#050507]"
              style={{ background: '#30D158' }}
            />
          )}
        </div>

        {/* Caller name */}
        <h1
          className="font-black text-white mb-1 text-center"
          style={{ fontSize: 34, letterSpacing: '-0.5px' }}
        >
          {callerName}
        </h1>

        {/* Status line */}
        <p
          className="text-[16px] font-medium"
          style={{ color: '#8E8E93' }}
        >
          {accepted ? formatTimer(elapsed) : 'mobile · HOTMESS'}
        </p>

        {/* Connected — call controls grid */}
        {accepted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 grid grid-cols-3 gap-6 w-full max-w-xs"
          >
            {/* Mute */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setMuted((m) => !m)}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-colors"
                style={{ background: muted ? '#FFFFFF' : 'rgba(255,255,255,0.15)' }}
              >
                {muted
                  ? <MicOff className="w-6 h-6" style={{ color: '#000' }} />
                  : <Mic className="w-6 h-6 text-white" />}
              </button>
              <span className="text-[11px] font-medium" style={{ color: '#8E8E93' }}>
                {muted ? 'unmute' : 'mute'}
              </span>
            </div>

            {/* Speaker */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setSpeakerOn((s) => !s)}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-colors"
                style={{ background: speakerOn ? '#FFFFFF' : 'rgba(255,255,255,0.15)' }}
              >
                {speakerOn
                  ? <Volume2 className="w-6 h-6" style={{ color: '#000' }} />
                  : <VolumeX className="w-6 h-6 text-white" />}
              </button>
              <span className="text-[11px] font-medium" style={{ color: '#8E8E93' }}>
                speaker
              </span>
            </div>

            {/* Video (greyed — fake) */}
            <div className="flex flex-col items-center gap-2">
              <button
                className="w-16 h-16 rounded-full flex items-center justify-center opacity-40"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                disabled
              >
                <Video className="w-6 h-6 text-white" />
              </button>
              <span className="text-[11px] font-medium" style={{ color: '#8E8E93' }}>
                video
              </span>
            </div>
          </motion.div>
        )}

        <div className="flex-1" />

        {/* Bottom actions */}
        {!accepted ? (
          /* Ringing — decline + accept */
          <div className="flex items-end justify-between w-full max-w-xs pb-16">
            {/* Decline */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onEnd}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#FF3B30' }}
                aria-label="Decline"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <span className="text-[13px] font-medium text-white/70">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  setAccepted(true);
                  setElapsed(0);
                  if ('vibrate' in navigator) navigator.vibrate(50);
                }}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#34C759' }}
                aria-label="Accept"
              >
                <Phone className="w-8 h-8 text-white" />
              </button>
              <span className="text-[13px] font-medium text-white/70">Accept</span>
            </div>
          </div>
        ) : (
          /* Connected — single end call button */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 pb-16"
          >
            <button
              onClick={onEnd}
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: '#FF3B30' }}
              aria-label="End call"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            <span className="text-[13px] font-medium text-white/70">End</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Android Fake Call ──────────────────────────────────────────────────────────
//
// Material You style — bold green gradient background, large caller info,
// slide-up to answer / slide-down to decline (simulated with tap buttons).

function AndroidFakeCall({
  callerName,
  onEnd,
}: {
  callerName: string;
  onEnd: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if ('vibrate' in navigator) navigator.vibrate([400, 200, 400, 200, 400]);
  }, []);

  useEffect(() => {
    if (!accepted) return;
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [accepted]);

  useEffect(() => {
    if (elapsed >= 180) onEnd();
  }, [elapsed, onEnd]);

  const initial = callerName.charAt(0).toUpperCase();

  if (!accepted) {
    // Ringing UI
    return (
      <motion.div
        key="android-fake-call-ring"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[210] flex flex-col"
        style={{ background: 'linear-gradient(160deg, #1b5e20 0%, #0a0a0a 50%)' }}
      >
        {/* Top section */}
        <div className="flex flex-col items-center pt-20 px-6">
          {/* Avatar */}
          <div className="relative mb-5">
            <div
              className="absolute -inset-3 rounded-full animate-ping opacity-25"
              style={{ background: 'rgba(76,175,80,0.5)' }}
            />
            <div
              className="w-28 h-28 rounded-full border-4 overflow-hidden flex items-center justify-center"
              style={{ borderColor: '#4CAF50', background: '#1C1C1E' }}
            >
              <span className="text-white font-black" style={{ fontSize: 48 }}>
                {initial}
              </span>
            </div>
          </div>

          <p className="text-[13px] font-medium mb-1" style={{ color: '#81C784' }}>
            HOTMESS · Incoming call
          </p>
          <h1
            className="font-bold text-white text-center mb-1"
            style={{ fontSize: 32, letterSpacing: '-0.3px' }}
          >
            {callerName}
          </h1>
          <p className="text-[14px]" style={{ color: '#9E9E9E' }}>
            mobile
          </p>
        </div>

        {/* Bottom buttons */}
        <div className="flex-1 flex flex-col items-center justify-end pb-20 gap-6 px-8">
          <div className="flex items-end justify-between w-full max-w-xs">
            {/* Decline */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onEnd}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
                style={{ background: '#D32F2F' }}
                aria-label="Decline"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <span className="text-[12px] font-medium text-white/60">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  setAccepted(true);
                  if ('vibrate' in navigator) navigator.vibrate(50);
                }}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
                style={{ background: '#2E7D32' }}
                aria-label="Accept"
              >
                <Phone className="w-8 h-8 text-white" />
              </button>
              <span className="text-[12px] font-medium text-white/60">Accept</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Connected UI
  return (
    <motion.div
      key="android-fake-call-connected"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[210] flex flex-col items-center"
      style={{ background: '#121212' }}
    >
      {/* Header */}
      <div className="flex flex-col items-center pt-16 px-6 w-full">
        <p className="text-sm mb-1" style={{ color: '#4CAF50' }}>
          {formatTimer(elapsed)}
        </p>
        <h1 className="text-[28px] font-bold text-white mb-0.5">{callerName}</h1>
        <p className="text-[13px]" style={{ color: '#9E9E9E' }}>mobile</p>

        {/* Avatar */}
        <div
          className="mt-6 w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center"
          style={{ borderColor: '#4CAF50', background: '#1C1C1E' }}
        >
          <span className="text-white font-black" style={{ fontSize: 40 }}>{initial}</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Controls */}
      <div className="w-full px-6 pb-20">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: muted ? '#FFFFFF' : 'rgba(255,255,255,0.12)' }}
            >
              {muted
                ? <MicOff className="w-6 h-6" style={{ color: '#000' }} />
                : <Mic className="w-6 h-6 text-white" />}
            </button>
            <span className="text-[11px] text-white/50">{muted ? 'Unmute' : 'Mute'}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setSpeakerOn((s) => !s)}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: speakerOn ? '#4CAF50' : 'rgba(255,255,255,0.12)' }}
            >
              <Volume2 className="w-6 h-6 text-white" />
            </button>
            <span className="text-[11px] text-white/50">Speaker</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              className="w-16 h-16 rounded-full flex items-center justify-center opacity-30"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              disabled
            >
              <Video className="w-6 h-6 text-white" />
            </button>
            <span className="text-[11px] text-white/30">Video</span>
          </div>
        </div>

        {/* End call */}
        <div className="flex justify-center">
          <button
            onClick={onEnd}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: '#D32F2F' }}
            aria-label="End call"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main SOSOverlay ────────────────────────────────────────────────────────────

export default function SOSOverlay({ onClose }: SOSOverlayProps) {
  const [firstContact, setFirstContact] = useState<EmergencyContact | null>(null);
  const [locationSharingActive, setLocationSharingActive] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallContactName, setFakeCallContactName] = useState('Mum');
  const [showDismissPIN, setShowDismissPIN] = useState(false);
  const [showHoldDismiss, setShowHoldDismiss] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const { emitPulse } = useGlobe();
  const [isHolding, setIsHolding] = useState(false);
  const { openSheet } = useSheet();
  const platform = detectPlatform();

  // Stop active shares on mount + load emergency contact
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('location_shares')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('active', true);

      if (user.email) {
        // Expire all active right_now_status for this user
        await supabase
          .from('right_now_status')
          .update({ expires_at: new Date().toISOString() })
          .eq('user_email', user.email)
          .gte('expires_at', new Date().toISOString());
      }

      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('id, name, phone, relation')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (contacts && contacts.length > 0) {
        setFirstContact(contacts[0] as EmergencyContact);
        setFakeCallContactName(contacts[0].name);
      }
    };

    init().catch(console.error);
  }, []);

  // Hold-to-dismiss progress
  useEffect(() => {
    if (!isHolding) {
      setHoldProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          setIsHolding(false);
          handleDismiss();
          return 0;
        }
        return prev + 3.33;
      });
    }, 30);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHolding]);

  const handleShareLocation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Not authenticated'); return; }

    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      const { error } = await supabase.from('location_shares').insert({
        user_id: user.id,
        lat: position.latitude,
        lng: position.longitude,
        active: true,
      });
      if (error) throw error;

      setLocationSharingActive(true);
      toast.success('Location shared with emergency contacts');

      if (user.email) {
        await supabase.from('right_now_status').upsert({
          user_email: user.email,
          user_id: user.id ?? null,
          status: 'sos',
          active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'user_email' });

        // Signal the Globe — safety pulse
        emitPulse?.({ type: 'sos', metadata: { userId: user.id } });
      }
    } catch {
      toast.error('Could not get location. Please enable location access.');
    }
  };

  const handleTextContact = () => {
    if (!firstContact) return;
    const body = encodeURIComponent('I need help. This is an emergency. HOTMESS SOS triggered.');
    window.location.href = `sms:${firstContact.phone}?body=${body}`;
  };

  const handleAddContact = () => {
    onClose();
    openSheet('emergency-contact', {});
  };

  const handleCallEmergency = () => {
    window.location.href = 'tel:999';
  };

  const handleGetHelp = () => {
    window.open('https://www.victimsupport.org.uk', '_blank', 'noopener,noreferrer');
  };

  const handleExitClearData = () => {
    // Only clear sensitive keys — preserve auth tokens so user can return
    try {
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (key.startsWith('hm_') || key.startsWith('hm.')) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    try { sessionStorage.clear(); } catch {}
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(100);
    window.location.replace('https://hotmessldn.com/safe');
  };

  const handleShowDismissPin = () => {
    const storedHash = localStorage.getItem('hotmess_pin_hash');
    if (!storedHash) {
      setShowHoldDismiss(true);
      setHoldProgress(0);
    } else {
      setShowDismissPIN(true);
      setPinInput('');
    }
  };

  const handlePinInput = (digit: string) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + digit;
    setPinInput(newPin);
    if (newPin.length === 4) {
      const storedHash = localStorage.getItem('hotmess_pin_hash');
      if (storedHash === hashPIN(newPin)) {
        handleDismiss();
      } else {
        toast.error('Incorrect PIN');
        setPinInput('');
      }
    }
  };

  const handleDismiss = () => {
    setShowDismissPIN(false);
    setShowHoldDismiss(false);
    setPinInput('');
    onClose();
  };

  return (
    <>
      {/* Main SOS overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center px-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mb-6"
        >
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </motion.div>

        {/* Header */}
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-red-500 font-black text-2xl uppercase tracking-widest mb-2 text-center"
        >
          EMERGENCY MODE
        </motion.h1>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10 space-y-1"
        >
          <p className="text-white/80 text-sm font-bold">Sharing stopped</p>
          <p className="text-red-400 text-sm font-bold">SOS is live</p>
          <p className="text-white/50 text-sm">Choose your next move</p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xs space-y-3"
        >
          {/* Share Location */}
          <button
            onClick={handleShareLocation}
            disabled={locationSharingActive}
            className={`w-full py-4 font-black rounded-2xl text-base uppercase tracking-wide flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${
              locationSharingActive
                ? 'bg-[#C8962C] text-black'
                : 'bg-[#C8962C]/80 text-black hover:bg-[#C8962C]'
            }`}
          >
            <MapPin className="w-5 h-5" />
            {locationSharingActive ? 'Location Shared ✓' : 'Share Location'}
          </button>

          {/* Fake Call */}
          <button
            onClick={() => setShowFakeCall(true)}
            className="w-full py-4 bg-[#1C1C1E] border border-[#C8962C]/40 text-white font-black rounded-2xl flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5 text-[#C8962C]" />
            Fake Call
          </button>

          {/* Get Help */}
          <button
            onClick={handleGetHelp}
            className="w-full py-4 bg-red-500 text-white font-black rounded-2xl text-base uppercase tracking-wide"
          >
            Get help
          </button>

          {/* Text / Add emergency contact */}
          {firstContact ? (
            <button
              onClick={handleTextContact}
              className="w-full py-4 bg-[#1C1C1E] border border-[#C8962C]/40 text-white font-black rounded-2xl flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5 text-[#C8962C]" />
              Text {firstContact.name}
            </button>
          ) : (
            <button
              onClick={handleAddContact}
              className="w-full py-4 bg-[#1C1C1E] border border-[#C8962C]/40 text-white font-black rounded-2xl flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5 text-[#C8962C]" />
              Add emergency contact
            </button>
          )}

          {/* Call emergency */}
          <button
            onClick={handleCallEmergency}
            className="w-full py-4 bg-[#1C1C1E] border border-red-500/40 text-white font-black rounded-2xl flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5 text-red-400" />
            Call 999
          </button>

          {/* Exit & clear data — disappearance hatch */}
          <button
            onClick={handleExitClearData}
            className="w-full py-3 bg-transparent text-white/30 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 hover:text-white/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit &amp; clear data
          </button>

          {/* Dismiss SOS */}
          <button
            onClick={handleShowDismissPin}
            className="w-full py-3 bg-transparent text-white/40 font-bold rounded-2xl text-sm hover:text-white/60 transition-colors"
          >
            Dismiss SOS
          </button>
        </motion.div>
      </motion.div>

      {/* ── Fake Call Overlay (platform-matched) ────────────────────────────── */}
      <AnimatePresence>
        {showFakeCall && (
          platform === 'android' ? (
            <AndroidFakeCall
              callerName={fakeCallContactName}
              onEnd={() => setShowFakeCall(false)}
            />
          ) : (
            <IOSFakeCall
              callerName={fakeCallContactName}
              onEnd={() => setShowFakeCall(false)}
            />
          )
        )}
      </AnimatePresence>

      {/* ── PIN dismiss sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDismissPIN && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[205] flex items-end"
          >
            <motion.div
              className="w-full bg-[#1C1C1E] rounded-t-3xl p-6"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Enter PIN to Dismiss</h3>
                <button
                  onClick={() => setShowDismissPIN(false)}
                  className="p-2 hover:bg-white/5 rounded-lg"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-lg border-2 border-[#C8962C]/50 flex items-center justify-center"
                    style={{ background: pinInput.length > i ? '#C8962C' : 'transparent' }}
                  >
                    {pinInput.length > i && <span className="text-white font-black">●</span>}
                  </div>
                ))}
              </div>

              {/* PIN pad */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinInput(String(num))}
                    disabled={pinInput.length >= 4}
                    className="py-3 bg-white/5 rounded-lg font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <button
                  onClick={() => handlePinInput('0')}
                  disabled={pinInput.length >= 4}
                  className="py-3 bg-white/5 rounded-lg font-bold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  0
                </button>
                <button
                  onClick={() => setPinInput((p) => p.slice(0, -1))}
                  className="py-3 bg-white/5 rounded-lg font-bold text-white hover:bg-white/10"
                >
                  ⌫
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hold-to-dismiss sheet (no PIN) ────────────────────────────────── */}
      <AnimatePresence>
        {showHoldDismiss && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[205] flex items-end"
          >
            <motion.div
              className="w-full bg-[#1C1C1E] rounded-t-3xl p-6"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Dismiss SOS?</h3>
                <button
                  onClick={() => { setShowHoldDismiss(false); setIsHolding(false); }}
                  className="p-2 hover:bg-white/5 rounded-lg"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              <p className="text-white/40 text-sm mb-5">
                Hold the button for 3 seconds to confirm you're safe.
              </p>
              <button
                onMouseDown={() => { setIsHolding(true); setHoldProgress(0); }}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={(e) => { e.preventDefault(); setIsHolding(true); setHoldProgress(0); }}
                onTouchEnd={() => setIsHolding(false)}
                className="w-full py-4 rounded-xl font-bold text-black relative overflow-hidden select-none"
                style={{ background: '#C8962C' }}
              >
                {/* Fill bar */}
                <div
                  className="absolute inset-0 bg-black/25 origin-left transition-none"
                  style={{ transform: `scaleX(${holdProgress / 100})`, transformOrigin: 'left' }}
                />
                <span className="relative">
                  {isHolding ? `${Math.round(holdProgress)}%` : 'Hold to Dismiss SOS'}
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
