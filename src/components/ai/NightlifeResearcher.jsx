import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Clock, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/utils/logger';

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
      const userProfile = `
Location: ${currentUser.city || 'London'}
Interests: ${(currentUser.event_preferences || []).join(', ')}
Music Taste: ${(currentUser.music_taste || []).join(', ')}
Bio: ${currentUser.bio || 'No bio'}
`;

      const prompt = `You are a specialist nightlife and LGBT venue researcher. For the query "${query}", provide recommendations for LGBT-focused nightlife options.

User Profile:
${userProfile}

For each recommendation provide:
• Name of venue, event or party
• Location and address
• Typical opening hours or event schedule
• A brief description of the venue or event experience
• Why it matches the user's interests

Focus exclusively on LGBT venues and events. Prioritise accuracy by cross-checking sources. Use recent information.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            venues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  location: { type: 'string' },
                  address: { type: 'string' },
                  hours: { type: 'string' },
                  description: { type: 'string' },
                  match_reason: { type: 'string' }
                }
              }
            },
            summary: { type: 'string' }
          }
        }
      });

      setResults(response);
      if (onVenuesFound) {
        onVenuesFound(response.venues);
      }
      toast.success(`Found ${response.venues?.length || 0} venues`);
    } catch (error) {
      logger.error('Failed to search:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#FF1493]" />
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
          className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black"
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
              className="bg-black/40 border border-white/10 rounded-lg p-4 hover:border-[#FF1493] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-black text-lg">{venue.name}</h4>
                <MapPin className="w-4 h-4 text-[#FF1493] flex-shrink-0" />
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

              <div className="text-xs text-[#00D9FF] bg-[#00D9FF]/10 rounded px-2 py-1 inline-block">
                ✨ {venue.match_reason}
              </div>
            </motion.div>
          ))}

          {results.summary && (
            <div className="bg-[#FF1493]/10 border border-[#FF1493]/20 rounded-lg p-4 text-sm">
              <p className="text-white/80">{results.summary}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}