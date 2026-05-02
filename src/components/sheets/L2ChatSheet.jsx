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
  Send, ArrowLeft,
  Loader2, Search, ChevronRight,
  Camera, Mic, Video, Navigation, MapPin,
  Sparkles, X, Flag, Ghost,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetSection, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadToStorage } from '@/lib/uploadToStorage';
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
        const emailKey = userEmail.toLowerCase();
        const updated = { ...(row.unread_count || {}), [emailKey]: 0 };
        supabase
          .from('chat_threads')
          .update({ unread_count: updated })
          .eq('id', threadId)
          .then(({ error }) => {
            if (error) console.error('[Chat] markRead update failed:', error.message);
            else console.log(`[Chat] Thread ${threadId} marked read for ${emailKey}`);
          });
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

  const handleOpenMaps = (e) => {
    e?.stopPropagation();
    console.log('[LocationCard] 🗺️ Tap detected. Metadata:', msg.metadata);
    
    const lat = msg.metadata?.approxLat;
    const lng = msg.metadata?.approxLng;
    
    if (lat && lng) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      console.log('[LocationCard] 🚀 Opening Google Maps:', url);
      const win = window.open(url, '_blank');
      if (!win) {
        console.warn('[LocationCard] ⚠️ Popup blocked. Falling back to same-window redirect.');
        window.location.href = url;
      }
    } else {
      console.error('[LocationCard] ❌ Approx coordinates missing in metadata:', { lat, lng });
      toast.error('Location data missing.');
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleOpenMaps}
      className={cn(
        'max-w-[80%] px-4 py-3 rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer active:scale-95',
        isExpired
          ? 'bg-white/5 border-white/10 opacity-60'
          : isMe ? 'bg-[#C8962C]/15 border-[#C8962C]/30' : 'bg-[#1C1C1E] border-white/10',
        msg._isUploading && 'opacity-60 blur-[1px]'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-lg transition-all duration-300', (pulseActive || msg._isUploading) && 'animate-pulse')}>📍</span>
        <span className="text-sm font-bold text-white">
          {msg._isUploading ? 'Locating...' : isExpired ? 'Location expired' : isMe ? 'My Location' : `${otherName}'s Location`}
        </span>
      </div>
      {!isExpired && distText && !msg._isUploading && (
        <p className="text-xs text-white/60 mt-1 ml-7">{distText}</p>
      )}
      {msg._isUploading && (
        <p className="text-[10px] text-white/40 mt-1 ml-7 animate-pulse">Establishing GPS lock...</p>
      )}
      <div className="flex items-center justify-between mt-2 ml-7">
        <p className="text-[10px] text-white/30">
          {msg._isUploading ? 'Searching...' : isExpired
            ? sentAt ? formatDistanceToNow(sentAt, { addSuffix: true }) : ''
            : `Expires in ${minsLeft} min`}
        </p>
        {!msg._isUploading && !isExpired && (
          <div className="flex items-center gap-1">
             <span className="text-[10px] font-bold text-[#C8962C] uppercase tracking-wider">Tap for Maps</span>
             <ChevronRight className="w-3 h-3 text-[#C8962C]" />
          </div>
        )}
        {msg._isUploading && (
          <Loader2 className="w-3 h-3 text-white/20 animate-spin" />
        )}
      </div>
    </motion.div>
  );
}

