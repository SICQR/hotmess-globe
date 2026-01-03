import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const QUICK_QUERIES = [
  "Find me a techno party this Friday near Shoreditch",
  "What are the most popular queer venues tonight?",
  "Show me hookup events with high intensity",
  "Any drops happening this weekend?",
  "What events match my interests?"
];

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }, '-created_date'),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['user-interactions-chat', user?.email],
    queryFn: () => base44.entities.UserInteraction.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hey ${currentUser.full_name || 'there'}! 👋 I'm your HOTMESS AI assistant. Ask me anything about events, venues, and nightlife in queer cities. What are you looking for tonight?`,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (queryText = input) => {
    if (!queryText.trim() || isTyping) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Build context for AI
      const interactionSummary = interactions.reduce((acc, int) => {
        acc[int.beacon_kind] = (acc[int.beacon_kind] || 0) + 1;
        return acc;
      }, {});

      const topInterests = Object.entries(interactionSummary)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([kind]) => kind);

      const prompt = `You are HOTMESS AI, a friendly and knowledgeable nightlife assistant for queer cities. You help users discover events, venues, and experiences.

User Profile:
- Name: ${user?.full_name || 'User'}
- Level: ${Math.floor((user?.xp || 0) / 1000) + 1}
- XP: ${user?.xp || 0}
- Top interests: ${topInterests.join(', ') || 'exploring new experiences'}
- Past interactions: ${interactions.length}

Available Events/Beacons:
${beacons.slice(0, 30).map(b => `- ID: ${b.id}, Title: ${b.title}, Type: ${b.kind}, Mode: ${b.mode}, City: ${b.city}, Intensity: ${Math.round((b.intensity || 0.5) * 100)}%, XP: ${b.xp_scan || 100}, Description: ${b.description || 'N/A'}`).join('\n')}

User Query: "${queryText}"

Respond in a friendly, conversational tone. If recommending specific beacons, include their IDs in your response like [BEACON:id]. Be helpful, engaging, and use inclusive language. Keep responses concise but informative.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble right now. Please try again!",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const parseMessageContent = (content) => {
    const beaconRegex = /\[BEACON:([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = beaconRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      
      const beaconId = match[1];
      const beacon = beacons.find(b => b.id === beaconId);
      if (beacon) {
        parts.push({ type: 'beacon', beacon });
      }
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-xl border-b border-white/10 p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B026FF] to-[#FF1493] flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">HOTMESS AI</h1>
            <p className="text-xs text-white/60">Your nightlife discovery assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-[#FF1493] to-[#B026FF] text-white'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {message.role === 'assistant' ? (
                      <div className="space-y-2">
                        {parseMessageContent(message.content).map((part, idx) => {
                          if (part.type === 'text') {
                            return <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap">{part.content}</p>;
                          } else if (part.type === 'beacon') {
                            return (
                              <Link key={idx} to={createPageUrl(`BeaconDetail?id=${part.beacon.id}`)}>
                                <div className="bg-black/30 border border-white/20 rounded-lg p-3 hover:bg-black/50 transition-colors mt-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[#FF1493] text-black mb-1">
                                        {part.beacon.kind}
                                      </span>
                                      <h4 className="font-bold text-sm mb-1">{part.beacon.title}</h4>
                                      <div className="flex items-center gap-2 text-xs text-white/60">
                                        <MapPin className="w-3 h-3" />
                                        <span>{part.beacon.city}</span>
                                      </div>
                                    </div>
                                    {part.beacon.xp_scan && (
                                      <span className="text-xs text-[#FFEB3B] font-bold">+{part.beacon.xp_scan} XP</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            );
                          }
                        })}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#B026FF]" />
                  <span className="text-sm text-white/60">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Queries */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUERIES.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(query)}
                  className="text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-black/95 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about events..."
            className="flex-1 bg-black border-white/20 text-white"
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-[#B026FF] to-[#FF1493] hover:opacity-90 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}