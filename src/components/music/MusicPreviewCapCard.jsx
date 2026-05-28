/**
 * MusicPreviewCapCard — shown when a MESS user hits the music preview cap.
 *
 * Listens for the 'music:preview_cap_hit' window event dispatched by
 * MusicPlayerContext. Renders in-line in the mini-player or release page.
 * Dismissable. Per-doctrine 07: one line, no chrome, felt-copy tone.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MusicPreviewCapCard({ inline = false }) {
  const [visible, setVisible] = useState(false);
  const [cap, setCap] = useState(90);
  const navigate = useNavigate();

  useEffect(() => {
    function onHit(e) {
      if (e?.detail?.cap) setCap(e.detail.cap);
      setVisible(true);
    }
    window.addEventListener('music:preview_cap_hit', onHit);
    return () => window.removeEventListener('music:preview_cap_hit', onHit);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className={
        inline
          ? 'mx-3 my-2 p-3 rounded-xl flex items-center gap-3'
          : 'fixed bottom-24 left-3 right-3 z-[55] p-3 rounded-xl flex items-center gap-3'
      }
      style={{ background: 'rgba(200,150,44,0.12)', border: '1px solid rgba(200,150,44,0.35)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[#C8962C] font-black uppercase tracking-wider text-[10px] mb-0.5">
          {cap}s preview
        </div>
        <div className="text-white/85 text-[12px] leading-snug">
          The rest is for HOTMESS.
        </div>
      </div>
      <button
        type="button"
        onClick={() => { setVisible(false); navigate('/upgrade'); }}
        className="shrink-0 px-3 h-8 rounded-full text-[11px] font-bold uppercase tracking-wider"
        style={{ background: '#C8962C', color: '#000' }}
      >
        Unlock
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80"
      >
        ×
      </button>
    </div>
  );
}