/** MapPin card — renders a static Google Map with "Get Directions" action */
function MapPinCard({ msg, isMe, otherName }) {
  const lat = msg.metadata?.lat;
  const lng = msg.metadata?.lng;
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY;
  
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;

  const handleOpenMaps = (e) => {
    e?.stopPropagation();
    console.log('[MapPinCard] 🗺️ Tap detected. Metadata:', msg.metadata);
    
    const lat = msg.metadata?.lat;
    const lng = msg.metadata?.lng;
    
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      console.log('[MapPinCard] 🚀 Opening Google Maps:', url);
      const win = window.open(url, '_blank');
      if (!win) {
        console.warn('[MapPinCard] ⚠️ Popup blocked. Falling back to same-window redirect.');
        window.location.href = url;
      }
    } else {
      console.error('[MapPinCard] ❌ Coordinates missing in metadata:', { lat, lng });
      toast.error('Location data missing or corrupted.');
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'max-w-[85%] rounded-2xl border overflow-hidden transition-all duration-300',
        isMe ? 'bg-[#C8962C]/15 border-[#C8962C]/30' : 'bg-[#1C1C1E] border-white/10'
      )}
    >
      <div className="p-3 border-b border-white/5 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#C8962C]" />
        <span className="text-sm font-bold text-white">
          {isMe ? 'My location' : `${otherName}'s location`}
        </span>
      </div>
      
      <div 
        className="relative aspect-video bg-white/5 cursor-pointer overflow-hidden group/map"
        onClick={handleOpenMaps}
      >
        <img 
          src={mapUrl} 
          alt="Map Pin" 
          className="w-full h-full object-cover transition-transform duration-500 group-hover/map:scale-110" 
        />
        <div className="absolute inset-0 bg-black/20 group-hover/map:bg-black/0 transition-colors" />
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 opacity-0 group-hover/map:opacity-100 transition-opacity">
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">Tap to open map</span>
        </div>
      </div>

      <button 
        onClick={handleOpenMaps}
        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
      >
        <Navigation className="w-3.5 h-3.5" />
        Get Directions
      </button>
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
export default function L2ChatSheet({ thread: initialThreadId, to: initialToEmail, userId: initialUserId, toUid, title, meetMode, suggestStop, otherIsMoving, otherIsListening, otherRadioShow }) {
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

  // ── Pre-seed composer for movement flows ──────────────────────────────────
  const [hasPreSeeded, setHasPreSeeded] = useState(false);
  useEffect(() => {
    if (hasPreSeeded) return;
    if (suggestStop) {
      setNewMessage("You\u2019re passing near me \u2014 quick stop?");
      setHasPreSeeded(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    } else if (meetMode && otherIsMoving) {
      setNewMessage("Meet on the way?");
      setHasPreSeeded(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [suggestStop, meetMode, otherIsMoving, hasPreSeeded]);

  // ── Resolve userId → email internally (GDPR: email never exposed as prop) ──
  const [resolvedToEmail, setResolvedToEmail] = useState(initialToEmail || null);
  useEffect(() => {
    if (!resolvedUserId || resolvedToEmail) return;
    
    // Fetch target user's email from profiles
    supabase
      .from('profiles')
      .select('email')
      .eq('id', resolvedUserId)
      .single()
      .then(({ data }) => {
        if (data?.email) {
          setResolvedToEmail(data.email);
        }
      })
      .catch((err) => {
        console.warn('[Chat] Target lookup failed.', err);
      });
  }, [resolvedUserId]);  

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
    console.log('[Chat] 📤 Sending message:', { text, threadId: selectedThread?.id });

    try {
      let thread = selectedThread;

      // 1. Resolve/Create thread if it's a new conversation
      if (thread?._new) {
        console.log('[Chat] 🆕 Attempting to create new thread...');
        
        // Double check if a thread was created while we were typing
        const { data: existing } = await supabase
          .from('chat_threads')
          .select('*')
          .contains('participant_emails', thread.participant_emails)
          .maybeSingle();

        if (existing) {
          console.log('[Chat] ℹ️ Found existing thread, using it instead of creating new.');
          thread = existing;
        } else {
          const { data: newThread, error: threadErr } = await supabase
            .from('chat_threads')
            .insert({
              participant_emails: thread.participant_emails,
              active: true,
              last_message_at: new Date().toISOString(),
              unread_count: {} // Initialize unread count
            })
            .select()
            .single();

          if (threadErr) {
            console.error('[Chat] ❌ Thread Creation Error:', threadErr);
            throw threadErr;
          }
          thread = newThread;
          console.log('[Chat] ✅ New thread created:', thread.id);
        }
        
        setSelectedThread(thread);
        setThreads(prev => [thread, ...prev.filter(t => t.id !== thread.id)]);

        // Load profile for the other participant
        const other = thread.participant_emails.find(e => e !== currentUser.email);
        if (other) await loadProfilesByEmail([other]);
      }

      // 2. Optimistic Update
      const isHighlighted = highlightNext && isBoostActive('highlighted_message');
      const now = new Date().toISOString();
      const optimisticMsg = {
        _optimistic: true, 
        thread_id: thread.id,
        sender_email: currentUser.email,
        content: isHighlighted ? JSON.stringify({ text, is_highlighted: true }) : text,
        message_type: 'text',
        created_date: now,
      };
      setMessages(prev => [...prev, optimisticMsg]);

      // 3. Insert Message to DB
      console.log('[Chat] 💾 Inserting message to DB...');
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: thread.id,
          sender_email: currentUser.email,
          content: isHighlighted ? JSON.stringify({ text, is_highlighted: true }) : (text || optimisticMsg.content),
          message_type: 'text',
          created_date: new Date().toISOString(),
          metadata: {}, // Ensure metadata is present even for text messages
        });

      if (msgError) {
        console.error('[Chat] ❌ Message Insertion Error:', msgError.message, msgError.details, msgError.code);
        throw msgError;
      }

      if (isHighlighted) setHighlightNext(false);

      // 4. Update thread metadata (last message, unread counts)
      const recipientEmail = thread.participant_emails?.find(e => e !== currentUser.email);
      if (recipientEmail) {
        const currentUnread = thread.unread_count || {};
        const emailKey = recipientEmail.toLowerCase();
        const newUnreadCount = { ...currentUnread, [emailKey]: (currentUnread[emailKey] || 0) + 1 };

        // Push notification (async, non-blocking)
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

        console.log('[Chat] 📈 Updating thread unread counts...');
        const { error: threadUpdateErr } = await supabase
          .from('chat_threads')
          .update({
            last_message: text.slice(0, 80),
            last_message_at: new Date().toISOString(),
            unread_count: newUnreadCount,
          })
          .eq('id', thread.id);
        
        if (threadUpdateErr) {
          console.warn('[Chat] ⚠️ Thread update warning (non-fatal):', threadUpdateErr.message);
        }

        setSelectedThread(prev => prev ? { ...prev, unread_count: newUnreadCount } : prev);
      }

      console.log('[Chat] ✨ Message sent successfully!');
      
      // Mark read as part of the send flow
      markRead(thread.id, currentUser?.email);

      // Refresh if no realtime
      if (!realtimeRef.current || thread?._new) {
        openThread(thread);
      }
    } catch (err) {
      console.error('[Chat] 💥 Critical Send Error:', err);
      toast.error("Couldn't send. Tap message to retry.");
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
    console.log('[Chat] 🌟 Sending special message:', { type: message_type });

    try {
      let thread = selectedThread;
      if (thread?._new) {
        // Shared logic with handleSend for new thread creation
        const { data: existing } = await supabase
          .from('chat_threads')
          .select('*')
          .contains('participant_emails', thread.participant_emails)
          .maybeSingle();

        if (existing) {
          thread = existing;
        } else {
          const { data: newThread, error: threadErr } = await supabase
            .from('chat_threads')
            .insert({
              participant_emails: thread.participant_emails,
              active: true,
              last_message_at: new Date().toISOString(),
              unread_count: {}
            })
            .select().single();
          if (threadErr) throw threadErr;
          thread = newThread;
        }
        setSelectedThread(thread);
        setThreads(prev => [thread, ...prev.filter(t => t.id !== thread.id)]);
      }

      console.log('[Chat] 💾 Inserting special message:', { type: message_type, metadata });
      const { error: msgError } = await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_email: currentUser.email,
        content,
        message_type,
        metadata, // Fix: Include metadata!
        created_date: new Date().toISOString(),
      });
      if (msgError) {
        console.error('[Chat] ❌ Special Message Insert Error:', msgError);
        throw msgError;
      }

      const recipientEmail = thread.participant_emails?.find(e => e !== currentUser.email);
      const lastMsg = message_type === 'location' ? '📍 Location shared' : message_type === 'travel' ? '🚗 On the way' : message_type === 'photo' ? '📷 Photo' : content.slice(0, 80);

      if (recipientEmail) {
        const currentUnread = thread.unread_count || {};
        const emailKey = recipientEmail.toLowerCase();
        const newUnreadCount = { ...currentUnread, [emailKey]: (currentUnread[emailKey] || 0) + 1 };

        pushNotify({
          emails: [recipientEmail],
          title: profiles[currentUser.email]?.display_name || 'Someone',
          body: lastMsg,
          tag: `chat-${thread.id}`,
          url: `/ghosted?sheet=chat&thread=${thread.id}`,
        });

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

      // Manual fallback refresh to ensure message appears immediately even if Realtime is off
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_date', { ascending: true });
      
      if (msgs) {
        setMessages(msgs);
        console.log('[Chat] 🔄 Manual message refresh success.');
      }

      if (!realtimeRef.current) openThread(thread);
    } catch (err) {
      console.error('[Chat] 💥 Special Send Error:', err);
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

    // 1. Create a local preview URL for optimistic UI
    const previewUrl = URL.createObjectURL(file);
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    const optimisticPhoto = {
      id: tempId,
      _optimistic: true,
      _isUploading: true,
      thread_id: selectedThread?.id,
      sender_email: currentUser.email,
      content: previewUrl,
      message_type: 'photo',
      created_date: now,
    };

    // Add to messages immediately
    setMessages(prev => [...prev.filter(m => m.id !== tempId), optimisticPhoto]);
    console.log('[Chat] 🖼️ Starting optimistic photo upload...');

    try {
      const publicUrl = await uploadToStorage(
        file,
        'chat-attachments',
        currentUser.id || currentUser.email,
      );

      console.log('[Chat] ✅ Photo uploaded to storage. Updating preview...');

      // 2. Update the optimistic preview to use the real URL (prevents flicker)
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, content: publicUrl, _isUploading: false } : m
      ));

      // 3. Send the real message to the database
      await handleSendSpecial({
        content: publicUrl,
        message_type: 'photo',
        metadata: { url: publicUrl },
      });

      // 4. Finally clean up after the real message has likely arrived via realtime
      // (or handleSendSpecial's internal refetch)
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        URL.revokeObjectURL(previewUrl);
      }, 500);

    } catch (err) {
      console.error('[Chat] Photo upload error:', err);
      toast.error("Couldn't send photo. Try again.");
      // Mark it as failed so user can try again
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, _isUploading: false, _failed: true } : m
      ));
    }
  };

  // ── Share approximate location as a chat card ──────────────────────────────
  const handleShareLocation = async () => {
    if (!currentUser?.email || sending) return;
    setSending(true);

    const tempId = `loc-${Date.now()}`;
    const now = new Date().toISOString();

    // 0. Pre-check: App-level consent
    const { data: profile } = await supabase.from('profiles').select('location_consent').eq('email', currentUser.email).single();
    if (profile && profile.location_consent === false) {
      toast.error('Location sharing is OFF in your settings. Enable it in your profile to share.', {
        action: { label: 'Settings', onClick: () => openSheet('edit-profile') }
      });
      setSending(false);
      return;
    }

    // 1. Optimistic Bubble - Show "Locating..." immediately
    const optimisticLoc = {
      id: tempId,
      _optimistic: true,
      _isUploading: true, // We repurpose this for GPS loading
      thread_id: selectedThread?.id,
      sender_email: currentUser.email,
      content: '📍 Locating...',
      message_type: 'location',
      created_date: now,
      metadata: {}
    };
    setMessages(prev => [...prev.filter(m => m.id !== tempId), optimisticLoc]);

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (err) => {
          console.warn('[Chat] High accuracy failed, retrying with low accuracy...', err.message);
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
          });
        }, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const approxLat = Math.round(lat * 1000) / 1000;
      const approxLng = Math.round(lng * 1000) / 1000;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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

      const content = `📍 My Location${distanceLabel ? ' — ' + distanceLabel : ''}`;
      const metadata = { approxLat, approxLng, expiresAt, distanceLabel };
      console.log('[Chat] 📍 Generated location metadata:', metadata);

      // 2. Update optimistic bubble with real coordinates
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, content, metadata, _isUploading: false } : m
      ));

      // 3. Send real message
      console.log('[Chat] 📤 Sending approximate location...');
      await handleSendSpecial({
        content,
        message_type: 'location',
        metadata,
      });

      // 4. Persistence cleanup
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }, 500);

      toast.success('Location shared (expires in 1 hour)');
    } catch (err) {
      console.error('[Chat] Location share error:', err);
      const isSecure = window.isSecureContext;
      const origin = window.location.origin;
      
      console.log('[Chat] Debug Info:', { isSecure, origin, errCode: err.code });

      if (!isSecure && !origin.includes('localhost')) {
        toast.error("Geolocation requires HTTPS or localhost. Try using 'http://localhost:5173'", { duration: 10000 });
      } else if (err.code === 1) { // PERMISSION_DENIED
        toast.error("Browser blocked location. Reset permissions in your address bar (lock icon) and refresh.", { duration: 6000 });
      } else {
        toast.error("Couldn't get your location. Check GPS settings.");
      }
      setMessages(prev => prev.filter(m => m.id !== tempId));
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
              <Ghost className="w-10 h-10 mx-auto mb-3" style={{ color: '#C8962C', opacity: 0.3 }} />
              <p className="text-white/50 font-bold">No conversations yet</p>
              <p className="text-white/25 text-sm mt-1">Boo someone in Ghosted to start</p>
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
            {/* Status indicator — navigation arrow when moving, green dot otherwise */}
            {(otherIsMoving || otherProfile?.movement_active || otherProfile?.is_moving) ? (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#050507] flex items-center justify-center" style={{ background: '#C8962C' }}>
                <Navigation className="w-2 h-2 text-black" />
              </span>
            ) : (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#34C759] rounded-full border-2 border-[#050507]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate">{otherName}</p>
            <p className="text-xs truncate" style={{ color: (otherIsMoving || otherProfile?.movement_active || otherProfile?.is_moving) ? '#C8962C' : '#8E8E93' }}>
              {(() => {
                const isOtherMoving = otherIsMoving || otherProfile?.movement_active || otherProfile?.is_moving;
                const parts = [];
                // Distance
                if (otherProfile?.distance_m != null) {
                  if (otherProfile.distance_m < 100) parts.push('<100m');
                  else if (otherProfile.distance_m < 1000) parts.push(`${Math.round(otherProfile.distance_m)}m`);
                  else parts.push(`${(otherProfile.distance_m / 1000).toFixed(1)}km`);
                }
                // Context — movement gets richer label
                if (isOtherMoving) {
                  const eta = otherProfile?.movement_eta || otherProfile?.eta;
                  const dest = otherProfile?.movement_destination || otherProfile?.destination_label;
                  if (eta) parts.push(`Moving · ${eta}`);
                  else if (dest) parts.push(`On the way to ${dest}`);
                  else parts.push('On the move nearby');
                } else if (otherProfile?.venue_name || otherProfile?.checkin_venue) {
                  parts.push(`At ${otherProfile.venue_name || otherProfile.checkin_venue}`);
                } else if (otherIsListening && otherRadioShow) {
                  parts.push(`Listening · ${otherRadioShow}`);
                } else if (otherIsListening) {
                  parts.push('Listening live');
                } else if (otherProfile?.is_online) {
                  parts.push('Online');
                } else if (otherProfile?.last_seen) {
                  parts.push('Recently active');
                }
                return parts.length > 0 ? parts.join(' · ') : 'Tap to view profile';
              })()}
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
          <div className="text-center py-10 px-6">
            {/* Movement-aware contextual headline */}
            {(otherIsMoving || otherProfile?.movement_active || otherProfile?.is_moving) ? (
              <>
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  <Navigation className="w-4 h-4" style={{ color: '#C8962C' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#C8962C' }}>Moving</span>
                </div>
                <p className="text-white font-bold text-base mb-1">He's on the move nearby</p>
                <p className="text-white/40 text-sm mb-5">
                  {suggestStop ? 'Suggest a quick stop' : meetMode ? 'Pick a meetpoint' : 'Share a meetpoint or suggest a stop'}
                </p>
              </>
            ) : otherProfile?.venue_name || otherProfile?.checkin_venue ? (
              <>
                <p className="text-white font-bold text-base mb-1">
                  {`He's at ${otherProfile.venue_name || otherProfile.checkin_venue}`}
                </p>
                <p className="text-white/40 text-sm mb-5">
                  Send a Boo, share a meetpoint, or just say hey
                </p>
              </>
            ) : otherIsListening ? (
              <>
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#00C2E0] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00C2E0]">Tuned In</span>
                </div>
                <p className="text-white font-bold text-base mb-1">
                  {otherRadioShow ? `You're both tuned in` : `He's listening live`}
                </p>
                <p className="text-white/40 text-sm mb-5">
                  {otherRadioShow ? `Same moment — ${otherRadioShow}` : 'Send a Boo or say something'}
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-bold text-base mb-1">You're both nearby</p>
                <p className="text-white/40 text-sm mb-5">
                  Send a Boo, share a meetpoint, or just say hey
                </p>
              </>
            )}

            {/* Movement quick actions — different hierarchy when moving */}
            {(otherIsMoving || otherProfile?.movement_active || otherProfile?.is_moving) ? (
              <div className="flex flex-col items-center gap-2">
                {/* Primary: Share meetpoint */}
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = Math.round(pos.coords.latitude * 1000) / 1000;
                          const lng = Math.round(pos.coords.longitude * 1000) / 1000;
                          handleSendSpecial?.({
                            content: '\u{1F4CD} My Location \u2014 meet here?',
                            message_type: 'location',
                            metadata: { approxLat: lat, approxLng: lng },
                          });
                        },
                        () => toast('Location not available'),
                        { enableHighAccuracy: false, timeout: 5000 }
                      );
                    }
                  }}
                  className="h-11 px-6 rounded-full text-sm font-bold active:scale-95 transition-transform"
                  style={{ background: '#C8962C', color: '#000' }}
                >
                  Share meetpoint
                </button>
                <div className="flex items-center gap-2">
                  {/* Suggest Stop pre-seeded message */}
                  <button
                    onClick={() => {
                      setNewMessage("You\u2019re passing near me \u2014 quick stop?");
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="h-10 px-4 rounded-full text-xs font-bold active:scale-95 transition-transform"
                    style={{ background: 'rgba(200,150,44,0.12)', color: '#C8962C', border: '1px solid rgba(200,150,44,0.2)' }}
                  >
                    Suggest a stop
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentUser?.id || !otherProfile?.id) return;
                      try {
                        await supabase.from('taps').insert({
                          from_user_id: currentUser.auth_user_id || currentUser.id,
                          to_user_id: otherProfile.id,
                          tapper_email: currentUser.email || '',
                          tapped_email: otherEmail || '',
                          tap_type: 'boo',
                        });
                        if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(50);
                        toast('Boo sent');
                      } catch { /* best-effort */ }
                    }}
                    className="h-10 px-4 rounded-full text-xs font-bold bg-white/8 text-white/60 active:scale-95 transition-transform border border-white/10"
                  >
                    Boo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={async () => {
                    if (!currentUser?.id || !otherProfile?.id) return;
                    try {
                      await supabase.from('taps').insert({
                        from_user_id: currentUser.auth_user_id || currentUser.id,
                        to_user_id: otherProfile.id,
                        tapper_email: currentUser.email || '',
                        tapped_email: otherEmail || '',
                        tap_type: 'boo',
                      });
                      if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(50);
                      toast('Boo sent');
                    } catch { /* best-effort */ }
                  }}
                  className="h-10 px-5 rounded-full text-sm font-bold active:scale-95 transition-transform"
                  style={{ background: '#C8962C', color: '#000' }}
                >
                  Boo
                </button>
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = Math.round(pos.coords.latitude * 1000) / 1000;
                          const lng = Math.round(pos.coords.longitude * 1000) / 1000;
                          handleSendSpecial?.({
                            content: `\u{1F4CD} My Location`,
                            message_type: 'location',
                            metadata: { approxLat: lat, approxLng: lng },
                          });
                        },
                        () => toast('Location not available'),
                        { enableHighAccuracy: false, timeout: 5000 }
                      );
                    }
                  }}
                  className="h-10 px-5 rounded-full text-sm font-bold bg-white/10 text-white active:scale-95 transition-transform border border-white/10"
                >
                  Share location
                </button>
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="h-10 px-5 rounded-full text-sm font-bold bg-white/5 text-white/60 active:scale-95 transition-transform border border-white/8"
                >
                  Message
                </button>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => {
            const myId = currentUser?.id;
            const myEmail = currentUser?.email?.toLowerCase();
            
            // Resilience: Check all possible ID and email variations from the DB
            const isMe = 
              (msg.sender_id && msg.sender_id === myId) || 
              (msg.from_user_id && msg.from_user_id === myId) ||
              (msg.sender_email && msg.sender_email.toLowerCase() === myEmail);
            
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
                className={cn('flex w-full px-2 mb-1', isMe ? 'justify-end' : 'justify-start')}
              >
                {msg.message_type === 'travel' && msg.metadata ? (
                  <JourneyStatusCard metadata={msg.metadata} isMe={isMe} otherName={otherName} />
                ) : msg.message_type === 'location' ? (
                  <LocationCard msg={msg} isMe={isMe} otherName={otherName} />
                ) : (msg.message_type === 'map_pin' || msg.message_type === 'map-pin') ? (
                  <MapPinCard msg={msg} isMe={isMe} otherName={otherName} />
                ) : isMeetpoint && msg.metadata ? (
                  <MeetpointCard {...msg.metadata} />
                ) : isPhoto ? (
                  <div className={cn('max-w-[70%] md:max-w-[280px]', isMe ? 'items-end flex flex-col' : 'items-start flex flex-col')}>
                    <div className="relative overflow-hidden rounded-2xl w-full aspect-auto">
                      <img
                        src={msg.content}
                        alt="Photo"
                        className={cn(
                          "w-full h-auto cursor-pointer border shadow-lg transition-all duration-500 rounded-2xl", 
                          isMe ? 'border-[#C8962C]/30' : 'border-white/10',
                          msg._isUploading && 'opacity-40 blur-[2px] grayscale-[0.3]'
                        )}
                        onClick={() => !msg._isUploading && window.open(msg.content, '_blank')}
                      />
                      {msg._isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    {msg.created_date && (
                      <p className="text-[10px] mt-1 opacity-40 text-white flex items-center gap-0.5 px-1">
                        {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        {isMe && messageStatus && <motion.span initial={messageStatus === 'Seen' ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={messageStatus === 'Seen' ? { delay: 0.2, duration: 0.3 } : { duration: 0.15 }} className={`text-[10px] ml-1 ${messageStatus === 'Seen' ? 'text-[#C8962C] font-medium' : messageStatus === '!' ? 'text-[#FF3B30] font-bold' : 'text-white/30'}`}>{messageStatus === '!' ? '⚠ Tap to retry' : messageStatus}</motion.span>}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[85%] px-4 py-2.5 rounded-[22px] shadow-lg transition-all',
                      isMe
                        ? 'rounded-br-none'
                        : 'rounded-bl-none',
                      isHighlightedMsg && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-black',
                    )}
                    style={{
                      background: isMe 
                        ? 'linear-gradient(135deg, #C8962C 0%, #E8A13D 100%)' 
                        : 'rgba(28, 28, 30, 0.95)',
                      color: isMe ? '#000' : '#fff',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      marginLeft: isMe ? 'auto' : '0',
                      border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)'
                    }}
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
