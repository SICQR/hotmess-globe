/**
 * L2CreatePersonaSheet — create a new persona
 * Opened via openSheet('create-persona', {})
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { usePersona, PERSONA_TYPES } from '@/contexts/PersonaContext';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

const PERSONA_OPTIONS = [
  {
    type: PERSONA_TYPES.TRAVEL,
    label: 'Travel',
    description: "Who you are when you're away from home",
    color: '#00C2E0',
  },
  {
    type: PERSONA_TYPES.WEEKEND,
    label: 'Weekend',
    description: 'Your after-dark, off-duty self',
    color: '#C8962C',
  },
  {
    type: PERSONA_TYPES.CUSTOM,
    label: 'Custom',
    description: 'Name it yourself — anything goes',
    color: '#39FF14',
  },
];

export default function L2CreatePersonaSheet({ onClose }) {
  const { createPersona, personas } = usePersona();
  const { closeSheet } = useSheet();

  const [selectedType, setSelectedType] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => (onClose ? onClose() : closeSheet());

  const handleCreate = async () => {
    if (!selectedType) return;
    const name = displayName.trim() || PERSONA_OPTIONS.find(o => o.type === selectedType)?.label || selectedType;

    setSaving(true);
    const { error } = await createPersona({
      personaType: selectedType,
      displayName: name,
      bio: bio.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error('Could not create persona');
    } else {
      toast.success(`${name} persona created`);
      handleClose();
    }
  };

  const canCreate = !!selectedType && personas.length < 5;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-[150] bg-[#0D0D0D] rounded-t-3xl pb-10"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3">
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">New Persona</p>
          <p className="text-white font-black text-base leading-tight">Choose a type</p>
        </div>
      </div>

      <div className="px-4 space-y-3 mt-2">
        {/* Type picker */}
        {PERSONA_OPTIONS.map((opt) => {
          const active = selectedType === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => {
                setSelectedType(opt.type);
                if (!displayName) setDisplayName(opt.label);
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
              style={{
                background: active ? `${opt.color}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? `${opt.color}50` : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
                style={{
                  background: `${opt.color}20`,
                  border: `2px solid ${opt.color}50`,
                  color: opt.color,
                }}
              >
                {opt.label.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-black text-sm text-white">{opt.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{opt.description}</p>
              </div>
              {active && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: opt.color }}
                >
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </button>
          );
        })}

        {/* Display name */}
        <div className="mt-1">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-mono px-1 mb-1.5 block">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={32}
            placeholder="How you'll appear"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-[#C8962C]/40 transition-colors"
          />
        </div>

        {/* Bio (optional) */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-mono px-1 mb-1.5 block">
            Bio <span className="normal-case text-white/20">(optional)</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={160}
            rows={2}
            placeholder="A line about this version of you…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 outline-none focus:border-[#C8962C]/40 transition-colors resize-none"
          />
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!canCreate || saving}
          className="w-full py-3.5 rounded-2xl font-black text-sm transition-all disabled:opacity-40"
          style={{
            background: canCreate ? '#C8962C' : 'rgba(200,150,44,0.2)',
            color: canCreate ? '#000' : '#C8962C',
          }}
        >
          {saving ? 'Creating…' : 'Create Persona'}
        </button>

        {personas.length >= 5 && (
          <p className="text-center text-[11px] text-white/30">
            You've reached the 5-persona limit
          </p>
        )}
      </div>
    </motion.div>
  );
}
