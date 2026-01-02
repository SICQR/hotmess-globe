import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Users, Crown, Send, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import SquadChallenges from '../components/squads/SquadChallenges';

export default function SquadChat() {
  const [searchParams] = useSearchParams();
  const squadId = searchParams.get('id');
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: squad } = useQuery({
    queryKey: ['squad', squadId],
    queryFn: async () => {
      const squads = await base44.entities.Squad.list();
      return squads.find(s => s.id === squadId);
    },
    enabled: !!squadId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['squad-members', squadId],
    queryFn: () => base44.entities.SquadMember.filter({ squad_id: squadId }),
    enabled: !!squadId,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: chatThread } = useQuery({
    queryKey: ['squad-thread', squadId],
    queryFn: async () => {
      const threads = await base44.entities.ChatThread.filter({
        thread_type: 'squad',
        'metadata.squad_id': squadId
      });
      return threads[0] || null;
    },
    enabled: !!squadId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['squad-messages', chatThread?.id],
    queryFn: () => base44.entities.Message.filter({ thread_id: chatThread.id }, '-created_date'),
    enabled: !!chatThread,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      if (!chatThread) {
        throw new Error('No chat thread');
      }

      await base44.entities.Message.create({
        thread_id: chatThread.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content,
        message_type: 'text',
      });

      await base44.entities.ChatThread.update(chatThread.id, {
        last_message: content,
        last_message_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['squad-messages']);
      setMessage('');
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const memberUsers = members.map(m => allUsers.find(u => u.email === m.user_email)).filter(Boolean);
  const isCreator = squad?.creator_email === currentUser?.email;
  const isMember = members.some(m => m.user_email === currentUser?.email);

  if (!squad || !currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase mb-2">Members Only</h2>
          <p className="text-white/60 mb-6">Join this squad to access the chat</p>
          <Link to={createPageUrl('Connect')}>
            <Button className="bg-[#FF1493] hover:bg-white text-black font-black">
              FIND SQUADS
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Link to={createPageUrl('Connect')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Connect
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase mb-2">{squad.name}</h1>
              <p className="text-white/60 text-sm mb-2">{squad.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#B026FF] uppercase font-bold">{squad.interest}</span>
                <span className="text-white/40">{members.length} members</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!chatThread ? (
                  <div className="text-center py-12 text-white/40">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_email === currentUser.email;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${
                          isOwn 
                            ? 'bg-[#FF1493] text-black' 
                            : 'bg-white/10 text-white'
                        } rounded-xl p-3`}>
                          {!isOwn && (
                            <div className="text-xs font-bold mb-1">{msg.sender_name}</div>
                          )}
                          <div className="text-sm">{msg.content}</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="bg-white/5 border-white/20"
                    disabled={!chatThread}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending || !chatThread}
                    className="bg-[#FF1493] hover:bg-white text-black font-black"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members ({members.length})
              </h3>
              <div className="space-y-2">
                {memberUsers.slice(0, 10).map((user) => (
                  <Link key={user.email} to={createPageUrl(`Profile?email=${user.email}`)}>
                    <div className="flex items-center gap-3 p-2 hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border border-white flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold">{user.full_name?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm flex items-center gap-2">
                          {user.full_name}
                          {user.email === squad.creator_email && (
                            <Crown className="w-4 h-4 text-[#FFEB3B]" />
                          )}
                        </div>
                        <div className="text-xs text-white/40">
                          LVL {Math.floor((user.xp || 0) / 1000) + 1}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Squad Challenges */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <SquadChallenges squadId={squadId} currentUser={currentUser} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}