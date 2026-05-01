import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useFirst5Minutes, F5M_STAGES } from '@/hooks/useFirst5Minutes';

/**
 * First 5 Minutes Flow — Chunk 06
 * Flag: v6_first_five_minutes
 *
 * 9 screens: Cold Open → Auth → Age → Name → Sound → Ghosted → Match → Chat → Arrival
 * Each stage: logged to analytics_events + persisted to profiles.onboarding_stage
 * Resume: mounts at correct stage from profile
 * Complete: onboarding_stage → 'complete', navigate → /ghosted
 */

const T = {
  bg: '#080808', card: '#0d0d0d', border: '#1a1a1a',
  gold: '#C8962C', white: '#fff', muted: 'rgba(255,255,255,0.35)', green: '#30D158',
};

// ── GLOB PULSE BG ─────────────────────────────────────────────────────────────
function GlobeBg({ intensity = 1 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.12 * intensity, 0.22 * intensity, 0.12 * intensity] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ position: 'absolute', top: '28%', left: '50%', transform: 'translateX(-50%)',
          width: 280, height: 280, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.gold} 0%, transparent 70%)`,
          filter: 'blur(60px)' }}
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)',
          width: 320, height: 320, borderRadius: '50%', border: `1px solid ${T.gold}22` }}
      />
    </div>
  );
}

// ── SCREEN COMPONENTS ─────────────────────────────────────────────────────────

function ScreenColdOpen({ onNext }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    // Load live right_now count
    supabase.from('right_now_posts')
      .select('id', { count: 'exact', head: true })
      .gt('ends_at', new Date().toISOString())
      .then(({ count: c }) => setCount(c ?? 0));
    // Fallback reveal after 1.2s
    const t = setTimeout(() => setCount(prev => prev ?? '—'), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <GlobeBg />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          style={{ fontFamily: 'Oswald, sans-serif', fontSize: 56, fontWeight: 700,
            color: T.white, letterSpacing: '-0.01em', marginBottom: 4 }}>
          HOTMESS
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          style={{ fontFamily: 'Barlow, sans-serif', fontSize: 14, color: T.gold,
            letterSpacing: '0.12em', marginBottom: 28 }}>
          London. Tonight.
        </motion.div>
        {count !== null && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: T.muted,
              marginBottom: 40, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6 }}>
            <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: T.gold }} />
            {count} men live right now.
          </motion.div>
        )}
        {count !== null && (
          <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onNext}
            style={{ width: '100%', padding: '14px', background: T.gold, border: 'none',
              fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: '0.22em',
              color: '#000', cursor: 'pointer', textTransform: 'uppercase' }}>
            JOIN THE NIGHT
          </motion.button>
        )}
      </div>
    </div>
  );
}

function ScreenAuth({ onNext }) {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex',
      flexDirection: 'column', justifyContent: 'flex-end', padding: '0 16px 48px' }}>
      <GlobeBg intensity={0.6} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 30, color: T.white,
          textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 8 }}>
          Join the night.
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: T.muted, marginBottom: 20 }}>
          18+ · Consent first · Care always.
        </div>
        {[['🍎  Continue with Apple', true], ['G  Continue with Google', false]].map(([label, solid]) => (
          <motion.button key={label} whileTap={{ scale: 0.97 }} onClick={onNext}
            style={{ width: '100%', padding: '13px', marginBottom: 8,
              background: solid ? T.white : 'transparent',
              border: `1px solid ${solid ? T.white : '#333'}`,
              fontFamily: 'Barlow, sans-serif', fontSize: 12,
              color: solid ? '#000' : T.white, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

function ScreenAge({ onNext }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ padding: '48px 16px 24px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: T.gold,
        fontFamily: 'Oswald, sans-serif', marginBottom: 8 }}>AGE GATE</div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 32, color: T.white,
        textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 32 }}>
        How old<br />are you?
      </div>
      {['18–24', '25–32', '33–40', '41+'].map(age => (
        <button key={age} onClick={() => { setSelected(age); setTimeout(onNext, 350); }}
          style={{ width: '100%', padding: '12px 16px', marginBottom: 6,
            background: selected === age ? `${T.gold}22` : T.card,
            border: `1px solid ${selected === age ? T.gold : T.border}`,
            fontFamily: 'Oswald, sans-serif', fontSize: 14,
            color: selected === age ? T.gold : T.white,
            cursor: 'pointer', textAlign: 'left', letterSpacing: '0.05em' }}>
          {age}
        </button>
      ))}
    </div>
  );
}

function ScreenName({ onNext }) {
  const [name, setName] = useState('');
  return (
    <div style={{ padding: '48px 16px 24px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: T.gold,
        fontFamily: 'Oswald, sans-serif', marginBottom: 8 }}>QUICK SETUP</div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 30, color: T.white,
        textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 8 }}>
        What do people<br />call you?
      </div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 10, color: T.muted, marginBottom: 24 }}>
        GPS is finding your area in the background.
      </div>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder="your name..."
        style={{ width: '100%', background: T.card, border: `1px solid ${T.border}`,
          padding: '12px 14px', color: T.white, fontFamily: 'Barlow, sans-serif',
          fontSize: 16, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
      <button onClick={onNext}
        style={{ width: '100%', padding: '13px', background: T.gold, border: 'none',
          fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: '0.22em',
          color: '#000', cursor: 'pointer', textTransform: 'uppercase' }}>
        {name ? `I'M ${name.toUpperCase()}` : 'SKIP → AUTO NAME'}
      </button>
    </div>
  );
}

