import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Hook for SoundCloud OAuth status and connection management
 */
export function useSoundCloudStatus() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['soundcloud-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { connected: false, error: 'Not authenticated' };
      }

      const response = await fetch('/api/soundcloud/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check SoundCloud status');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/soundcloud/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to disconnect SoundCloud');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-status'] });
    },
  });

  const initiateConnect = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Redirect to authorize endpoint
    window.location.href = `/api/soundcloud/authorize?access_token=${session.access_token}`;
  }, []);

  return {
    isConnected: data?.connected ?? false,
    username: data?.username,
    userId: data?.user_id,
    avatarUrl: data?.avatar_url,
    isLoading,
    error: error?.message || data?.error,
    connect: initiateConnect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    refetch,
  };
}

/**
 * Hook for uploading tracks to SoundCloud
 */
export function useSoundCloudUpload() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, description, genre, tags, sharing = 'public' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('track[title]', title);
      formData.append('track[asset_data]', file, file.name);

      if (description) formData.append('track[description]', description);
      if (genre) formData.append('track[genre]', genre);
      if (tags) formData.append('track[tag_list]', tags);
      if (sharing) formData.append('track[sharing]', sharing);

      setIsUploading(true);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/soundcloud/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.send(formData);
      });

      return uploadPromise;
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  return {
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    isUploading,
    uploadProgress,
    uploadedTrack: uploadMutation.data,
    error: uploadMutation.error?.message,
    reset: uploadMutation.reset,
  };
}

/**
 * Hook for fetching public SoundCloud tracks
 */
export function useSoundCloudTracks(userId) {
  return useQuery({
    queryKey: ['soundcloud-tracks', userId],
    queryFn: async () => {
      if (!userId) return [];

      const response = await fetch(`/api/soundcloud/public-tracks?user_id=${userId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch tracks');
      }

      const data = await response.json();
      return data.tracks || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching public SoundCloud profile
 */
export function useSoundCloudProfile(username) {
  return useQuery({
    queryKey: ['soundcloud-profile', username],
    queryFn: async () => {
      if (!username) return null;

      const response = await fetch(`/api/soundcloud/public-profile?username=${username}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch profile');
      }

      return response.json();
    },
    enabled: !!username,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
