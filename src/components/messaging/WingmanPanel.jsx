/**
 * Wingman Panel
 * 
 * AI-powered conversation starters for messaging.
 * Shows common ground and generates personalized openers.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  MessageSquare,
  Music,
  Heart,
  Calendar,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const OPENER_TYPES = {
  personal: { label: 'Personal', icon: Heart, color: '#FF1493' },
  flirty: { label: 'Flirty', icon: Sparkles, color: '#B026FF' },
  question: { label: 'Question', icon: MessageSquare, color: '#00D9FF' }
};

export default function WingmanPanel({ 
  targetProfileId, 
  targetName,
  onSelectOpener,
  className = '' 
}) {
  const { user } = useAuth();
  const [openers, setOpeners] = useState([]);
  const [commonGround, setCommonGround] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Fetch openers
  const fetchOpeners = async () => {
    if (!user?.email || !targetProfileId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/wingman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewerEmail: user.email,
          targetProfileId
        })
      });

      if (!response.ok) throw new Error('Failed to generate openers');

      const data = await response.json();
      setOpeners(data.openers || []);
      setCommonGround(data.commonGround);
    } catch (err) {
      console.error('Wingman error:', err);
      setError('Failed to generate openers');
      // Set fallback openers
      setOpeners([
        { text: `Hey ${targetName || 'there'}! Your profile caught my eye.`, type: 'personal' },
        { text: 'Something tells me we might vibe. Am I wrong?', type: 'flirty' },
        { text: 'What brings you to HOTMESS?', type: 'question' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchOpeners();
  }, [targetProfileId, user?.email]);

  // Copy to clipboard
  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Use opener (insert into message input)
  const handleUse = (text) => {
    onSelectOpener?.(text);
  };

  return (
    <div className={`bg-black border border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B026FF]" />
          <span className="font-bold text-sm text-white">Wingman</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchOpeners}
          disabled={loading}
          className="h-7 px-2 text-white/60 hover:text-white"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Common Ground */}
      {commonGround && (
        <div className="px-3 py-2 border-b border-white/10 bg-white/5">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Common Ground</p>
          <div className="flex flex-wrap gap-1">
            {commonGround.interests?.map((interest, i) => (
              <span key={`int-${i}`} className="px-2 py-0.5 bg-[#FF1493]/20 text-[#FF1493] text-[10px] rounded-full">
                {interest}
              </span>
            ))}
            {commonGround.music?.map((genre, i) => (
              <span key={`music-${i}`} className="px-2 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] text-[10px] rounded-full flex items-center gap-1">
                <Music className="w-2 h-2" /> {genre}
              </span>
            ))}
            {commonGround.events?.map((event, i) => (
              <span key={`event-${i}`} className="px-2 py-0.5 bg-[#FFEB3B]/20 text-[#FFEB3B] text-[10px] rounded-full flex items-center gap-1">
                <Calendar className="w-2 h-2" /> {event}
              </span>
            ))}
            {!commonGround.interests?.length && !commonGround.music?.length && !commonGround.events?.length && (
              <span className="text-xs text-white/40">No shared interests found</span>
            )}
          </div>
        </div>
      )}

      {/* Openers */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-white/40">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating openers...</span>
          </div>
        ) : error && openers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <Button size="sm" onClick={fetchOpeners} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {openers.map((opener, index) => {
                const typeInfo = OPENER_TYPES[opener.type] || OPENER_TYPES.personal;
                const Icon = typeInfo.icon;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                    className="group border border-white/10 hover:border-white/30 transition-colors"
                  >
                    {/* Type label */}
                    <div className="flex items-center gap-2 px-3 py-1 border-b border-white/10 bg-white/5">
                      <Icon className="w-3 h-3" style={{ color: typeInfo.color }} />
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                    </div>
                    
                    {/* Opener text */}
                    <div className="p-3">
                      <p className="text-sm text-white">{opener.text}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 px-3 pb-3">
                      <Button
                        size="sm"
                        onClick={() => handleCopy(opener.text, index)}
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-[#39FF14]" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUse(opener.text)}
                        className="flex-1 h-7 text-xs bg-[#FF1493] hover:bg-[#FF1493]/80"
                      >
                        Use this
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer tip */}
      <div className="px-3 pb-3">
        <p className="text-[10px] text-white/40 text-center">
          Pro tip: Personalize before sending
        </p>
      </div>
    </div>
  );
}
