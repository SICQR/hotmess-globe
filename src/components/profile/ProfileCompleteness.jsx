import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Zap, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ProfileCompleteness({ user }) {
  const checks = [
    { id: 'basic', label: 'Name & Avatar', completed: !!(user.full_name && user.avatar_url), xp: 100 },
    { id: 'bio', label: 'Bio', completed: !!(user.bio && user.bio.length > 10), xp: 75 },
    { id: 'location', label: 'Location', completed: !!user.city, xp: 50 },
    { id: 'interests', label: 'Interests', completed: !!(user.interests && user.interests.length > 0), xp: 100 },
    { id: 'vibes', label: 'Preferred Vibes', completed: !!(user.preferred_vibes && user.preferred_vibes.length > 0), xp: 75 },
    { id: 'music', label: 'Music Taste', completed: !!(user.music_taste && user.music_taste.length > 0), xp: 50 },
  ];

  const completedCount = checks.filter(c => c.completed).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const totalXP = checks.reduce((sum, c) => sum + c.xp, 0);
  const earnedXP = checks.filter(c => c.completed).reduce((sum, c) => sum + c.xp, 0);
  const isComplete = percentage === 100;

  if (isComplete) {
    return null; // Don't show if profile is 100% complete
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border-2 border-[#FF1493]/40 p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-black uppercase mb-1">Complete Your Profile</h3>
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/60">
              {percentage}% complete
            </p>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#FFEB3B]/20 border border-[#FFEB3B] rounded">
              <Zap className="w-3 h-3 text-[#FFEB3B]" />
              <span className="text-xs font-bold text-[#FFEB3B]">{earnedXP}/{totalXP} XP</span>
            </div>
          </div>
        </div>
        <Link to={createPageUrl('EditProfile')}>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#FF1493] hover:bg-white text-white hover:text-black border-2 border-white font-black text-xs uppercase transition-colors">
            Edit Profile
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-white/10 mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-[#FF1493] to-[#B026FF]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {checks.map(check => (
          <div key={check.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {check.completed ? (
                <CheckCircle2 className="w-4 h-4 text-[#39FF14]" />
              ) : (
                <Circle className="w-4 h-4 text-white/20" />
              )}
              <span className={`text-xs ${check.completed ? 'text-white/80' : 'text-white/40'}`}>
                {check.label}
              </span>
            </div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono ${
              check.completed
                ? 'text-[#39FF14]'
                : 'text-white/40'
            }`}>
              {check.completed ? <Trophy className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
              {check.xp}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}