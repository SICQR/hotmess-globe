import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Loader2, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

// Context-aware quick questions based on current page
const CONTEXT_QUESTIONS = {
  '/events': ['What events are tonight?', 'Find techno parties', 'Pride events this month', 'Events near me'],
  '/market': ['Products under £50', 'New drops this week', 'HNH MESS products', 'Best sellers'],
  '/music': ["What's playing now?", 'SMASH DADDYS releases', 'Radio schedule', 'Upcoming live shows'],
  '/social': ["Who's nearby?", 'Best matches for me', 'How does Right Now work?', 'Message tips'],
  '/safety': ['Crisis support', 'PrEP clinics near me', 'I need to talk to someone', 'Safety resources'],
  '/pulse': ['Show me the map', 'Events near me', 'Care resources', 'What are beacons?'],
  '/profile': ['Optimize my profile', 'Explain XP system', 'How to get more matches', 'Privacy settings'],
  default: ['What can you help with?', 'Explain XP system', 'Tonight in London', 'How do I use this app?']
};

export default function GlobalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get context-aware quick questions
  const currentPath = location.pathname;
  const quickQuestions = CONTEXT_QUESTIONS[currentPath] || CONTEXT_QUESTIONS.default;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to AI
  const sendMessage = async (messageText) => {
    if (!messageText.trim() || sending) return;

    const userMessage = messageText.trim();
    setInput('');
    setSending(true);
    setError(null);

    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          context: {
            page: currentPath,
            intent: detectIntent(userMessage)
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Update conversation ID if new
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Add assistant response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        crisis: data.crisis,
        action: data.action,
        toolResults: data.toolResults
      }]);

      // Handle actions (navigation, modals, etc.)
      if (data.action) {
        handleAction(data.action);
      }

    } catch (err) {
      console.error('AI Chat error:', err);
      setError('Something went wrong. Please try again.');
      // Remove the user message if we got an error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  // Handle AI-triggered actions
  const handleAction = (action) => {
    if (action.type === 'navigate' && action.url) {
      navigate(action.url);
    }
    // Add more action handlers as needed
  };

  // Detect intent from message for context
  const detectIntent = (message) => {
    const lowerMessage = message.toLowerCase();
    if (/event|party|tonight|weekend/.test(lowerMessage)) return 'events';
    if (/product|buy|shop|market/.test(lowerMessage)) return 'shopping';
    if (/music|radio|play/.test(lowerMessage)) return 'music';
    if (/match|profile|connect/.test(lowerMessage)) return 'social';
    if (/help|crisis|support|safe/.test(lowerMessage)) return 'safety';
    return 'general';
  };

  const handleSend = () => sendMessage(input);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    sendMessage(question);
  };

  return (
    <>
      {/* Floating Button - hidden on mobile to avoid nav overlap */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="hidden md:flex fixed bottom-4 right-4 z-50 w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] rounded-full items-center justify-center border-2 border-white shadow-lg hover:shadow-xl transition-all"
          >
            <Bot className="w-5 h-5 text-white" />
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
            className="fixed bottom-20 right-4 w-full md:w-[420px] h-[550px] bg-black border-2 border-[#FF1493] z-50 flex flex-col shadow-[0_0_40px_rgba(255,20,147,0.3)]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#FF1493] to-[#B026FF] border-b-2 border-white p-4">
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
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#FF1493]" />
                  <p className="text-sm text-white/80 mb-2 font-bold">
                    Hey! I'm your HOTMESS AI assistant
                  </p>
                  <p className="text-xs text-white/60 mb-6">
                    I know about London's gay scene, venues, events, terminology, and everything HOTMESS
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Try asking:</p>
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickQuestion(q)}
                        className="block w-full text-left px-3 py-2 bg-white/5 border border-white/10 hover:border-[#FF1493] text-xs text-white/80 transition-all"
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
                      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-2 border-white ${
                        msg.crisis ? 'bg-red-500' : 'bg-gradient-to-br from-[#FF1493] to-[#B026FF]'
                      }`}>
                        {msg.crisis ? (
                          <AlertTriangle className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#FF1493] text-white border-2 border-white'
                            : msg.crisis
                            ? 'bg-red-500/20 border-2 border-red-500 text-white'
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
                              a: ({ href, children }) => (
                                <a 
                                  href={href} 
                                  className="text-[#00D9FF] underline inline-flex items-center gap-1" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                  <ExternalLink className="w-3 h-3" />
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
                      
                      {/* Tool results indicator */}
                      {msg.toolResults && msg.toolResults.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {msg.toolResults.map((tr, i) => (
                            <span 
                              key={i} 
                              className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded"
                            >
                              {tr.tool.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action button if navigable */}
                      {msg.action?.type === 'navigate' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate(msg.action.url);
                            setIsOpen(false);
                          }}
                          className="mt-2 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black text-xs"
                        >
                          Go there →
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/10 px-4 py-2.5 flex items-center gap-1">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="text-center py-2">
                  <p className="text-xs text-red-400">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className="text-xs text-white/40 underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t-2 border-[#FF1493] p-4 bg-black">
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
                  className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black border-2 border-white"
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
