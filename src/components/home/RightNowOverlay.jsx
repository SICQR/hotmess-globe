import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import TacticalProfileCard from '../social/TacticalProfileCard';

export default function RightNowOverlay({ isOpen, onClose, users, onUserClick }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b-2 border-[#FF1493] bg-black/80 backdrop-blur-xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">RIGHT NOW</h2>
              <p className="text-xs text-white/40 uppercase tracking-wider font-mono">
                {users.length} ACTIVE IN CITY
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Tactical Grid */}
          <div className="overflow-y-auto h-[calc(100vh-80px)] p-6">
            {users.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                {users.map((user, idx) => (
                  <TacticalProfileCard 
                    key={user.email}
                    user={user}
                    delay={idx * 0.03}
                    hotScore={Math.floor(Math.random() * 100)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="text-6xl mb-4 opacity-20">👻</div>
                  <p className="text-white/40 text-sm uppercase tracking-wider">No Signal</p>
                  <p className="text-white/20 text-xs mt-2">Check back later</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}