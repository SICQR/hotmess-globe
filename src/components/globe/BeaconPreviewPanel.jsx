import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Calendar, Users, Zap, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { getProfileUrl, getDisplayName } from '@/lib/userPrivacy';

export default function BeaconPreviewPanel({ beacon, onClose, onViewFull }) {
  if (!beacon) return null;

  const kindColors = {
    event: '#00D9FF',
    venue: '#B026FF',
    hookup: '#FF1493',
    drop: '#FFEB3B',
    popup: '#39FF14',
    private: '#FF6B35',
    person: '#00D9FF',
  };

  const color = kindColors[beacon.kind] || '#FF1493';
  const isPerson = beacon.kind === 'person';
  const detailsUrl = isPerson && beacon.email
    ? getProfileUrl(user)
    : createPageUrl('BeaconDetail') + '?id=' + encodeURIComponent(beacon.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4"
    >
      <div className="bg-black/95 border-2 border-white backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div 
          className="p-4 border-b-2 border-white/20 relative"
          style={{ backgroundColor: `${color}20` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            {beacon.image_url && (
              <img
                src={beacon.image_url}
                alt={beacon.title}
                className="w-16 h-16 object-cover border-2 border-white grayscale"
              />
            )}
            <div className="flex-1 min-w-0">
              <div 
                className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80"
                style={{ color }}
              >
                {isPerson ? 'person' : beacon.kind}
              </div>
              <h3 className="font-black text-lg leading-tight mb-1 line-clamp-2">
                {beacon.title}
              </h3>
              {beacon.isRightNow && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14] text-[10px] font-black uppercase animate-pulse">
                  <Zap className="w-3 h-3" />
                  RIGHT NOW
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {beacon.description && (
            <p className="text-sm text-white/80 line-clamp-2">
              {beacon.description}
            </p>
          )}

          {/* Quick Info */}
          <div className="flex flex-wrap gap-2 text-xs">
            {beacon.city && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10">
                <MapPin className="w-3 h-3 text-white/60" />
                <span className="text-white/80">{beacon.city}</span>
              </div>
            )}

            {beacon.event_date && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10">
                <Calendar className="w-3 h-3 text-white/60" />
                <span className="text-white/80">
                  {format(new Date(beacon.event_date), 'MMM d, h:mm a')}
                </span>
              </div>
            )}

            {beacon.capacity && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10">
                <Users className="w-3 h-3 text-white/60" />
                <span className="text-white/80">{beacon.capacity}</span>
              </div>
            )}

            {beacon.xp_scan && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 border"
                style={{ 
                  backgroundColor: `${color}20`, 
                  borderColor: `${color}60`,
                  color 
                }}
              >
                <Zap className="w-3 h-3" />
                <span className="font-bold">{beacon.xp_scan} XP</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onViewFull}
              className="flex-1 bg-[#FF1493] hover:bg-white text-black font-black border-2 border-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {isPerson ? 'VIEW PROFILE' : 'VIEW DETAILS'}
            </Button>
            <Link to={detailsUrl}>
              <Button
                variant="outline"
                className="border-white/20 hover:bg-white/10"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}