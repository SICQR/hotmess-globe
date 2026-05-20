/**
 * SafetyAftercare — "Stay with us." Eight tappable care actions.
 *
 * Brief: warm, steady, non-clinical, masculine, not corporate-wellness.
 * Most apps stop at panic. HOTMESS continues into care. Visible by default
 * on /safety (Phil v1.0): users get a calm permanent entry, deeper post-SOS
 * states open the resources / breathing surfaces.
 *
 * Haptic doctrine (Phil v1.0):
 *   - Aftercare should feel quiet. Almost no haptics here.
 *   - Subtle tap on breathing start (impactLight).
 *   - Tiny pulse on session complete / aftercare close (impactSoft).
 *   - NOTHING else. No vibration on tile tap, no buzz on resource open.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Droplet, MessageCircle, Wind, Footprints, BookOpen, Heart, Phone, Check,
} from 'lucide-react';
import { SUPPORT_RESOURCES } from '@/lib/safety/supportResources';
import { impactLight, impactSoft } from '@/lib/safety/haptics';

const TOKENS = {
  gold: '#C8962C',
  care: '#3A464D',
  ink: '#050507',
};

const BREATH = { inhale: 4000, hold: 7000, exhale: 8000 };

function BreathRing({ onClose }) {
  const [phase, setPhase] = useState('inhale');
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef(null);
  const firedStartRef = useRef(false);

  useEffect(() => {
    // Subtle tap on breathing start — single fire, never per phase change.
    if (!firedStartRef.current) {
      impactLight();
      firedStartRef.current = true;
    }
    const next = () => {
      setPhase((p) => {
        if (p === 'inhale') return 'hold';
        if (p === 'hold') return 'exhale';
        setCycles((c) => c + 1);
        return 'inhale';
      });
    };
    timerRef.current = setTimeout(next, BREATH[phase]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  const label = phase === 'inhale' ? 'Breathe in · 4' : phase === 'hold' ? 'Hold · 7' : 'Out · 8';
  const scale = phase === 'inhale' ? 1.0 : phase === 'hold' ? 1.0 : 0.55;
  const duration = BREATH[phase] / 1000;

  return (
    <div className="flex flex-col items-center py-6">
      <motion.div
        animate={{ scale }}
        transition={{ duration, ease: phase === 'hold' ? 'linear' : 'easeInOut' }}
        className="w-32 h-32 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${TOKENS.gold}44, ${TOKENS.gold}11 70%)`,
          border: `1px solid ${TOKENS.gold}55`,
        }}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: TOKENS.gold, boxShadow: `0 0 24px ${TOKENS.gold}` }}
        />
      </motion.div>
      <p className="mt-5 font-mono text-sm uppercase tracking-[0.22em]" style={{ color: TOKENS.gold }}>
        {label}
      </p>
      <p className="mt-1 text-[11px] text-white/45">Cycle {cycles + 1}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-bold bg-white/8 text-white/75"
      >
        Done
      </button>
    </div>
  );
}

function WaterToast({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 rounded-2xl p-4 border"
      style={{ background: 'rgba(58,70,77,0.40)', borderColor: 'rgba(255,255,255,0.10)' }}
    >
      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <Droplet className="w-5 h-5" style={{ color: '#8ECAFF' }} />
      </motion.div>
      <p className="text-sm text-white/85">Noted. One glass at a time.</p>
    </motion.div>
  );
}

function ResourcesList({ onClose }) {
  return (
    <div className="rounded-2xl p-4 border" style={{ background: 'rgba(58,70,77,0.35)', borderColor: 'rgba(255,255,255,0.10)' }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: TOKENS.gold }}>
        Support — UK
      </p>
      <ul className="space-y-2.5" role="list">
        {SUPPORT_RESOURCES.map((r) => (
          <li key={r.id}>
            <a
              href={r.tel ? `tel:${r.tel}` : (r.url || '#')}
              target={r.tel ? undefined : '_blank'}
              rel={r.tel ? undefined : 'noopener noreferrer'}
              className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 bg-black/30 border"
              style={{
                borderColor: r.emergency ? 'rgba(139,26,26,0.40)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{r.name}</p>
                <p className="text-[11px] text-white/55 leading-snug">{r.summary}</p>
                {r.hours && <p className="text-[10px] text-white/35 mt-1">{r.hours}</p>}
              </div>
              <div className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] tabular-nums" style={{ color: r.emergency ? '#FF6B6B' : TOKENS.gold }}>
                <Phone className="w-3 h-3" />
                {r.display}
              </div>
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-white/5 text-white/70"
      >
        Close
      </button>
    </div>
  );
}

export default function SafetyAftercare({
  onTextSomeoneSafe,
  onGetHomeSafely,
  onSessionComplete,
  expandResourcesByDefault = false,
}) {
  const navigate = useNavigate();
  const [panel, setPanel] = useState(expandResourcesByDefault ? 'resources' : null);

  // External signal (post-SOS) → expand resources panel.
  useEffect(() => {
    if (expandResourcesByDefault && panel !== 'resources') {
      setPanel('resources');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandResourcesByDefault]);

  const actions = [
    {
      id: 'water',
      label: 'Drink water',
      icon: Droplet,
      handler: () => setPanel('water'),
    },
    {
      id: 'text',
      label: 'Text someone safe',
      icon: MessageCircle,
      handler: () => onTextSomeoneSafe?.(),
    },
    {
      id: 'breath',
      label: 'Grounding reset',
      icon: Wind,
      handler: () => setPanel('breath'),
    },
    {
      id: 'breathe',
      label: 'Breathe',
      icon: Wind,
      handler: () => setPanel('breath'),
    },
    {
      id: 'home',
      label: 'Get home safely',
      icon: Footprints,
      handler: () => onGetHomeSafely?.(),
    },
    {
      id: 'resources',
      label: 'Support resources',
      icon: BookOpen,
      handler: () => setPanel('resources'),
    },
    {
      id: 'hnh',
      label: 'Hand N Hand',
      icon: Heart,
      handler: () => navigate('/care'),
    },
  ];

  const handleAcknowledge = () => {
    // Tiny pulse on session complete — Phil v1.0.
    impactSoft();
    onSessionComplete?.();
  };

  return (
    <section
      aria-label="Aftercare"
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        background: 'rgba(58,70,77,0.32)',
        borderColor: 'rgba(200,150,44,0.22)',
      }}
    >
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: TOKENS.gold }}>
          Aftercare
        </p>
        <h2 className="text-2xl font-black text-white mt-1 tracking-tight">
          Stay with us.
        </h2>
        <p className="text-sm text-white/55 mt-1.5 leading-relaxed">
          One thing at a time. No rush.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 mb-3" role="list">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={a.handler}
                className="w-full text-left rounded-xl p-3 border bg-black/30 hover:bg-black/40 active:scale-[0.98] transition-transform"
                style={{ borderColor: 'rgba(255,255,255,0.10)' }}
              >
                <Icon className="w-5 h-5 mb-1.5" style={{ color: TOKENS.gold }} />
                <p className="text-[13px] font-bold text-white">{a.label}</p>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={handleAcknowledge}
            className="w-full text-left rounded-xl p-3 border bg-black/20 active:scale-[0.98] transition-transform"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <Check className="w-5 h-5 mb-1.5 text-white/55" />
            <p className="text-[13px] font-bold text-white/75">I'm okay for now</p>
          </button>
        </li>
      </ul>

      <AnimatePresence mode="wait">
        {panel === 'water' && (
          <motion.div key="water" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <WaterToast onDismiss={() => setPanel(null)} />
          </motion.div>
        )}
        {panel === 'breath' && (
          <motion.div key="breath" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <BreathRing onClose={() => setPanel(null)} />
          </motion.div>
        )}
        {panel === 'resources' && (
          <motion.div key="resources" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <ResourcesList onClose={() => setPanel(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
