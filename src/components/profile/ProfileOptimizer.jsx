/**
 * Profile Optimizer Component
 * 
 * Shows profile completeness and optimization suggestions.
 * Follows progressive disclosure - shows summary first, details on expand.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Camera,
  FileText,
  Heart,
  Music,
  Target,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

// Action icons mapping
const ACTION_ICONS = {
  upload_photo: Camera,
  edit_bio: FileText,
  edit_interests: Heart,
  edit_tribes: Heart,
  edit_looking_for: Target,
  edit_music: Music,
  edit_stats: FileText,
  edit_position: Target
};

// Impact colors following 60-30-10 rule
const IMPACT_STYLES = {
  high: {
    bg: 'bg-[#C8962C]/20',
    border: 'border-[#C8962C]',
    text: 'text-[#C8962C]',
    icon: AlertCircle
  },
  medium: {
    bg: 'bg-[#C8962C]/20',
    border: 'border-[#C8962C]',
    text: 'text-[#C8962C]',
    icon: AlertCircle
  },
  low: {
    bg: 'bg-white/10',
    border: 'border-white/30',
    text: 'text-white/60',
    icon: AlertCircle
  }
};

export default function ProfileOptimizer({ 
  compact = false,
  showOnlyIfIssues = false,
  className = '' 
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  // Fetch profile analysis
  useEffect(() => {
    async function fetchAnalysis() {
      if (!user?.email) return;

      setLoading(true);
      try {
        const response = await fetch('/api/ai/profile-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: user.email })
        });

        if (!response.ok) throw new Error('Failed to analyze profile');

        const data = await response.json();
        setAnalysis(data);
      } catch (err) {
        console.error('Profile analysis error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [user?.email]);

  // Handle action click
  const handleAction = (action) => {
    const routes = {
      upload_photo: '/profile/edit#photos',
      edit_bio: '/profile/edit#bio',
      edit_interests: '/profile/edit#interests',
      edit_tribes: '/profile/edit#tribes',
      edit_looking_for: '/profile/edit#looking-for',
      edit_music: '/profile/edit#music',
      edit_stats: '/profile/edit#stats',
      edit_position: '/profile/edit#position'
    };

    navigate(routes[action] || '/profile/edit');
  };

  // Don't render if no issues and showOnlyIfIssues is true
  if (showOnlyIfIssues && analysis && analysis.issues.length === 0) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className={`bg-black border border-white/10 p-4 ${className}`}>
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Analyzing profile...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return null; // Fail silently in production
  }

  // No analysis
  if (!analysis) return null;

  const { completeness, strengthLevel, issues, aiSummary, highPriorityCount } = analysis;

  // Compact view - just the progress bar and summary
  if (compact) {
    return (
      <div className={`bg-black border border-white/10 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C8962C]" />
            <span className="font-bold text-sm text-white">Profile Strength</span>
          </div>
          <span className="text-sm font-bold text-[#C8962C]">{completeness}%</span>
        </div>
        <Progress value={completeness} className="h-2" />
        {highPriorityCount > 0 && (
          <button 
            onClick={() => navigate('/profile/optimize')}
            className="mt-3 text-xs text-[#C8962C] hover:underline"
          >
            {highPriorityCount} quick win{highPriorityCount > 1 ? 's' : ''} available →
          </button>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className={`bg-black border border-white/10 ${className}`}>
      {/* Header - Always visible */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C8962C]/20 flex items-center justify-center border border-[#C8962C]">
              <Sparkles className="w-5 h-5 text-[#C8962C]" />
            </div>
            <div>
              <h3 className="font-bold text-white">Profile Optimizer</h3>
              <p className="text-xs text-white/60">
                {strengthLevel === 'excellent' && 'Looking great!'}
                {strengthLevel === 'good' && 'Almost there'}
                {strengthLevel === 'needs_work' && 'Room to improve'}
                {strengthLevel === 'incomplete' && 'Let\'s get started'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#C8962C]">{completeness}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <Progress 
          value={completeness} 
          className="h-3 mb-3"
        />

        {/* AI Summary */}
        {aiSummary && (
          <p className="text-sm text-white/80 italic">
            "{aiSummary}"
          </p>
        )}
      </div>

      {/* Issues list - Expandable */}
      {issues.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="text-sm text-white/60">
              {issues.length} suggestion{issues.length > 1 ? 's' : ''}
              {highPriorityCount > 0 && ` (${highPriorityCount} high priority)`}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {issues.map((issue, index) => {
                    const style = IMPACT_STYLES[issue.impact];
                    const ActionIcon = ACTION_ICONS[issue.action] || FileText;
                    
                    return (
                      <motion.div
                        key={issue.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
                          p-3 border ${style.border} ${style.bg}
                          flex items-center justify-between group
                          hover:bg-white/10 transition-colors cursor-pointer
                        `}
                        onClick={() => handleAction(issue.action)}
                      >
                        <div className="flex items-center gap-3">
                          <ActionIcon className={`w-4 h-4 ${style.text}`} />
                          <div>
                            <p className="text-sm font-medium text-white">{issue.message}</p>
                            <p className="text-xs text-white/50">{issue.detail}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* All good state */}
      {issues.length === 0 && (
        <div className="p-4 text-center">
          <div className="w-12 h-12 bg-[#39FF14]/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-[#39FF14]">
            <Check className="w-6 h-6 text-[#39FF14]" />
          </div>
          <p className="text-sm text-white/80">Your profile is fully optimized!</p>
        </div>
      )}
    </div>
  );
}
