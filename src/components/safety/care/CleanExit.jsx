import { useState } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * CLEAN EXIT surface — Care As Kink Chunk 04b
 * "You're done. Cancel the clock."
 * Marks user_session as cancelled, notifies backup contacts all clear.
 */
export default function CleanExit({ onDone }) {
  const { enabled, cancelSession } = useCareAsKink();
  const [phase, setPhase] = useState('idle'); // idle | confirming | done

  if (!enabled) return null;

  const handleExit = async () => {
    setPhase('confirming');
    try {
      await cancelSession();
      setPhase('done');
      setTimeout(() => onDone?.(), 2000);
    } catch {
      setPhase('idle');
    }
  };

  if (phase === 'done') {
    return (
      <div style={centreStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={goldTextStyle}>Gone.</div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Clock cancelled.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div style={labelStyle}>CLEAN EXIT</div>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 32 }}>
        You're done. Cancel the clock.
      </div>

      <button
        onClick={handleExit}
        disabled={phase === 'confirming'}
        style={actionBtnStyle}
      >
        {phase === 'confirming' ? '...' : "I'M OUT"}
      </button>
    </div>
  );
}

const baseStyle = { background: '#080808', padding: '24px 20px', fontFamily: 'Barlow, sans-serif', color: '#fff' };
const labelStyle = { fontSize: 11, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif', marginBottom: 8 };
const centreStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#080808' };
const goldTextStyle = { color: '#C8962C', fontSize: 22, fontFamily: 'Oswald, sans-serif', letterSpacing: 2 };
const actionBtnStyle = { width: '100%', background: 'transparent', color: '#C8962C', border: '1px solid #C8962C', borderRadius: 4, padding: '13px 0', fontSize: 13, fontFamily: 'Oswald, sans-serif', letterSpacing: 2, cursor: 'pointer' };
