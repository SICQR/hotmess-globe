/**
 * ScreenshotDetection - Monitor and notify on screenshots
 * 
 * Detects when users take screenshots of chats/profiles
 * and notifies the other party
 */

import { useEffect, useCallback } from 'react';
import { Camera, AlertTriangle } from 'lucide-react';

// Hook to detect screenshot attempts
export function useScreenshotDetection({
  enabled = true,
  onScreenshot,
  context = 'chat', // 'chat', 'profile', 'photos'
}) {
  const handleVisibilityChange = useCallback(() => {
    // iOS screenshot briefly hides document
    if (document.hidden && enabled) {
      // Possible screenshot detected
      onScreenshot?.({ type: 'visibility', context, timestamp: Date.now() });
    }
  }, [enabled, onScreenshot, context]);

  const handleKeyDown = useCallback((e) => {
    // Detect PrintScreen key
    if (e.key === 'PrintScreen' && enabled) {
      onScreenshot?.({ type: 'printscreen', context, timestamp: Date.now() });
    }
    // Detect Cmd+Shift+3/4 (Mac) or Win+PrintScreen
    if (enabled && (
      (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) ||
      (e.metaKey && e.ctrlKey && e.key === '4')
    )) {
      onScreenshot?.({ type: 'keyboard_shortcut', context, timestamp: Date.now() });
    }
  }, [enabled, onScreenshot, context]);

  useEffect(() => {
    if (!enabled) return;

    // Listen for visibility changes (iOS screenshot detection)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    // iOS-specific: blur event sometimes fires on screenshot
    const handleBlur = () => {
      if (document.hasFocus() === false && enabled) {
        onScreenshot?.({ type: 'blur', context, timestamp: Date.now() });
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, handleVisibilityChange, handleKeyDown, onScreenshot, context]);
}

// Screenshot notification toast
export function ScreenshotNotification({ 
  show, 
  username, 
  context,
  onClose 
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top">
      <div className="bg-black/95 border-2 border-[#E62020] px-4 py-3 flex items-center gap-3"
           style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.5)' }}>
        <div className="w-10 h-10 bg-[#E62020]/20 border border-[#E62020] flex items-center justify-center">
          <Camera className="w-5 h-5 text-[#E62020]" />
        </div>
        <div>
          <div className="font-bold text-sm">Screenshot Detected</div>
          <div className="text-xs text-white/60">
            {username} took a screenshot of your {context}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="ml-4 text-white/40 hover:text-white text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Screenshot warning banner for sensitive content
export function ScreenshotWarningBanner({ className = '' }) {
  return (
    <div className={`bg-[#E62020]/10 border border-[#E62020]/30 px-4 py-2 
                     flex items-center gap-3 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-[#E62020]" />
      <span className="text-xs text-[#E62020]">
        Screenshots are detected and the user will be notified
      </span>
    </div>
  );
}

// Privacy shield overlay (blur on screenshot attempt)
export function PrivacyShield({ 
  active = false,
  children,
  blurLevel = 20,
}) {
  return (
    <div className="relative">
      {children}
      {active && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center"
          style={{ backdropFilter: `blur(${blurLevel}px)` }}
        >
          <div className="text-center">
            <Camera className="w-12 h-12 mx-auto text-[#E62020] mb-2" />
            <p className="font-bold text-[#E62020]">Content Protected</p>
            <p className="text-xs text-white/60">Screenshots are not allowed</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default {
  useScreenshotDetection,
  ScreenshotNotification,
  ScreenshotWarningBanner,
  PrivacyShield,
};
