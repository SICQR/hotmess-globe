import { useState, useEffect } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * BACKUP surface — Care As Kink Chunk 04a
 * "Who's got you tonight?"
 * Stores up to 2 contacts in trusted_contacts where role='backup'
 */
export default function BackupSetup({ onDone }) {
  const { saveBackup, loadBackup } = useCareAsKink();
  const [contacts, setContacts] = useState([
    { name: '', phone: '' },
    { name: '', phone: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    loadBackup().then(existing => {
      if (existing.length > 0) {
        setContacts([
          existing[0] || { name: '', phone: '' },
          existing[1] || { name: '', phone: '' },
        ]);
      }
    });
  }, []);

  const update = (idx, field, val) => {
    setContacts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSave = async () => {
    const filled = contacts.filter(c => c.name.trim() && c.phone.trim());
    if (filled.length === 0) return;
    setSaving(true);
    try {
      await saveBackup(filled);
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
      <div className="flex items-center justify-center h-full">
        <span style={{ color: '#C8962C', fontSize: 22, fontFamily: 'Oswald, sans-serif', letterSpacing: 2 }}>
          Backed.
        </span>
      </div>
    );
  }

  return (
    <div style={{ background: '#080808', color: '#fff', padding: '24px 20px', fontFamily: 'Barlow, sans-serif' }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif', marginBottom: 6 }}>
        BACKUP
      </div>
      <div style={{ fontSize: 15, color: '#aaa', marginBottom: 24 }}>
        Who's got you tonight?
      </div>

      {contacts.map((c, idx) => (
        <div key={idx} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#555', marginBottom: 6 }}>
            CONTACT {idx + 1}
          </div>
          <input
            type="text"
            placeholder="Name"
            value={c.name}
            onChange={e => update(idx, 'name', e.target.value)}
            style={inputStyle}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={c.phone}
            onChange={e => update(idx, 'phone', e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        style={btnStyle}
      >
        {saving ? '...' : 'SAVE'}
      </button>
    </div>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  background: '#111',
  border: '1px solid #222',
  borderRadius: 4,
  color: '#fff',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'Barlow, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle = {
  marginTop: 24,
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
