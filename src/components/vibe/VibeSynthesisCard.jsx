import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Sparkles, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function VibeSynthesisCard({ userEmail, compact = false }) {
  const [synthesizing, setSynthesizing] = useState(false);
  const queryClient = useQueryClient();

  const { data: vibe, isLoading } = useQuery({
    queryKey: ['user-vibe', userEmail],
    queryFn: async () => {
      const vibes = await base44.entities.UserVibe.filter({ user_email: userEmail });
      return vibes[0] || null;
    },
    enabled: !!userEmail
  });

  const synthesizeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('synthesizeVibe', {}),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['user-vibe']);
      toast.success('Vibe synthesized!');
      setSynthesizing(false);
    },
    onError: (error) => {
      toast.error('Failed to synthesize vibe');
      setSynthesizing(false);
    }
  });

  const handleSynthesize = () => {
    setSynthesizing(true);
    synthesizeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  if (!vibe) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#B026FF]/20 to-[#FF1493]/20 border-2 border-[#B026FF] rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-[#B026FF]" />
          <h3 className="text-xl font-black uppercase">DISCOVER YOUR VIBE</h3>
        </div>
        <p className="text-sm text-white/60 mb-4">
          Let the AI analyze your Sweat History and synthesize your dynamic character profile.
        </p>
        <Button
          onClick={handleSynthesize}
          disabled={synthesizing}
          className="w-full bg-[#B026FF] hover:bg-[#B026FF]/80 text-white font-black"
        >
          {synthesizing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              SYNTHESIZING...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              SYNTHESIZE VIBE
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  const archetypeIcons = {
    architect: '🏗️',
    hunter: '🎯',
    collector: '📦',
    explorer: '🧭',
    socialite: '✨',
    merchant: '💰',
    guardian: '🛡️',
    alchemist: '🧪'
  };

  if (compact) {
    return (
      <div 
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2"
        style={{ 
          borderColor: vibe.vibe_color,
          backgroundColor: `${vibe.vibe_color}20`
        }}
      >
        <span className="text-lg">{archetypeIcons[vibe.archetype] || '✨'}</span>
        <span 
          className="font-black text-sm uppercase tracking-wider"
          style={{ color: vibe.vibe_color }}
        >
          {vibe.vibe_title}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-black to-[#1a1a1a] border-2 rounded-xl p-6 relative overflow-hidden"
      style={{ borderColor: vibe.vibe_color }}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${vibe.vibe_color}, transparent 70%)`
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{archetypeIcons[vibe.archetype] || '✨'}</span>
            <div>
              <h2 
                className="text-2xl font-black uppercase tracking-wider mb-1"
                style={{ color: vibe.vibe_color }}
              >
                {vibe.vibe_title}
              </h2>
              <p className="text-xs text-white/60 uppercase">{vibe.archetype}</p>
            </div>
          </div>
          <Button
            onClick={handleSynthesize}
            disabled={synthesizing}
            size="sm"
            variant="ghost"
            className="text-white/60 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${synthesizing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <p className="text-sm text-white/80 mb-4">{vibe.vibe_description}</p>

        {vibe.traits && vibe.traits.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {vibe.traits.map((trait, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-bold uppercase border"
                style={{ 
                  borderColor: vibe.vibe_color,
                  color: vibe.vibe_color,
                  backgroundColor: `${vibe.vibe_color}15`
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {vibe.synthesis_count > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Zap className="w-3 h-3" />
            <span>Synthesized {vibe.synthesis_count} times</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}