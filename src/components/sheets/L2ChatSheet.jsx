/**
 * L2ChatSheet — Supabase-native messaging
 *
 * Tables:
 *   chat_threads  (id, participant_emails[], last_message, last_message_at)
 *   messages      (id, thread_id, sender_email, content, message_type, read_by, media_urls, created_at, created_date)
 *   profiles      (id, email, display_name, avatar_url)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import {
  MessageCircle, Send, ArrowLeft,
  Loader2, Search, ChevronRight,
  Camera, Mic, Video, Navigation,
  Sparkles, X, Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetSection, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import MeetpointCard from '@/components/messaging/MeetpointCard';
import VideoCallModal from '@/components/video/VideoCallModal';
import TravelModal from '@/components/messaging/TravelModal';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { usePowerups } from '@/hooks/usePowerups';
import { Zap } from 'lucide-react';
import { pushNotify } from '@/lib/pushNotify';
import { parseLocation } from '@/lib/locationParser';
import ChatTravelCard from '@/components/chat/ChatTravelCard';
import JourneyStatusCard from '@/components/chat/JourneyStatusCard';

// ── Read-state helpers ────────────────────────────────────────────────────────
// getLastRead: kept for backward compat (returns local timestamp or 0)
const getLastRead = (threadId) => {
  try { return parseInt(localStorage.getItem(`chat_read_${threadId}`) || '0', 10); } catch { return 0; }
};

/**
 * Mark a thread as read: DB-first (unread_count → 0 for caller's email),
 * then update local timestamp as a fallback cache key.
 * Fire-and-forget; never blocks the UI.
 */
const markRead = (threadId, userEmail) => {
  // DB write: zero out unread count for this user
  if (userEmail && threadId) {
    supabase
      .from('chat_threads')
      .select('unread_count')
      .eq('id', threadId)
      .single()
      .then(({ data: row }) => {
        if (!row) return;
        const updated = { ...(row.unread_count || {}), [userEmail]: 0 };
        supabase
          .from('chat_threads')
          .update({ unread_count: updated })
          .eq('id', threadId)
          .then(() => {});
      });
  }
  // Local cache: still written so useUnreadCount can read optimistically
  try { localStorage.setItem(`chat_read_${threadId}`, String(Date.now())); } catch {}
};

/** Location card — renders shared location with expiry, trust signals, visual hierarchy */
function LocationCard({ msg, isMe, otherName }) {
  const sentAt = msg.created_date ? new Date(msg.created_date) : null;
  const expiresAt = sentAt ? new Date(sentAt.getTime() + 60 * 60 * 1000) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  const minsLeft = expiresAt && !isExpired ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000)) : 0;
  const distText = (msg.content || '').replace('📍 My Location', '').replace(' — ', '').trim();

  // Pulse settles to static after 6 seconds
  const [pulseActive, setPulseActive] = useState(!isExpired);
  useEffect(() => {
    if (!isExpired && pulseActive) {
      const t = setTimeout(() => setPulseActive(false), 6000);
      return () => clearTimeout(t);
    }
  }, [isExpired, pulseActive]);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'max-w-[80%] px-4 py-3 rounded-2xl border overflow-hidden transition-all duration-300',
        isExpired
          ? 'bg-white/5 border-white/10 opacity-60'
          : isMe ? 'bg-[#C8962C]/15 border-[#C8962C]/30' : 'bg-[#1C1C1E] border-white/10'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-lg transition-all duration-300', pulseActive && 'animate-pulse')}>📍</span>
        <span className="text-sm font-bold text-white">
          {isExpired ? 'Location expired' : isMe ? 'My Location' : `${otherName}'s Location`}
        </span>
      </div>
      {!isExpired && distText && (
        <p className="text-xs text-white/60 mt-1 ml-7">{distText}</p>
      )}
      <div className="flex items-center justify-between mt-2 ml-7">
        <p className="text-[10px] text-white/30">
          {isExpired
            ? sentAt ? formatDistanceToNow(sentAt, { addSuffix: true }) : ''
            : `Expires in ${minsLeft} min`}
        </p>
        {!isExpired && (
          <p className="text-[10px] text-[#C8962C]/60">Approximate only</p>
        )}
      </div>
      {isMe && !isExpired && (
        <p className="text-[9px] text-white/20 mt-1.5 ml-7">Shared for 1 hour. You're in control.</p>
      )}
    </motion.div>
  );
}

