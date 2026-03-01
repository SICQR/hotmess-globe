import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, Users, Crown, Send, Loader2, Image, Smile, Reply
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import SquadChallenges from '../components/squads/SquadChallenges';

const REACTIONS = [
  { emoji: '🔥', label: 'fire' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '👍', label: 'thumbs' },
  { emoji: '😂', label: 'laugh' },
  { emoji: '😮', label: 'wow' },
];

export default function SquadChat() {
  const [searchParams] = useSearchParams();
  const squadId = searchParams.get('id');
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');
  const [showReactions, setShowReactions] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [muted, setMuted] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const ok = await base44.auth.requireProfile(window.location.href);
      if (!ok) return;
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
            <Button className="bg-[#C8962C] hover:bg-white text-black font-black">
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
                <span className="text-[#C8962C] uppercase font-bold">{squad.interest}</span>
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
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isOwn = msg.sender_email === currentUser.email;
                      const showAvatar = idx === 0 || messages[idx - 1]?.sender_email !== msg.sender_email;
                      const msgUser = allUsers.find(u => u.email === msg.sender_email);
                      
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                        >
                          {/* Avatar for others */}
                          {!isOwn && showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8962C] to-[#C8962C] mr-2 flex-shrink-0 overflow-hidden">
                              {msgUser?.avatar_url ? (
                                <img src={msgUser.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                  {msg.sender_name?.[0]}
                                </div>
                              )}
                            </div>
                          )}
                          {!isOwn && !showAvatar && <div className="w-8 mr-2" />}
                          
                          <div className="relative max-w-[70%]">
                            {/* Reply preview */}
                            {msg.reply_to && (
                              <div className="text-xs text-white/40 mb-1 pl-2 border-l-2 border-white/20">
                                Replying to {msg.reply_to_name}
                              </div>
                            )}
                            
                            <div className={`${
                              isOwn 
                                ? 'bg-[#C8962C] text-black' 
                                : 'bg-white/10 text-white'
                            } rounded-xl p-3 relative`}>
                              {!isOwn && showAvatar && (
                                <div className="text-xs font-bold mb-1 flex items-center gap-1">
                                  {msg.sender_name}
                                  {msg.sender_email === squad?.creator_email && (
                                    <Crown className="w-3 h-3 text-[#FFD700]" />
                                  )}
                                </div>
                              )}
                              <div className="text-sm">{msg.content}</div>
                              <div className={`text-[10px] mt-1 ${isOwn ? 'text-black/50' : 'text-white/40'}`}>
                                {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              
                              {/* Reactions display */}
                              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {Object.entries(msg.reactions).map(([emoji, count]) => (
                                    <span key={emoji} className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                                      {emoji} {count}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Message actions */}
                            <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                              <button 
                                onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <Smile className="w-4 h-4 text-white/60" />
                              </button>
                              <button 
                                onClick={() => setReplyTo(msg)}
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <Reply className="w-4 h-4 text-white/60" />
                              </button>
                            </div>
                            
                            {/* Reaction picker */}
                            <AnimatePresence>
                              {showReactions === msg.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-10 bg-black border border-white/20 rounded-full px-2 py-1 flex gap-1`}
                                >
                                  {REACTIONS.map((r) => (
                                    <button
                                      key={r.label}
                                      onClick={() => {
                                        // Add reaction logic here
                                        setShowReactions(null);
                                        toast.success(`Reacted with ${r.emoji}`);
                                      }}
                                      className="text-lg hover:scale-125 transition-transform"
                                    >
                                      {r.emoji}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{typingUsers.join(', ')} typing...</span>
                  </div>
                )}
              </div>

              {/* Reply preview */}
              {replyTo && (
                <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-white/40">Replying to </span>
                    <span className="font-bold">{replyTo.sender_name}</span>
                    <p className="text-white/60 text-xs truncate max-w-xs">{replyTo.content}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white">✕</button>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg">
                    <Image className="w-5 h-5 text-white/60" />
                  </button>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={replyTo ? `Reply to ${replyTo.sender_name}...` : "Type a message..."}
                    className="bg-white/5 border-white/20 flex-1"
                    disabled={!chatThread}
                  />
                  <button className="p-2 hover:bg-white/10 rounded-lg">
                    <Smile className="w-5 h-5 text-white/60" />
                  </button>
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending || !chatThread}
                    className="bg-[#C8962C] hover:bg-white text-black font-black"
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
                      <div className="w-10 h-10 bg-gradient-to-br from-[#C8962C] to-[#C8962C] border border-white flex items-center justify-center">
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
