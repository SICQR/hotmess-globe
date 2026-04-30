import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';

/**
 * SafePage - Stealth "Disappear" target.
 * Renders a blank or extremely generic "Safe" screen to protect user privacy.
 */
export default function SafePage() {
  useEffect(() => {
    // Clear search params to hide any traces
    window.history.replaceState({}, '', '/safe');
    
    // Set document title to something generic
    document.title = 'Page Not Found';
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050507] flex items-center justify-center p-8">
      {/* 
        This page is intentionally blank/minimalist.
        It looks like a loading state or a 404 to a casual observer.
      */}
      <div className="flex flex-col items-center gap-4 opacity-5">
        <Shield className="w-12 h-12 text-white/20" />
        <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-white/20 animate-[loading_2s_infinite]" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </div>
  );
}