function ScreenSound({ onNext }) {
  return (
    <div style={{ padding: '48px 16px 24px', display: 'flex',
      flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: T.gold,
        fontFamily: 'Oswald, sans-serif', marginBottom: 12 }}>SOUND OF THE NIGHT</div>
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: 56, marginBottom: 20 }}>🎵</motion.div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: T.white,
        textTransform: 'uppercase', marginBottom: 8 }}>Radio is on.</div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: T.muted,
        fontStyle: 'italic', marginBottom: 32, maxWidth: 260 }}>
        The night has a sound. You're in it.
      </div>
      <button onClick={onNext}
        style={{ width: '100%', padding: '13px', background: 'transparent',
          border: `1px solid ${T.gold}`, fontFamily: 'Oswald, sans-serif',
          fontSize: 12, letterSpacing: '0.22em', color: T.gold,
          cursor: 'pointer', textTransform: 'uppercase' }}>
        HEAR IT →
      </button>
    </div>
  );
}

function ScreenGhosted({ onNext }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{ padding: '48px 16px 24px', display: 'flex',
      flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: T.gold,
        fontFamily: 'Oswald, sans-serif', marginBottom: 12 }}>YOU'RE IN</div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 32, color: T.white,
        textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 8 }}>
        Ghosted.
      </div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 12, color: T.muted,
        fontStyle: 'italic', marginBottom: 32, maxWidth: 260 }}>
        The city can see you. No name yet. Just a signal.
        Tap BOO to say you're here.
      </div>
      <motion.button whileTap={{ scale: 0.92 }}
        onClick={() => { setPressed(true); setTimeout(onNext, 600); }}
        animate={pressed ? { scale: [1, 1.4, 1], background: [T.gold, T.gold] } : {}}
        style={{ width: 90, height: 90, borderRadius: '50%',
          background: pressed ? T.gold : 'transparent',
          border: `2px solid ${T.gold}`, cursor: 'pointer',
          fontFamily: 'Oswald, sans-serif', fontSize: 22,
          color: pressed ? '#000' : T.gold, letterSpacing: '0.1em' }}>
        BOO
      </motion.button>
    </div>
  );
}

