import React, { useState } from 'react';
import { Users, MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DiscoveryGrid from '@/components/social/DiscoveryGrid';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Social() {
  const [activeTab, setActiveTab] = useState('discover');
  
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: threads = [] } = useQuery({
    queryKey: ['message-threads', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allThreads = await base44.entities.ChatThread.filter({
        $or: [
          { participant_1: currentUser.email },
          { participant_2: currentUser.email }
        ]
      }, '-updated_date');
      return allThreads;
    },
    enabled: !!currentUser,
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-5xl font-black uppercase mb-2">SOCIAL</h1>
          <p className="text-white/60 uppercase tracking-wider text-sm">
            Discover • Connect • Message
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-8">
            <TabsTrigger 
              value="discover"
              className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black"
            >
              <Users className="w-4 h-4 mr-2" />
              DISCOVER
            </TabsTrigger>
            <TabsTrigger 
              value="inbox"
              className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black relative"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              INBOX
              {threads.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-[#FF1493] text-black text-xs font-black rounded-full">
                  {threads.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            <DiscoveryGrid currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="inbox">
            {threads.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-2xl font-black mb-2">NO MESSAGES YET</h3>
                <p className="text-white/60 mb-6">Start a conversation from Discover</p>
                <Button 
                  onClick={() => setActiveTab('discover')}
                  className="bg-[#FF1493] hover:bg-white text-black font-black uppercase"
                >
                  GO TO DISCOVER
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => {
                  const otherParticipant = thread.participant_1 === currentUser?.email 
                    ? thread.participant_2 
                    : thread.participant_1;
                  
                  return (
                    <Link 
                      key={thread.id}
                      to={createPageUrl(`Messages?thread=${thread.id}`)}
                      className="block"
                    >
                      <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 p-4 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                            <span className="text-lg font-black">
                              {otherParticipant[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-black uppercase">{otherParticipant}</p>
                            <p className="text-sm text-white/60 truncate">
                              {thread.last_message || 'Start a conversation...'}
                            </p>
                          </div>
                          {thread.unread_count > 0 && (
                            <span className="px-3 py-1 bg-[#FF1493] text-black text-xs font-black rounded-full">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}