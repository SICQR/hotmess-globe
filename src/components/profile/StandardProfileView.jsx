import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Heart, Music, Sparkles, Shield, AlertTriangle, Users, Palette, Zap } from 'lucide-react';
import MutualConnections from './MutualConnections';
import { taxonomyConfig } from '../discovery/taxonomyConfig';
import PhotoGallery from './shared/PhotoGallery';

const buildTagLabelMap = () => {
  const map = new Map();
  (taxonomyConfig?.tags || []).forEach((t) => {
    if (t?.id) map.set(String(t.id), t);
  });
  return map;
};

const TAG_BY_ID = buildTagLabelMap();

/**
 * Animated section card with glassmorphism
 */
const ProfileSection = ({ 
  children, 
  title, 
  icon: Icon, 
  delay = 0, 
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: 'glass-card',
    hot: 'glass-card-hot',
    cyan: 'glass-card-cyan',
    purple: 'glass-card-purple',
    lime: 'bg-white/5 border border-[#39FF14]/20',
    danger: 'bg-white/5 border border-red-500/20',
  };

  const titleColors = {
    default: 'text-white/40',
    hot: 'text-[#E62020]',
    cyan: 'text-[#00D9FF]',
    purple: 'text-[#B026FF]',
    lime: 'text-[#39FF14]',
    danger: 'text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`rounded-xl p-6 ${variants[variant]} ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon className={`w-4 h-4 ${titleColors[variant]}`} />}
          <h3 className={`text-sm uppercase tracking-wider font-bold ${titleColors[variant]}`}>
            {title}
          </h3>
        </div>
      )}
      {children}
    </motion.div>
  );
};

/**
 * Animated tag chip with hover effects
 */
