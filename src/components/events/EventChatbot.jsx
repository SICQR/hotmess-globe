import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Loader2, Sparkles, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export default function EventChatbot({ event, isOpen, onClose }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    try {
      const user = await base44.auth.me();
      
      // Create context message with event details
      const contextPrompt = `I'm at the event: "${event.title}". Here are the details:
- Date: ${event.event_date ? format(new Date(event.event_date), 'EEEE, MMMM d, yyyy at h:mm a') : 'TBA'}
- Location: ${event.venue_name || event.city || 'TBA'}
- Type: ${event.mode || 'event'}
- Description: ${event.description || 'No description'}
${event.capacity ? `- Capacity: ${event.capacity}` : ''}
${event.ticket_url ? `- Tickets: ${event.ticket_url}` : ''}

Please help me with any questions about this event.`;

      const conversation = await base44.agents.createConversation({
        agent_name: 'event_assistant',
        metadata: {
          name: `${event.title} - Assistant`,
          event_id: event.id,
          event_title: event.title
        }
      });

      setConversationId(conversation.id);

      // Send context and get welcome message
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: contextPrompt
      });
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "What time does the event start?",
    "Where exactly is the venue?",
    "Who's performing?",
    "How many people are attending?",
    "What should I bring?",
    "Is there a dress code?"
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-black border-l-2 border-[#B026FF] z-50 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border-b-2 border-[#B026FF] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center border-2 border-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase">Event Assistant</h3>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                  <span className="text-[10px] text-white/60 uppercase">AI Powered</span>
                </div>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Event Context */}
          <div className="bg-black/40 border border-white/10 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 text-white/80">
              <Calendar className="w-3 h-3 text-[#FF1493]" />
              <span>{event.event_date ? format(new Date(event.event_date), 'MMM d, h:mm a') : 'TBA'}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <MapPin className="w-3 h-3 text-[#FF1493]" />
              <span>{event.venue_name || event.city || 'Location TBA'}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#B026FF]" />
              <p className="text-sm text-white/60 mb-6">
                Hey! I'm your AI event assistant. Ask me anything about {event.title}!
              </p>
              <div className="space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Quick Questions:</p>
                {quickQuestions.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q)}
                    className="block w-full text-left px-3 py-2 bg-white/5 border border-white/10 hover:border-[#B026FF] text-xs text-white/80 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-[#FF1493] text-black border-2 border-white'
                        : 'bg-white/5 border border-white/10 text-white'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="text-[#FFEB3B]">{children}</strong>,
                          code: ({ children }) => (
                            <code className="bg-white/10 px-1 py-0.5 text-xs">{children}</code>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.tool_calls.map((call, i) => (
                        <div key={i} className="text-[10px] text-white/40 flex items-center gap-1">
                          <Loader2 className={`w-3 h-3 ${call.status === 'running' ? 'animate-spin' : ''}`} />
                          <span>{call.name?.split('.').pop()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t-2 border-[#B026FF] p-4 bg-black">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about the event..."
              disabled={sending || !conversationId}
              className="flex-1 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/40"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim() || !conversationId}
              className="bg-[#B026FF] hover:bg-[#B026FF]/90 text-white font-black border-2 border-white"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}