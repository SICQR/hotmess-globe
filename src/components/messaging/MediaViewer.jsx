import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MediaViewer({ mediaUrl, mediaType, onClose, allMedia = [], currentIndex = 0, onNavigate }) {
  const hasPrev = allMedia.length > 1 && currentIndex > 0;
  const hasNext = allMedia.length > 1 && currentIndex < allMedia.length - 1;
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = `media-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-7xl max-h-[90vh] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Controls */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownload}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Download className="w-5 h-5" />
              </Button>
              {allMedia.length > 1 && (
                <span className="text-white/60 text-sm">
                  {currentIndex + 1} / {allMedia.length}
                </span>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Navigation Arrows */}
          {hasPrev && (
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/80 hover:bg-black rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/80 hover:bg-black rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Media Content */}
          <div className="flex items-center justify-center w-full h-full">
            {mediaType === 'image' ? (
              <img
                src={mediaUrl}
                alt="Full size"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}