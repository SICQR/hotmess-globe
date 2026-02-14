import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logger from '@/utils/logger';

export default function TrendingSummary({ posts }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    if (!posts || posts.length === 0) return;

    setLoading(true);
    try {
      const topPosts = posts
        .sort((a, b) => {
          const scoreA = (a.likes_count || 0) * 2 + (a.comments_count || 0) * 3;
          const scoreB = (b.likes_count || 0) * 2 + (b.comments_count || 0) * 3;
          return scoreB - scoreA;
        })
        .slice(0, 10);

      const prompt = `Analyze these trending community posts from HOTMESS LONDON and create a brief, engaging summary of what's happening:

${topPosts.map((p, i) => `${i + 1}. ${p.content} (${p.likes_count || 0} likes, ${p.comments_count || 0} comments) [${p.category}]`).join('\n')}

Create a 2-3 sentence summary highlighting:
- Main themes/topics people are discussing
- Most popular categories
- Overall community vibe/sentiment

Use a fun, energetic tone that matches HOTMESS LONDON's nightlife culture.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      setSummary(response);
    } catch (error) {
      logger.error('Failed to generate summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (posts && posts.length >= 5) {
      generateSummary();
    }
  }, [posts?.length]);

  if (!summary && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/40 rounded-xl p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-[#FF1493]" />
        <h3 className="font-black uppercase tracking-wider">What's Trending</h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Analyzing community activity...</span>
        </div>
      ) : (
        <>
          <p className="text-white/80 leading-relaxed mb-3">{summary}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            className="text-xs text-[#FF1493] hover:text-[#FF1493]/90"
          >
            <Sparkles className="w-3 h-3 mr-2" />
            Refresh Summary
          </Button>
        </>
      )}
    </motion.div>
  );
}