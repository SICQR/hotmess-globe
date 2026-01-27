/**
 * Real-time Subscription Hook
 * Uses Supabase Realtime for WebSocket-based updates
 * Replaces polling with push-based updates
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribe to real-time changes on a table
 */
export function useRealtimeSubscription(table, options = {}) {
  const {
    event = '*', // INSERT, UPDATE, DELETE, or * for all
    filter,
    schema = 'public',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    invalidateQueries = [], // React Query keys to invalidate
    enabled = true,
  } = options;

  const queryClient = useQueryClient();
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const handlePayload = useCallback((payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Call type-specific handlers
    if (eventType === 'INSERT' && onInsert) {
      onInsert(newRecord);
    } else if (eventType === 'UPDATE' && onUpdate) {
      onUpdate(newRecord, oldRecord);
    } else if (eventType === 'DELETE' && onDelete) {
      onDelete(oldRecord);
    }

    // Call generic handler
    if (onChange) {
      onChange(payload);
    }

    // Invalidate React Query caches
    if (invalidateQueries.length > 0) {
      invalidateQueries.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      });
    }
  }, [onInsert, onUpdate, onDelete, onChange, invalidateQueries, queryClient]);

  useEffect(() => {
    if (!enabled || !table) return;

    const channelName = `realtime:${schema}:${table}:${filter || 'all'}`;
    
    // Build channel configuration
    let channelConfig = supabase.channel(channelName);

    // Build filter string if provided
    const filterString = filter ? `${filter.column}=eq.${filter.value}` : undefined;

    channelConfig = channelConfig.on(
      'postgres_changes',
      {
        event,
        schema,
        table,
        filter: filterString,
      },
      handlePayload
    );

    // Subscribe
    channelConfig.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
        // Subscribed to table
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError(new Error(`Channel error for ${table}`));
        console.error(`[Realtime] Channel error for ${table}`);
      } else if (status === 'TIMED_OUT') {
        setIsConnected(false);
        setError(new Error(`Subscription timeout for ${table}`));
        console.error(`[Realtime] Timeout for ${table}`);
      }
    });

    channelRef.current = channelConfig;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [table, event, filter, schema, enabled, handlePayload]);

  return {
    isConnected,
    error,
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    },
  };
}

/**
 * Subscribe to presence (who's online)
 */
export function usePresenceSubscription(channelName, options = {}) {
  const {
    userInfo = {},
    onSync,
    onJoin,
    onLeave,
    enabled = true,
  } = options;

  const channelRef = useRef(null);
  const [presenceState, setPresenceState] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !channelName) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo.id || 'anonymous',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
        onSync?.(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        onJoin?.(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        onLeave?.(key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo);
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [channelName, enabled, userInfo, onSync, onJoin, onLeave]);

  const updatePresence = useCallback(async (updates) => {
    if (channelRef.current) {
      await channelRef.current.track({ ...userInfo, ...updates });
    }
  }, [userInfo]);

  return {
    presenceState,
    isConnected,
    updatePresence,
    onlineCount: Object.keys(presenceState).length,
  };
}

/**
 * Subscribe to broadcast messages (for custom events)
 */
export function useBroadcastSubscription(channelName, options = {}) {
  const {
    eventName = 'message',
    onMessage,
    enabled = true,
  } = options;

  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !channelName) return;

    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: eventName }, (payload) => {
        onMessage?.(payload.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [channelName, eventName, enabled, onMessage]);

  const broadcast = useCallback(async (payload) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });
    }
  }, [eventName]);

  return {
    isConnected,
    broadcast,
  };
}

/**
 * Subscribe to multiple tables at once
 */
export function useMultiTableSubscription(subscriptions, options = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const channelsRef = useRef([]);
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    if (!enabled || !subscriptions.length) return;

    let connected = 0;

    subscriptions.forEach(({ table, event = '*', filter, onPayload, invalidateQueries = [] }) => {
      const channelName = `multi:${table}:${filter?.column || 'all'}`;
      const filterString = filter ? `${filter.column}=eq.${filter.value}` : undefined;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table,
            filter: filterString,
          },
          (payload) => {
            onPayload?.(payload);
            
            if (invalidateQueries.length > 0) {
              invalidateQueries.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            connected++;
            setConnectedCount(connected);
          }
        });

      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      setConnectedCount(0);
    };
  }, [enabled, subscriptions, queryClient]);

  return {
    connectedCount,
    totalSubscriptions: subscriptions.length,
    allConnected: connectedCount === subscriptions.length,
  };
}

export default useRealtimeSubscription;
