/**
 * Scene Scout Component
 *
 * AI-powered nightlife recommendations.
 * Shows personalized venue/event suggestions with match scoring.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

const TYPE_STYLES = {
  event: {
    bg: 'bg-[#C8962C]/20',
    border: 'border-[#C8962C]',
    text: 'text-[#C8962C]',
    label: 'Event'
  },
  venue: {
    bg: 'bg-[#00C2E0]/20',
    border: 'border-[#00C2E0]',
    text: 'text-[#00C2E0]',
    label: 'Venue'
  }
};

export default function SceneScout({
  date,
  compact = false,
  maxPicks = 3,
  className = ''
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/ai/scene-scout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ date: selectedDate })
      });

      if (response.status === 403) {
        const resData = await response.json();
        if (resData.upgradeRequired) {
          setError('upgrade_required');
          return;
        }
      }

      if (!response.ok) throw new Error('Failed to get recommendations');

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Scene scout error:', err);
      if (err.message !== 'upgrade_required') {
        setError('failed');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user?.id, selectedDate]);

  const formatTime = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#39FF14';
    if (score >= 60) return '#FFEB3B';
    return '#C8962C';
  };

  if (loading) {
    return (
      <div className={`bg-black border border-white/10 p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Finding your perfect night...</span>
        </div>
      </div>
    );
  }

  if (error === 'upgrade_required') {
    return (
      <div className={`bg-black border border-white/10 p-6 ${className}`}>
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-[#C8962C] mx-auto mb-3" />
          <p className="text-sm text-white/70 mb-3">Scene Scout is available from HOTMESS tier</p>
          <Button size="sm" onClick={() => openSheet('membership')}>
            Upgrade from £7.99/mo
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-black border border-white/10 p-6 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-400 mb-3">Could not load recommendations</p>
          <Button size="sm" onClick={fetchRecommendations} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { picks, narrative, hotmessActivity } = data;
  const displayPicks = picks.slice(0, maxPicks);

  if (compact) {
    return (
      <div className={`bg-black border border-white/10 ${className}`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8962C]" />
              <span className="font-bold text-sm text-white">Tonight's Picks</span>
            </div>
            <button
              onClick={() => navigate('/events?view=scout')}
              className="text-xs text-[#C8962C] hover:underline"
            >
              See all →
            </button>
          </div>
        </div>
        <div className="divide-y divide-white/10">
          {displayPicks.map((pick) => (
            <div
              key={pick.id}
              className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer"
              onClick={() => navigate(`/${pick.type === 'event' ? 'events' : 'venues'}/${pick.id}`)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: `${getScoreColor(pick.score)}20`,
                    color: getScoreColor(pick.score)
                  }}
                >
                  {pick.score}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{pick.title}</p>
                  <p className="text-xs text-white/50">{pick.metadata?.area}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black border border-white/10 ${className}`}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#C8962C] to-[#C8962C] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Scene Scout</h3>
              <p className="text-xs text-white/60">AI-powered recommendations</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchRecommendations} className="text-white/60 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          {['today', 'tomorrow', 'weekend'].map((option) => {
            const optionDate = getDateFromOption(option);
            const isSelected = selectedDate === optionDate;
            return (
              <button
                key={option}
                onClick={() => setSelectedDate(optionDate)}
                className={`px-3 py-1 text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'bg-[#C8962C] border-[#C8962C] text-white'
                    : 'bg-transparent border-white/20 text-white/60 hover:border-white/40'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {narrative && (
        <div className="p-4 bg-white/5 border-b border-white/10">
          <p className="text-sm text-white/90 italic leading-relaxed">"{narrative}"</p>
        </div>
      )}

      <div className="p-4 space-y-3">
        {displayPicks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60 mb-2">Nothing matching your vibe tonight</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/events')}>
              Browse all events
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {displayPicks.map((pick, index) => {
              const style = TYPE_STYLES[pick.type];
              return (
                <motion.div
                  key={pick.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border ${style.border} ${style.bg} hover:bg-white/10 transition-colors cursor-pointer`}
                  onClick={() => navigate(`/${pick.type === 'event' ? 'events' : 'pulse'}/${pick.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase font-bold ${style.text}`}>{style.label}</span>
                          {pick.metadata?.type && (
                            <span className="text-[10px] text-white/40">• {pick.metadata.type}</span>
                          )}
                        </div>
                        <h4 className="font-bold text-white">{pick.title}</h4>
                      </div>
                      <div
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center ml-3"
                        style={{
                          backgroundColor: `${getScoreColor(pick.score)}15`,
                          border: `2px solid ${getScoreColor(pick.score)}`
                        }}
                      >
                        <span className="text-lg font-black leading-none" style={{ color: getScoreColor(pick.score) }}>
                          {pick.score}
                        </span>
                        <span className="text-[8px] text-white/50">match</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-white/60 mb-3">
                      {pick.metadata?.area && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pick.metadata.area}</span>
                      )}
                      {pick.start_time && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(pick.start_time)}</span>
                      )}
                    </div>
                    {pick.reasons?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pick.reasons.map((reason, i) => (
                          <span key={i} className="px-2 py-1 bg-white/10 text-[10px] text-white/80">{reason}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {hotmessActivity?.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#C8962C]" />
            <span className="text-xs font-bold text-white">HOTMESS Activity</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotmessActivity.map((activity, i) => (
              <span key={i} className="px-2 py-1 bg-[#C8962C]/20 text-[10px] text-[#C8962C]">
                {activity.count} @ {activity.location}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getDateFromOption(option) {
  const today = new Date();
  switch (option) {
    case 'today':
      return today.toISOString().split('T')[0];
    case 'tomorrow':
      today.setDate(today.getDate() + 1);
      return today.toISOString().split('T')[0];
    case 'weekend':
      const dayOfWeek = today.getDay();
      const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
      today.setDate(today.getDate() + daysUntilSaturday);
      return today.toISOString().split('T')[0];
    default:
      return today.toISOString().split('T')[0];
  }
}
