import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ProfileCompleteness({ user }) {
  const checks = [
    { id: 'basic', label: 'Name & Avatar', completed: !!(user.full_name && user.avatar_url) },
    { id: 'bio', label: 'Bio', completed: !!(user.bio && user.bio.length > 10) },
    { id: 'location', label: 'Location', completed: !!user.city },
    { id: 'interests', label: 'Interests', completed: !!(user.interests && user.interests.length > 0) },
    { id: 'vibes', label: 'Preferred Vibes', completed: !!(user.preferred_vibes && user.preferred_vibes.length > 0) },
    { id: 'music', label: 'Music Taste', completed: !!(user.music_taste && user.music_taste.length > 0) },
  ];

  const completedCount = checks.filter(c => c.completed).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const isComplete = percentage === 100;

  if (isComplete) {
    return null; // Don't show if profile is 100% complete
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#C8962C]/20 to-[#B026FF]/20 border-2 border-[#C8962C]/40 p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-black uppercase mb-1">Complete Your Profile</h3>
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/60">
              {percentage}% complete
            </p>
          </div>
        </div>
        <Link to={createPageUrl('EditProfile')}>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#C8962C] hover:bg-white text-white hover:text-black border-2 border-white font-black text-xs uppercase transition-colors">
            Edit Profile
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-white/10 mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-[#C8962C] to-[#B026FF]"
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
            {check.completed && (
              <Trophy className="w-3 h-3 text-[#39FF14]" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}