const TagChip = ({ label, variant = 'cyan', delay = 0, isSensitive = false }) => {
  const variants = {
    cyan: 'bg-[#00D9FF]/15 border-[#00D9FF]/35 text-[#00D9FF] hover:bg-[#00D9FF]/25 hover:border-[#00D9FF]/50',
    hot: 'bg-[#E62020]/15 border-[#E62020]/40 text-[#E62020] hover:bg-[#E62020]/25 hover:border-[#E62020]/50',
    purple: 'bg-[#B026FF]/15 border-[#B026FF]/35 text-[#D7B8FF] hover:bg-[#B026FF]/25 hover:border-[#B026FF]/50',
    lime: 'bg-[#39FF14]/20 border-[#39FF14]/40 text-[#39FF14] hover:bg-[#39FF14]/30 hover:border-[#39FF14]/50',
    neutral: 'bg-white/10 border-white/15 text-white/80 hover:bg-white/15 hover:border-white/25',
    danger: 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-500/50',
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        inline-flex items-center gap-1 px-3 py-1.5 
        border rounded-lg text-xs font-bold uppercase tracking-wide
        transition-all duration-200 cursor-default
        ${variants[variant]}
        ${isSensitive ? 'ring-1 ring-[#E62020]/30' : ''}
      `}
    >
      {isSensitive && <Shield className="w-3 h-3" />}
      {label}
    </motion.span>
  );
};

export default function StandardProfileView({ user, currentUser, isHandshakeConnection, isOwnProfile }) {
  const tagIds = Array.isArray(user?.tag_ids)
    ? user.tag_ids
    : Array.isArray(user?.tags)
      ? user.tags
      : [];

  const normalizedTagIds = tagIds
    .map((t) => String(t || '').trim())
    .filter(Boolean);

  const tagged = normalizedTagIds
    .map((id) => {
      const tag = TAG_BY_ID.get(id);
      return {
        id,
        label: tag?.label || id,
        isSensitive: !!tag?.isSensitive,
      };
    });

  const canSeeSensitiveTags = !!isOwnProfile || !!isHandshakeConnection;
  const safeTags = tagged.filter((t) => !t.isSensitive);
  const sensitiveTags = tagged.filter((t) => t.isSensitive);
  const visibleSensitive = canSeeSensitiveTags ? sensitiveTags : [];
  const hiddenSensitiveCount = canSeeSensitiveTags ? 0 : sensitiveTags.length;

  const preferredVibes = Array.isArray(user?.preferred_vibes) ? user.preferred_vibes : [];
  const skills = Array.isArray(user?.skills) ? user.skills : [];
  const musicTaste = Array.isArray(user?.music_taste) ? user.music_taste : [];

  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PhotoGallery user={user} />
      </motion.div>

      {/* Tags */}
      <AnimatePresence>
        {(safeTags.length > 0 || visibleSensitive.length > 0) && (
          <ProfileSection title="Tags" icon={Hash} delay={0.1} variant="cyan">
            {hiddenSensitiveCount > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-white/40 uppercase mb-3 flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                {hiddenSensitiveCount} sensitive tag{hiddenSensitiveCount > 1 ? 's' : ''} hidden
              </motion.p>
            )}
            <div className="flex flex-wrap gap-2">
              {safeTags.map((tag, idx) => (
                <TagChip 
                  key={tag.id} 
                  label={tag.label} 
                  variant="cyan" 
                  delay={0.05 * idx}
                />
              ))}
              {visibleSensitive.map((tag, idx) => (
                <TagChip 
                  key={tag.id} 
                  label={tag.label} 
                  variant="hot" 
                  delay={0.05 * (safeTags.length + idx)}
                  isSensitive
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Bio */}
      <AnimatePresence>
        {user?.bio && (
          <ProfileSection title="About" icon={Sparkles} delay={0.15}>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/80 leading-relaxed text-base"
            >
              {user.bio}
            </motion.p>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Vibes */}
      <AnimatePresence>
        {preferredVibes.length > 0 && (
          <ProfileSection title="Vibes" icon={Zap} delay={0.2}>
            <div className="flex flex-wrap gap-2">
              {preferredVibes.slice(0, 8).map((vibe, idx) => (
                <TagChip 
                  key={idx} 
                  label={String(vibe).replaceAll('_', ' ')} 
                  variant="neutral" 
                  delay={0.05 * idx}
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Skills */}
      <AnimatePresence>
        {skills.length > 0 && (
          <ProfileSection title="Skills" icon={Palette} delay={0.25} variant="purple">
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 10).map((skill, idx) => (
                <TagChip 
                  key={idx} 
                  label={String(skill)} 
                  variant="purple" 
                  delay={0.05 * idx}
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Music Taste */}
      <AnimatePresence>
        {musicTaste.length > 0 && (
          <ProfileSection title="Music Taste" icon={Music} delay={0.3}>
            <div className="flex flex-wrap gap-2">
              {musicTaste.slice(0, 10).map((genre, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="text-white/70 text-sm"
                >
                  {genre}
                  {idx < musicTaste.slice(0, 10).length - 1 && (
                    <span className="text-[#00D9FF] mx-2">•</span>
                  )}
                </motion.span>
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Interests */}
      <AnimatePresence>
        {user?.interests && user.interests.length > 0 && (
          <ProfileSection title="Interests" icon={Heart} delay={0.35} variant="cyan">
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest, idx) => (
                <TagChip 
                  key={idx} 
                  label={interest} 
                  variant="cyan" 
                  delay={0.05 * idx}
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Looking For */}
      <AnimatePresence>
        {user?.looking_for && user.looking_for.length > 0 && (
          <ProfileSection title="Looking For" icon={Heart} delay={0.4} variant="hot">
            <div className="flex flex-wrap gap-2">
              {user.looking_for.map((item, idx) => (
                <TagChip 
                  key={idx} 
                  label={item} 
                  variant="hot" 
                  delay={0.05 * idx}
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Aftercare Menu - visible only to connections */}
      <AnimatePresence>
        {isHandshakeConnection && user?.aftercare_menu && user.aftercare_menu.length > 0 && (
          <ProfileSection title="Aftercare Menu 🔒" icon={Shield} delay={0.45} variant="lime">
            <div className="flex flex-wrap gap-2">
              {user.aftercare_menu.map((item, idx) => (
                <TagChip 
                  key={idx} 
                  label={item} 
                  variant="lime" 
                  delay={0.05 * idx}
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Dealbreakers */}
      <AnimatePresence>
        {user?.dealbreakers_text && user.dealbreakers_text.length > 0 && (
          <ProfileSection title="Dealbreakers" icon={AlertTriangle} delay={0.5} variant="danger">
            <div className="flex flex-wrap gap-2">
              {user.dealbreakers_text.map((item, idx) => (
                <TagChip 
                  key={idx} 
                  label={item} 
                  variant="danger" 
                  delay={0.05 * idx}
                />
              ))}
            </div>
          </ProfileSection>
        )}
      </AnimatePresence>

      {/* Mutual Connections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <MutualConnections targetUser={user} currentUser={currentUser} />
      </motion.div>
    </div>
  );
}