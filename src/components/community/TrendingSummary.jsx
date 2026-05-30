import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function TrendingSummary({ posts }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const generateSummary = async () => {
    if (!posts || posts.length === 0) return;
    setLoading(true);
    try {
      /* LLM trending summary disabled — skip */
      setSummary(null);
    } catch (error) {
      console.error('Failed to generate summary:', error);
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
      className="bg-gradient-to-br from-[#C8962C]/20 to-[#C8962C]/20 border border-[#C8962C]/40 rounded-xl p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-[#C8962C]" />
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
            className="text-xs text-[#C8962C] hover:text-[#C8962C]/90"
          >
            <Sparkles className="w-3 h-3 mr-2" />
            Refresh Summary
          </Button>
        </>
      )}
    </motion.div>
  );
}