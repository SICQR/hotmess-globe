import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, ThumbsUp, Clock, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * AftercareNudge - Post-meetup check-in modal
 * 
 * Per HOTMESS OS spec:
 * "Aftercare Nudge: 'You good?' → ALL GOOD / NEED A MINUTE / GET HELP"
 * 
 * Triggers automatically after:
 * - User ends a safety check-in
 * - User was in a message thread and went inactive
 * - Manual trigger available
 */

const RESPONSES = [
  { 
    id: 'good', 
    label: 'ALL GOOD', 
    icon: ThumbsUp, 
    color: '#39FF14',
    message: "Glad you're okay. Take care of yourself.",
  },
  { 
    id: 'minute', 
    label: 'NEED A MINUTE', 
    icon: Clock, 
    color: '#FFEB3B',
    message: "Take your time. We're here when you're ready.",
    showResources: true,
  },
  { 
    id: 'help', 
    label: 'GET HELP', 
    icon: Phone, 
    color: '#FF1493',
    message: "Help is available. You're not alone.",
    showResources: true,
    urgent: true,
  },
];

export default function AftercareNudge({ 
  isOpen, 
  onClose, 
  userName,
  autoShow = false,
  autoShowDelay = 3000,
}) {
  const [visible, setVisible] = useState(isOpen);
  const [response, setResponse] = useState(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const navigate = useNavigate();

  // Auto-show after delay if enabled
  useEffect(() => {
    if (autoShow && !visible) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, autoShowDelay);
      return () => clearTimeout(timer);
    }
  }, [autoShow, autoShowDelay, visible]);

  // Sync with isOpen prop
  useEffect(() => {
    setVisible(isOpen);
  }, [isOpen]);

  const handleResponse = (resp) => {
    setResponse(resp);
    setShowFollowUp(true);
    
    // Track response (could send to analytics)
    try {
      const history = JSON.parse(localStorage.getItem('aftercare_responses') || '[]');
      history.push({
        response: resp.id,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('aftercare_responses', JSON.stringify(history.slice(-20)));
    } catch (e) {
      // Storage not available
    }
  };

  const handleClose = () => {
    setVisible(false);
    setResponse(null);
    setShowFollowUp(false);
    onClose?.();
  };

  const handleGoToSafety = () => {
    handleClose();
    navigate('/safety');
  };

  const handleGoToCare = () => {
    handleClose();
    navigate('/safety/resources');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-black border-2 border-[#FF1493] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FF1493]/20 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-[#FF1493]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase">
                      Hey{userName ? ` ${userName}` : ''}
                    </h2>
                    <p className="text-sm text-white/60">Quick check-in</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!showFollowUp ? (
                <>
                  {/* Main question */}
                  <p className="text-3xl font-black text-white text-center mb-8">
                    You good? 💙
                  </p>

                  {/* Response buttons */}
                  <div className="space-y-3">
                    {RESPONSES.map((resp) => (
                      <motion.button
                        key={resp.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleResponse(resp)}
                        className="w-full flex items-center gap-4 p-4 border-2 transition-all text-left"
                        style={{
                          borderColor: `${resp.color}50`,
                          backgroundColor: `${resp.color}10`,
                        }}
                      >
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${resp.color}20` }}
                        >
                          <resp.icon className="w-6 h-6" style={{ color: resp.color }} />
                        </div>
                        <span 
                          className="text-lg font-black uppercase"
                          style={{ color: resp.color }}
                        >
                          {resp.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Follow-up based on response */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div 
                      className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${response.color}20` }}
                    >
                      <response.icon className="w-10 h-10" style={{ color: response.color }} />
                    </div>
                    
                    <p className="text-xl font-bold text-white mb-4">
                      {response.message}
                    </p>

                    {response.showResources && (
                      <div className="space-y-3 mt-6">
                        {response.urgent && (
                          <div className="bg-red-500/20 border border-red-500/50 p-4 mb-4">
                            <p className="text-sm text-white/80 mb-2">
                              If you're in immediate danger, call 999
                            </p>
                            <a 
                              href="tel:999"
                              className="inline-flex items-center gap-2 text-red-400 font-bold"
                            >
                              <Phone className="w-4 h-4" />
                              Emergency: 999
                            </a>
                          </div>
                        )}

                        <Button
                          onClick={handleGoToCare}
                          className="w-full bg-[#FF1493] hover:bg-white text-black font-black uppercase"
                        >
                          <Heart className="w-4 h-4 mr-2" />
                          Care Resources
                        </Button>

                        <Button
                          onClick={handleGoToSafety}
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10 font-bold"
                        >
                          Safety Hub
                        </Button>
                      </div>
                    )}

                    {!response.showResources && (
                      <Button
                        onClick={handleClose}
                        className="mt-6 bg-white/10 hover:bg-white/20 text-white font-bold"
                      >
                        Continue
                      </Button>
                    )}
                  </motion.div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/5">
              <p className="text-[10px] text-white/40 text-center uppercase tracking-wider">
                Your response is private • HOTMESS Care
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage aftercare nudge timing
 */
export function useAftercareNudge() {
  const [shouldShow, setShouldShow] = useState(false);
  const [userName, setUserName] = useState('');

  // Check if we should show nudge (e.g., after safety check-in ends)
  const triggerNudge = (name = '') => {
    setUserName(name);
    setShouldShow(true);
  };

  const dismissNudge = () => {
    setShouldShow(false);
  };

  return {
    shouldShow,
    userName,
    triggerNudge,
    dismissNudge,
  };
}
