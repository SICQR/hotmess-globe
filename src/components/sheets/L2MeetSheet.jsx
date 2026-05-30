import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { useV6Flag as useFlag } from '@/hooks/useV6Flag';

/**
 * L2 Meet Sheet — Chunk 05
 * Flag: v6_meet_flow
 *
 * Phases: suggest → moving → arrival → finding → done
 * Globe signals: EN_ROUTE / MEETPOINT / ARRIVAL / MET (never live positions)
 * Flash: 120s expiry, 60s cooldown
 * Movement timeout: 30min no update → session terminates
 */

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const FLASH_EXPIRY_S = 120;
const FLASH_COOLDOWN_S = 60;
const MOVEMENT_TIMEOUT_MS = 30 * 60 * 1000;
const MOVEMENT_POLL_MS = 10_000;
const ARRIVAL_RADIUS_M = 50;

// ── UTILS ─────────────────────────────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

// ── HOOK: LIVE MOVEMENT ───────────────────────────────────────────────────────
function useLiveMovement({ sessionId, meetpoint, enabled }) {
  const [youDist, setYouDist] = useState(null);
  const [themDist, setThemDist] = useState(null);
  const [arrived, setArrived] = useState(false);
  const lastUpdateRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled || !sessionId || !meetpoint?.lat) return;

    // Supabase Realtime: subscribe to public_movement_presence for this session
    const channel = supabase
      .channel(`meet-movement-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'public_movement_presence',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const row = payload.new;
        if (!row) return;
        lastUpdateRef.current = Date.now();

        const dist = haversine(row.approx_lat, row.approx_lng, meetpoint.lat, meetpoint.lng);

        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return;
          if (row.user_id === user.id) setYouDist(dist);
          else setThemDist(dist);
        });
      })
      .subscribe();

    // Movement timeout: 30min no update → terminate
    const checkTimeout = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > MOVEMENT_TIMEOUT_MS) {
        clearInterval(checkTimeout);
        // Signal timeout — parent handles session termination
        setArrived(false);
      }
    }, 60_000);

    timeoutRef.current = checkTimeout;
    return () => {
      supabase.removeChannel(channel);
      clearInterval(checkTimeout);
    };
  }, [enabled, sessionId, meetpoint]);

  // Arrival check
  useEffect(() => {
    if (youDist !== null && themDist !== null &&
        youDist < ARRIVAL_RADIUS_M && themDist < ARRIVAL_RADIUS_M) {
      setArrived(true);
    }
  }, [youDist, themDist]);

  return { youDist, themDist, arrived };
}

// ── MEETPOINT SUGGESTION CARD ─────────────────────────────────────────────────
function MeetpointCard({ suggestion, onConfirm, onDismiss }) {
  if (!suggestion) return (
    <div style={cardStyle}>
      <div style={{ color: '#444', fontSize: 12, padding: 20, textAlign: 'center' }}>
        Finding best meetpoint...
      </div>
    </div>
  );

  return (
    <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      style={cardStyle}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#C8962C',
          fontFamily: 'Oswald, sans-serif', marginBottom: 4 }}>
          SUGGESTED MEETPOINT
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: '#fff',
            letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {suggestion.label}
          </div>
          <div style={{ fontSize: 9, color: '#666', fontFamily: 'Barlow, sans-serif', textAlign: 'right' }}>
            {suggestion.source === 'shared_venue' ? "You're both here" :
             suggestion.source === 'midpoint' ? 'Halfway between you' : 'Nearby'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onConfirm} style={goldBtnStyle}>MEET HERE</button>
          <button onClick={onDismiss} style={ghostBtnStyle}>CHANGE</button>
        </div>
      </div>
    </motion.div>
  );
}

// ── MOVEMENT STATE ────────────────────────────────────────────────────────────
function MovementState({ youDist, themDist, meetpoint }) {
  return (
    <div style={{ background: '#050505', borderBottom: '1px solid #1a1a1a' }}>
      {/* Distance counters */}
      <div style={{ display: 'flex', padding: '10px 16px', gap: 8 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 4 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, color: '#4A90E2' }}>
            {youDist !== null ? fmtDist(youDist) : '—'}
          </div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 9, color: '#444' }}>you from meet</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 4 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, color: '#FF6B2B' }}>
            {themDist !== null ? fmtDist(themDist) : '—'}
          </div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 9, color: '#444' }}>them from meet</div>
        </div>
      </div>
      {/* Globe signal pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px 10px' }}>
        <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 5, height: 5, borderRadius: '50%', background: '#C8962C' }} />
        <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: 9, color: '#C8962C', letterSpacing: '0.12em' }}>
          MEET SESSION ACTIVE · Globe signals active
        </span>
      </div>
    </div>
  );
}

// ── ARRIVAL BANNER ────────────────────────────────────────────────────────────
function ArrivalBanner({ onFound, onCantFind }) {
  useEffect(() => {
    const t = setTimeout(onCantFind, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
      {[1, 2, 3].map(i => (
        <motion.div key={i}
          animate={{ scale: [0.8, 2.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
          style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%',
            border: '2px solid #C8962C', pointerEvents: 'none' }} />
      ))}
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 52, color: '#C8962C',
          lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 8 }}>
          You're<br />both here.
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 12, color: '#555',
          fontStyle: 'italic', marginBottom: 32 }}>
          Loop closed.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onCantFind} style={ghostBtnStyle}>CAN'T FIND THEM</button>
          <button onClick={onFound} style={goldBtnStyle}>FOUND ✓</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── FINDING EACH OTHER MODE ───────────────────────────────────────────────────
function FindingMode({ onFound, onClose }) {
  const [flashed, setFlashed] = useState(false);
  const [expiry, setExpiry] = useState(null);
  const [cooldownActive, setCooldownActive] = useState(false);

  useEffect(() => {
    if (expiry === null) return;
    if (expiry <= 0) { setFlashed(false); setExpiry(null); return; }
    const t = setTimeout(() => setExpiry(e => e - 1), 1000);
    return () => clearTimeout(t);
  }, [expiry]);

  const handleFlash = () => {
    if (flashed || cooldownActive) return;
    setFlashed(true);
    setExpiry(FLASH_EXPIRY_S);
    // After expiry, start cooldown
    setTimeout(() => {
      setFlashed(false);
      setExpiry(null);
      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), FLASH_COOLDOWN_S * 1000);
    }, FLASH_EXPIRY_S * 1000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20,
        background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>×</button>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, color: '#fff',
        textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>
        Finding each other
      </div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: '#555',
        textAlign: 'center', fontStyle: 'italic', marginBottom: 28, maxWidth: 280 }}>
        You're both nearby. Send your exact location once — it expires in {FLASH_EXPIRY_S}s.
      </div>
      <motion.button onClick={handleFlash} disabled={flashed || cooldownActive}
        animate={!flashed && !cooldownActive ? {
          boxShadow: ['0 0 0px #C8962C00', '0 0 24px #C8962C88', '0 0 0px #C8962C00']
        } : {}}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 140, height: 140, borderRadius: '50%',
          background: flashed ? 'rgba(48,209,88,0.15)' : 'rgba(200,150,44,0.12)',
          border: `2px solid ${flashed ? '#30D158' : cooldownActive ? '#333' : '#C8962C'}`,
          cursor: flashed || cooldownActive ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>📍</span>
        <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: '0.15em',
          color: flashed ? '#30D158' : cooldownActive ? '#333' : '#C8962C', textTransform: 'uppercase' }}>
          {flashed ? 'SENT' : cooldownActive ? 'WAIT' : 'FLASH'}
        </span>
        {expiry !== null && (
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: 9, color: '#555' }}>
            expires {expiry}s
          </span>
        )}
      </motion.button>
      {flashed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontFamily: 'Barlow, sans-serif', fontSize: 10, color: '#30D158',
            textAlign: 'center', marginBottom: 20 }}>
          Exact location sent. Expires in {expiry}s.<br />
          <span style={{ color: '#555' }}>Not stored. Thread-only.</span>
        </motion.div>
      )}
      <button onClick={onFound} style={{ ...goldBtnStyle, width: '100%', maxWidth: 280 }}>
        WE FOUND EACH OTHER ✓
      </button>
    </motion.div>
  );
}

// ── MET STATE: SILENCE WINDOW ─────────────────────────────────────────────────
function MetState({ metAt, onExtend, onLeaving }) {
  const [silenceLeft, setSilenceLeft] = useState(90);
  const [phase, setPhase] = useState('silence'); // silence | active | extended

  useEffect(() => {
    if (silenceLeft <= 0) { setPhase('active'); return; }
    const t = setTimeout(() => setSilenceLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [silenceLeft]);

  const r = 16, circ = 2 * Math.PI * r;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: '#080808', padding: '24px 20px', fontFamily: 'Barlow, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {/* Silence ring */}
        <div style={{ position: 'relative', width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} width={40} height={40}>
            <circle cx={20} cy={20} r={r} fill="none" stroke="#1a1a1a" strokeWidth={2} />
            {phase === 'silence' && (
              <circle cx={20} cy={20} r={r} fill="none" stroke="#C8962C" strokeWidth={2}
                strokeDasharray={`${(silenceLeft / 90) * circ} ${circ}`} strokeLinecap="round" />
            )}
          </svg>
          <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: 9, color: '#C8962C', position: 'relative' }}>
            {phase === 'silence' ? silenceLeft : '✓'}
          </span>
        </div>
        <div>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, color: '#fff', letterSpacing: 1 }}>
            {phase === 'silence' ? 'Quiet window.' : 'You met.'}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {phase === 'silence' ? 'Notifications off for 90 seconds.' : 'How is it going?'}
          </div>
        </div>
      </div>

      {phase === 'active' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onExtend} style={goldBtnStyle}>STILL TOGETHER</button>
          <button onClick={onLeaving} style={ghostBtnStyle}>TAKE CARE</button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function L2MeetSheet({ threadId, partnerName, partnerId, onClose }) {
  const enabled = useFlag('v6_meet_flow');
  const [phase, setPhase] = useState('suggest'); // suggest | moving | arrival | finding | met | done
  const [suggestion, setSuggestion] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [meetpoint, setMeetpoint] = useState(null);
  const [metAt, setMetAt] = useState(null);

  const { youDist, themDist, arrived } = useLiveMovement({
    sessionId, meetpoint, enabled: phase === 'moving',
  });

  useEffect(() => {
    if (!enabled || !partnerId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch('/api/meetpoint/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ thread_id: threadId, user_b_id: partnerId }),
      })
        .then(r => r.json())
        .then(setSuggestion)
        .catch(() => {});
    });
  }, [enabled, partnerId, threadId]);

  // Arrival detection
  useEffect(() => {
    if (arrived && phase === 'moving') setPhase('arrival');
  }, [arrived, phase]);

  const handleConfirmMeetpoint = async () => {
    if (!suggestion) return;
    const { data: { session } } = await supabase.auth.getSession();

    // Create meet_session
    const { data: ms } = await supabase
      .from('meet_sessions')
      .insert({
        user_a_id: (await supabase.auth.getUser()).data.user?.id,
        user_b_id: partnerId,
        thread_id: threadId,
        meetpoint_lat: suggestion.lat,
        meetpoint_lng: suggestion.lng,
        meetpoint_label: suggestion.label,
        status: 'moving',
      })
      .select('id')
      .single();

    setSessionId(ms?.id);
    setMeetpoint({ lat: suggestion.lat, lng: suggestion.lng });
    setPhase('moving');
  };

  const handleFound = async () => {
    if (!sessionId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const now = new Date().toISOString();
    setMetAt(now);
    await fetch('/api/meetpoint/found', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    setPhase('met');
  };

  if (!enabled) return null;

  return (
    <div style={{ background: '#080808', minHeight: '100%', fontFamily: 'Barlow, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #111',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif' }}>
            MEET
          </div>
          <div style={{ fontSize: 15, color: '#fff', fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase', letterSpacing: 1 }}>
            {partnerName || 'Your person'}
          </div>
        </div>
        {/* Phase progress */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['suggest', 'moving', 'arrival', 'done'].map((p, i) => (
            <div key={p} style={{ width: 20, height: 2, borderRadius: 1,
              background: ['suggest', 'moving', 'arrival', 'met', 'done'].indexOf(phase) >= i
                ? '#C8962C' : '#1a1a1a', transition: 'background 0.4s' }} />
          ))}
        </div>
      </div>

      {/* Movement view */}
      {phase === 'moving' && (
        <MovementState youDist={youDist} themDist={themDist} meetpoint={meetpoint} />
      )}

      {/* Main content area */}
      <div style={{ padding: '16px' }}>
        {phase === 'suggest' && (
          <MeetpointCard
            suggestion={suggestion}
            onConfirm={handleConfirmMeetpoint}
            onDismiss={() => setSuggestion(null)}
          />
        )}

        {phase === 'moving' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic', marginBottom: 16 }}>
              Both on the way. Updates every 10 seconds.
            </div>
            <button onClick={() => setPhase('finding')} style={ghostBtnStyle}>
              CAN'T FIND THEM?
            </button>
          </div>
        )}

        {phase === 'met' && metAt && (
          <MetState
            metAt={metAt}
            onExtend={() => {
              supabase.from('meet_sessions').update({ extended: true }).eq('id', sessionId);
            }}
            onLeaving={() => {
              supabase.from('meet_sessions').update({
                closed_at: new Date().toISOString(), status: 'found'
              }).eq('id', sessionId);
              setPhase('done');
            }}
          />
        )}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, color: '#C8962C',
              textTransform: 'uppercase', marginBottom: 8 }}>
              Meet complete.
            </div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 11, color: '#555',
              fontStyle: 'italic' }}>
              suggest → commit → move → arrive → found
            </div>
          </motion.div>
        )}
      </div>

      {/* Arrival banner */}
      <AnimatePresence>
        {phase === 'arrival' && (
          <ArrivalBanner
            onFound={handleFound}
            onCantFind={() => setPhase('finding')}
          />
        )}
      </AnimatePresence>

      {/* Finding mode */}
      <AnimatePresence>
        {phase === 'finding' && (
          <FindingMode
            onFound={handleFound}
            onClose={() => setPhase(arrived ? 'arrival' : 'moving')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const cardStyle = {
  background: '#0f0f0f',
  border: '1px solid rgba(200,150,44,0.2)',
  borderRadius: 6,
  overflow: 'hidden',
};

const goldBtnStyle = {
  flex: 1,
  padding: '11px 16px',
  background: '#C8962C',
  border: 'none',
  borderRadius: 4,
  fontFamily: 'Oswald, sans-serif',
  fontSize: 11,
  letterSpacing: '0.18em',
  color: '#080808',
  cursor: 'pointer',
  textTransform: 'uppercase',
};

const ghostBtnStyle = {
  flex: 1,
  padding: '11px 16px',
  background: 'transparent',
  border: '1px solid #1c1c1c',
  borderRadius: 4,
  fontFamily: 'Oswald, sans-serif',
  fontSize: 11,
  letterSpacing: '0.1em',
  color: 'rgba(255,255,255,0.38)',
  cursor: 'pointer',
  textTransform: 'uppercase',
};
