import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/components/utils/supabaseClient';
import { format } from 'date-fns';

export default function NightlifeResearcher({ currentUser, onVenuesFound }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleScout = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Sign in to use Scene Scout'); return; }

      const response = await fetch('/api/ai/scene-scout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] }),
      });

      if (response.status === 403) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Upgrade for Scene Scout access');
        return;
      }
      if (response.status === 429) {
        toast.error('Monthly limit reached — upgrade for more picks');
        return;
      }
      if (!response.ok) throw new Error('Scout failed');

      const payload = await response.json();
      setResults(payload);
      if (onVenuesFound && payload.picks) {
        onVenuesFound(payload.picks.filter(p => p.type === 'venue'));
      }
    } catch (error) {
      console.error('Scene scout error:', error);
      toast.error('Could not fetch picks right now');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#C8962C]" />
          <h3 className="text-lg font-black uppercase">Scene Scout</h3>
        </div>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">AI · Tonight</span>
      </div>

      {!results ? (
        <div className="text-center py-2">
          <p className="text-white/50 text-sm mb-5">
            Personalised picks for tonight based on your vibe.
          </p>
          <Button
            onClick={handleScout}
            disabled={loading || !currentUser}
            className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scouting…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Get Tonight's Picks</>
            )}
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {results.narrative && (
            <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-lg p-4 text-sm text-white/80 mb-2">
              <p>{results.narrative}</p>
            </div>
          )}

          {(results.picks || []).map((pick, idx) => (
            <motion.div
              key={pick.id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-black/40 border border-white/10 rounded-lg p-4 hover:border-[#C8962C]/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-bold text-sm text-white">{pick.title}</h4>
                <span className="text-xs text-[#C8962C] ml-2 flex-shrink-0 font-mono">{pick.score}%</span>
              </div>
              {pick.description && (
                <p className="text-xs text-white/60 mb-2">{pick.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-white/40 mb-2">
                {pick.metadata?.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{pick.metadata.area}
                  </span>
                )}
                {pick.start_time && (
                  <span className="text-[#C8962C]/70">
                    {format(new Date(pick.start_time), 'h:mm a')}
                  </span>
                )}
                <span className="uppercase opacity-60">{pick.type}</span>
              </div>
              {pick.reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pick.reasons.map((r, i) => (
                    <span key={i} className="text-[10px] text-[#00C2E0] bg-[#00C2E0]/10 rounded px-2 py-0.5">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          {(results.picks || []).length === 0 && (
            <p className="text-white/40 text-sm text-center py-4">
              Nothing matching your vibe tonight. Check back later or add more to your profile.
            </p>
          )}

          <button
            onClick={() => setResults(null)}
            className="text-xs text-white/30 hover:text-white/50 transition-colors pt-1 block"
          >
            ← New scout
          </button>
        </motion.div>
      )}
    </div>
  );
}
