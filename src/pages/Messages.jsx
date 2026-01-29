import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Plus, Inbox, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatThread from '../components/messaging/ChatThread';
import ThreadList from '../components/messaging/ThreadList';
import NewMessageModal from '../components/messaging/NewMessageModal';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuxMobileBannerAd } from '@/components/lux/AdSlot';

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

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['chat-threads', currentUser?.email],
    queryFn: async () => {
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-last_message_at');
      return allThreads.filter(t => t.participant_emails.includes(currentUser.email));
    },
    enabled: !!currentUser,
    refetchInterval: 5000, // Poll every 5s (optimized)
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-white/40 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60 font-mono">LOADING MESSAGES...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto h-screen flex flex-col md:flex-row">
        {/* Thread List - Left Sidebar */}
        <div className={`${selectedThread ? 'hidden md:block' : 'block'} md:w-96 border-r-2 border-white/10 flex flex-col bg-black`}>
          <div className="p-6 border-b-2 border-white/10 bg-gradient-to-r from-black to-[#FF1493]/10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#FF1493] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter">MESSAGES</h1>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">IN-APP DMS</p>
                </div>
              </div>
            </motion.div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => goToSocial('discover')}
                className="border-white/20 hover:bg-white hover:text-black font-bold uppercase text-xs"
              >
                BACK TO GRID
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => goToSocial('inbox')}
                className="border-white/20 hover:bg-white hover:text-black font-bold uppercase text-xs"
              >
                <Inbox className="w-3 h-3 mr-1" />
                INBOX
              </Button>
            </div>

            <Button
              onClick={() => setShowNewMessage(true)}
              className="w-full mt-4 font-black uppercase bg-[#FF1493] hover:bg-white text-white hover:text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              NEW MESSAGE
            </Button>

            {/* Ad Slot in Sidebar */}
            <div className="mt-4">
              <LuxMobileBannerAd
                slotId="messages-sidebar"
                fallbackImage="/images/ad-placeholder-small.jpg"
                fallbackHref="/market"
              />
            </div>
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
        <div className={`${selectedThread ? 'block' : 'hidden md:block'} flex-1 bg-black`}>
          {selectedThread ? (
            <>
              <div className="p-4 border-b-2 border-white/20 bg-black flex items-center gap-2">
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
            <div className="h-full flex items-center justify-center bg-black">
              <div className="text-center">
                <div className="w-32 h-32 bg-black border-2 border-white flex items-center justify-center mb-8 mx-auto">
                  <MessageCircle className="w-16 h-16 text-white/20" />
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