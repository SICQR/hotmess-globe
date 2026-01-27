import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Hook for Telegram integration - connection status and management
 */
export function useTelegram() {
  const queryClient = useQueryClient();
  const [deepLink, setDeepLink] = useState(null);
  const [deepLinkExpiry, setDeepLinkExpiry] = useState(null);

  // Get connection status
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { connected: false };
      }

      const response = await fetch('/api/telegram/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Telegram status');
      }

      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  // Generate deep link for connecting
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate link');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setDeepLink(data.deepLink);
      setDeepLinkExpiry(new Date(data.expiresAt));
    },
  });

  // Disconnect Telegram
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/telegram/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to disconnect');
      }

      return response.json();
    },
    onSuccess: () => {
      setDeepLink(null);
      setDeepLinkExpiry(null);
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
    },
  });

  // Import Telegram username to profile
  const importUsernameMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/telegram/import-username', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import username');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
    },
  });

  // Open Telegram with deep link
  const openTelegramLink = useCallback(() => {
    if (deepLink) {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    }
  }, [deepLink]);

  // Check if deep link is still valid
  const isDeepLinkValid = deepLinkExpiry ? new Date() < deepLinkExpiry : false;

  return {
    // Connection status
    isConnected: data?.connected ?? false,
    username: data?.username,
    firstName: data?.firstName,
    notificationsEnabled: data?.notificationsEnabled,
    linkedAt: data?.linkedAt,
    mutedUntil: data?.mutedUntil,
    isLoading,
    error: error?.message,
    
    // Actions
    generateLink: generateLinkMutation.mutate,
    isGeneratingLink: generateLinkMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    importUsername: importUsernameMutation.mutateAsync,
    isImportingUsername: importUsernameMutation.isPending,
    refetch,
    
    // Deep link
    deepLink: isDeepLinkValid ? deepLink : null,
    deepLinkExpiry,
    openTelegramLink,
  };
}

/**
 * Hook for opening the Telegram group
 */
export function useTelegramGroup() {
  const openGroup = useCallback(() => {
    const groupUrl = 'https://t.me/Hotmess_feed';
    const isMobile = /android|iphone|ipad|ipod|iemobile|opera mini/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      // Try native app first
      window.location.href = 'tg://resolve?domain=Hotmess_feed';
      
      // Fallback to web after delay
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = groupUrl;
        }
      }, 800);
    } else {
      window.open(groupUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return { openGroup };
}
