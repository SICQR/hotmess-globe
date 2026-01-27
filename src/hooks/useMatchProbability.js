/**
 * Hook for fetching match probability for a single user
 * 
 * Used by the Profile page to display compatibility scores.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Fetch match probability for a specific user
 * @param {Object} options
 * @param {string} options.targetId - Target user's ID (UUID)
 * @param {string} options.targetEmail - Target user's email (alternative to targetId)
 * @param {number} options.viewerLat - Viewer's latitude
 * @param {number} options.viewerLng - Viewer's longitude
 * @param {boolean} options.enabled - Whether to enable the query
 */
export function useMatchProbability({ targetId, targetEmail, viewerLat, viewerLng, enabled = true }) {
  return useQuery({
    queryKey: ['match-probability', targetId || targetEmail, viewerLat, viewerLng],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams();
      if (targetId) params.set('target_id', targetId);
      if (targetEmail) params.set('target_email', targetEmail);
      if (viewerLat !== undefined && Number.isFinite(viewerLat)) params.set('lat', String(viewerLat));
      if (viewerLng !== undefined && Number.isFinite(viewerLng)) params.set('lng', String(viewerLng));

      const response = await fetch(`/api/match-probability/single?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch match probability (${response.status})`);
      }

      return response.json();
    },
    enabled: enabled && !!(targetId || targetEmail),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get a human-readable label for match probability
 */
export function getMatchProbabilityLabel(probability) {
  if (!Number.isFinite(probability)) return '';
  if (probability >= 90) return 'Excellent match';
  if (probability >= 75) return 'Great match';
  if (probability >= 60) return 'Good match';
  if (probability >= 40) return 'Moderate match';
  return 'Low match';
}

/**
 * Get color class for match probability
 */
export function getMatchProbabilityColor(probability) {
  if (!Number.isFinite(probability)) return 'text-white/60';
  if (probability >= 80) return 'text-emerald-400';
  if (probability >= 60) return 'text-cyan-400';
  if (probability >= 40) return 'text-yellow-400';
  return 'text-white/60';
}

/**
 * Get background gradient class for match probability
 */
export function getMatchProbabilityGradient(probability) {
  if (!Number.isFinite(probability)) return 'from-white/10 to-white/5';
  if (probability >= 80) return 'from-emerald-500/20 to-green-400/10';
  if (probability >= 60) return 'from-cyan-500/20 to-blue-400/10';
  if (probability >= 40) return 'from-yellow-500/20 to-orange-400/10';
  return 'from-white/10 to-white/5';
}
