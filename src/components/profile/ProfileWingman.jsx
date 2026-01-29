import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageCircle, Lightbulb, Heart, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Zap, MapPin, Music, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * ProfileWingman - AI-powered conversation starters and match insights
 * 
 * Based on the HOTMESS OS spec:
 * - "AI Wingman - Conversation starters, match insights, profile optimization"
 * - Generates contextual openers based on profile analysis
 * - Shows match insights explaining compatibility
 */

// Conversation starter templates based on profile attributes
const OPENER_TEMPLATES = {
  interests: [
    "I see you're into {interest} - what got you into that?",
    "Fellow {interest} fan! Have you {action} lately?",
    "Your profile says {interest} - have any recommendations?",
    "{interest} is underrated. What's your take on it?",
  ],
  music: [
    "I see you're into {genre} - caught any good sets lately?",
    "Your music taste is 🔥 - who are you listening to right now?",
    "Fellow {genre} head! What's your go-to track?",
    "Have you been to any good {genre} nights recently?",
  ],
  location: [
    "Fellow {city} local! What's your go-to spot around here?",
    "I see you're in {city} - how long have you been there?",
    "What's the vibe like in {city} these days?",
  ],
  travel: [
    "Your travel photos look amazing! Where was your last trip?",
    "I see you've been to {place} - I've always wanted to go there!",
    "Fellow traveler! What's on your bucket list?",
  ],
  bio: [
    "Your bio made me laugh - '{excerpt}' is so real",
    "I relate to '{excerpt}' in your bio so much",
    "Your vibe is exactly what I was looking for",
  ],
  generic: [
    "Hey! Your profile caught my eye - what are you up to today?",
    "Just had to say hi - love your energy",
    "Your vibe is immaculate. What's your story?",
    "Hey! What brings you to HOTMESS?",
  ],
};

// Generate conversation starters based on profile
const generateOpeners = (profile, currentUser) => {
  const openers = [];
  
  // Interest-based openers
  const interests = profile.interests || [];
  if (interests.length > 0) {
    const interest = interests[Math.floor(Math.random() * interests.length)];
    const template = OPENER_TEMPLATES.interests[Math.floor(Math.random() * OPENER_TEMPLATES.interests.length)];
    openers.push({
      text: template.replace('{interest}', interest).replace('{action}', 'tried something new'),
      reason: `Based on shared interest: ${interest}`,
      type: 'interest',
    });
  }
  
  // Music-based openers (from preferred_vibes or tags)
  const musicVibes = (profile.preferred_vibes || []).filter(v => 
    ['techno', 'house', 'disco', 'dnb', 'garage', 'ambient', 'pop', 'hiphop', 'rnb'].includes(v.toLowerCase())
  );
  if (musicVibes.length > 0) {
    const genre = musicVibes[0];
    const template = OPENER_TEMPLATES.music[Math.floor(Math.random() * OPENER_TEMPLATES.music.length)];
    openers.push({
      text: template.replace('{genre}', genre),
      reason: `They're into ${genre} music`,
      type: 'music',
    });
  }
  
  // Location-based openers
  if (profile.city) {
    const template = OPENER_TEMPLATES.location[Math.floor(Math.random() * OPENER_TEMPLATES.location.length)];
    openers.push({
      text: template.replace('{city}', profile.city),
      reason: `Both in ${profile.city}`,
      type: 'location',
    });
  }
  
  // Bio-based openers
  if (profile.bio && profile.bio.length > 20) {
    const excerpt = profile.bio.slice(0, 50).trim();
    const template = OPENER_TEMPLATES.bio[Math.floor(Math.random() * OPENER_TEMPLATES.bio.length)];
    openers.push({
      text: template.replace('{excerpt}', excerpt + (profile.bio.length > 50 ? '...' : '')),
      reason: 'Based on their bio',
      type: 'bio',
    });
  }
  
  // Always add some generic openers
  const genericTemplate = OPENER_TEMPLATES.generic[Math.floor(Math.random() * OPENER_TEMPLATES.generic.length)];
  openers.push({
    text: genericTemplate,
    reason: 'Classic opener',
    type: 'generic',
  });
  
  // Shuffle and return top 3-4
  return openers.sort(() => Math.random() - 0.5).slice(0, 4);
};

