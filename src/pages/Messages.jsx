import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Terminal, Send, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toEmail = searchParams.get('to');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', user?.email, toEmail],
    queryFn: async () => {
      if (!user) return [];
      const sent = await base44.entities.DirectMessage.filter({ sender_email: user.email, receiver_email: toEmail }, 'created_date');
      const received = await base44.entities.DirectMessage.filter({ sender_email: toEmail, receiver_email: user.email }, 'created_date');
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!user && !!toEmail,
    refetchInterval: 3000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const sendMutation = useMutation({
    mutationFn: (content) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);
      return base44.entities.DirectMessage.create({
        sender_email: user.email,
        receiver_email: toEmail,
        content,
        expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setMessage('');
      toast.success('>> TRANSMITTED');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey || !user) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'DirectMessage',
          filter: `receiver_email=eq.${user.email}`
        },
        () => {
          refetch();
          // UI SHAKE
          document.body.style.animation = 'shake 0.3s';
          setTimeout(() => { document.body.style.animation = ''; }, 300);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  if (!user || !toEmail) return null;

  const otherUser = allUsers.find(u => u.email === toEmail);
  if (!otherUser) return <div className="min-h-screen bg-black text-white flex items-center justify-center">User not found</div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  return (
    <div className="h-screen bg-black text-[#39FF14] flex flex-col font-mono">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>

      {/* Terminal Header */}
      <div className="border-b-2 border-[#39FF14] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate(-1)} variant="ghost" className="text-[#39FF14] hover:bg-[#39FF14]/10 rounded-none">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Terminal className="w-5 h-5" />
          <div>
            <div className="font-black text-sm">TERMINAL SESSION</div>
            <div className="text-xs text-[#39FF14]/60">@{otherUser.full_name?.toLowerCase().replace(/\s/g, '_')}</div>
          </div>
        </div>
        <Button className="bg-transparent border-2 border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black font-black rounded-none text-xs">
          <Lock className="w-3 h-3 mr-2" />
          ENCRYPT ON TELEGRAM
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => {
          const isMine = msg.sender_email === user.email;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: isMine ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isMine ? 'bg-[#39FF14]/10 border-r-4 border-[#39FF14]' : 'bg-white/5 border-l-4 border-white/30'} p-3 rounded-none`}>
                <div className="text-xs text-white/40 mb-1">
                  [{new Date(msg.created_date).toLocaleTimeString()}]
                </div>
                <div className={isMine ? 'text-[#39FF14]' : 'text-white'}>{msg.content}</div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
        {messages.length === 0 && (
          <div className="text-center py-20 text-white/40">
            <Terminal className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>// NEW SESSION INITIATED</p>
            <p className="text-xs mt-2">Messages expire in 6 hours unless Handshake accepted</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t-2 border-[#39FF14] p-4 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder=">> TYPE MESSAGE..."
          className="flex-1 bg-black border-2 border-[#39FF14] text-[#39FF14] placeholder:text-[#39FF14]/30 rounded-none font-mono"
        />
        <Button
          type="submit"
          disabled={!message.trim() || sendMutation.isPending}
          className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black rounded-none"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}