/**
 * Push Notification Permission Prompt
 * 
 * Non-intrusive UI for requesting push notification permission.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Zap, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/lib/pushNotifications';

export function PushPermissionPrompt({ variant = 'banner' }) {
  const { 
    shouldPrompt, 
    isLoading, 
    request, 
    dismiss,
    isSupported 
  } = usePushNotifications();

  if (!isSupported || !shouldPrompt) return null;

  if (variant === 'modal') {
    return <PushPermissionModal onEnable={request} onDismiss={dismiss} isLoading={isLoading} />;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-[#E62020]/20 to-[#B026FF]/20 border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E62020]/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#E62020]" />
              </div>
              <div>
                <p className="text-sm font-medium">Never miss a match</p>
                <p className="text-xs text-white/60">
                  Get notified when high matches go live or message you
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={request}
                disabled={isLoading}
                size="sm"
                className="bg-[#E62020] text-black font-bold hover:bg-white"
              >
                <Bell className="w-4 h-4 mr-1" />
                {isLoading ? 'Enabling...' : 'Enable'}
              </Button>
              <button
                onClick={dismiss}
                className="p-1.5 text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PushPermissionModal({ onEnable, onDismiss, isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-black border-2 border-white/10 max-w-md w-full p-6"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#E62020]/20 flex items-center justify-center">
            <Bell className="w-8 h-8 text-[#E62020]" />
          </div>
          <h2 className="text-2xl font-black uppercase mb-2">Stay Connected</h2>
          <p className="text-white/60 text-sm">
            Enable notifications to know when your best matches are online and ready to connect.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
            <Zap className="w-5 h-5 text-[#39FF14]" />
            <div>
              <p className="text-sm font-medium">Live alerts</p>
              <p className="text-xs text-white/50">Know when high matches go live</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
            <MessageCircle className="w-5 h-5 text-[#00D9FF]" />
            <div>
              <p className="text-sm font-medium">Message notifications</p>
              <p className="text-xs text-white/50">Never miss a conversation</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
            <Heart className="w-5 h-5 text-[#B026FF]" />
            <div>
              <p className="text-sm font-medium">Match updates</p>
              <p className="text-xs text-white/50">Weekly digest of new high matches</p>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={onEnable}
            disabled={isLoading}
            className="w-full bg-[#E62020] text-black font-black uppercase py-5"
          >
            <Bell className="w-5 h-5 mr-2" />
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </Button>
          <Button
            onClick={onDismiss}
            variant="ghost"
            className="w-full text-white/50 hover:text-white"
          >
            Maybe later
          </Button>
        </div>

        <p className="text-center text-xs text-white/30 mt-4">
          You can change this anytime in settings
        </p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Inline prompt for specific contexts
 */
export function PushPermissionInline({ context = 'match' }) {
  const { shouldPrompt, isLoading, request, dismiss } = usePushNotifications();

  if (!shouldPrompt) return null;

  const contextMessages = {
    match: 'Get notified when this person goes live',
    browse: 'Enable alerts for new high matches',
    message: 'Get notified when you receive messages',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 p-3 bg-[#E62020]/10 border border-[#E62020]/30 text-sm"
    >
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-[#E62020]" />
        <span className="text-white/80">{contextMessages[context]}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={request}
          disabled={isLoading}
          className="text-[#E62020] font-bold hover:text-white transition-colors"
        >
          {isLoading ? 'Enabling...' : 'Enable'}
        </button>
        <button
          onClick={dismiss}
          className="text-white/40 hover:text-white/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default PushPermissionPrompt;
