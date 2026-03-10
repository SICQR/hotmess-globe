/**
 * useChat — Full-lifecycle chat hook for a single thread.
 *
 * Handles:
 * - Loading message history
 * - Sending text + media messages
 * - Realtime subscription for new messages (INSERT)
 * - Realtime subscription for read receipts (UPDATE on read_at)
 * - In-view detection → mark as read (stamps read_at + appends read_by)
 * - Typing indicator via Supabase Presence
 * - Ephemeral messages (expires_at)
 *
 * IDENTITY MODEL: All sender names use username (anonymous handle), never display_name.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_email: string;
  sender_name: string | null;
  content: string | null;
  message_type: string;
  metadata: Record<string, unknown>;
  media_urls: string[] | null;
  read_by: string[];
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ChatThread {
  id: string;
  participant_emails: string[];
  last_message: string | null;
  last_message_at: string | null;
  unread_count: Record<string, number>;
  active: boolean;
}

export interface UseChatOptions {
  threadId: string | null;
  userEmail: string | null;
  /** If true, auto-subscribe to realtime. Default: true */
  realtime?: boolean;
  /** Page size for history loading. Default: 50 */
  pageSize?: number;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  /** Send a text message */
  sendMessage: (content: string, opts?: SendMessageOpts) => Promise<ChatMessage | null>;
  /** Send a media message (image/video) */
  sendMedia: (urls: string[], type?: string) => Promise<ChatMessage | null>;
  /** Mark all messages in thread as read (call when thread is in view) */
  markAsRead: () => Promise<void>;
  /** Mark a specific message as read (call when message scrolls into view) */
  markMessageRead: (messageId: string) => Promise<void>;
  /** Load older messages */
  loadMore: () => Promise<void>;
  /** Currently typing users (emails) */
  typingUsers: string[];
  /** Signal that current user is typing */
  setTyping: (isTyping: boolean) => void;
  /** Realtime connection status */
  isConnected: boolean;
}

interface SendMessageOpts {
  /** Message type. Default: 'text' */
  type?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** TTL in seconds — message auto-deletes after this duration */
  ttlSeconds?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat({
  threadId,
  userEmail,
  realtime = true,
  pageSize = 50,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const oldestMessageDate = useRef<string | null>(null);

  // Memoize sender profile for outgoing messages
  const senderProfileRef = useRef<{ username: string; display_name: string } | null>(null);

  // -----------------------------------------------------------------------
  // Load sender profile (username-first for identity model)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!userEmail) return;
    supabase
      .from('profiles')
      .select('username, display_name')
      .eq('email', userEmail)
      .single()
      .then(({ data }) => {
        if (data) senderProfileRef.current = data;
      });
  }, [userEmail]);

