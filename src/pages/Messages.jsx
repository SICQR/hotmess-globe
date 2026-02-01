import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatThread from '../components/messaging/ChatThread';
import ThreadList from '../components/messaging/ThreadList';
import NewMessageModal from '../components/messaging/NewMessageModal';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConversationListSkeleton } from '@/components/skeletons/PageSkeletons';
import { ErrorState } from '@/components/ui/EmptyState';

export default function Messages() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [prefillToEmail, setPrefillToEmail] = useState(null);
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

  // Deep-link: /social/inbox?to=email → open compose with recipient prefilled.
  useEffect(() => {
    if (!currentUser) return;
    if (!requestedTo) return;
    if (requestedTo === String(currentUser.email || '').trim().toLowerCase()) return;

    setPrefillToEmail(requestedTo);
    setShowNewMessage(true);
  }, [currentUser, requestedTo]);

  // Deep-link: /social/inbox?thread=<id> → open an existing thread.
  useEffect(() => {
    if (!requestedThreadId) return;
    if (!Array.isArray(threads) || !threads.length) return;
    if (selectedThread?.id === requestedThreadId) return;

    const match = threads.find((t) => String(t?.id) === requestedThreadId);
    if (match) setSelectedThread(match);
  }, [requestedThreadId, threads, selectedThread?.id]);

  const goToSocial = (tab) => {
    const safeTab = tab === 'inbox' ? 'inbox' : 'discover';
    navigate(`/social?tab=${encodeURIComponent(safeTab)}`);
  };

  const clearThreadParam = () => {
    try {
      const params = new URLSearchParams(location.search || '');
      params.delete('thread');
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : '',
        },
        { replace: true }
      );
    } catch {
      // ignore
    }
  };

  const backToInbox = () => {
    setSelectedThread(null);
    // If we arrived via /social/inbox?thread=..., remove the param so the thread doesn't reopen.
    if (requestedThreadId) clearThreadParam();
  };

  if (!currentUser || isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto flex">
          {/* Sidebar skeleton */}
          <div className="w-full md:w-96 border-r border-white/10 p-6">
            <div className="h-8 w-40 bg-white/10 rounded mb-4 animate-pulse" />
            <div className="h-10 w-full bg-white/10 rounded mb-6 animate-pulse" />
            <ConversationListSkeleton count={6} />
          </div>
          {/* Main area skeleton (hidden on mobile) */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="w-32 h-32 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
    <div className="min-h-screen bg-black text-white relative">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF1493]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00D9FF]/5 rounded-full blur-[150px]" />
      </div>
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row relative z-10">
        {/* Thread List - Left Sidebar */}
        <div className={`${selectedThread ? 'hidden md:block' : 'block'} md:w-96 border-r border-white/10 flex flex-col glass`}>
          <div className="p-6 border-b border-white/10 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-black uppercase tracking-tighter mb-1 text-gradient-hot">MESSAGES</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">IN-APP DMS</p>
            </motion.div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="glass"
                onClick={() => goToSocial('discover')}
                className="border-white/20"
              >
                BACK TO GRID
              </Button>
              <Button
                type="button"
                variant="glass"
                onClick={() => goToSocial('inbox')}
                className="border-white/20"
              >
                INBOX
              </Button>
            </div>

            <Button
              onClick={() => setShowNewMessage(true)}
              variant="hot"
              className="w-full mt-4 font-black uppercase"
            >
              <Plus className="w-4 h-4 mr-2" />
              NEW MESSAGE
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <ThreadList
              threads={threads}
              currentUser={currentUser}
              allUsers={allUsers}
              onSelectThread={setSelectedThread}
              onNewMessage={() => setShowNewMessage(true)}
            />
          </div>
        </div>

        {/* Chat Thread - Main Area */}
        <div className={`${selectedThread ? 'block' : 'hidden md:block'} flex-1 backdrop-blur-sm`}>
          {selectedThread ? (
            <>
              <div className="p-4 border-b border-white/10 backdrop-blur-xl flex items-center gap-2">
                <Button
                  type="button"
                  variant="glass"
                  onClick={backToInbox}
                  className="border-white/20"
                >
                  BACK TO INBOX
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => goToSocial('discover')}
                  className="border-white/20"
                >
                  BACK TO GRID
                </Button>
              </div>
              <ChatThread
                thread={selectedThread}
                currentUser={currentUser}
                onBack={backToInbox}
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 glass border border-[#FF1493]/20 rounded-xl flex items-center justify-center mb-8 mx-auto hover:shadow-glow-hot/20 transition-all duration-300">
                  <MessageCircle className="w-16 h-16 text-[#FF1493]/40" />
                </div>
                <p className="text-white/60 text-xl font-black uppercase tracking-wider mb-2">SELECT A CONVERSATION</p>
                <p className="text-white/20 text-xs uppercase font-mono">MESSAGES STAY IN-APP</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <NewMessageModal
          currentUser={currentUser}
          allUsers={allUsers}
          prefillToEmail={prefillToEmail}
          onClose={() => setShowNewMessage(false)}
          onThreadCreated={(thread) => {
            setSelectedThread(thread);
            setShowNewMessage(false);
          }}
        />
      )}
    </div>
  );
}