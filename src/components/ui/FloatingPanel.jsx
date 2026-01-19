import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export default function FloatingPanel({ 
  title, 
  children, 
  defaultOpen = true, 
  onClose,
  position = 'left',
  width = 'w-80'
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  const widthClassMap = {
    'w-80': 'w-[calc(100vw-2rem)] max-w-80',
    'w-96': 'w-[calc(100vw-2rem)] max-w-96',
    'w-[480px]': 'w-[calc(100vw-2rem)] md:w-[480px]',
  };

  const widthClasses = widthClassMap[width] || width;

  const positionClasses = {
    left: 'left-4 top-20',
    right: 'right-4 top-20',
    'top-left': 'left-4 top-4',
    'top-right': 'right-4 top-4'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed ${positionClasses[position]} z-40 max-w-[calc(100vw-2rem)] ${widthClasses} max-h-[85vh]`}
    >
      <div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-y-auto max-h-[70vh] p-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}