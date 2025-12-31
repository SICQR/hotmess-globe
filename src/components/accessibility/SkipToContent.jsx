import React from 'react';

/**
 * Skip to main content link for keyboard navigation
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FF1493] focus:text-black focus:font-bold focus:uppercase focus:text-sm"
    >
      Skip to main content
    </a>
  );
}