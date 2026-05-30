import { useState, useEffect, useRef } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * COVER surface — Care As Kink Chunk 04a
 * Fake incoming call. Web Audio ring tone. No call log. No trace.
 */

const CALLERS = ['Dean', 'Mum', 'Work', 'Doctor'];
const RING_DURATION = 10; // seconds before auto-answer UI

export default function Cover() {
  const { coverActive, coverCaller, endCover, startCover } = useCareAsKink();
  const [selectedCaller, setSelectedCaller] = useState(CALLERS[0]);
  const [phase, setPhase] = useState('setup'); // setup | ringing | call | ended
  const [countdown, setCountdown] = useState(RING_DURATION);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const timerRef = useRef(null);

  // Start ringing when coverActive flips to true
  useEffect(() => {
    if (coverActive && phase === 'setup') {
      startRinging();
    }
  }, [coverActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      clearInterval(timerRef.current);
    };
  }, []);

  const startRinging = () => {
    setPhase('ringing');
    setCountdown(RING_DURATION);
    playRingTone();
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          stopAudio();
          setPhase('call');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const playRingTone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const pattern = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        setTimeout(pattern, 1000);
        oscRef.current = osc;
      };
      pattern();
    } catch {
      // Web Audio not available — silent
    }
  };

  const stopAudio = () => {
    try {
      oscRef.current?.stop?.();
      audioCtxRef.current?.close?.();
    } catch {
      // ignore
    }
  };

  const handleDecline = () => {
    stopAudio();
    clearInterval(timerRef.current);
    setPhase('setup');
    endCover();
  };

  const handleAnswer = () => {
    stopAudio();
    clearInterval(timerRef.current);
    setPhase('call');
  };

  const handleEnd = () => {
    setPhase('ended');
    endCover();
  };

  // Setup view (pre-cover activated)
  if (!coverActive && phase === 'setup') {
    return (
      <div style={baseStyle}>
        <div style={labelStyle}>COVER</div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
          Fake call. No log.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {CALLERS.map(name => (
            <button
              key={name}
              onClick={() => setSelectedCaller(name)}
              style={{
                ...callerBtnStyle,
                background: selectedCaller === name ? '#C8962C' : '#1a1a1a',
                color: selectedCaller === name ? '#080808' : '#fff',
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <button onClick={() => startCover(selectedCaller)} style={actionBtnStyle}>
          CALL ME
        </button>
      </div>
    );
  }

  // Ringing
  if (phase === 'ringing') {
    return (
      <div style={{ ...baseStyle, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 60 }}>
        <div>
          <div style={{ fontSize: 28, fontFamily: 'Oswald, sans-serif', color: '#fff', textAlign: 'center', marginBottom: 8 }}>
            {coverCaller || selectedCaller}
          </div>
          <div style={{ fontSize: 12, color: '#555', textAlign: 'center', letterSpacing: 2 }}>
            INCOMING CALL
          </div>
        </div>

        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a1a1a', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28 }}>📞</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          <button onClick={handleDecline} style={{ ...callBtnStyle, background: '#2a0a0a', color: '#ff4444' }}>
            Decline
          </button>
          <button onClick={handleAnswer} style={{ ...callBtnStyle, background: '#0a2a0a', color: '#44ff44' }}>
            Answer
          </button>
        </div>
      </div>
    );
  }

  // Active call
  if (phase === 'call') {
    return (
      <div style={{ ...baseStyle, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 60 }}>
        <div>
          <div style={{ fontSize: 28, fontFamily: 'Oswald, sans-serif', color: '#fff', textAlign: 'center', marginBottom: 8 }}>
            {coverCaller || selectedCaller}
          </div>
          <div style={{ fontSize: 12, color: '#C8962C', textAlign: 'center', letterSpacing: 2 }}>
            ON CALL
          </div>
        </div>

        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a1a1a', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28 }}>📱</span>
        </div>

        <button onClick={handleEnd} style={{ ...callBtnStyle, background: '#2a0a0a', color: '#ff4444', margin: '0 auto' }}>
          End Call
        </button>
      </div>
    );
  }

  return null;
}

const baseStyle = {
  background: '#080808',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '32px 20px',
  fontFamily: 'Barlow, sans-serif',
  minHeight: 320,
};

const labelStyle = {
  fontSize: 11,
  letterSpacing: 3,
  color: '#C8962C',
  fontFamily: 'Oswald, sans-serif',
  marginBottom: 8,
};

const callerBtnStyle = {
  border: 'none',
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: 13,
  fontFamily: 'Barlow, sans-serif',
  cursor: 'pointer',
};

const actionBtnStyle = {
  width: '100%',
  background: '#C8962C',
  color: '#080808',
  border: 'none',
  borderRadius: 4,
  padding: '13px 0',
  fontSize: 13,
  fontFamily: 'Oswald, sans-serif',
  letterSpacing: 2,
  cursor: 'pointer',
};

const callBtnStyle = {
  border: 'none',
  borderRadius: 4,
  padding: '12px 24px',
  fontSize: 13,
  fontFamily: 'Barlow, sans-serif',
  cursor: 'pointer',
};
