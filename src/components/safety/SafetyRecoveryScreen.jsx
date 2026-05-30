/**
 * SafetyRecoveryScreen — post-safety recovery overlay
 *
 * Shown after SOS is dismissed/resolved. Reassures the user and offers
 * next-step actions: return to app, open Care, or contact support.
 *
 * z-[205] — above SOSOverlay (z-200), below fake call (z-210).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Heart, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSOSContext } from '@/contexts/SOSContext';

export default function SafetyRecoveryScreen() {
  const navigate = useNavigate();
  const { dismissRecovery } = useSOSContext();

  const handleReturn = () => {
    dismissRecovery();
  };

  const handleOpenCare = () => {
    dismissRecovery();
    navigate('/care');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:safety@hotmessldn.com?subject=Safety%20Support%20Request';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[205] flex flex-col items-center justify-center px-6"
      style={{ background: '#050507' }}
    >
      {/* Shield icon */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'rgba(200, 150, 44, 0.15)', border: '2px solid #C8962C' }}
      >
        <ShieldCheck className="w-12 h-12" style={{ color: '#C8962C' }} />
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-3xl font-black text-white tracking-tight mb-3 text-center"
      >
        You're covered
      </motion.h1>

      {/* Subtext */}
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-white/60 text-base text-center max-w-xs mb-12 leading-relaxed"
      >
        Your trusted contacts have been alerted. You are not alone.
      </motion.p>

      {/* Action buttons */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="w-full max-w-xs space-y-3"
      >
        {/* Return to app */}
        <button
          onClick={handleReturn}
          className="w-full py-4 font-black rounded-2xl text-base uppercase tracking-wide flex items-center justify-center gap-2 transition-colors"
          style={{ background: '#C8962C', color: '#000' }}
        >
          <ArrowLeft className="w-5 h-5" />
          Return to app
        </button>

        {/* Open Care */}
        <button
          onClick={handleOpenCare}
          className="w-full py-4 font-bold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors border"
          style={{
            background: '#1C1C1E',
            borderColor: 'rgba(200, 150, 44, 0.4)',
            color: '#fff',
          }}
        >
          <Heart className="w-5 h-5" style={{ color: '#C8962C' }} />
          Open Care
        </button>

        {/* Contact support */}
        <button
          onClick={handleContactSupport}
          className="w-full py-4 font-bold rounded-2xl text-base flex items-center justify-center gap-2 transition-colors border"
          style={{
            background: '#1C1C1E',
            borderColor: 'rgba(200, 150, 44, 0.4)',
            color: '#fff',
          }}
        >
          <Mail className="w-5 h-5" style={{ color: '#C8962C' }} />
          Contact support
        </button>
      </motion.div>

      {/* Quiet reassurance footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-10 text-white/25 text-xs text-center px-8"
      >
        If you are in immediate danger, call 999 (UK), 112 (EU), or 911 (US).
      </motion.p>
    </motion.div>
  );
}
