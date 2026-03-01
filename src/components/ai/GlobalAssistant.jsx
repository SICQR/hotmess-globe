import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/components/utils/supabaseClient';
import ReactMarkdown from 'react-markdown';

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
      const conversation = await base44.agents.createConversation({
        agent_name: 'event_assistant',
        metadata: {
          name: 'HOTMESS Assistant'
        }
      });

      setConversationId(conversation.id);

      // Send welcome message
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: "Hello! I'm exploring events on HOTMESS."
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
    "What events are happening tonight?",
    "Help me find people into techno",
    "How do I use Right Now?",
    "What's my next challenge?",
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
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#C8962C] to-[#C8962C] rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_20px_rgba(255,20,147,0.5)] hover:shadow-[0_0_30px_rgba(255,20,147,0.8)] transition-all"
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
            className="fixed bottom-6 right-6 w-full md:w-[420px] h-[600px] bg-black border-2 border-[#C8962C] z-[80] flex flex-col shadow-[0_0_40px_rgba(255,20,147,0.3)]"
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
                    Ask me about events, marketplace, connections, safety, challenges, or any app feature
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
                                <a {...props} className="text-[#00D9FF] underline" target="_blank" rel="noopener noreferrer">
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
            <div className="border-t-2 border-[#C8962C] p-4 bg-black">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={sending || !conversationId}
                  className="flex-1 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !input.trim() || !conversationId}
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
