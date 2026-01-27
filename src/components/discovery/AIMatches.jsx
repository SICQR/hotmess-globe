import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, Brain, ChevronRight, RefreshCw, Zap, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { supabase } from '@/components/utils/supabaseClient';
import { cn } from '@/lib/utils';

// Fetch AI-powered recommendations
async function fetchAIMatches({ lat, lng, limit = 6 }) {
  const session = await supabase?.auth.getSession();
  const token = session?.data?.session?.access_token;
  
  if (!token) return { recommendations: [], ml_enabled: false };

  const params = new URLSearchParams({
    limit: String(limit),
    use_ml: 'true',
  });
  
  if (lat) params.set('lat', String(lat));
  if (lng) params.set('lng', String(lng));

  const res = await fetch(`/api/recommendations?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) return { recommendations: [], ml_enabled: false };
  return res.json();
}

// Trigger preference learning
async function learnPreferences() {
  const session = await supabase?.auth.getSession();
  const token = session?.data?.session?.access_token;
  
  if (!token) return null;

  const res = await fetch('/api/recommendations/learn', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) return null;
  return res.json();
}

function MatchCard({ match, index }) {
  const primaryPhoto = match.photos?.[0]?.url || match.avatar_url;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(match.full_name || 'User')}&size=200&background=111111&color=ffffff`;

  return (
    <Link
      to={createPageUrl(`Profile?email=${match.email}`)}
      className="group relative block overflow-hidden rounded-xl border-2 border-white/10 hover:border-[#39FF14] transition-all"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 overflow-hidden">
        <img
          src={primaryPhoto || fallbackUrl}
          alt={match.full_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      {/* Match Score */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-[#39FF14] to-[#00D9FF] text-black rounded-full flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        <span className="text-[10px] font-black">{match.match_percentage || match.scores?.overall}%</span>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h4 className="font-bold text-white truncate">{match.full_name}</h4>
        {match.city && (
          <div className="flex items-center gap-1 text-[10px] text-white/60 mt-0.5">
            <MapPin className="w-2.5 h-2.5" />
            <span className="truncate">
              {match.city}
              {match.scores?.distanceKm && ` • ${match.scores.distanceKm.toFixed(1)}km`}
            </span>
          </div>
        )}
        
        {/* Score breakdown mini */}
        {match.scores && (
          <div className="flex gap-2 mt-2">
            {match.scores.distance >= 20 && (
              <span className="px-1.5 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[8px] font-bold uppercase rounded">
                Nearby
              </span>
            )}
            {match.scores.interest >= 15 && (
              <span className="px-1.5 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] text-[8px] font-bold uppercase rounded">
                Common Interests
              </span>
            )}
            {match.scores.ml >= 10 && (
              <span className="px-1.5 py-0.5 bg-[#B026FF]/20 text-[#B026FF] text-[8px] font-bold uppercase rounded">
                AI Pick
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function AIMatches({ currentUser, viewerLocation }) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-matches', viewerLocation?.lat, viewerLocation?.lng],
    queryFn: () => fetchAIMatches({
      lat: viewerLocation?.lat,
      lng: viewerLocation?.lng,
    }),
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const learnMutation = useMutation({
    mutationFn: learnPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-matches']);
    },
  });

  // Periodically trigger learning (every 5 minutes if component is mounted)
  useEffect(() => {
    const interval = setInterval(() => {
      learnMutation.mutate();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const recommendations = data?.recommendations || [];
  const mlEnabled = data?.ml_enabled;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-[#39FF14]/5 to-[#00D9FF]/5 border border-[#39FF14]/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#39FF14] to-[#00D9FF] rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-black animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold">AI Matches</h3>
            <p className="text-xs text-white/40">Analyzing your preferences...</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[3/4] bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[#39FF14]/5 to-[#00D9FF]/5 border border-[#39FF14]/20 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#39FF14] to-[#00D9FF] rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-bold flex items-center gap-2">
              AI Matches
              {mlEnabled && (
                <span className="px-2 py-0.5 bg-[#B026FF]/20 text-[#B026FF] text-[10px] font-bold uppercase rounded-full">
                  Personalized
                </span>
              )}
            </h3>
            <p className="text-xs text-white/40">
              {mlEnabled 
                ? 'Based on your activity and preferences' 
                : 'Top matches near you'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-white/60 hover:text-white"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {recommendations.slice(0, 6).map((match, idx) => (
          <MatchCard key={match.email} match={match} index={idx} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-[#39FF14]" />
          <span>{data?.total || 0} compatible profiles found</span>
        </div>
        <Link
          to={createPageUrl('ProfilesGrid')}
          className="flex items-center gap-1 text-[#39FF14] hover:text-[#39FF14]/80 transition-colors"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// Compact version for sidebar/widgets
export function AIMatchesCompact({ currentUser, viewerLocation }) {
  const { data } = useQuery({
    queryKey: ['ai-matches-compact', viewerLocation?.lat, viewerLocation?.lng],
    queryFn: () => fetchAIMatches({
      lat: viewerLocation?.lat,
      lng: viewerLocation?.lng,
      limit: 3,
    }),
    enabled: !!currentUser?.email,
    staleTime: 10 * 60 * 1000,
  });

  const recommendations = data?.recommendations || [];

  if (recommendations.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#39FF14]" />
        <span className="text-sm font-bold">Top Matches</span>
      </div>
      <div className="space-y-2">
        {recommendations.map(match => (
          <Link
            key={match.email}
            to={createPageUrl(`Profile?email=${match.email}`)}
            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <img
              src={match.photos?.[0]?.url || match.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.full_name || 'U')}&size=40&background=111111&color=ffffff`}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{match.full_name}</div>
              <div className="text-[10px] text-white/40 truncate">{match.city}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#39FF14]">
              <Heart className="w-3 h-3" />
              {match.match_percentage || match.scores?.overall}%
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
