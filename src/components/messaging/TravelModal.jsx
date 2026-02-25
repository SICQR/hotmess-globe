/**
 * TravelModal — share your current location as a meetpoint card in chat
 *
 * Tap ✈️ Travel in chat composer → this modal appears →
 * "Share Location" → inserts a meetpoint message into the chat thread.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Compute OSM tile coords for zoom 14
const toTile = (lat, lng, z = 14) => {
  const x = Math.floor(((lng + 180) / 360) * 2 ** z);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z);
  return { x, y, z };
};

export default function TravelModal({ onSend, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [location, setLocation] = useState(null); // { lat, lng }
  const [etaInput, setEtaInput] = useState('15');
  const [label, setLabel] = useState('My Location');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    setStatus('loading');
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ready');
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSend = async () => {
    if (!location) return;
    setSending(true);
    try {
      await onSend({
        message_type: 'meetpoint',
        metadata: {
          title: label || 'My Location',
          lat: location.lat,
          lng: location.lng,
          etaMin: parseInt(etaInput) || 15,
        },
        content: `📍 ${label || 'My Location'} — ${etaInput || '15'} min away`,
      });
      onClose?.();
    } catch (err) {
      toast.error('Failed to share location');
    } finally {
      setSending(false);
    }
  };

  const tile = location ? toTile(location.lat, location.lng) : null;
  const tileUrl = tile ? `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png` : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-end justify-center pb-8 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span className="text-white font-black">Drop a pin</span>
              </div>
              <p className="text-white/40 text-xs mt-0.5 pl-7">Timeboxed. Kill it anytime.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Map preview */}
          <div className="relative mx-4 mt-4 h-40 rounded-2xl overflow-hidden bg-[#0d1a2e]">
            {status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
                <p className="text-white/40 text-xs">Finding you…</p>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-white/50 text-xs">Location's off</p>
                <button onClick={requestLocation} className="text-[#C8962C] text-xs font-bold">Try again</button>
              </div>
            )}
            {status === 'ready' && tileUrl && (
              <>
                <img src={tileUrl} alt="Map" className="w-full h-full object-cover opacity-80" crossOrigin="anonymous" />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-red-500 drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }} />
                </div>
                {/* Coordinates */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-full">
                  <span className="text-[10px] text-white/60 font-mono">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Label + ETA inputs */}
          {status === 'ready' && (
            <div className="p-4 space-y-3">
              <div>
                <label className="text-white/40 text-xs font-bold mb-1.5 block">LABEL</label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="My Location"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-[#C8962C]/50"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs font-bold mb-1.5 block">ETA (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={etaInput}
                  onChange={e => setEtaInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-[#C8962C]/50"
                />
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="p-4 pt-0 space-y-3">
            <button
              onClick={handleSend}
              disabled={status !== 'ready' || sending}
              className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Navigation className="w-5 h-5" />
              {sending ? 'Sending…' : 'Send meetpoint'}
            </button>
            <button onClick={onClose} className="w-full py-3 bg-[#2A2A2A] text-white font-bold rounded-2xl text-sm">
              Not yet
            </button>
            <p className="text-[10px] text-white/25 text-center">If you hit SOS, sharing shuts off instantly.</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