/**
 * Supabase-powered chat sheet UI that manages threads, messages, profiles, real-time updates, media attachments, and Wingman AI suggestions.
 *
 * Renders a conversation list when no thread is selected and a full chat view with messages, typing indicators, composer, and optional video/travel modals when a thread is open.
 *
 * @param {{ thread?: string, to?: string, title?: string }} props - Component props.
 * @param {string} [props.thread] - Initial thread ID to open on mount.
 * @param {string} [props.to] - Initial recipient email to preselect a new conversation (creates a new thread on first send).
 * @param {string} [props.title] - Fallback title used when the other participant's name is unavailable.
 * @returns {JSX.Element} The chat sheet React element.
 */
export default function L2ChatSheet({ thread: initialThreadId, to: initialToEmail, userId: initialUserId, toUid, title }) {
  // Accept both prop names — callers may pass userId or legacy toUid
  const resolvedUserId = initialUserId || toUid;
  const { openSheet, updateSheetProps } = useSheet();
  const { isActive: isBoostActive, refresh: refreshBoosts } = usePowerups();

  const [currentUser, setCurrentUser]   = useState(null); // { id, email }
  const [threads, setThreads]           = useState([]);
  const [profiles, setProfiles]         = useState({}); // email → profile
  const [threadsLoading, setThreadsLoading] = useState(true);

  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [newMessage, setNewMessage]     = useState('');
  const [sending, setSending]           = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [highlightNext, setHighlightNext] = useState(false);
  const [failedMsgIds, setFailedMsgIds] = useState(new Set());

  // ── Wingman AI state ─────────────────────────────────────────────────────
  const [wingmanLoading, setWingmanLoading] = useState(false);
  const [wingmanSuggestions, setWingmanSuggestions] = useState(null); // { openers: [{text, type}], targetName }
  const [, setWingmanError] = useState(false);
  // ── Typing indicator ───────────────────────────────────────────────────────
  const { typingUsers, sendTyping } = useTypingIndicator(
    selectedThread && !selectedThread._new ? selectedThread.id : null,
    currentUser?.email
  );

  const messagesEndRef  = useRef(null);
  const photoInputRef   = useRef(null);
  const inputRef        = useRef(null);
  const realtimeRef     = useRef(null);

  // ── Boot: get current user ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser({ id: user.id, email: user.email });
    });
  }, []);

  // ── Resolve userId → email internally (GDPR: email never exposed as prop) ──
  const [resolvedToEmail, setResolvedToEmail] = useState(initialToEmail || null);
  useEffect(() => {
    if (!resolvedUserId || resolvedToEmail) return;
    supabase
      .from('profiles')
      .select('email')
      .eq('id', resolvedUserId)
      .single()
      .then(({ data }) => {
        if (data?.email) setResolvedToEmail(data.email);
      });
  }, [resolvedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load threads when user is ready ───────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.email) return;
    loadThreads();
  }, [currentUser?.email]);

  const loadThreads = async () => {
    setThreadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .contains('participant_emails', [currentUser.email])
        .eq('active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      const threadList = data || [];
      setThreads(threadList);

      // Load profiles for all other participants
      const otherEmails = [
        ...new Set(
          threadList.flatMap(t => t.participant_emails || [])
            .filter(e => e !== currentUser.email)
        ),
      ];
      if (otherEmails.length > 0) {
        await loadProfilesByEmail(otherEmails);
      }
    } catch (err) {
      console.error('[Chat] loadThreads error:', err);
    } finally {
      setThreadsLoading(false);
    }
  };

  const loadProfilesByEmail = async (emails) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url')
      .in('email', emails);

    if (data) {
      setProfiles(prev => {
        const next = { ...prev };
        data.forEach(p => { if (p.email) next[p.email] = p; });
        return next;
      });
    }
  };

  // ── Open thread from props ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.email || threadsLoading) return;

    if (initialThreadId) {
      const t = threads.find(th => th.id === initialThreadId);
      if (t) openThread(t);
    } else if (resolvedToEmail && !selectedThread) {
      const existing = threads.find(t =>
        t.participant_emails?.includes(resolvedToEmail) &&
        t.participant_emails?.includes(currentUser.email)
      );
      if (existing) {
        openThread(existing);
      } else {
        // Pre-select the "to" email so first send creates the thread
        setSelectedThread({ _new: true, participant_emails: [currentUser.email, resolvedToEmail] });
      }
    }
  }, [currentUser?.email, threadsLoading, initialThreadId, resolvedToEmail]);

  // ── Open thread → load messages + subscribe ───────────────────────────────
  const openThread = useCallback(async (thread) => {
    setSelectedThread(thread);
    if (thread._new) return;

    setMessagesLoading(true);
    markRead(thread.id, currentUser?.email);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_date', { ascending: true });
      if (!error) setMessages(data || []);
    } catch (err) {
      console.error('[Chat] loadMessages error:', err);
    } finally {
      setMessagesLoading(false);
    }

    // Realtime subscription for new messages
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    realtimeRef.current = supabase
      .channel(`messages:thread:${thread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          markRead(thread.id, currentUser?.email);
        }
      )
      // Cross-device read sync: when recipient reads, their unread_count zeroes →
      // sender's "Seen" indicator updates in real time (no refresh needed)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_threads', filter: `id=eq.${thread.id}` },
        (payload) => {
          if (payload.new?.unread_count) {
            setSelectedThread(prev => prev ? { ...prev, unread_count: payload.new.unread_count } : prev);
          }
        }
      )
      .subscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  // Cleanup realtime on unmount
  useEffect(() => () => {
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
  }, []);

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !currentUser?.email || sending) return;

    setSending(true);
    setNewMessage('');
    try {
      let thread = selectedThread;

      // Create thread if it's a new conversation
      if (thread?._new) {
        const { data: newThread, error } = await supabase
          .from('chat_threads')
          .insert({
            participant_emails: thread.participant_emails,
            active: true,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        thread = newThread;
        setSelectedThread(newThread);
        setThreads(prev => [newThread, ...prev]);

        // Load profile for the other participant
        const other = newThread.participant_emails.find(e => e !== currentUser.email);
        if (other) await loadProfilesByEmail([other]);
      }

      const senderProfile = profiles[currentUser.email];

      // Optimistic: show message immediately before DB insert
      const isHighlighted = highlightNext && isBoostActive('highlighted_message');
      const now = new Date().toISOString();
      const optimisticMsg = {
        _optimistic: true, // no `id` yet = ✓ (Sent) state
        thread_id: thread.id,
        sender_email: currentUser.email,
        content: isHighlighted ? JSON.stringify({ text, is_highlighted: true }) : text,
        message_type: 'text',
        created_date: now,
      };
      setMessages(prev => [...prev, optimisticMsg]);

      // Insert to DB
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: thread.id,
          sender_email: currentUser.email,
          content: isHighlighted ? JSON.stringify({ text, is_highlighted: true }) : optimisticMsg.content,
          message_type: 'text',
          created_date: new Date().toISOString(),
        });
      if (msgError) throw msgError;
      // Consume the highlight toggle after sending
      if (isHighlighted) setHighlightNext(false);

      // Mark thread read on send (DB-first via markRead helper)
      markRead(thread.id, currentUser?.email);

      // Increment unread_count for recipient + push notification
      const recipientEmail = thread.participant_emails?.find(e => e !== currentUser.email);
      if (recipientEmail) {
        // Increment unread badge for recipient
        const currentUnread = thread.unread_count || {};
        const newUnreadCount = { ...currentUnread, [recipientEmail]: (currentUnread[recipientEmail] || 0) + 1 };

        // Push notification (skip if recipient muted this thread)
        const mutedBy = thread.muted_by || [];
        if (!mutedBy.includes(recipientEmail)) {
          const senderName = profiles[currentUser.email]?.display_name || 'Someone';
          pushNotify({
            emails: [recipientEmail],
            title: senderName,
            body: text.length > 60 ? text.slice(0, 57) + '…' : text,
            tag: `chat-${thread.id}`,
            url: `/ghosted?sheet=chat&thread=${thread.id}`,
          });
        }

        // Update thread: last_message + unread_count in one write
        await supabase
          .from('chat_threads')
          .update({
            last_message: text.slice(0, 80),
            last_message_at: new Date().toISOString(),
            unread_count: newUnreadCount,
          })
          .eq('id', thread.id);

        // Keep local state in sync
        setSelectedThread(prev => prev ? { ...prev, unread_count: newUnreadCount } : prev);
      } else {
        // No recipient found — still update last_message
        await supabase
          .from('chat_threads')
          .update({
            last_message: text.slice(0, 80),
            last_message_at: new Date().toISOString(),
          })
          .eq('id', thread.id);
      }

      // Refresh messages if no realtime (new thread)
      if (!realtimeRef.current || thread?._new) {
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('thread_id', thread.id)
          .order('created_date', { ascending: true });
        if (data) setMessages(data);

        // Subscribe now that thread exists
        if (!realtimeRef.current) openThread(thread);
      }
    } catch (err) {
      toast.error("Couldn't send. Tap message to retry.");
      // Mark the optimistic message as failed — don't remove it
      setMessages(prev => prev.map(m =>
        m._optimistic && m.content === text ? { ...m, _failed: true } : m
      ));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Send a special message (meetpoint, travel card, etc.)
  const handleSendSpecial = async ({ message_type, metadata, content }) => {
    if (!currentUser?.email || sending) return;
    setSending(true);
    try {
      let thread = selectedThread;
      if (thread?._new) {
        const { data: newThread, error } = await supabase
          .from('chat_threads')
          .insert({
            participant_emails: thread.participant_emails,
            active: true,
            last_message_at: new Date().toISOString(),
          })
          .select().single();
        if (error) throw error;
        thread = newThread;
        setSelectedThread(newThread);
        setThreads(prev => [newThread, ...prev]);
      }

      const { error: msgError } = await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_email: currentUser.email,
        content,
        message_type,
        created_date: new Date().toISOString(),
      });
      if (msgError) throw msgError;

      // Increment unread + push notification with smart fallback for media/location
      const recipientEmail = thread.participant_emails?.find(e => e !== currentUser.email);
      const lastMsg = message_type === 'location' ? '📍 Location shared' : message_type === 'travel' ? '🚗 On the way' : message_type === 'photo' ? '📷 Photo' : content.slice(0, 80);

      if (recipientEmail) {
        const currentUnread = thread.unread_count || {};
        const newUnreadCount = { ...currentUnread, [recipientEmail]: (currentUnread[recipientEmail] || 0) + 1 };

        const mutedBy = thread.muted_by || [];
        if (!mutedBy.includes(recipientEmail)) {
          const senderName = profiles[currentUser.email]?.display_name || 'Someone';
          const pushBody = message_type === 'location' ? `${senderName} sent a location`
            : message_type === 'travel' ? `${senderName} is on the way`
            : message_type === 'photo' ? `${senderName} sent a photo`
            : content.length > 60 ? content.slice(0, 57) + '…' : content;
          pushNotify({
            emails: [recipientEmail],
            title: senderName,
            body: pushBody,
            tag: `chat-${thread.id}`,
            url: `/ghosted?sheet=chat&thread=${thread.id}`,
          });
        }

        await supabase.from('chat_threads').update({
          last_message: lastMsg,
          last_message_at: new Date().toISOString(),
          unread_count: newUnreadCount,
        }).eq('id', thread.id);

        setSelectedThread(prev => prev ? { ...prev, unread_count: newUnreadCount } : prev);
      } else {
        await supabase.from('chat_threads').update({
          last_message: lastMsg,
          last_message_at: new Date().toISOString(),
        }).eq('id', thread.id);
      }

      const { data: msgs } = await supabase
        .from('chat_messages').select('*').eq('thread_id', thread.id)
        .order('created_date', { ascending: true });
      if (msgs) setMessages(msgs);
    } catch (err) {
      toast.error("Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    setSelectedThread(null);
    setMessages([]);
    if (realtimeRef.current) { supabase.removeChannel(realtimeRef.current); realtimeRef.current = null; }
    updateSheetProps?.({ thread: null, to: null, title: 'Messages' });
    loadThreads();
  };

  // ── Helper: extract other party's email from thread ────────────────────────
  const getOtherEmail = (thread) =>
    thread.participant_emails?.find(e => e !== currentUser?.email) || '';
  const getProfile = (email) => profiles[email] || null;

  // ── Wingman AI handler ─────────────────────────────────────────────────────
  // ── Derive other-party info (needed by Wingman + chat view) ───────────────
  const otherEmail = selectedThread ? getOtherEmail(selectedThread) : '';
  const otherProfile = otherEmail ? getProfile(otherEmail) : null;
  const otherName = otherProfile?.display_name || otherEmail || title || 'Chat';

  const handleWingmanTap = useCallback(async () => {
    if (wingmanLoading) return;

    // CHROME tier gating
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('email', authUser.email)
          .single();
        const tier = (profile?.subscription_tier || 'FREE').toUpperCase();
        if (tier !== 'CHROME' && tier !== 'ELITE') {
          toast('Upgrade to CHROME for Wingman suggestions', {
            style: { background: '#1C1C1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          });
          return;
        }
      }
    } catch {
      // If tier check fails, proceed anyway (fail-open for MVP)
    }

    // Need the other profile's ID for the API call
    if (!otherProfile?.id) {
      toast.error('Profile not loaded yet');
      return;
    }

    setWingmanLoading(true);
    setWingmanError(false);
    setWingmanSuggestions(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/wingman', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          viewerEmail: currentUser.email,
          targetProfileId: otherProfile.id,
        }),
      });

      if (!res.ok) throw new Error('Wingman API error');

      const data = await res.json();
      setWingmanSuggestions({
        openers: data.openers || [],
        targetName: data.targetName || otherName,
      });
    } catch {
      setWingmanError(true);
      toast.error('Wingman is resting. Try again later.');
    } finally {
      setWingmanLoading(false);
    }
  }, [wingmanLoading, currentUser?.email, otherProfile?.id, otherName]);

  const handleWingmanSelect = useCallback((text) => {
    setNewMessage(text);
    setWingmanSuggestions(null);
    inputRef.current?.focus();
  }, []);

  const handleWingmanDismiss = useCallback(() => {
    setWingmanSuggestions(null);
    setWingmanError(false);
  }, []);

  // ── Photo upload ───────────────────────────────────────────────────────────
  const handlePhotoUpload = async (file) => {
    if (!file || !currentUser?.email) return;

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `chat-photos/${currentUser.id || currentUser.email}/${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file, { upsert: false });

      if (uploadError) {
        toast.error('Could not upload photo');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(path);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        toast.error('Could not get photo URL');
        return;
      }

      await handleSendSpecial({
        content: publicUrl,
        message_type: 'photo',
        metadata: { url: publicUrl },
      });
    } catch (err) {
      toast.error("Couldn't send photo. Try again.");
    }
  };

  // ── Share approximate location as a chat card ──────────────────────────────
  const handleShareLocation = async () => {
    if (!currentUser?.email || sending) return;
    setSending(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // coarse = intentional
          timeout: 10000,
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // Round to ~100m precision (3 decimal places) — never expose exact
      const approxLat = Math.round(lat * 1000) / 1000;
      const approxLng = Math.round(lng * 1000) / 1000;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Calculate approximate distance to the other user if we have their location
      let distanceLabel = '';
      if (otherProfile?.geoLat && otherProfile?.geoLng) {
        const R = 6371;
        const dLat = (otherProfile.geoLat - lat) * Math.PI / 180;
        const dLng = (otherProfile.geoLng - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(otherProfile.geoLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (km < 1) distanceLabel = '<1 km away';
        else if (km < 5) distanceLabel = `~${Math.round(km)} km away`;
        else distanceLabel = `~${Math.round(km / 5) * 5} km away`;
      }

      const locationContent = JSON.stringify({
        type: 'location',
        approxLat,
        approxLng,
        distanceLabel,
        expiresAt,
      });

      await handleSendSpecial({
        content: `📍 My Location${distanceLabel ? ' — ' + distanceLabel : ''}`,
        message_type: 'location',
        metadata: {},
      });

      // Write to location_shares with expiry
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('location_shares').insert({
          user_id: session.user.id,
          current_lat: approxLat,
          current_lng: approxLng,
          active: true,
        }).catch(() => {}); // best-effort
      }

      toast.success('Location shared (expires in 1 hour)');
    } catch {
      toast.error("Couldn't get your location. Check permissions.");
    } finally {
      setSending(false);
    }
  };

  const isUnread = (thread) => {
    if (!thread.last_message_at) return false;
    return new Date(thread.last_message_at).getTime() > getLastRead(thread.id);
  };

  const filteredThreads = threads.filter(t => {
    if (!searchQuery) return true;
    const email = getOtherEmail(t);
    const p = getProfile(email);
    return (p?.display_name || 'Anonymous').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ── Thread list ────────────────────────────────────────────────────────────
  if (!selectedThread) {
    return (
      <div className="h-full flex flex-col">
        <SheetSection>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </SheetSection>

        <SheetDivider />

        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 font-bold">No conversations yet</p>
              <p className="text-white/20 text-sm mt-1">Tap someone's profile to start chatting</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredThreads.map(thread => {
                const email = getOtherEmail(thread);
                const p = getProfile(email);
                const unread = isUnread(thread);
                const name = p?.display_name || 'Anonymous';

                return (
                  <button
                    key={thread.id}
                    onClick={() => openThread(thread)}
                    className="w-full p-4 hover:bg-white/5 transition-colors text-left flex items-center gap-3 active:bg-white/10"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C8962C] to-[#8B6914] flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-black text-white">{name[0]?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                      {unread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#C8962C] rounded-full border-2 border-black" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-white truncate', unread ? 'font-black' : 'font-semibold')}>{name}</p>
                      <p className="text-white/40 text-xs truncate">{thread.last_message || 'Start chatting...'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {thread.last_message_at && (
                        <p className="text-white/30 text-xs">
                          {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                        </p>
                      )}
                      <ChevronRight className="w-4 h-4 text-white/20 ml-auto mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header — noir glass with gold accent line */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#C8962C]/20 flex-shrink-0 relative overflow-hidden" style={{ background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        {/* Subtle gold shimmer line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8962C]/40 to-transparent" />
        <button onClick={handleBack} className="text-white/60 p-1 active:scale-90 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => otherEmail && openSheet(SHEET_TYPES.PROFILE, { email: otherEmail })}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8962C] to-[#8B6914] flex items-center justify-center overflow-hidden ring-2 ring-[#C8962C]/30">
              {otherProfile?.avatar_url ? (
                <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-white">{otherName[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#34C759] rounded-full border-2 border-[#050507]" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate">{otherName}</p>
            <p className="text-[#8E8E93] text-xs truncate">
              {otherProfile?.distance_m != null
                ? otherProfile.distance_m < 1000
                  ? 'Nearby'
                  : `~${Math.round(otherProfile.distance_m / 1000)} km away`
                : otherProfile?.is_online
                  ? 'Online now'
                  : otherProfile?.last_seen
                    ? 'Recently active'
                    : 'Tap to view profile'}
            </p>
          </div>
        </button>

        {/* Report user */}
        <button
          onClick={() => openSheet('report', { userId: otherProfile?.id, userName: otherName })}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10 transition-colors"
          title="Report this user"
          aria-label="Report user"
        >
          <Flag className="w-3.5 h-3.5 text-white/30" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/40 text-sm">No messages yet. Say hi! 👋</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_email === currentUser?.email;
            const isMeetpoint = msg.message_type === 'meetpoint';
            const isHighlightedMsg = !!msg.metadata?.is_highlighted;
            const isPhoto =
              msg.message_type === 'photo' ||
              /\.(jpe?g|png|gif|webp|avif|heic)(\?.*)?$/i.test(msg.content || '');

            // Day separator — show date label when day changes
            let daySeparator = null;
            if (msg.created_date) {
              const msgDate = new Date(msg.created_date);
              const prevDate = i > 0 && messages[i - 1]?.created_date ? new Date(messages[i - 1].created_date) : null;
              const showSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
              if (showSep) {
                const today = new Date();
                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                let label = msgDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
                if (msgDate.toDateString() === today.toDateString()) label = 'Today';
                else if (msgDate.toDateString() === yesterday.toDateString()) label = 'Yesterday';
                daySeparator = (
                  <div className="flex items-center gap-3 py-2" key={`sep-${msg.id || i}`}>
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                );
              }
            }

            // Message status: ✓ (sent) → ✓✓ (delivered) → "Seen" (read, last msg only)
            const recipientUnread = selectedThread?.unread_count?.[otherEmail];
            const isReadByRecipient = isMe && recipientUnread === 0;
            const isLastFromMe = isMe && !messages.slice(i + 1).some(m => m.sender_email === currentUser?.email);
            const isFailed = !!msg._failed;
            const isOptimistic = !!msg._optimistic && !msg.id;
            // Only show "Seen" on the very last message from me — keeps it clean
            const messageStatus = !isMe ? null
              : isFailed ? '!'
              : isReadByRecipient && isLastFromMe ? 'Seen'
              : msg.id ? '✓✓' : '✓';

            return (
              <React.Fragment key={msg.id || i}>
              {daySeparator}
              <motion.div
                initial={{ opacity: isOptimistic ? 0.7 : 0, y: isOptimistic ? 4 : 8 }}
                animate={{ opacity: isFailed ? 1 : isOptimistic ? 0.7 : 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
              >
                {msg.message_type === 'travel' && msg.metadata ? (
                  <JourneyStatusCard metadata={msg.metadata} isMe={isMe} otherName={otherName} />
                ) : msg.message_type === 'location' ? (
                  <LocationCard msg={msg} isMe={isMe} otherName={otherName} />
                ) : isMeetpoint && msg.metadata ? (
                  <MeetpointCard {...msg.metadata} />
                ) : isPhoto ? (
                  <div className={cn('max-w-[80%]', isMe ? 'items-end flex flex-col' : 'items-start flex flex-col')}>
                    <img
                      src={msg.content}
                      alt="Photo"
                      className="max-w-[200px] rounded-xl cursor-pointer border border-white/10"
                      onClick={() => window.open(msg.content, '_blank')}
                    />
                    {msg.created_date && (
                      <p className="text-[10px] mt-1 opacity-40 text-white flex items-center gap-0.5">
                        {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        {isMe && messageStatus && <motion.span initial={messageStatus === 'Seen' ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={messageStatus === 'Seen' ? { delay: 0.2, duration: 0.3 } : { duration: 0.15 }} className={`text-[10px] ml-1 ${messageStatus === 'Seen' ? 'text-[#C8962C] font-medium' : messageStatus === '!' ? 'text-[#FF3B30] font-bold' : 'text-white/30'}`}>{messageStatus === '!' ? '⚠ Tap to retry' : messageStatus}</motion.span>}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[80%] px-4 py-2.5 rounded-2xl transition-opacity',
                      isMe
                        ? 'hm-bubble-sent rounded-br-sm'
                        : 'hm-bubble-received rounded-bl-sm',
                      isHighlightedMsg && 'ring-2 ring-[#C8962C] ring-offset-1 ring-offset-[#050507]',
                      isFailed && 'ring-1 ring-[#FF3B30]/50',
                    )}
                    style={isMe && isFailed ? { background: '#1C1C1E', color: '#fff' } : isHighlightedMsg && isMe ? { background: 'linear-gradient(135deg, #CFAF6A 0%, #F2D38B 100%)' } : isHighlightedMsg && !isMe ? { background: '#1C1C1E', border: '2px solid #C8962C' } : undefined}
                    onClick={isFailed ? () => {
                      // Remove failed message and retry
                      setMessages(prev => prev.filter(m => m !== msg));
                      setNewMessage(msg.content);
                    } : undefined}
                    role={isFailed ? 'button' : undefined}
                  >
                    {isHighlightedMsg && (
                      <div className="flex items-center gap-1 mb-1">
                        <Zap className="w-3 h-3 text-[#C8962C]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#C8962C]">Highlighted</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.created_date && (
                      <p className="text-[10px] mt-1 opacity-50 flex items-center gap-0.5">
                        {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        {isMe && messageStatus && <motion.span initial={messageStatus === 'Seen' ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={messageStatus === 'Seen' ? { delay: 0.2, duration: 0.3 } : { duration: 0.15 }} className={`text-[10px] ml-1 ${messageStatus === 'Seen' ? 'text-[#C8962C] font-medium' : messageStatus === '!' ? 'text-[#FF3B30] font-bold' : 'text-white/30'}`}>{messageStatus === '!' ? '⚠ Tap to retry' : messageStatus}</motion.span>}
                      </p>
                    )}
                  </div>
                )}
                {/* Inline travel card — auto-detect postcode/venue in text messages */}
                {msg.message_type === 'text' && (() => {
                  const loc = parseLocation(msg.content);
                  if (!loc || loc.confidence < 0.5) return null;
                  const cachedPos = typeof window !== 'undefined' ? window.__hm_last_pos : null;
                  return (
                    <div className={cn('mt-1.5', isMe ? 'flex justify-end' : 'flex justify-start')}>
                      <ChatTravelCard
                        location={loc}
                        isMe={isMe}
                        userLat={cachedPos?.lat}
                        userLng={cachedPos?.lng}
                        onRoute={() => {
                          if (loc.lat && loc.lng) {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
                            window.open(url, '_blank');
                          }
                        }}
                      />
                    </div>
                  );
                })()}
              </motion.div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-white/40 text-xs">{typingUsers[0]} is typing…</span>
        </div>
      )}

      {/* Wingman suggestions panel */}
      <AnimatePresence>
        {(wingmanSuggestions || wingmanLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="border-t border-[#C8962C]/30 bg-black/90 backdrop-blur-sm flex-shrink-0 overflow-hidden"
          >
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8962C]" />
                  <span className="text-xs font-bold text-[#C8962C] uppercase tracking-wider">Wingman</span>
                </div>
                <button
                  onClick={handleWingmanDismiss}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
                  aria-label="Dismiss suggestions"
                >
                  <X className="w-3 h-3 text-white/50" />
                </button>
              </div>

              {wingmanLoading ? (
                <div className="space-y-2 pb-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-10 rounded-xl animate-pulse bg-white/[0.06] border border-[#C8962C]/20" />
                  ))}
                </div>
              ) : wingmanSuggestions?.openers?.length > 0 ? (
                <div className="space-y-2 pb-1">
                  {wingmanSuggestions.openers.map((opener, i) => (
                    <button
                      key={i}
                      onClick={() => handleWingmanSelect(opener.text)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-[#C8962C]/30 bg-[#1C1C1E] text-white text-sm leading-snug active:bg-[#C8962C]/20 active:scale-[0.98] transition-all"
                      aria-label={`Use suggestion: ${opener.text}`}
                    >
                      {opener.text}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer — noir glass with gold top accent */}
      <div className="border-t border-[#C8962C]/15 flex-shrink-0 relative" style={{ background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8962C]/30 to-transparent" />
        {/* Action bar */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-1">
          {/* Camera / Attach */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
              // Reset so same file can be re-selected
              e.target.value = '';
            }}
          />
          <button
            onClick={() => photoInputRef.current?.click()}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
            title="Photo"
          >
            <Camera className="w-4 h-4 text-white/50" />
          </button>

          {/* Video call */}
          <button
            onClick={() => {
              if (!otherProfile?.id) {
                toast.error('Profile not ready yet. Try again in a moment.');
                return;
              }
              setShowVideoModal(true);
            }}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
            title="Video call"
          >
            <Video className="w-4 h-4 text-[#C8962C]" />
          </button>

          {/* Share location */}
          <button
            onClick={handleShareLocation}
            disabled={sending}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-95 transition-transform"
            title="Share approximate location"
          >
            <Navigation className="w-4 h-4 text-[#C8962C]" />
          </button>

          {/* Wingman AI */}
          <button
            onClick={handleWingmanTap}
            disabled={wingmanLoading}
            className={cn(
              'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-all active:scale-95',
              wingmanLoading
                ? 'bg-[#C8962C]/20 border-[#C8962C]/40'
                : 'bg-white/5 border-[#C8962C]/50 hover:bg-[#C8962C]/10'
            )}
            title="Wingman - AI conversation starters"
            aria-label="Get Wingman conversation suggestions"
          >
            {wingmanLoading ? (
              <Loader2 className="w-4 h-4 text-[#C8962C] animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#C8962C]" />
            )}
          </button>

        </div>

        {/* Highlight toggle indicator */}
        {highlightNext && (
          <div className="px-3 py-1 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#C8962C]" />
            <span className="text-xs font-bold text-[#C8962C]">Next message will be highlighted</span>
            <button onClick={() => setHighlightNext(false)} className="ml-auto text-xs text-white/40">Cancel</button>
          </div>
        )}

        {/* Text input row — auto-grow textarea (WhatsApp pattern) */}
        <div className="flex items-end gap-2 px-3 pb-3">
          {/* Highlight message button */}
          <button
            onClick={() => {
              if (isBoostActive('highlighted_message')) {
                setHighlightNext(prev => !prev);
              } else {
                openSheet('boost-shop', {});
              }
            }}
            className={cn(
              'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-all active:scale-95',
              highlightNext
                ? 'bg-[#C8962C]/20 border-[#C8962C]/50'
                : 'bg-white/5 border-white/10'
            )}
            title={isBoostActive('highlighted_message') ? 'Highlight this message' : 'Get Highlighted Message power-up'}
            aria-label="Highlight message"
          >
            <Zap className={cn('w-4 h-4', highlightNext ? 'text-[#C8962C]' : 'text-white/40')} />
          </button>

          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={e => {
              setNewMessage(e.target.value);
              sendTyping(true);
              // Auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-[#1C1C1E] border border-white/[0.06] rounded-2xl text-sm text-white placeholder-white/30 focus:border-[#C8962C]/40 focus:ring-1 focus:ring-[#C8962C]/20 transition-all resize-none py-2.5 px-4 min-h-[40px] max-h-[120px] overflow-y-auto"
            disabled={sending}
            style={{ height: '40px' }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className={cn(
              'flex-shrink-0 w-9 h-9 p-0 rounded-full transition-colors',
              newMessage.trim()
                ? 'bg-[#C8962C] hover:bg-[#C8962C]/90 text-black'
                : 'bg-[#1C1C1E] border border-white/10 text-white/50'
            )}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : newMessage.trim() ? (
              <Send className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Video call modal */}
      {showVideoModal && otherProfile?.id && (
        <VideoCallModal
          remoteUserId={otherProfile.id}
          remoteUserName={otherName}
          remoteUserPhoto={otherProfile?.avatar_url}
          onClose={() => setShowVideoModal(false)}
        />
      )}

      {/* Travel / meetpoint modal */}
      {showTravelModal && (
        <TravelModal
          onSend={handleSendSpecial}
          onClose={() => setShowTravelModal(false)}
        />
      )}

    </div>
  );
}
