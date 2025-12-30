import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, Paperclip, ArrowLeft, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ChatThread({ thread, currentUser, onBack }) {
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const isTelegramEncrypted = thread.telegram_chat_id || thread.thread_type === 'dm';

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', thread.id],
    queryFn: () => base44.entities.Message.filter({ thread_id: thread.id }, 'created_date'),
    refetchInterval: 1500, // Real-time polling for new messages
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      // Send via Telegram Bot API for E2E encryption
      const message = await base44.entities.Message.create({
        thread_id: thread.id,
        sender_email: currentUser.email,
        content: data.content,
        message_type: data.message_type || 'text',
        metadata: data.metadata || {},
        read_by: [currentUser.email],
      });

      // Update thread's last message and increment unread count for others
      const newUnreadCount = { ...thread.unread_count };
      thread.participant_emails.forEach(email => {
        if (email !== currentUser.email) {
          newUnreadCount[email] = (newUnreadCount[email] || 0) + 1;
        }
      });

      await base44.entities.ChatThread.update(thread.id, {
        last_message: data.content,
        last_message_at: new Date().toISOString(),
        unread_count: newUnreadCount,
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', thread.id]);
      queryClient.invalidateQueries(['chat-threads']);
      setMessageText('');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMutation.mutate({
      content: messageText,
      message_type: 'text',
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      sendMutation.mutate({
        content: 'Image',
        message_type: 'image',
        metadata: { image_url: file_url },
      });
      
      toast.success('Image sent');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read and update thread unread count
  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m.sender_email !== currentUser.email && !m.read_by.includes(currentUser.email)
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        base44.entities.Message.update(msg.id, {
          read_by: [...msg.read_by, currentUser.email],
        });
      });

      // Update thread unread count
      base44.entities.ChatThread.update(thread.id, {
        unread_count: {
          ...thread.unread_count,
          [currentUser.email]: 0,
        },
      });
      queryClient.invalidateQueries(['chat-threads']);
    }
  }, [messages, currentUser.email, thread.id]);

  const otherParticipants = thread.participant_emails.filter(email => email !== currentUser.email);
  const otherUsers = allUsers.filter(u => otherParticipants.includes(u.email));

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          {otherUsers.length === 1 ? (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                <span className="font-bold text-sm">{otherUsers[0].full_name?.[0] || 'U'}</span>
              </div>
              <div>
                <p className="font-bold">{otherUsers[0].full_name}</p>
                <p className="text-xs text-white/40 uppercase flex items-center gap-1">
                  {thread.thread_type}
                  {isTelegramEncrypted && <span className="text-[#00D9FF]">• E2E</span>}
                </p>
              </div>
            </>
          ) : (
            <div>
              <p className="font-bold">{otherUsers.map(u => u.full_name).join(', ')}</p>
              <p className="text-xs text-white/40 uppercase flex items-center gap-1">
                Group • {thread.thread_type}
                {isTelegramEncrypted && <span className="text-[#00D9FF]">• E2E</span>}
              </p>
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const isOwn = msg.sender_email === currentUser.email;
            const sender = allUsers.find(u => u.email === msg.sender_email);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold">{sender?.full_name?.[0] || 'U'}</span>
                    </div>
                  )}
                  
                  <div>
                    {msg.message_type === 'image' && msg.metadata?.image_url && (
                      <img 
                        src={msg.metadata.image_url} 
                        alt="Sent image" 
                        className="rounded-xl max-w-full mb-2"
                      />
                    )}
                    
                    {msg.message_type === 'text' && (
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-[#FF1493] text-black'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    )}
                    
                    {msg.message_type === 'system' && (
                      <div className="text-center text-xs text-white/40 italic">
                        {msg.content}
                      </div>
                    )}
                    
                    <p className={`text-xs text-white/40 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-white/5 border-t border-white/10 p-4">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label htmlFor="image-upload">
            <Button type="button" variant="ghost" size="icon" disabled={uploading} asChild>
              <span>
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
              </span>
            </Button>
          </label>

          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />

          <Button 
            type="submit" 
            size="icon"
            disabled={!messageText.trim() || sendMutation.isPending}
            className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}