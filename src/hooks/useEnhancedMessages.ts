/**
 * useEnhancedMessages — Real-time DMs with reactions and location sharing
 *
 * Adapted from SICQR/ghosted with HOTMESS table schema:
 * - Messages with reactions (JSONB)
 * - Location-in-messages support
 * - Real-time subscriptions via Supabase
 * - Message status tracking (sending/sent/failed)
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export interface MessageLocation {
  lat: number;
  lng: number;
  cluster?: string;
  distance?: number;
  travelTime?: number;
  address?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'location' | 'image';
  location?: MessageLocation;
  imageUrl?: string;
  reactions?: Record<string, string>; // userId -> emoji
  status: 'sending' | 'sent' | 'failed';
}

export const EMOJI_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢'] as const;

/**
 * Hook for real-time messaging between two users
 */
export function useEnhancedMessages(currentUserId: string | null, otherUserId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch messages on mount
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      setLoading(false);
      return;
    }

    async function fetchMessages() {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
          )
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
          type: msg.type || 'text',
          location:
            msg.type === 'location' && msg.location_lat && msg.location_lng
              ? {
                  lat: msg.location_lat,
                  lng: msg.location_lng,
                  cluster: msg.location_cluster,
                  distance: msg.location_distance,
                  travelTime: msg.location_travel_time,
                  address: msg.location_address,
                }
              : undefined,
          imageUrl: msg.image_url,
          reactions: msg.reactions || {},
          status: msg.status || 'sent',
        }));

        setMessages(formattedMessages);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`messages-${currentUserId}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as any;
          // Only add if it's part of this conversation
          if (
            (msg.sender_id === currentUserId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === currentUserId)
          ) {
            const newMessage: Message = {
              id: msg.id,
              senderId: msg.sender_id,
              receiverId: msg.receiver_id,
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              type: msg.type || 'text',
              location:
                msg.type === 'location' && msg.location_lat && msg.location_lng
                  ? {
                      lat: msg.location_lat,
                      lng: msg.location_lng,
                      cluster: msg.location_cluster,
                      distance: msg.location_distance,
                      travelTime: msg.location_travel_time,
                      address: msg.location_address,
                    }
                  : undefined,
              imageUrl: msg.image_url,
              reactions: msg.reactions || {},
              status: msg.status || 'sent',
            };
            setMessages((current) => [...current, newMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as any;
          setMessages((current) =>
            current.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    reactions: msg.reactions || {},
                    status: msg.status || 'sent',
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId]);

  return { messages, loading, error };
}

/**
 * Send a message
 */
export async function sendEnhancedMessage(
  message: Omit<Message, 'id' | 'timestamp' | 'status'>
): Promise<Message> {
  const messageInsert: any = {
    sender_id: message.senderId,
    receiver_id: message.receiverId,
    content: message.content,
    type: message.type,
    location_lat: message.location?.lat,
    location_lng: message.location?.lng,
    location_cluster: message.location?.cluster,
    location_distance: message.location?.distance,
    location_travel_time: message.location?.travelTime,
    location_address: message.location?.address,
    image_url: message.imageUrl,
    reactions: message.reactions || {},
    status: 'sent',
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(messageInsert)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    content: data.content,
    timestamp: new Date(data.created_at).getTime(),
    type: data.type || 'text',
    location:
      data.type === 'location' && data.location_lat && data.location_lng
        ? {
            lat: data.location_lat,
            lng: data.location_lng,
            cluster: data.location_cluster,
            distance: data.location_distance,
            travelTime: data.location_travel_time,
            address: data.location_address,
          }
        : undefined,
    imageUrl: data.image_url,
    reactions: data.reactions || {},
    status: data.status || 'sent',
  };
}

/**
 * Add a reaction to a message
 */
export async function addMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  // Fetch current reactions
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchError) throw fetchError;

  const reactions = (message.reactions as Record<string, string>) || {};
  reactions[userId] = emoji;

  const { error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);

  if (error) throw error;
}

/**
 * Remove a reaction from a message
 */
export async function removeMessageReaction(
  messageId: string,
  userId: string
): Promise<void> {
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchError) throw fetchError;

  const reactions = (message.reactions as Record<string, string>) || {};
  delete reactions[userId];

  const { error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);

  if (error) throw error;
}
