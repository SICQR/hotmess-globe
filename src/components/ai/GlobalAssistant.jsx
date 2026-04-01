import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/components/utils/supabaseClient';

export default function GlobalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize conversation on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    setConversationId(crypto.randomUUID());
    setMessages([{
      role: 'assistant',
      content: "Hey! I'm your HOTMESS assistant. Ask me about events, profiles, safety, or anything on the platform."
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          context: { source: 'global_assistant' }
        })
      });

      if (response.status === 401) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sign in to use the AI assistant.'
        }]);
        return;
      }

      if (response.status === 403) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'AI chat is available from HOTMESS tier. Upgrade to unlock.'
        }]);
        return;
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.message || data.reply || 'Something went wrong.'
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.'
      }]);
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
    "What events are happening tonight?",
    "Help me find people into techno",
    "How do I use Right Now?",
    "Show me top-rated sellers",
    "How do safety check-ins work?"
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#C8962C] to-[#C8962C] rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_20px_rgba(200,150,44,0.5)] hover:shadow-[0_0_30px_rgba(200,150,44,0.8)] transition-all"
          >
            <Bot className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#39FF14] rounded-full border-2 border-black animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed bottom-6 right-6 w-full md:w-[420px] h-[600px] bg-black border-2 border-[#C8962C] z-[80] flex flex-col shadow-[0_0_40px_rgba(200,150,44,0.3)]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#C8962C] to-[#C8962C] border-b-2 border-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-white">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase text-white">HOTMESS AI</h3>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                      <span className="text-[10px] text-white uppercase">Online</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#C8962C]" />
                  <p className="text-sm text-white/80 mb-2 font-bold">
                    Hey! I'm your HOTMESS AI assistant
                  </p>
                  <p className="text-xs text-white/60 mb-6">
                    Ask me about events, marketplace, connections, safety, or any app feature
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Try asking:</p>
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(q)}
                        className="block w-full text-left px-3 py-2 bg-white/5 border border-white/10 hover:border-[#C8962C] text-xs text-white/80 transition-all"
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
                      <div className="w-8 h-8 bg-gradient-to-br from-[#C8962C] to-[#C8962C] flex items-center justify-center flex-shrink-0 border-2 border-white">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#C8962C] text-white border-2 border-white'
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
                              a: ({ children, ...props }) => (
                                <a {...props} className="text-[#00C2E0] underline" target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t-2 border-[#C8962C] p-4 bg-black">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={sending}
                  className="flex-1 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-[#C8962C] hover:bg-white text-white hover:text-black font-black border-2 border-white"
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
        )}
      </AnimatePresence>
    </>
  );
}