function ScreenMatch({ onNext }) {
  return (
    <div style={{ padding: '48px 16px 24px', display: 'flex',
      flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: T.gold,
        fontFamily: 'Oswald, sans-serif', marginBottom: 12 }}>PROXIMITY</div>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        style={{ width: 80, height: 80, borderRadius: '50%', border: `2px solid ${T.gold}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 20, background: `${T.gold}15` }}>
        👤
      </motion.div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: T.white,
        textTransform: 'uppercase', marginBottom: 8 }}>Someone nearby.</div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: T.muted,
        fontStyle: 'italic', marginBottom: 32, maxWidth: 260 }}>
        340m away. No name until you both say yes.
      </div>
      <button onClick={onNext}
        style={{ width: '100%', padding: '13px', background: T.gold, border: 'none',
          fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: '0.22em',
          color: '#000', cursor: 'pointer', textTransform: 'uppercase' }}>
        SAY HI →
      </button>
    </div>
  );
}

function ScreenChat({ onNext }) {
  const [sent, setSent] = useState(false);
  return (
    <div style={{ padding: '48px 16px 24px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: T.gold,
        fontFamily: 'Oswald, sans-serif', marginBottom: 12 }}>CHAT</div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 12, color: T.muted,
        fontStyle: 'italic', marginBottom: 20 }}>
        It's mutual. First message unlocked.
      </div>
      {sent && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '10px 14px', background: T.gold, marginBottom: 12,
            alignSelf: 'flex-end', maxWidth: '75%', marginLeft: 'auto',
            display: 'table' }}>
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: 13, color: '#000' }}>
            Hey — see you in 5?
          </span>
        </motion.div>
      )}
      {!sent ? (
        <button onClick={() => { setSent(true); setTimeout(onNext, 1200); }}
          style={{ width: '100%', padding: '13px', background: T.gold, border: 'none',
            fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: '0.22em',
            color: '#000', cursor: 'pointer', textTransform: 'uppercase' }}>
          SEND: "HEY — SEE YOU IN 5?"
        </button>
      ) : (
        <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 10, color: T.muted,
          fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
          Message sent. Waiting...
        </div>
      )}
    </div>
  );
}

function ScreenArrival({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <GlobeBg />
      {[1, 2, 3].map(i => (
        <motion.div key={i}
          animate={{ scale: [0.8, 2.2], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
          style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%',
            border: `2px solid ${T.gold}`, pointerEvents: 'none' }} />
      ))}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 42, color: T.gold,
          textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 12 }}>
          You're in<br />the night.
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 12, color: T.muted,
          fontStyle: 'italic' }}>
          The city just got more interesting.
        </div>
      </motion.div>
    </div>
  );
}

// ── STAGE CONFIG ──────────────────────────────────────────────────────────────
const STAGE_LABELS = [
  '0:00 Cold Open', '0:08 Auth', '0:20 Age', '0:35 Name',
  '0:50 Sound', '1:00 Ghosted', '1:30 Match', '2:30 Chat', '5:00 Here',
];

const STAGE_KEYS = [
  F5M_STAGES.COLD_OPEN, F5M_STAGES.AUTH, F5M_STAGES.AGE, F5M_STAGES.NAME,
  F5M_STAGES.SOUND, F5M_STAGES.GHOSTED, F5M_STAGES.MATCH, F5M_STAGES.CHAT,
  F5M_STAGES.ARRIVAL,
];

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function First5MinutesFlow({ initialStage, onComplete }) {
  const { logStage, completeOnboarding, getResumeIndex } = useFirst5Minutes();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(() => getResumeIndex(initialStage));

  const advance = async () => {
    const nextIdx = Math.min(screen + 1, STAGE_LABELS.length - 1);
    // Log stage completion
    await logStage(STAGE_KEYS[nextIdx]);
    setScreen(nextIdx);
  };

  const handleDone = async () => {
    await completeOnboarding();
    onComplete?.();
    navigate('/ghosted');
  };

  const screens = [
    <ScreenColdOpen onNext={advance} />,
    <ScreenAuth onNext={advance} />,
    <ScreenAge onNext={advance} />,
    <ScreenName onNext={advance} />,
    <ScreenSound onNext={advance} />,
    <ScreenGhosted onNext={advance} />,
    <ScreenMatch onNext={advance} />,
    <ScreenChat onNext={advance} />,
    <ScreenArrival onDone={handleDone} />,
  ];

  return (
    <div style={{ background: '#000', color: T.white, height: '100vh',
      maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column',
      fontFamily: 'Barlow, sans-serif', overflow: 'hidden' }}>

      {/* Progress bar */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`,
        flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
          {STAGE_LABELS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2, borderRadius: 1,
              background: i <= screen ? T.gold : T.border,
              transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ fontSize: 9, color: T.muted, fontFamily: 'Barlow, sans-serif',
          letterSpacing: '0.1em' }}>
          {STAGE_LABELS[screen]}
        </div>
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
            {screens[screen]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
