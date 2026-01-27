import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

const fetchRecommendations = async ({ lat, lng, limit = 20, offset = 0, minScore = 0 }) => {
  const session = await supabase?.auth.getSession();
  const token = session?.data?.session?.access_token;
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    min_score: String(minScore),
  });
  
  if (lat) params.set('lat', String(lat));
  if (lng) params.set('lng', String(lng));

  const res = await fetch(`/api/recommendations?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch recommendations');
  }

  return res.json();
};

export function useRecommendations({ lat, lng, limit = 20, enabled = true }) {
  return useQuery({
    queryKey: ['recommendations', lat, lng, limit],
    queryFn: () => fetchRecommendations({ lat, lng, limit }),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for recording user interactions
export function useRecordInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetEmail, interactionType, metadata = {} }) => {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/recommendations/interaction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_email: targetEmail,
          interaction_type: interactionType,
          metadata,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record interaction');
      }

      return res.json();
    },
    onSuccess: () => {
      // Optionally invalidate recommendations to reflect new data
      // queryClient.invalidateQueries(['recommendations']);
    },
  });
}

// Score explanation generator
export function getScoreExplanation(scores) {
  if (!scores) return null;

  const explanations = [];

  if (scores.distance >= 25) {
    explanations.push('Very close to you');
  } else if (scores.distance >= 20) {
    explanations.push('Nearby');
  } else if (scores.distance >= 15) {
    explanations.push('In your area');
  }

  if (scores.interest >= 20) {
    explanations.push('Many shared interests');
  } else if (scores.interest >= 15) {
    explanations.push('Some common interests');
  }

  if (scores.activity >= 12) {
    explanations.push('Recently active');
  }

  if (scores.compatibility >= 15) {
    explanations.push('High compatibility');
  }

  return explanations.length > 0 ? explanations.join(' • ') : 'Good match';
}

// Distance label generator
export function getDistanceLabel(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return null;
  
  if (distanceKm < 1) {
    return 'Less than 1 km';
  } else if (distanceKm < 5) {
    return `${distanceKm.toFixed(1)} km away`;
  } else if (distanceKm < 50) {
    return `${Math.round(distanceKm)} km away`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
}

export default useRecommendations;
