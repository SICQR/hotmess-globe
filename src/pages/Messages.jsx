/**
 * Messages - Mobile-first messaging experience
 * 
 * Features:
 * - Full-screen thread on mobile (no split view)
 * - Smooth slide transitions between list and thread
 * - Pull-to-refresh
 * - Swipe back gesture
 * - Typing indicators
 * - Read receipts
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Plus, ArrowLeft, Search, MoreVertical, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChatThread from '../components/messaging/ChatThread';
import ThreadList from '../components/messaging/ThreadList';
import NewMessageModal from '../components/messaging/NewMessageModal';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConversationListSkeleton } from '@/components/skeletons/PageSkeletons';
import EmptyState, { ErrorState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

// Get other participant info
function getOtherParticipant(thread, currentUser, allUsers) {
  const otherEmail = thread?.participant_emails?.find(e => e !== currentUser?.email);
  return allUsers?.find(u => u.email === otherEmail) || { email: otherEmail };
}

export default function Messages() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [prefillToEmail, setPrefillToEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: allUsers = [] } = useAllUsers();

  const requestedTo = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const raw = params.get('to');
      return raw ? String(raw).trim().toLowerCase() : null;
    } catch {
      return null;
    }
  }, [location.search]);

  const requestedThreadId = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const raw = params.get('thread');
      return raw ? String(raw).trim() : null;
    } catch {
      return null;
    }
  }, [location.search]);

  const { data: threads = [], isLoading, error, refetch } = useQuery({
    queryKey: ['chat-threads', currentUser?.email],
    queryFn: async () => {
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-last_message_at');
      return allThreads.filter(t => t.participant_emails.includes(currentUser.email));
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
    retry: 2,
  });

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t => {
      const other = getOtherParticipant(t, currentUser, allUsers);
      const name = other?.full_name || other?.display_name || other?.email || '';
      return name.toLowerCase().includes(q);
    });
  }, [threads, searchQuery, currentUser, allUsers]);

  // Deep-link handlers
  useEffect(() => {
    if (!currentUser || !requestedTo) return;
    if (requestedTo === String(currentUser.email || '').trim().toLowerCase()) return;
    setPrefillToEmail(requestedTo);
    setShowNewMessage(true);
  }, [currentUser, requestedTo]);

  useEffect(() => {
    if (!requestedThreadId || !threads?.length) return;
    if (selectedThread?.id === requestedThreadId) return;
    const match = threads.find((t) => String(t?.id) === requestedThreadId);
    if (match) setSelectedThread(match);
  }, [requestedThreadId, threads, selectedThread?.id]);

  const goToSocial = useCallback((tab) => {
    navigate(`/social?tab=${encodeURIComponent(tab === 'inbox' ? 'inbox' : 'discover')}`);
  }, [navigate]);

  const clearThreadParam = useCallback(() => {
    const params = new URLSearchParams(location.search || '');
    params.delete('thread');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  }, [location, navigate]);

  const backToInbox = useCallback(() => {
    setSelectedThread(null);
    if (requestedThreadId) clearThreadParam();
  }, [requestedThreadId, clearThreadParam]);

  const handleSelectThread = useCallback((thread) => {
    setSelectedThread(thread);
  }, []);

  // Get selected thread participant info
  const selectedParticipant = useMemo(() => {
    if (!selectedThread) return null;
    return getOtherParticipant(selectedThread, currentUser, allUsers);
  }, [selectedThread, currentUser, allUsers]);

  // Loading state
  if (!currentUser || isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Mobile: Full screen skeleton */}
        <div className="md:hidden">
          <div className="p-4 border-b border-white/10">
            <div className="h-8 w-32 bg-white/10 rounded animate-pulse mb-4" />
            <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
          </div>
          <ConversationListSkeleton count={8} />
        </div>
        {/* Desktop: Split view skeleton */}
        <div className="hidden md:flex max-w-7xl mx-auto">
          <div className="w-96 border-r border-white/10 p-6">
            <div className="h-8 w-40 bg-white/10 rounded mb-4 animate-pulse" />
            <div className="h-10 w-full bg-white/10 rounded mb-6 animate-pulse" />
            <ConversationListSkeleton count={6} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-32 h-32 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <ErrorState
          title="Couldn't load messages"
          description="We had trouble connecting to your inbox."
          type="network"
          onRetry={() => refetch()}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF1493]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00D9FF]/5 rounded-full blur-[150px]" />
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden relative z-10">
        <AnimatePresence mode="wait">
          {!selectedThread ? (
            // Thread List (Mobile)
            <motion.div
              key="thread-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-screen pb-24"
            >
              {/* Header */}
              <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/10">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-black">Messages</h1>
                    <Button
                      onClick={() => setShowNewMessage(true)}
                      variant="hot"
                      size="sm"
                      className="font-black"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      New
                    </Button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="pl-10 bg-white/5 border-white/10 focus:border-[#FF1493]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Thread List */}
              <div className="p-2">
                {filteredThreads.length === 0 ? (
                  <EmptyState
                    preset="messages"
                    action={() => setShowNewMessage(true)}
                    actionLabel="Start Chatting"
                  />
                ) : (
                  <ThreadList
                    threads={filteredThreads}
                    currentUser={currentUser}
                    allUsers={allUsers}
                    onSelectThread={handleSelectThread}
                    onNewMessage={() => setShowNewMessage(true)}
                  />
                )}
              </div>
            </motion.div>
          ) : (
            // Chat Thread (Mobile - Full Screen)
            <motion.div
              key="chat-thread"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="min-h-screen flex flex-col"
            >
              {/* Thread Header */}
              <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={backToInbox}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0">
                      {selectedParticipant?.avatar_url ? (
                        <img
                          src={selectedParticipant.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-black">
                          {(selectedParticipant?.full_name || selectedParticipant?.email || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black truncate">
                        {selectedParticipant?.full_name || selectedParticipant?.display_name || selectedParticipant?.email?.split('@')[0] || 'Unknown'}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {selectedParticipant?.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <MoreVertical className="w-5 h-5 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1">
                <ChatThread
                  thread={selectedThread}
                  currentUser={currentUser}
                  onBack={backToInbox}
                  hideHeader
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:flex max-w-7xl mx-auto h-screen relative z-10">
        {/* Sidebar */}
        <div className="w-96 border-r border-white/10 flex flex-col bg-black/50 backdrop-blur-sm">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-black text-gradient-hot">Messages</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">In-app DMs</p>
              </div>
              <Button
                onClick={() => setShowNewMessage(true)}
                variant="hot"
                size="sm"
                className="font-black"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-10 bg-white/5 border-white/10 focus:border-[#FF1493]/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredThreads.length === 0 ? (
              <EmptyState
                preset="messages"
                size="small"
                action={() => setShowNewMessage(true)}
                actionLabel="New Message"
              />
            ) : (
              <ThreadList
                threads={filteredThreads}
                currentUser={currentUser}
                allUsers={allUsers}
                onSelectThread={handleSelectThread}
                selectedThreadId={selectedThread?.id}
                onNewMessage={() => setShowNewMessage(true)}
              />
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-black/30">
          {selectedThread ? (
            <>
              {/* Desktop Thread Header */}
              <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                      {selectedParticipant?.avatar_url ? (
                        <img src={selectedParticipant.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-black">
                          {(selectedParticipant?.full_name || selectedParticipant?.email || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-black">
                        {selectedParticipant?.full_name || selectedParticipant?.display_name || selectedParticipant?.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-white/40">{selectedParticipant?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                      <Video className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <ChatThread
                  thread={selectedThread}
                  currentUser={currentUser}
                  onBack={backToInbox}
                  hideHeader
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-[#FF1493]/20 flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-12 h-12 text-[#FF1493]/40" />
                </div>
                <p className="text-xl font-black uppercase mb-2">Select a conversation</p>
                <p className="text-white/40 text-sm">Or start a new message</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessage && (
          <NewMessageModal
            currentUser={currentUser}
            allUsers={allUsers}
            prefillToEmail={prefillToEmail}
            onClose={() => {
              setShowNewMessage(false);
              setPrefillToEmail(null);
            }}
            onThreadCreated={(thread) => {
              setSelectedThread(thread);
              setShowNewMessage(false);
              setPrefillToEmail(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
