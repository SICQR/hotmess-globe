import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * LED BRUTALIST Side Tab Navigation
 * Filing cabinet style vertical tabs with LED accents
 */

const DEFAULT_TABS = [
  { id: 'home', label: 'HOME', path: 'Home' },
  { id: 'pulse', label: 'PULSE', path: 'Pulse' },
  { id: 'social', label: 'SOCIAL', path: 'Connect' },
  { id: 'market', label: 'MARKET', path: 'Marketplace' },
  { id: 'events', label: 'EVENTS', path: 'Events' },
];

export default function SideTabNav({ 
  tabs = DEFAULT_TABS, 
  position = 'right',
  currentPage 
}) {
  const location = useLocation();
  
  const isActive = (path) => {
    if (currentPage) return currentPage === path;
    return location.pathname === createPageUrl(path);
  };

  return (
    <nav 
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col",
        "border-l-2 border-white/20",
        position === 'right' ? 'right-0' : 'left-0'
      )}
      aria-label="Side navigation"
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        
        return (
          <Link
            key={tab.id}
            to={createPageUrl(tab.path)}
            className={cn(
              // Base styles
              "relative w-10 py-4 px-2",
              "font-mono text-[10px] font-bold uppercase tracking-[0.15em]",
              "writing-mode-vertical text-orientation-mixed",
              "border-b border-white/10 last:border-b-0",
              "transition-all duration-150",
              // Inactive state
              !active && "bg-black text-white/40 hover:text-white hover:bg-white/5",
              // Active state - LED glow
              active && "bg-[#E62020] text-white shadow-[0_0_20px_rgba(255,20,147,0.8)]"
            )}
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
            aria-current={active ? 'page' : undefined}
          >
            {/* LED indicator dot for active */}
            {active && (
              <span 
                className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white"
                style={{ boxShadow: '0 0 8px #FFF' }}
              />
            )}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Horizontal version for mobile - filing tabs at bottom
 */
export function BottomTabNav({ tabs = DEFAULT_TABS, currentPage }) {
  const location = useLocation();
  
  const isActive = (path) => {
    if (currentPage) return currentPage === path;
    return location.pathname === createPageUrl(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t-2 border-white bg-black"
      aria-label="Bottom navigation"
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          
          return (
            <Link
              key={tab.id}
              to={createPageUrl(tab.path)}
              className={cn(
                // Base styles
                "flex-1 py-4 text-center",
                "font-mono text-[9px] font-bold uppercase tracking-[0.1em]",
                "border-r border-white/10 last:border-r-0",
                "transition-all duration-150",
                // Min touch target
                "min-h-[52px] flex items-center justify-center",
                // Inactive state
                !active && "text-white/40 active:bg-white/5",
                // Active state
                active && "text-[#E62020] bg-white/5"
              )}
              aria-current={active ? 'page' : undefined}
            >
              {/* LED underline for active */}
              <span className="relative">
                {tab.label}
                {active && (
                  <span 
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#E62020]"
                    style={{ boxShadow: '0 0 8px #E62020' }}
                  />
                )}
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black" />
    </nav>
  );
}
