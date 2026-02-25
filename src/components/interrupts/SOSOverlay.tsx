/**
 * SOSOverlay — full-screen emergency interrupt
 *
 * Triggered by the SOS button in chat.
 * Immediately stops active location sharing, shows EMERGENCY MODE takeover.
 * Per spec rule "A": stop sharing instantly on SOS trigger.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, MessageSquare, UserPlus } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface SOSOverlayProps {
  onClose: () => void;
}

export default function SOSOverlay({ onClose }: SOSOverlayProps) {
  const [firstContact, setFirstContact] = useState<EmergencyContact | null>(null);
  const { openSheet } = useSheet();

  // Rule A: stop all active shares the moment SOS mounts
  useEffect(() => {
    const stopShares = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Stop active location shares (table: location_shares, keyed by user_id UUID)
      await supabase
        .from('location_shares')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('active', true);

      // Deactivate right_now_status (canonical TABLE, keyed by user_email)
      if (user.email) {
        await supabase
          .from('right_now_status')
          .update({ active: false })
          .eq('user_email', user.email)
          .eq('active', true);
      }

      // Fetch emergency contacts — store the first one for the SMS button
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('id, name, phone, relation')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (contacts && contacts.length > 0) {
        setFirstContact(contacts[0] as EmergencyContact);
      }
    };

    stopShares().catch(console.error);
  }, []);

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

  return (
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
        <button
          onClick={onClose}
          className="w-full py-3 bg-transparent text-white/40 font-bold rounded-2xl text-sm"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
