/**
 * PersonaSwitcherSheet — slide-up sheet for switching active persona
 * Triggered by long-pressing the profile avatar in OSBottomNav or ProfileMode.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, User } from 'lucide-react';
import { usePersona } from '@/contexts/PersonaContext';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { supabase } from '@/components/utils/supabaseClient';

// Color per persona_type
const PERSONA_COLORS: Record<string, string> = {
  main:    '#C8962C',
  travel:  '#00C2E0',
  weekend: '#C8962C',
  custom:  '#39FF14',
};

const PERSONA_LIMITS: Record<string, number> = { mess: 1, hotmess: 2, connected: 3, promoter: 5, venue: 10 };

interface PersonaSwitcherSheetProps {
  onClose: () => void;
}

export default function PersonaSwitcherSheet({ onClose }: PersonaSwitcherSheetProps) {
  const { personas, activePersona, loadPersonas, switchPersona, isLoading } = usePersona();
  const { session } = useBootGuard();
  const { openSheet } = useSheet();
  const [userTier, setUserTier] = useState<string>('mess');

  useEffect(() => {
    if (session?.user?.id) loadPersonas(session.user.id);
  }, [session?.user?.id, loadPersonas]);

  useEffect(() => {
    supabase.rpc('get_user_tier').then(({ data }) => {
      if (data?.tier) setUserTier(data.tier);
    });
  }, []);

  const handleSwitch = async (personaId: string) => {
    if (personaId === activePersona?.id) { onClose(); return; }
    const ok = await switchPersona(personaId);
    if (ok) {
      toast.success('Persona switched');
      onClose();
    } else {
      toast.error('Could not switch persona');
    }
  };

  const handleAddPersona = () => {
    onClose();
    openSheet('create-persona', {});
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-[150] bg-[#0D0D0D] rounded-t-3xl pb-8"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-4">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="px-6 mb-4">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Active Persona</p>
        <p className="text-white font-black text-lg mt-0.5">
          {activePersona?.display_name || 'Main'}
        </p>
      </div>

      {/* Persona list */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
          </div>
        ) : personas.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-white/40 text-sm">No secondary personas yet</p>
            <p className="text-white/20 text-xs mt-1">Your main profile is always active</p>
          </div>
        ) : (
          personas.map((persona) => {
            const type = persona.persona_type || 'main';
            const color = PERSONA_COLORS[type] || '#C8962C';
            const isActive = persona.id === activePersona?.id;
            return (
              <button
                key={persona.id}
                onClick={() => handleSwitch(persona.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-98"
                style={{
                  background: isActive ? `${color}15` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {/* Avatar / initial */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20`, border: `2px solid ${color}50` }}
                >
                  {persona.avatar_url ? (
                    <img src={persona.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" style={{ color }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <p className="font-black text-sm text-white">
                    {persona.display_name || type}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color }}>
                    {type}
                  </p>
                </div>

                {/* Active check */}
                {isActive && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: color }}
                  >
                    <Check className="w-3.5 h-3.5 text-black" />
                  </div>
                )}
              </button>
            );
          })
        )}

        {/* Add persona (tier-aware limit) */}
        {personas.length < (PERSONA_LIMITS[userTier] ?? 1) && (
          <button
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-dashed border-white/15 text-white/40 hover:text-white/60 transition-colors"
            onClick={handleAddPersona}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold">Add persona</span>
            <span className="ml-auto text-xs text-white/20">{personas.length}/{PERSONA_LIMITS[userTier] ?? 1}</span>
          </button>
        )}

        {/* Upgrade prompt when at limit */}
        {personas.length >= (PERSONA_LIMITS[userTier] ?? 1) && (
          <button
            onClick={() => openSheet('membership', {})}
            className="w-full py-3 text-center text-[#C8962C] text-sm font-bold border border-[#C8962C]/30 rounded-2xl"
          >
            Upgrade to add more personas
          </button>
        )}
      </div>
    </motion.div>
  );
}
