import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Check, 
  X, 
  Loader2, 
  ExternalLink,
  Bell,
  BellOff,
  RefreshCw,
  AtSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegram } from '@/hooks/useTelegram';
import { toast } from 'sonner';

// Telegram brand color
const TELEGRAM_COLOR = '#0088cc';

/**
 * Telegram connection component with QR code and deep link
 */
export default function TelegramConnect({ variant = 'card', className, showImportUsername = false }) {
  const {
    isConnected,
    username,
    firstName,
    notificationsEnabled,
    mutedUntil,
    isLoading,
    error,
    generateLink,
    isGeneratingLink,
    disconnect,
    isDisconnecting,
    importUsername,
    isImportingUsername,
    deepLink,
    deepLinkExpiry,
    openTelegramLink,
    refetch,
  } = useTelegram();

  const handleImportUsername = async () => {
    if (!username) {
      toast.error('Your Telegram account does not have a username set');
      return;
    }
    
    try {
      const result = await importUsername();
      if (result.success) {
        toast.success(`Username @${result.username} imported successfully!`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to import username');
    }
  };

  const [showQR, setShowQR] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  // Countdown timer for deep link expiry
  useEffect(() => {
    if (!deepLinkExpiry) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((deepLinkExpiry - new Date()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setTimeLeft(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deepLinkExpiry]);

  // Format time remaining
  const formatTime = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: TELEGRAM_COLOR }} />
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    if (isConnected) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${TELEGRAM_COLOR}20` }}
            >
              <MessageCircle className="w-3 h-3" style={{ color: TELEGRAM_COLOR }} />
            </div>
            <span className="text-sm text-zinc-300">@{username}</span>
            <Check className="w-4 h-4 text-green-500" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            disabled={isDisconnecting}
            className="text-xs text-zinc-500 hover:text-red-400"
          >
            {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Disconnect'}
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generateLink}
        disabled={isGeneratingLink}
        className={`gap-2 ${className}`}
        style={{ borderColor: `${TELEGRAM_COLOR}50`, color: TELEGRAM_COLOR }}
      >
        {isGeneratingLink ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        Connect Telegram
      </Button>
    );
  }

  // Card variant (default)
  return (
    <div className={`p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 ${className}`}>
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isConnected ? `${TELEGRAM_COLOR}20` : undefined }}
        >
          <MessageCircle 
            className={`w-6 h-6 ${isConnected ? '' : 'text-zinc-500'}`}
            style={isConnected ? { color: TELEGRAM_COLOR } : undefined}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white">Telegram</h3>
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.span
                  key="connected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full"
                >
                  <Check className="w-3 h-3" />
                  Connected
                </motion.span>
              ) : (
                <motion.span
                  key="disconnected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-xs text-zinc-500"
                >
                  Not connected
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: TELEGRAM_COLOR }}
                >
                  <span className="text-white text-sm font-bold">
                    {firstName?.[0] || username?.[0] || 'T'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{firstName || username}</p>
                  {username && (
                    <p className="text-xs text-zinc-500">@{username}</p>
                  )}
                </div>
              </div>

              {/* Notification status */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  {notificationsEnabled && !mutedUntil ? (
                    <>
                      <Bell className="w-4 h-4 text-green-500" />
                      <span>Notifications on</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 text-zinc-500" />
                      <span>Notifications off</span>
                    </>
                  )}
                </div>
              </div>

              {/* Import Username Option */}
              {showImportUsername && username && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportUsername}
                  disabled={isImportingUsername}
                  className="w-full border-[#0088cc]/50 text-[#0088cc] hover:bg-[#0088cc]/10"
                >
                  {isImportingUsername ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <AtSign className="w-4 h-4 mr-2" />
                  )}
                  Use @{username} as my username
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                disabled={isDisconnecting}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Get instant notifications for new matches, messages, and nearby activity.
              </p>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              {deepLink ? (
                <div className="space-y-3">
                  <Button
                    onClick={openTelegramLink}
                    className="w-full"
                    style={{ backgroundColor: TELEGRAM_COLOR }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open in Telegram
                    <ExternalLink className="w-3 h-3 ml-2 opacity-70" />
                  </Button>

                  {timeLeft !== null && (
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Link expires in {formatTime(timeLeft)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateLink}
                        disabled={isGeneratingLink}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isGeneratingLink ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-zinc-600 text-center">
                    Tap the button or scan in Telegram
                  </div>
                </div>
              ) : (
                <Button
                  onClick={generateLink}
                  disabled={isGeneratingLink}
                  className="w-full"
                  style={{ backgroundColor: TELEGRAM_COLOR }}
                >
                  {isGeneratingLink ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  Connect Telegram
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
