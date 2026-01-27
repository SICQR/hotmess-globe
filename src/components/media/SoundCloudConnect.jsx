import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSoundCloudStatus } from '@/hooks/useSoundCloud';

/**
 * SoundCloud connection status and management component
 * Shows connection state and allows connect/disconnect
 */
export default function SoundCloudConnect({ variant = 'card', className }) {
  const {
    isConnected,
    username,
    avatarUrl,
    isLoading,
    error,
    connect,
    disconnect,
    isDisconnecting,
  } = useSoundCloudStatus();

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-[#FF5500]" />
      </div>
    );
  }

  if (variant === 'inline') {
    if (isConnected) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#FF5500]/20 flex items-center justify-center">
                <Music className="w-3 h-3 text-[#FF5500]" />
              </div>
            )}
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
        onClick={connect}
        className={`gap-2 border-[#FF5500]/30 hover:border-[#FF5500] hover:bg-[#FF5500]/10 ${className}`}
      >
        <Music className="w-4 h-4 text-[#FF5500]" />
        Connect SoundCloud
      </Button>
    );
  }

  // Card variant (default)
  return (
    <div className={`p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
          ${isConnected ? 'bg-[#FF5500]/20' : 'bg-zinc-800'}
        `}>
          <Music className={`w-6 h-6 ${isConnected ? 'text-[#FF5500]' : 'text-zinc-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white">SoundCloud</h3>
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-700" />
                )}
                <div>
                  <p className="text-sm text-white font-medium">@{username}</p>
                  <a
                    href={`https://soundcloud.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-[#FF5500] flex items-center gap-1"
                  >
                    View profile <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              
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
                Connect your SoundCloud account to upload tracks, share mixes, and showcase your music.
              </p>
              
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <Button
                onClick={connect}
                className="w-full bg-[#FF5500] hover:bg-[#FF5500]/80"
              >
                <Music className="w-4 h-4 mr-2" />
                Connect SoundCloud
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
