/**
 * Real-time Connection Manager
 * 
 * Manages Supabase real-time subscriptions with:
 * - Automatic reconnection
 * - Presence tracking
 * - Typing indicators
 * - Connection status monitoring
 */

import { supabase } from '@/components/utils/supabaseClient';

// Connection status
export const ConnectionStatus = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

// Event types
export const RealtimeEvent = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BROADCAST: 'broadcast',
  PRESENCE: 'presence',
};

// Active subscriptions
const subscriptions = new Map();
const presenceChannels = new Map();

// Connection state
let connectionStatus = ConnectionStatus.DISCONNECTED;
let connectionListeners = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Subscribe to connection status changes
 */
export function onConnectionStatusChange(callback) {
  connectionListeners.push(callback);
  callback(connectionStatus);
  
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
}

/**
 * Update connection status
 */
function setConnectionStatus(status) {
  connectionStatus = status;
  connectionListeners.forEach(cb => cb(status));
}

/**
 * Subscribe to database changes
 */
export function subscribeToTable(table, callback, options = {}) {
  const {
    event = '*', // INSERT, UPDATE, DELETE, or *
    filter,
    schema = 'public',
  } = options;
  
  const key = `${schema}:${table}:${event}:${filter || 'all'}`;
  
  // Check if already subscribed
  if (subscriptions.has(key)) {
    const existing = subscriptions.get(key);
    existing.callbacks.push(callback);
    return () => {
      existing.callbacks = existing.callbacks.filter(cb => cb !== callback);
      if (existing.callbacks.length === 0) {
        existing.subscription.unsubscribe();
        subscriptions.delete(key);
      }
    };
  }
  
  // Create new subscription
  let channelConfig = supabase
    .channel(key)
    .on(
      'postgres_changes',
      {
        event,
        schema,
        table,
        filter,
      },
      (payload) => {
        const sub = subscriptions.get(key);
        if (sub) {
          sub.callbacks.forEach(cb => cb(payload));
        }
      }
    );
  
  const subscription = channelConfig.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setConnectionStatus(ConnectionStatus.CONNECTED);
      reconnectAttempts = 0;
    } else if (status === 'CLOSED') {
      handleDisconnect(key);
    } else if (status === 'CHANNEL_ERROR') {
      setConnectionStatus(ConnectionStatus.ERROR);
      handleReconnect(key);
    }
  });
  
  subscriptions.set(key, {
    subscription,
    callbacks: [callback],
    options: { event, filter, schema, table },
  });
  
  setConnectionStatus(ConnectionStatus.CONNECTING);
  
  return () => {
    const sub = subscriptions.get(key);
    if (sub) {
      sub.callbacks = sub.callbacks.filter(cb => cb !== callback);
      if (sub.callbacks.length === 0) {
        sub.subscription.unsubscribe();
        subscriptions.delete(key);
      }
    }
  };
}

/**
 * Subscribe to messages in a conversation
 */
export function subscribeToMessages(conversationId, callback) {
  return subscribeToTable('message', callback, {
    event: '*',
    filter: `conversation_id=eq.${conversationId}`,
  });
}

/**
 * Subscribe to notifications for a user
 */
export function subscribeToNotifications(userEmail, callback) {
  return subscribeToTable('notification', callback, {
    event: 'INSERT',
    filter: `user_email=eq.${userEmail}`,
  });
}

/**
 * Subscribe to beacon updates
 */
export function subscribeToBeacons(callback, cityFilter = null) {
  const options = { event: '*' };
  if (cityFilter) {
    options.filter = `city=eq.${cityFilter}`;
  }
  return subscribeToTable('Beacon', callback, options);
}

/**
 * Handle disconnection
 */
function handleDisconnect(key) {
  setConnectionStatus(ConnectionStatus.DISCONNECTED);
  console.log('[Realtime] Disconnected:', key);
}

/**
 * Handle reconnection with exponential backoff
 */
async function handleReconnect(key) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[Realtime] Max reconnection attempts reached');
    setConnectionStatus(ConnectionStatus.ERROR);
    return;
  }
  
  reconnectAttempts++;
  setConnectionStatus(ConnectionStatus.RECONNECTING);
  
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const sub = subscriptions.get(key);
  if (sub) {
    // Resubscribe
    sub.subscription.unsubscribe();
    
    const newSubscription = supabase
      .channel(key)
      .on(
        'postgres_changes',
        sub.options,
        (payload) => {
          sub.callbacks.forEach(cb => cb(payload));
        }
      )
      .subscribe();
    
    sub.subscription = newSubscription;
  }
}

/**
 * Create a presence channel
 */
export function createPresenceChannel(channelName, userInfo) {
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: userInfo.id || userInfo.email,
      },
    },
  });
  
  presenceChannels.set(channelName, {
    channel,
    userInfo,
    presenceState: {},
    listeners: [],
  });
  
  return channel;
}

/**
 * Join a presence channel
 */
export function joinPresence(channelName, userInfo, callbacks = {}) {
  let presenceData = presenceChannels.get(channelName);
  
  if (!presenceData) {
    createPresenceChannel(channelName, userInfo);
    presenceData = presenceChannels.get(channelName);
  }
  
  const { channel } = presenceData;
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      presenceData.presenceState = state;
      callbacks.onSync?.(state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      callbacks.onJoin?.(key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      callbacks.onLeave?.(key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          ...userInfo,
          online_at: new Date().toISOString(),
        });
      }
    });
  
  return {
    getPresence: () => channel.presenceState(),
    track: (state) => channel.track({ ...userInfo, ...state }),
    untrack: () => channel.untrack(),
    leave: () => {
      channel.unsubscribe();
      presenceChannels.delete(channelName);
    },
  };
}

/**
 * Send typing indicator
 */
export function sendTypingIndicator(channelName, userInfo, isTyping) {
  const presenceData = presenceChannels.get(channelName);
  if (!presenceData) return;
  
  presenceData.channel.track({
    ...userInfo,
    typing: isTyping,
    typing_at: isTyping ? new Date().toISOString() : null,
  });
}

/**
 * Broadcast a message to a channel
 */
export function broadcast(channelName, event, payload) {
  const channel = supabase.channel(channelName);
  
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  });
  
  // Auto-cleanup after sending
  setTimeout(() => channel.unsubscribe(), 1000);
}

/**
 * Subscribe to broadcasts on a channel
 */
export function subscribeToBroadcast(channelName, event, callback) {
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event }, (payload) => {
      callback(payload);
    })
    .subscribe();
  
  return () => channel.unsubscribe();
}

/**
 * Cleanup all subscriptions
 */
export function cleanup() {
  for (const [key, sub] of subscriptions) {
    sub.subscription.unsubscribe();
    subscriptions.delete(key);
  }
  
  for (const [key, data] of presenceChannels) {
    data.channel.unsubscribe();
    presenceChannels.delete(key);
  }
  
  setConnectionStatus(ConnectionStatus.DISCONNECTED);
}

/**
 * Get current connection status
 */
export function getConnectionStatus() {
  return connectionStatus;
}

/**
 * Check if connected
 */
export function isConnected() {
  return connectionStatus === ConnectionStatus.CONNECTED;
}

export default {
  ConnectionStatus,
  RealtimeEvent,
  onConnectionStatusChange,
  subscribeToTable,
  subscribeToMessages,
  subscribeToNotifications,
  subscribeToBeacons,
  createPresenceChannel,
  joinPresence,
  sendTypingIndicator,
  broadcast,
  subscribeToBroadcast,
  cleanup,
  getConnectionStatus,
  isConnected,
};
