import { useState, lazy, Suspense } from 'react';
import { useCareAsKink } from '@/hooks/useCareAsKink';

const BackupSetup      = lazy(() => import('@/components/safety/care/BackupSetup'));
const GetOut           = lazy(() => import('@/components/safety/care/GetOut'));
const Cover            = lazy(() => import('@/components/safety/care/Cover'));
const LandTime         = lazy(() => import('@/components/safety/care/LandTime'));
const CleanExit        = lazy(() => import('@/components/safety/care/CleanExit'));
const HowDidItLand     = lazy(() => import('@/components/safety/care/HowDidItLand'));
const PeopleWhoGetIt   = lazy(() => import('@/components/safety/care/PeopleWhoGetIt'));

/**
 * L2 Care As Kink Sheet — Chunks 04a + 04b
 * Flag: v6_care_as_kink_active
 */
export default function L2CareSheet({ onClose }) {
  const { enabled, coverActive } = useCareAsKink();
  const [active, setActive] = useState(null);

  if (!enabled) return null;

  // Cover takes full screen
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
        <button onClick={() => setActive(null)} style={backBtnStyle}>← back</button>
        <Suspense fallback={<div style={{ color: '#333', textAlign: 'center', paddingTop: 60 }}>...</div>}>
          {active === 'backup'       && <BackupSetup    onDone={() => setActive(null)} />}
          {active === 'getout'       && <GetOut         onDone={() => setActive(null)} />}
          {active === 'cover'        && <Cover />}
          {active === 'landtime'     && <LandTime       onDone={() => setActive(null)} />}
          {active === 'cleanexit'    && <CleanExit      onDone={() => setActive(null)} />}
          {active === 'howdidland'   && <HowDidItLand   onDone={() => setActive(null)} />}
          {active === 'peoplegetit'  && <PeopleWhoGetIt onEdit={() => setActive('backup')} />}
        </Suspense>
      </div>
    );
  }

  return (
    <div style={sheetStyle}>
      <div style={headerStyle}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#C8962C', fontFamily: 'Oswald, sans-serif' }}>
          CARE DRESSED AS KINK
        </div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
          You're covered. The system is quiet. You run the play.
        </div>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <SectionLabel>ACTIVE</SectionLabel>
        <SurfaceCard label="GET OUT"    sub="Hold. Your people move."      onTap={() => setActive('getout')}    accent />
        <SurfaceCard label="COVER"      sub="Fake call. No log."            onTap={() => setActive('cover')}    />
        <SurfaceCard label="LAND TIME"  sub="Set a check-in window."        onTap={() => setActive('landtime')} />
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        <SectionLabel>AFTER</SectionLabel>
        <SurfaceCard label="CLEAN EXIT"       sub="Cancel the clock."          onTap={() => setActive('cleanexit')}   />
        <SurfaceCard label="HOW DID IT LAND"  sub="Just a signal."             onTap={() => setActive('howdidland')}  />
        <SurfaceCard label="PEOPLE WHO GET IT" sub="Your backup contacts."     onTap={() => setActive('peoplegetit')} />
        <SurfaceCard label="BACKUP"            sub="Edit your people."          onTap={() => setActive('backup')}     />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, color: '#333', fontFamily: 'Oswald, sans-serif', marginBottom: 8, marginTop: 16 }}>
      {children}
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
        padding: '14px 16px',
        marginBottom: 8,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 3, color: accent ? '#C8962C' : '#fff', fontFamily: 'Oswald, sans-serif' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: '#555', marginTop: 3, fontFamily: 'Barlow, sans-serif' }}>
        {sub}
      </div>
    </button>
  );
}

const sheetStyle   = { background: '#080808', minHeight: '100%', fontFamily: 'Barlow, sans-serif' };
const headerStyle  = { padding: '28px 16px 12px', borderBottom: '1px solid #111' };
const overlayStyle = { position: 'fixed', inset: 0, background: '#080808', zIndex: 9999, display: 'flex', flexDirection: 'column' };
const backBtnStyle = { background: 'transparent', border: 'none', color: '#555', fontSize: 13, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Barlow, sans-serif' };