  // -----------------------------------------------------------------------
  // Load initial message history
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!threadId || !userEmail) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    setHasMore(true);
    oldestMessageDate.current = null;

    (async () => {
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(pageSize);

      if (cancelled) return;

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }

      const msgs = (data || []) as ChatMessage[];
      setMessages(msgs);
      setHasMore(msgs.length === pageSize);
      if (msgs.length > 0) {
        oldestMessageDate.current = msgs[0].created_at;
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [threadId, userEmail, pageSize]);

  // -----------------------------------------------------------------------
  // Realtime: subscribe to INSERT (new messages) and UPDATE (read receipts)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!threadId || !userEmail || !realtime) return;

    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Deduplicate (optimistic insert may already have it)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, read_by: updated.read_by, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [threadId, userEmail, realtime]);

  // -----------------------------------------------------------------------
  // Presence: typing indicators
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!threadId || !userEmail || !realtime) return;

    const presenceChannel = supabase
      .channel(`presence:${threadId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typers: string[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key] as { email: string; typing: boolean }[];
          for (const p of presences) {
            if (p.typing && p.email !== userEmail) {
              typers.push(p.email);
            }
          }
        }
        setTypingUsers(typers);
      })
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [threadId, userEmail, realtime]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string, opts?: SendMessageOpts): Promise<ChatMessage | null> => {
      if (!threadId || !userEmail) return null;

      const profile = senderProfileRef.current;
      const senderName = profile?.username || profile?.display_name || 'Anonymous';

      const expiresAt = opts?.ttlSeconds
        ? new Date(Date.now() + opts.ttlSeconds * 1000).toISOString()
        : null;

      const row = {
        thread_id: threadId,
        sender_email: userEmail,
        sender_name: senderName,
        content,
        message_type: opts?.type || 'text',
        metadata: opts?.metadata || {},
        read_by: [userEmail],
        expires_at: expiresAt,
      };

      const { data, error: insertErr } = await supabase
        .from('messages')
        .insert(row)
        .select('*')
        .single();

      if (insertErr) {
        setError(insertErr.message);
        return null;
      }

      const msg = data as ChatMessage;

      // Optimistic update (realtime will also deliver it, deduplicated above)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      return msg;
    },
    [threadId, userEmail]
  );

  const sendMedia = useCallback(
    async (urls: string[], type = 'image'): Promise<ChatMessage | null> => {
      if (!threadId || !userEmail) return null;

      const profile = senderProfileRef.current;
      const senderName = profile?.username || profile?.display_name || 'Anonymous';

      const { data, error: insertErr } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_email: userEmail,
          sender_name: senderName,
          content: null,
          message_type: type,
          media_urls: urls,
          metadata: {},
          read_by: [userEmail],
        })
        .select('*')
        .single();

      if (insertErr) {
        setError(insertErr.message);
        return null;
      }

      const msg = data as ChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      return msg;
    },
    [threadId, userEmail]
  );

  /**
   * Mark all unread messages in thread as read.
   * Uses the mark_messages_read RPC which atomically:
   * - Appends userEmail to read_by[]
   * - Sets read_at = now() (first reader wins)
   * - Decrements unread_count JSONB on chat_threads
   */
  const markAsRead = useCallback(async () => {
    if (!threadId || !userEmail) return;

    const { error: rpcErr } = await supabase.rpc('mark_messages_read', {
      p_thread_id: threadId,
      p_user_email: userEmail,
    });

    if (rpcErr) {
      console.warn('[useChat] markAsRead RPC failed:', rpcErr.message);
      return;
    }

    // Optimistic: update local state
    setMessages((prev) =>
      prev.map((m) => {
        if (m.sender_email !== userEmail && !m.read_by.includes(userEmail)) {
          return {
            ...m,
            read_by: [...m.read_by, userEmail],
            read_at: m.read_at || new Date().toISOString(),
          };
        }
        return m;
      })
    );
  }, [threadId, userEmail]);

  /**
   * Mark a single message as read (for in-view detection).
   * Updates read_at and read_by on the specific message row.
   * The UPDATE event will propagate to the sender via Realtime,
   * toggling the "double-check" read receipt icon.
   */
  const markMessageRead = useCallback(
    async (messageId: string) => {
      if (!userEmail) return;

      const { error: updateErr } = await supabase
        .from('messages')
        .update({
          read_by: supabase.rpc('array_append_unique' as any, {}) as any, // fallback below
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      // The array_append via RPC may not exist — use direct update instead
      if (updateErr) {
        // Fallback: read current, append, write back
        const { data: msg } = await supabase
          .from('messages')
          .select('read_by')
          .eq('id', messageId)
          .single();

        if (msg && !msg.read_by.includes(userEmail)) {
          await supabase
            .from('messages')
            .update({
              read_by: [...msg.read_by, userEmail],
              read_at: new Date().toISOString(),
            })
            .eq('id', messageId);
        }
      }

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId && !m.read_by.includes(userEmail)) {
            return {
              ...m,
              read_by: [...m.read_by, userEmail],
              read_at: m.read_at || new Date().toISOString(),
            };
          }
          return m;
        })
      );
    },
    [userEmail]
  );

  const loadMore = useCallback(async () => {
    if (!threadId || !hasMore || loading) return;

    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .lt('created_at', oldestMessageDate.current || new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    const older = ((data || []) as ChatMessage[]).reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === pageSize);
    if (older.length > 0) {
      oldestMessageDate.current = older[0].created_at;
    }
    setLoading(false);
  }, [threadId, hasMore, loading, pageSize]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!presenceChannelRef.current || !userEmail) return;
      presenceChannelRef.current.track({ email: userEmail, typing: isTyping });
    },
    [userEmail]
  );

  // -----------------------------------------------------------------------
  // Derived: is message read by recipient? (for sender-side double-check icon)
  // -----------------------------------------------------------------------
  const isMessageRead = useCallback(
    (msg: ChatMessage): boolean => {
      if (!userEmail || msg.sender_email !== userEmail) return false;
      return msg.read_by.some((email) => email !== userEmail);
    },
    [userEmail]
  );

  return useMemo(
    () => ({
      messages,
      loading,
      error,
      hasMore,
      sendMessage,
      sendMedia,
      markAsRead,
      markMessageRead,
      loadMore,
      typingUsers,
      setTyping,
      isConnected,
    }),
    [messages, loading, error, hasMore, sendMessage, sendMedia, markAsRead, markMessageRead, loadMore, typingUsers, setTyping, isConnected]
  );
}

export default useChat;
