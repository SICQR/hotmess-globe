import { useState, useRef, useCallback } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * GET OUT surface — Care As Kink Chunk 04a
 * Hold 3s → notifies backup contacts → starts COVER
 */

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TICK_MS = 120;
const TICKS_NEEDED = Math.ceil(3000 / TICK_MS); // ~25 ticks

export default function GetOut({ onDone }) {
  const { fireGetOut, startCover } = useCareAsKink();
  const [progress, setProgress] = useState(0); // 0–1
  const [phase, setPhase] = useState('idle'); // idle | holding | firing | done
  const intervalRef = useRef(null);
  const tickCount = useRef(0);

  const beginHold = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('holding');
    tickCount.current = 0;
    intervalRef.current = setInterval(() => {
      tickCount.current += 1;
      const p = tickCount.current / TICKS_NEEDED;
      setProgress(Math.min(p, 1));
      if (tickCount.current >= TICKS_NEEDED) {
        clearInterval(intervalRef.current);
        setPhase('firing');
        fireGetOut()
          .then(() => {
            setPhase('done');
            startCover();
          })
          .catch(() => {
            setPhase('done');
            startCover();
          });
      }
    }, TICK_MS);
  }, [phase, fireGetOut, startCover]);

  const cancelHold = useCallback(() => {
    if (phase !== 'holding') return;
    clearInterval(intervalRef.current);
    setProgress(0);
    tickCount.current = 0;
    setPhase('idle');
  }, [phase]);

  if (phase === 'done') {
    return (
      <div style={doneStyle}>
        <div style={{ fontSize: 18, color: '#C8962C', fontFamily: 'Oswald, sans-serif', letterSpacing: 2, marginBottom: 8 }}>
          Done.
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          Your people know.
        </div>
      </div>
    );
  }

  const strokeDash = `${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  const label = phase === 'firing' ? '...' : phase === 'holding' ? 'HOLD' : 'GET OUT';

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif', marginBottom: 20 }}>
        GET OUT
      </div>

      <div
        onMouseDown={beginHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={e => { e.preventDefault(); beginHold(); }}
        onTouchEnd={cancelHold}
        style={{ cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <svg width={130} height={130} viewBox="0 0 130 130" style={{ display: 'block' }}>
          {/* Track */}
          <circle
            cx={65} cy={65} r={RADIUS}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={6}
          />
          {/* Progress arc */}
          <circle
            cx={65} cy={65} r={RADIUS}
            fill="none"
            stroke="#C8962C"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={strokeDash}
            strokeDashoffset={0}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dasharray 0.08s linear' }}
          />
          {/* Centre label */}
          <text
            x={65} y={70}
            textAnchor="middle"
            fill={phase === 'holding' ? '#C8962C' : '#fff'}
            fontSize={12}
            fontFamily="Oswald, sans-serif"
            letterSpacing={2}
          >
            {label}
          </text>
        </svg>
      </div>

      <div style={{ fontSize: 11, color: '#444', marginTop: 16 }}>
        {phase === 'idle' ? 'hold 3 seconds' : phase === 'holding' ? 'keep holding...' : ''}
      </div>
    </div>
  );
}

const containerStyle = {
  background: '#080808',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: 'Barlow, sans-serif',
};

const doneStyle = {
  background: '#080808',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: '40px 20px',
};
