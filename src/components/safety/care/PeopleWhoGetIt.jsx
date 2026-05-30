import { useState, useEffect } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

/**
 * PEOPLE WHO GET IT surface — Care As Kink Chunk 04b
 * Shows your backup contacts. Lets you manage them from passive view.
 * No "emergency contacts" framing. These are just your people.
 */
export default function PeopleWhoGetIt({ onEdit }) {
  const { enabled, loadBackup } = useCareAsKink();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    loadBackup()
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div style={baseStyle}>
      <div style={labelStyle}>PEOPLE WHO GET IT</div>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
        They move when you need them to.
      </div>

      {loading ? (
        <div style={{ color: '#333', fontSize: 13 }}>...</div>
      ) : contacts.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 16 }}>No one added yet.</div>
          <button onClick={onEdit} style={editBtnStyle}>ADD YOUR PEOPLE</button>
        </div>
      ) : (
        <>
          {contacts.map((c, idx) => (
            <div key={idx} style={contactRowStyle}>
              <div style={{ fontSize: 14, color: '#fff', fontFamily: 'Oswald, sans-serif', letterSpacing: 1 }}>
                {c.name}
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{c.phone}</div>
            </div>
          ))}
          <button onClick={onEdit} style={{ ...editBtnStyle, marginTop: 20 }}>
            EDIT
          </button>
        </>
      )}
    </div>
  );
}

const baseStyle = { background: '#080808', padding: '24px 20px', fontFamily: 'Barlow, sans-serif', color: '#fff' };
const labelStyle = { fontSize: 11, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif', marginBottom: 8 };
const emptyStyle = { textAlign: 'center', padding: '20px 0' };
const contactRowStyle = { background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 4, padding: '14px 16px', marginBottom: 10 };
const editBtnStyle = { background: 'transparent', color: '#555', border: '1px solid #222', borderRadius: 4, padding: '10px 20px', fontSize: 11, fontFamily: 'Oswald, sans-serif', letterSpacing: 2, cursor: 'pointer', width: '100%' };
