/**
 * SOSOverlay — full-screen emergency interrupt
 *
 * Triggered by the SOS button.
 * Immediately stops active location sharing, shows EMERGENCY MODE takeover.
 * Features:
 *   - Share location (writes to location_shares table)
 *   - Fake call (incoming call overlay with timer)
 *   - PIN-protected dismiss (4-digit PIN or 3s hold if no PIN set)
 *   - Text emergency contact (SMS deeplink)
 *   - Call 999 (emergency services)
 *   - Get help (external link)
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, MessageSquare, UserPlus, MapPin, X } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface SOSOverlayProps {
  onClose: () => void;
}

// PIN hashing function (matches client-side hash)
function hashPIN(pin: string): string {
  const combined = `hotmess_${pin}_salt`;
  return [...combined].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(36);
}

export default function SOSOverlay({ onClose }: SOSOverlayProps) {
  const [firstContact, setFirstContact] = useState<EmergencyContact | null>(null);
  const [locationSharingActive, setLocationSharingActive] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallContactName, setFakeCallContactName] = useState('Mum');
  const [fakeCallTimer, setFakeCallTimer] = useState(0);
  const [showDismissPIN, setShowDismissPIN] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const { openSheet } = useSheet();

  // Rule A: stop all active shares on mount
  useEffect(() => {
    const stopShares = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Stop active location shares
      await supabase
        .from('location_shares')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('active', true);

      // Deactivate right_now_status
      if (user.email) {
        await supabase
          .from('right_now_status')
          .update({ active: false })
          .eq('user_email', user.email)
          .eq('active', true);
      }

      // Fetch emergency contacts
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('id, name, phone, relation')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (contacts && contacts.length > 0) {
        setFirstContact(contacts[0] as EmergencyContact);
        setFakeCallContactName(contacts[0].name);
      }
    };

    stopShares().catch(console.error);
  }, []);

  // Fake call timer
  useEffect(() => {
    if (!showFakeCall) return;

    const timer = setInterval(() => {
      setFakeCallTimer((prev) => {
        if (prev >= 45) {
          setShowFakeCall(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showFakeCall]);

  // Hold to dismiss progress
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
        return prev + 3.33; // 100 / (3000ms / 30fps)
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isHolding]);

  const handleShareLocation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      // Insert into location_shares
      const { error } = await supabase.from('location_shares').insert({
        user_id: user.id,
        lat: position.latitude,
        lng: position.longitude,
        active: true,
      });

      if (error) throw error;

      setLocationSharingActive(true);
      toast.success('Location shared with emergency contacts');

      // Also update right_now_status to reflect SOS
      if (user.email) {
        await supabase.from('right_now_status').insert({
          user_email: user.email,
          status: 'sos',
          active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } catch (err) {
      console.error('[SOS] Location share failed:', err);
      toast.error('Could not get location. Please enable location access.');
    }
  };

  const handleFakeCall = () => {
    setShowFakeCall(true);
    setFakeCallTimer(0);
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  const handleEndFakeCall = () => {
    setShowFakeCall(false);
    setFakeCallTimer(0);
  };

  const handleGetHelp = () => {
    window.open('https://www.victimsupport.org.uk', '_blank', 'noopener,noreferrer');
  };

  const handleCallEmergency = () => {
    window.location.href = 'tel:999';
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

  const handleShowDismissPin = () => {
    const storedHash = localStorage.getItem('hotmess_pin_hash');
    if (!storedHash) {
      // No PIN set, show hold-to-confirm
      setShowDismissPIN(false);
    } else {
      setShowDismissPIN(true);
      setPinInput('');
    }
  };

  const handlePinInput = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);

      if (newPin.length === 4) {
        // Verify PIN
        const storedHash = localStorage.getItem('hotmess_pin_hash');
        const inputHash = hashPIN(newPin);

        if (storedHash === inputHash) {
          handleDismiss();
        } else {
          toast.error('Incorrect PIN');
          setPinInput('');
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
  };

  const handleDismiss = () => {
    setShowDismissPIN(false);
    setPinInput('');
    onClose();
  };

  return (
    <>
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

        {/* Status lines */}
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
              locationSharingActive ? 'bg-[#C8962C] text-black' : 'bg-[#C8962C]/80 text-black hover:bg-[#C8962C]'
            }`}
          >
            <MapPin className="w-5 h-5" />
            {locationSharingActive ? 'Location Shared' : 'Share Location'}
          </button>

          {/* Fake Call */}
          <button
            onClick={handleFakeCall}
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

          {/* Emergency contact button — text if exists, add if not */}
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

          <button
            onClick={handleCallEmergency}
            className="w-full py-4 bg-[#1C1C1E] border border-red-500/40 text-white font-black rounded-2xl flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5 text-red-400" />
            Call emergency
          </button>

          {/* Dismiss SOS button */}
          <button
            onClick={handleShowDismissPin}
            className="w-full py-3 bg-transparent text-white/40 font-bold rounded-2xl text-sm hover:text-white/60 transition-colors"
          >
            Dismiss SOS
          </button>
        </motion.div>
      </motion.div>

      {/* Fake Call Overlay */}
      <AnimatePresence>
        {showFakeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-gradient-to-b from-[#1C3A1C] to-black z-[210] flex flex-col items-center justify-center"
          >
            {/* Contact info */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-12 h-12 text-white/40" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{fakeCallContactName}</h2>
              <p className="text-white/60">Incoming call...</p>
            </div>

            {/* Call timer */}
            {fakeCallTimer > 0 && (
              <div className="text-4xl font-black text-white mb-8" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {String(Math.floor(fakeCallTimer / 60)).padStart(2, '0')}:{String(fakeCallTimer % 60).padStart(2, '0')}
              </div>
            )}

            {/* Accept / Decline buttons */}
            <div className="flex gap-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleEndFakeCall}
                className="w-20 h-20 rounded-full bg-red-500/80 flex items-center justify-center shadow-lg hover:bg-red-500"
              >
                <Phone className="w-8 h-8 text-white rotate-45" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setShowFakeCall(true); // Keep showing, continue timer
                }}
                className="w-20 h-20 rounded-full bg-green-500/80 flex items-center justify-center shadow-lg hover:bg-green-500"
              >
                <Phone className="w-8 h-8 text-white" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Dismiss Overlay */}
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
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* PIN Display */}
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

              {/* PIN Pad */}
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
                <div className="col-span-1" />
                <button
                  onClick={() => handlePinInput('0')}
                  disabled={pinInput.length >= 4}
                  className="py-3 bg-white/5 rounded-lg font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  0
                </button>
                <button
                  onClick={handlePinBackspace}
                  className="py-3 bg-white/5 rounded-lg font-bold text-white hover:bg-white/10 transition-colors"
                >
                  ⌫
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold to Confirm Overlay (if no PIN) */}
      <AnimatePresence>
        {!showDismissPIN && !localStorage.getItem('hotmess_pin_hash') && (
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
              <h3 className="text-lg font-bold text-white mb-6">Hold to Confirm Dismiss</h3>
              <motion.button
                onMouseDown={() => {
                  setIsHolding(true);
                  setHoldProgress(0);
                }}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => {
                  setIsHolding(true);
                  setHoldProgress(0);
                }}
                onTouchEnd={() => setIsHolding(false)}
                className="w-full py-4 bg-[#C8962C] rounded-lg font-bold text-black relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-[#C8962C]/50"
                  style={{ width: `${holdProgress}%` }}
                />
                <span className="relative">Hold to Dismiss</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
