import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { MapPin, Zap } from 'lucide-react';
import CompatibilityBadge, { calculateCompatibility } from './CompatibilityBadge';
import ReportButton from '../moderation/ReportButton';

export default function DiscoveryCard({ user, userTags = [], userTribes = [], currentUserTags = [], index }) {
  const compatibility = calculateCompatibility(currentUserTags, userTags);
  const essentials = userTags.filter(t => t.is_essential).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={createPageUrl(`Profile?email=${user.email}`)}>
        <div className="group relative overflow-hidden border-2 border-white/10 hover:border-[#FF1493] transition-all">
          {/* Avatar */}
          <div className="aspect-square bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-6xl font-black overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              user.full_name?.[0] || 'U'
            )}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
            <div className="mb-2">
              <CompatibilityBadge badge={compatibility} size="small" />
            </div>
            
            <h3 className="text-lg font-black mb-1">{user.full_name}</h3>
            
            {user.city && (
              <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                <MapPin className="w-3 h-3" />
                <span>{user.city}</span>
              </div>
            )}

            {/* Tribes */}
            {userTribes.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {userTribes.slice(0, 2).map(tribe => (
                  <span
                    key={tribe.tribe_id}
                    className="px-2 py-0.5 bg-[#00D9FF] text-black text-[10px] font-bold uppercase"
                  >
                    {tribe.tribe_label}
                  </span>
                ))}
              </div>
            )}

            {/* Essentials preview */}
            {essentials.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {essentials.map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-0.5 bg-white/10 text-white text-[9px] font-bold uppercase"
                  >
                    {tag.tag_label}
                  </span>
                ))}
              </div>
            )}

            {/* XP & Report */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-black/80 border border-[#FFEB3B]">
                <Zap className="w-3 h-3 text-[#FFEB3B]" />
                <span className="text-[10px] font-bold text-[#FFEB3B]">{user.xp || 0}</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ReportButton itemType="user" itemId={user.email} variant="ghost" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}