import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Clock, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
export default function NightlifeResearcher({ currentUser, onVenuesFound }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Enter a search query');
      return;
    }
    setLoading(true);
    try {
      /* LLM venue search disabled */
      const response = { venues: [], summary: '' };
      setResults(response);
      if (onVenuesFound) {
        onVenuesFound([]);
      }
      toast.info('AI venue search is not yet available');
    } catch (error) {
      console.error('Failed to search:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#C8962C]" />
        <h3 className="text-lg font-black uppercase">AI Venue Finder</h3>
      </div>
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="e.g. techno clubs in Shoreditch, drag shows tonight..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="bg-white/5 border-white/20 text-white"
        />
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {results.venues?.map((venue, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-black/40 border border-white/10 rounded-lg p-4 hover:border-[#C8962C] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-black text-lg">{venue.name}</h4>
                <MapPin className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
              </div>
              <p className="text-sm text-white/80 mb-2">{venue.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-white/60 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{venue.location}</span>
                </div>
                {venue.hours && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{venue.hours}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-[#00C2E0] bg-[#00C2E0]/10 rounded px-2 py-1 inline-block">
                ✨ {venue.match_reason}
              </div>
            </motion.div>
          ))}
          {results.summary && (
            <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-lg p-4 text-sm">
              <p className="text-white/80">{results.summary}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}