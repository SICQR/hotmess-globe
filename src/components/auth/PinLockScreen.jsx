/**
 * PinLockScreen — Full-screen PIN entry/setup overlay
 * 
 * Features:
 * - 4-digit numeric keypad
 * - Dot indicators for entered digits
 * - Shake animation on wrong PIN
 * - Setup flow with confirmation
 * - Biometric option (future)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePinLock } from '@/contexts/PinLockContext';
import { Lock, Delete, Fingerprint, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'del'],
];

function PinDots({ length, filled, shake }) {
  return (
    <motion.div 
      className="flex gap-4 justify-center mb-8"
      animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            i < filled 
              ? 'bg-[#FF1493] border-[#FF1493]' 
              : 'bg-transparent border-white/30'
          }`}
          animate={i < filled ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.15 }}
        />
      ))}
    </motion.div>
  );
}

function Keypad({ onPress, onDelete, onBiometric, biometricAvailable }) {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
      {KEYPAD.flat().map((key) => {
        if (key === 'bio') {
          return (
            <button
              key={key}
              onClick={onBiometric}
              disabled={!biometricAvailable}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                biometricAvailable 
                  ? 'bg-white/5 hover:bg-white/10 text-white' 
                  : 'bg-transparent text-white/20 cursor-not-allowed'
              }`}
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          );
        }
        
        if (key === 'del') {
          return (
            <button
              key={key}
              onClick={onDelete}
              className="w-20 h-20 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all text-white"
            >
              <Delete className="w-6 h-6" />
            </button>
          );
        }
        
        return (
          <button
            key={key}
            onClick={() => onPress(key)}
            className="w-20 h-20 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-[#FF1493]/50 transition-all text-white text-2xl font-bold"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

export function PinEntryScreen() {
  const { verifyPin, isLocked, lockedUntil } = usePinLock();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) {
      setLockCountdown(0);
      return;
    }
    
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockCountdown(0);
        setError('');
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handlePress = useCallback((digit) => {
    if (pin.length >= 4 || lockCountdown > 0) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    
    // Auto-submit when 4 digits entered
    if (newPin.length === 4) {
      setTimeout(() => {
        const result = verifyPin(newPin);
        if (!result.success) {
          setShake(true);
          setError(result.error);
          setTimeout(() => {
            setShake(false);
            setPin('');
          }, 400);
        }
      }, 100);
    }
  }, [pin, verifyPin, lockCountdown]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, []);

  if (!isLocked) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center px-8"
    >
      {/* Logo */}
      <div className="mb-8">
        <Lock className="w-12 h-12 text-[#FF1493] mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white text-center">HOTMESS</h1>
        <p className="text-white/50 text-sm text-center mt-1">Enter your PIN</p>
      </div>

      {/* PIN dots */}
      <PinDots length={4} filled={pin.length} shake={shake} />

      {/* Error message */}
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm text-center mb-4"
        >
          {error}
        </motion.p>
      )}

      {/* Lockout countdown */}
      {lockCountdown > 0 && (
        <p className="text-yellow-400 text-sm text-center mb-4">
          Try again in {lockCountdown}s
        </p>
      )}

      {/* Keypad */}
      <Keypad
        onPress={handlePress}
        onDelete={handleDelete}
        onBiometric={() => toast.info('Biometric unlock coming soon')}
        biometricAvailable={false}
      />

      {/* Forgot PIN */}
      <button
        onClick={() => toast.info('Sign out and sign back in to reset your PIN')}
        className="mt-8 text-white/40 text-sm hover:text-white/60 transition-colors"
      >
        Forgot PIN?
      </button>
    </motion.div>
  );
}

export function PinSetupScreen() {
  const { setPin, showPinSetup, closePinSetup } = usePinLock();
  const [step, setStep] = useState('enter'); // enter, confirm
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin_] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setStep('enter');
    setFirstPin('');
    setPin_('');
    setError('');
  }, []);

  const handlePress = useCallback((digit) => {
    if (pin.length >= 4) return;
    
    const newPin = pin + digit;
    setPin_(newPin);
    setError('');
    
    if (newPin.length === 4) {
      setTimeout(() => {
        if (step === 'enter') {
          setFirstPin(newPin);
          setStep('confirm');
          setPin_('');
        } else {
          // Confirm step - check if matches
          if (newPin === firstPin) {
            const result = setPin(newPin);
            if (result.success) {
              toast.success('PIN set successfully!');
              reset();
            } else {
              setError(result.error);
              setPin_('');
            }
          } else {
            setShake(true);
            setError('PINs do not match. Try again.');
            setTimeout(() => {
              setShake(false);
              reset();
            }, 400);
          }
        }
      }, 100);
    }
  }, [pin, step, firstPin, setPin, reset]);

  const handleDelete = useCallback(() => {
    setPin_(prev => prev.slice(0, -1));
    setError('');
  }, []);

  if (!showPinSetup) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center px-8"
    >
      {/* Close button */}
      <button
        onClick={closePinSetup}
        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Header */}
      <div className="mb-8">
        <Shield className="w-12 h-12 text-[#00D9FF] mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white text-center">
          {step === 'enter' ? 'Create PIN' : 'Confirm PIN'}
        </h1>
        <p className="text-white/50 text-sm text-center mt-1">
          {step === 'enter' 
            ? 'Enter a 4-digit PIN to secure your app' 
            : 'Enter your PIN again to confirm'}
        </p>
      </div>

      {/* PIN dots */}
      <PinDots length={4} filled={pin.length} shake={shake} />

      {/* Error message */}
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm text-center mb-4"
        >
          {error}
        </motion.p>
      )}

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full ${step === 'enter' ? 'bg-[#FF1493]' : 'bg-white/30'}`} />
        <div className={`w-2 h-2 rounded-full ${step === 'confirm' ? 'bg-[#FF1493]' : 'bg-white/30'}`} />
      </div>

      {/* Keypad */}
      <Keypad
        onPress={handlePress}
        onDelete={handleDelete}
        onBiometric={() => {}}
        biometricAvailable={false}
      />

      {/* Back button on confirm step */}
      {step === 'confirm' && (
        <button
          onClick={reset}
          className="mt-8 text-white/40 text-sm hover:text-white/60 transition-colors"
        >
          Start over
        </button>
      )}
    </motion.div>
  );
}

export default function PinLockOverlay() {
  const { isLocked, showPinSetup } = usePinLock();

  return (
    <AnimatePresence>
      {isLocked && <PinEntryScreen />}
      {showPinSetup && <PinSetupScreen />}
    </AnimatePresence>
  );
}
