import React from 'react';
import { MapPin, Heart, Calendar, Zap } from 'lucide-react';
import MediaGallery from './MediaGallery';
import MutualConnections from './MutualConnections';

export default function StandardProfileView({ user, currentUser, isHandshakeConnection }) {
  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      {user?.photos && user.photos.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Photos</h3>
          <MediaGallery 
            photos={user.photos} 
            videoIntroUrl={user.video_intro_url}
            premiumVideos={user.premium_videos}
            unlockXp={user.premium_unlock_xp}
            ownerId={user.id}
            viewerEmail={currentUser?.email}
          />
        </div>
      )}

      {/* Bio */}
      {user?.bio && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">About</h3>
          <p className="text-white/80 leading-relaxed">{user.bio}</p>
        </div>
      )}

      {/* Interests */}
      {user?.interests && user.interests.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#00D9FF]/20 border border-[#00D9FF]/40 text-[#00D9FF] text-xs font-bold uppercase">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Looking For */}
      {user?.looking_for && user.looking_for.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Looking For</h3>
          <div className="flex flex-wrap gap-2">
            {user.looking_for.map((item, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#FF1493]/20 border border-[#FF1493]/40 text-[#FF1493] text-xs font-bold uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Aftercare Menu - visible only to connections */}
      {isHandshakeConnection && user?.aftercare_menu && user.aftercare_menu.length > 0 && (
        <div className="bg-white/5 border border-[#39FF14]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#39FF14] mb-3">Aftercare Menu 🔒</h3>
          <div className="flex flex-wrap gap-2">
            {user.aftercare_menu.map((item, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#39FF14]/20 border border-[#39FF14]/40 text-[#39FF14] text-xs font-bold uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dealbreakers */}
      {user?.dealbreakers_text && user.dealbreakers_text.length > 0 && (
        <div className="bg-white/5 border border-red-500/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-red-400 mb-3">Dealbreakers</h3>
          <div className="flex flex-wrap gap-2">
            {user.dealbreakers_text.map((item, idx) => (
              <span key={idx} className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mutual Connections */}
      <MutualConnections targetUser={user} currentUser={currentUser} />
    </div>
  );
}