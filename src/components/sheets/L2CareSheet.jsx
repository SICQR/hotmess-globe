import { useState, lazy, Suspense } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

const BackupSetup = lazy(() => import('@/components/safety/care/BackupSetup'));
const GetOut = lazy(() => import('@/components/safety/care/GetOut'));
const Cover = lazy(() => import('@/components/safety/care/Cover'));

/**
 * L2 Care As Kink Sheet — Chunk 04a
 * Flag: v6_care_as_kink_active
 * Three surfaces: BACKUP | GET OUT | COVER
 */
export default function L2CareSheet({ onClose }) {
  const { enabled, coverActive } = useCareAsKink();
  const [active, setActive] = useState(null); // 'backup' | 'getout' | 'cover' | null

  if (!enabled) return null;

  // Full-screen cover takes over when active
  if (coverActive) {
    return (
      <div style={overlayStyle}>
        <Suspense fallback={null}>
          <Cover />
        </Suspense>
      </div>
    );
  }

  if (active) {
    return (
      <div style={overlayStyle}>
        <button onClick={() => setActive(null)} style={backBtnStyle}>
          ← back
        </button>
        <Suspense fallback={<div style={{ color: '#333', textAlign: 'center', paddingTop: 60 }}>...</div>}>
          {active === 'backup' && <BackupSetup onDone={() => setActive(null)} />}
          {active === 'getout' && <GetOut onDone={() => setActive(null)} />}
          {active === 'cover' && <Cover />}
        </Suspense>
      </div>
    );
  }

  return (
    <div style={sheetStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif' }}>
          CARE DRESSED AS KINK
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
          You're covered. The system is quiet. You run the play.
        </div>
      </div>

      {/* Surface cards */}
      <div style={{ padding: '0 16px 24px' }}>
        <SurfaceCard
          id="backup"
          label="BACKUP"
          sub="Who's got you tonight?"
          onTap={() => setActive('backup')}
        />
        <SurfaceCard
          id="cover"
          label="COVER"
          sub="Fake call. No log."
          onTap={() => setActive('cover')}
        />
        <SurfaceCard
          id="getout"
          label="GET OUT"
          sub="Hold. Your people move."
          onTap={() => setActive('getout')}
          accent
        />
      </div>
    </div>
  );
}

function SurfaceCard({ label, sub, onTap, accent }) {
  return (
    <button
      onClick={onTap}
      style={{
        display: 'block',
        width: '100%',
        background: accent ? '#120a00' : '#0e0e0e',
        border: `1px solid ${accent ? '#C8962C33' : '#1a1a1a'}`,
        borderRadius: 6,
        padding: '16px',
        marginBottom: 10,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 3, color: accent ? '#C8962C' : '#fff', fontFamily: 'Oswald, sans-serif' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontFamily: 'Barlow, sans-serif' }}>
        {sub}
      </div>
    </button>
  );
}

const sheetStyle = {
  background: '#080808',
  minHeight: '100%',
  fontFamily: 'Barlow, sans-serif',
};

const headerStyle = {
  padding: '28px 16px 20px',
  borderBottom: '1px solid #111',
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: '#080808',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
};

const backBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#555',
  fontSize: 13,
  padding: '16px 20px',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'Barlow, sans-serif',
};
