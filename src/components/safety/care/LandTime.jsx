import { useState } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * LAND TIME surface — Care As Kink Chunk 04b
 * "What time should I know you're good?"
 * Writes land_time to user_sessions. If not checked in by then, backup contacts notified.
 */
export default function LandTime({ onDone }) {
  const { enabled, setLandTime } = useCareAsKink();
  const [selected, setSelected] = useState(null); // minutes from now
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!enabled) return null;

  const OPTIONS = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '3 hours', value: 180 },
  ];

  const handleSet = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setLandTime(selected);
      setConfirmed(true);
      setTimeout(() => {
        setConfirmed(false);
        onDone?.();
      }, 1800);
    } finally {
      setSaving(false);
    }
  };

  if (confirmed) {
    return (
      <div style={centreStyle}>
        <span style={goldTextStyle}>Set.</span>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div style={labelStyle}>LAND TIME</div>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
        What time should I know you're good?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            style={{
              ...optBtnStyle,
              background: selected === opt.value ? '#C8962C' : '#111',
              color: selected === opt.value ? '#080808' : '#fff',
              border: `1px solid ${selected === opt.value ? '#C8962C' : '#222'}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button onClick={handleSet} disabled={!selected || saving} style={actionBtnStyle}>
        {saving ? '...' : 'SET'}
      </button>
    </div>
  );
}

const baseStyle = { background: '#080808', padding: '24px 20px', fontFamily: 'Barlow, sans-serif', color: '#fff' };
const labelStyle = { fontSize: 11, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif', marginBottom: 8 };
const centreStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' };
const goldTextStyle = { color: '#C8962C', fontSize: 22, fontFamily: 'Oswald, sans-serif', letterSpacing: 2 };
const optBtnStyle = { width: '100%', border: 'none', borderRadius: 4, padding: '13px 16px', fontSize: 14, fontFamily: 'Barlow, sans-serif', cursor: 'pointer', textAlign: 'left' };
const actionBtnStyle = { width: '100%', background: '#C8962C', color: '#080808', border: 'none', borderRadius: 4, padding: '13px 0', fontSize: 13, fontFamily: 'Oswald, sans-serif', letterSpacing: 2, cursor: 'pointer', opacity: 1 };
