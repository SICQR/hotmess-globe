import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-white">
            <WifiOff className="w-5 h-5" />
            <span className="font-bold uppercase text-sm">You're offline</span>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-[#39FF14] text-black px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-white">
            <Wifi className="w-5 h-5" />
            <span className="font-bold uppercase text-sm">Back online</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}