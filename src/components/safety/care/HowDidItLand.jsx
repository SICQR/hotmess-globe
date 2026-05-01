import { useState } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * HOW DID IT LAND surface — Care As Kink Chunk 04b
 * Post-meet outcome capture. Writes to meet_outcomes table.
 * No therapy language. Just a signal.
 */

const OUTCOMES = [
  { key: 'found',     label: 'Found it.',      sub: 'It happened.' },
  { key: 'cancelled', label: 'Changed plans.',  sub: 'All good.' },
  { key: 'timeout',   label: 'Ran long.',       sub: 'Time got away.' },
];

export default function HowDidItLand({ onDone }) {
  const { enabled, recordOutcome } = useCareAsKink();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!enabled) return null;

  const handleSend = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await recordOutcome(selected);
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
        <span style={goldTextStyle}>Logged.</span>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div style={labelStyle}>HOW DID IT LAND</div>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
        Just a signal. No story needed.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {OUTCOMES.map(o => (
          <button
            key={o.key}
            onClick={() => setSelected(o.key)}
            style={{
              ...optBtnStyle,
              background: selected === o.key ? '#120a00' : '#111',
              border: `1px solid ${selected === o.key ? '#C8962C' : '#222'}`,
            }}
          >
            <div style={{ fontSize: 13, color: selected === o.key ? '#C8962C' : '#fff', fontFamily: 'Oswald, sans-serif', letterSpacing: 1 }}>
              {o.label}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{o.sub}</div>
          </button>
        ))}
      </div>

      <button onClick={handleSend} disabled={!selected || saving} style={actionBtnStyle}>
        {saving ? '...' : 'SEND'}
      </button>
    </div>
  );
}

const baseStyle = { background: '#080808', padding: '24px 20px', fontFamily: 'Barlow, sans-serif', color: '#fff' };
const labelStyle = { fontSize: 11, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif', marginBottom: 8 };
const centreStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#080808' };
const goldTextStyle = { color: '#C8962C', fontSize: 22, fontFamily: 'Oswald, sans-serif', letterSpacing: 2 };
const optBtnStyle = { width: '100%', border: 'none', borderRadius: 4, padding: '13px 16px', cursor: 'pointer', textAlign: 'left' };
const actionBtnStyle = { width: '100%', background: '#C8962C', color: '#080808', border: 'none', borderRadius: 4, padding: '13px 0', fontSize: 13, fontFamily: 'Oswald, sans-serif', letterSpacing: 2, cursor: 'pointer' };
