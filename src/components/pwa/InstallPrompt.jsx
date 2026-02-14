import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Zap, Bell, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logger from '@/utils/logger';

/**
 * PWA Install Prompt Component
 * Shows a prompt encouraging users to install the PWA
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    
    // Check if user has dismissed the prompt recently
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days after dismissal
      }
    }
    
    // Listen for the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after user has been on site for a bit
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Show after 30 seconds
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      logger.info('[PWA] App installed successfully');
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    logger.info('[PWA] User response:', outcome);
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };
  
  if (isInstalled || !showPrompt) {
    return null;
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 backdrop-blur-xl border-2 border-[#FF1493] rounded-xl p-5 shadow-2xl">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-[#FF1493] rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-8 h-8 text-black" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-black uppercase mb-1">Install HOTMESS</h3>
              <p className="text-sm text-white/80 mb-4">
                Add to your home screen for the best experience
              </p>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="w-8 h-8 bg-white/10 rounded-lg mx-auto mb-1 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#39FF14]" />
                  </div>
                  <span className="text-xs text-white/60">Faster</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-white/10 rounded-lg mx-auto mb-1 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-[#00D9FF]" />
                  </div>
                  <span className="text-xs text-white/60">Notifications</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-white/10 rounded-lg mx-auto mb-1 flex items-center justify-center">
                    <WifiOff className="w-4 h-4 text-[#FF1493]" />
                  </div>
                  <span className="text-xs text-white/60">Offline</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * iOS Install Instructions
 * Shows instructions for iOS users (Safari doesn't support beforeinstallprompt)
 */
export function IOSInstallInstructions({ onDismiss }) {
  const [showInstructions, setShowInstructions] = useState(false);
  
  useEffect(() => {
    // Check if iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && isSafari && !isStandalone) {
      // Check if dismissed recently
      const dismissed = localStorage.getItem('ios_install_dismissed');
      if (dismissed) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) return;
      }
      
      setTimeout(() => setShowInstructions(true), 30000);
    }
  }, []);
  
  const handleDismiss = () => {
    setShowInstructions(false);
    localStorage.setItem('ios_install_dismissed', Date.now().toString());
    onDismiss?.();
  };
  
  if (!showInstructions) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-20 left-4 right-4 z-50"
      >
        <div className="bg-black/95 border-2 border-white rounded-xl p-5">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-black uppercase mb-3">Install HOTMESS</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center font-bold">1</span>
              <span>Tap the <span className="text-[#00D9FF]">Share</span> button in Safari</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center font-bold">2</span>
              <span>Scroll down and tap <span className="text-[#00D9FF]">"Add to Home Screen"</span></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center font-bold">3</span>
              <span>Tap <span className="text-[#00D9FF]">"Add"</span> in the top right</span>
            </div>
          </div>
          
          <Button
            onClick={handleDismiss}
            className="w-full mt-4 bg-white text-black hover:bg-white/90"
          >
            Got it
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Offline Indicator
 * Shows when the user is offline
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isOffline) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-black py-2 px-4 text-center text-sm font-semibold"
    >
      <WifiOff className="w-4 h-4 inline-block mr-2" />
      You're offline. Some features may be limited.
    </motion.div>
  );
}

/**
 * Pending Sync Indicator
 * Shows when there are items waiting to sync
 */
export function PendingSyncIndicator({ count }) {
  if (!count || count === 0) return null;
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="fixed bottom-24 right-4 z-50"
    >
      <div className="bg-[#FF1493] text-black px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
        <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
        {count} pending sync
      </div>
    </motion.div>
  );
}

export default InstallPrompt;
