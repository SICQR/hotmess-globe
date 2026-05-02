import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { X, MapPin } from 'lucide-react';
import { createPageUrl } from '../../utils';

export default function BeaconPreviewPanel({ beacon, onClose, onViewFull }) {
  if (!beacon) return null;

  const kindColors = {
    event: '#00C2E0',
    venue: '#C8962C',
    hookup: '#C8962C',
    drop: '#FFEB3B',
    popup: '#39FF14',
    private: '#FF6B35',
    person: '#00C2E0',
  };

  const color = kindColors[beacon.kind] || '#C8962C';
  const isPerson = beacon.kind === 'person';
  const detailsUrl = isPerson && beacon.email
    ? createPageUrl(`Profile?email=${encodeURIComponent(beacon.email)}`)
    : createPageUrl('BeaconDetail') + '?id=' + encodeURIComponent(beacon.id);

  return (
    <AnimatePresence>
      <motion.div
        key="beacon-preview-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) onClose();
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[200] bg-[#0A0A0A] border-t border-white/10 rounded-t-[32px] px-6 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,20px))] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] touch-none"
        style={{ height: 'auto', minHeight: '40vh' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-4">
          <div className="w-12 h-1.5 bg-white/10 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C8962C]/10 rounded-xl flex items-center justify-center">
              <MapPin className={`w-5 h-5 ${isPerson ? 'text-[#00C2E0]' : 'text-[#C8962C]'}`} />
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tight text-white uppercase leading-none">
                {beacon.title}
              </h3>
              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">
                {isPerson ? 'person' : beacon.kind || 'SIGNAL'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto max-h-[60vh] pointer-events-auto pb-12">
          {(beacon.description || beacon.metadata?.description) && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <p className="text-white/70 text-sm leading-relaxed font-medium">
                {beacon.description || beacon.metadata?.description}
              </p>
            </div>
          )}


          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 gap-3">
            {(beacon.city || beacon.metadata?.city) && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10">
                <MapPin className="w-5 h-5 text-white/40" />
                <span className="text-white font-black uppercase tracking-wider text-xs">
                  {beacon.city || beacon.metadata?.city}
                </span>
              </div>
            )}

            {(beacon.address || beacon.metadata?.address) ? (
              <div className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10">
                <MapPin className="w-5 h-5 text-[#00C2E0]" />
                <span className="text-white font-bold text-sm uppercase tracking-tight">
                  {beacon.address || beacon.metadata?.address}
                </span>
              </div>
            ) : (
              <div className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10">
                <MapPin className="w-5 h-5 text-[#00C2E0]/40" />
                <span className="text-white/40 font-mono text-xs tracking-widest">
                  LOC: {Number(beacon.lat).toFixed(4)}, {Number(beacon.lng).toFixed(4)}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
               {beacon.isRightNow && (
                 <span className="px-3 py-1 bg-[#00C2E0]/20 border border-[#00C2E0]/30 text-[#00C2E0] text-[10px] font-black uppercase tracking-widest">Live Now</span>
               )}
               {beacon.intensity > 0.7 && (
                 <span className="px-3 py-1 bg-[#FFEB3B]/20 border border-[#FFEB3B]/30 text-[#FFEB3B] text-[10px] font-black uppercase tracking-widest">High Energy</span>
               )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