// Calculate and explain match insights
const calculateMatchInsights = (profile, currentUser) => {
  const insights = [];
  
  // Shared interests
  const myInterests = new Set(currentUser?.interests || []);
  const theirInterests = profile.interests || [];
  const sharedInterests = theirInterests.filter(i => myInterests.has(i));
  if (sharedInterests.length > 0) {
    insights.push({
      icon: Heart,
      text: `You both listed "${sharedInterests[0]}"${sharedInterests.length > 1 ? ` and ${sharedInterests.length - 1} more` : ''}`,
      color: '#FF1493',
    });
  }
  
  // Music/vibe compatibility
  const myVibes = new Set(currentUser?.preferred_vibes || []);
  const theirVibes = profile.preferred_vibes || [];
  const sharedVibes = theirVibes.filter(v => myVibes.has(v));
  if (sharedVibes.length > 0) {
    insights.push({
      icon: Music,
      text: `Similar music taste: ${sharedVibes.slice(0, 2).join(', ')}`,
      color: '#B026FF',
    });
  }
  
  // Same city
  if (profile.city && currentUser?.city && profile.city.toLowerCase() === currentUser.city.toLowerCase()) {
    insights.push({
      icon: MapPin,
      text: `Both in ${profile.city}`,
      color: '#00D9FF',
    });
  }
  
  // Activity level
  if (profile.activity_status === 'online' || profile.activity_status === 'looking_for_collabs') {
    insights.push({
      icon: Zap,
      text: 'Active at similar times',
      color: '#39FF14',
    });
  }
  
  // XP/Level proximity
  const myLevel = Math.floor((currentUser?.xp || 0) / 1000) + 1;
  const theirLevel = Math.floor((profile.xp || 0) / 1000) + 1;
  if (Math.abs(myLevel - theirLevel) <= 3) {
    insights.push({
      icon: Star,
      text: `Similar experience level (LVL ${theirLevel})`,
      color: '#FFD700',
    });
  }
  
  return insights.slice(0, 4);
};

export default function ProfileWingman({ 
  profile, 
  currentUser, 
  onSendMessage,
  matchScore,
  className 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Generate openers (refresh when key changes)
  const openers = useMemo(() => {
    return generateOpeners(profile, currentUser);
  }, [profile, currentUser, refreshKey]);
  
  // Calculate match insights
  const insights = useMemo(() => {
    return calculateMatchInsights(profile, currentUser);
  }, [profile, currentUser]);
  
  const handleCopy = (text, index) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  
  const handleUseOpener = (text) => {
    if (onSendMessage) {
      onSendMessage(text);
    } else {
      navigator.clipboard?.writeText(text);
      toast.success('Opener copied! Paste it in the message');
    }
  };
  
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    toast.success('New openers generated');
  };
  
  if (!profile) return null;
  
  return (
    <div className={cn("bg-black border-2 border-[#FF1493]/50", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#FFD700]" />
          <span className="font-black text-sm uppercase tracking-wider text-white">AI Wingman</span>
          {matchScore && (
            <span className="ml-2 px-2 py-0.5 bg-[#FF1493]/20 text-[#FF1493] text-xs font-bold rounded-full">
              {matchScore}% Match
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/60" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Match Insights */}
              {insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">
                      Why You Match
                    </span>
                  </div>
                  <div className="space-y-2">
                    {insights.map((insight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <insight.icon 
                          className="w-4 h-4 flex-shrink-0" 
                          style={{ color: insight.color }} 
                        />
                        <span className="text-white/80">{insight.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Conversation Starters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#00D9FF]" />
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">
                      Conversation Starters
                    </span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-2">
                  {openers.map((opener, idx) => (
                    <motion.div
                      key={`${refreshKey}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/5 border border-white/10 p-3 group"
                    >
                      <p className="text-sm text-white mb-2">"{opener.text}"</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase">
                          {opener.reason}
                        </span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(opener.text, idx)}
                            className="text-white/40 hover:text-white transition-colors"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-4 h-4 text-[#39FF14]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <Button
                            onClick={() => handleUseOpener(opener.text)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-[#00D9FF] hover:bg-[#00D9FF]/10"
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Quick tip */}
              <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 p-3 text-xs text-white/60">
                <span className="text-[#FFD700] font-bold">TIP:</span> Personalize these openers with specific details from their profile for better responses.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact version for profile cards
 */
export function ProfileWingmanCompact({ profile, currentUser, onSendMessage }) {
  const [showOpeners, setShowOpeners] = useState(false);
  
  const openers = useMemo(() => {
    return generateOpeners(profile, currentUser).slice(0, 2);
  }, [profile, currentUser]);
  
  return (
    <div className="relative">
      <Button
        onClick={() => setShowOpeners(!showOpeners)}
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-[#FFD700] hover:bg-[#FFD700]/10"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        Wingman
      </Button>
      
      <AnimatePresence>
        {showOpeners && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 w-72 bg-black border-2 border-[#FFD700]/50 p-3 z-50"
          >
            <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">
              Quick Openers
            </p>
            {openers.map((opener, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSendMessage?.(opener.text);
                  setShowOpeners(false);
                }}
                className="w-full text-left p-2 text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 mb-1 transition-colors"
              >
                "{opener.text}"
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
