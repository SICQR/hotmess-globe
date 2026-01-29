/**
 * Utility to trigger embedding generation after profile updates
 */

import { supabase } from '@/components/utils/supabaseClient';

const getAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Generate embeddings for the current user's profile
 * Should be called after saving profile text fields (bio, turn_ons, turn_offs)
 * 
 * @returns Promise with result or null if failed silently
 */
export async function generateProfileEmbeddings(): Promise<{
  generated: boolean;
  fields?: { bio: boolean; turn_ons: boolean; turn_offs: boolean; combined: boolean };
} | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.warn('No auth token available for embeddings generation');
      return null;
    }

    const response = await fetch('/api/match-probability/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Silent fail - embeddings are not critical
      console.warn('Embeddings generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Silent fail - don't block profile save
    console.warn('Embeddings generation error:', error);
    return null;
  }
}

/**
 * Check if embeddings exist for the current user
 */
export async function hasEmbeddings(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profile_embeddings')
      .select('user_id')
      .limit(1)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}
