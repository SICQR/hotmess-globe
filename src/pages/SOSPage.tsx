/**
 * SOSPage — Standalone /sos route
 *
 * Deep-linkable SOS activation. Immediately triggers SOSOverlay
 * (the full interrupt experience) so users can bookmark /sos or
 * share the link to trusted contacts as a "panic URL".
 */

import { useEffect } from 'react';
import { useSOSContext } from '@/contexts/SOSContext';
import { useNavigate } from 'react-router-dom';

export default function SOSPage() {
  const { triggerSOS, sosActive } = useSOSContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sosActive) {
      triggerSOS();
    }
  }, [triggerSOS, sosActive]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: '#050507' }}
    >
      {/* SOSOverlay is rendered globally by App.jsx when isActive is true.
          This page just triggers it and shows a fallback while it mounts. */}
      <div className="text-center px-8">
        <div className="w-16 h-16 rounded-full bg-[#FF3B30] mx-auto mb-4 flex items-center justify-center animate-pulse">
          <span className="text-2xl font-black text-white">SOS</span>
        </div>
        <p className="text-white/60 text-sm">Activating emergency mode…</p>
      </div>
    </div>
  );
}
