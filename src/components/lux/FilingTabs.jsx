import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';

/**
 * LUX BRUTALIST Filing Cabinet Navigation
 * 
 * Vertical side tabs that look like file folder tabs
 * - Stacked vertically on the right edge
 * - Active tab "pulls out" with content
 * - LED glow accent on active
 * - Vertical text orientation
 */

const DEFAULT_TABS = [
  { id: 'home', label: 'HOME', path: 'Home', icon: '◈' },
  { id: 'pulse', label: 'PULSE', path: 'Pulse', icon: '◉' },
  { id: 'social', label: 'CONNECT', path: 'Connect', icon: '◎' },
  { id: 'market', label: 'MARKET', path: 'Marketplace', icon: '◇' },
  { id: 'events', label: 'EVENTS', path: 'Events', icon: '◆' },
  { id: 'messages', label: 'MSGS', path: 'Messages', icon: '▣', badgeKey: 'messages' },
];

export function FilingTabs({
  tabs = DEFAULT_TABS,
  currentPage,
  position = 'right',
  onTabChange,
  badgeCounts = {}, // { messages: 5, events: 2 }
}) {
  const location = useLocation();
  const [hoveredTab, setHoveredTab] = useState(null);

  const isActive = (path) => {
    if (currentPage) return currentPage === path;
    const currentPath = location.pathname.toLowerCase();
    const tabPath = createPageUrl(path).toLowerCase();
    return currentPath === tabPath;
  };

  return (
    <nav
      className={`fixed top-1/2 -translate-y-1/2 z-[90] hidden lg:flex flex-col ${
        position === 'right' ? 'right-0' : 'left-0'
      }`}
      aria-label="Main navigation"
    >
      {/* Filing cabinet frame */}
      <div className={`relative ${position === 'right' ? 'border-l-2' : 'border-r-2'} border-white/40`}>
        {tabs.map((tab, index) => {
          const active = isActive(tab.path);
          const hovered = hoveredTab === tab.id;

          return (
            <Link
              key={tab.id}
              to={createPageUrl(tab.path)}
              onClick={() => onTabChange?.(tab)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className="relative block group"
              aria-current={active ? 'page' : undefined}
            >
              <motion.div
                initial={false}
                animate={{
                  x: active ? (position === 'right' ? -8 : 8) : 0,
                  backgroundColor: active ? '#FF1493' : 'rgba(0,0,0,0.95)',
                }}
                whileHover={{
                  x: position === 'right' ? -4 : 4,
                }}
                transition={{ duration: 0.15 }}
                className={`
                  relative flex items-center justify-center
                  w-12 py-5 
                  border-b border-white/10 last:border-b-0
                  ${position === 'right' ? 'border-l-2' : 'border-r-2'}
                  ${active 
                    ? 'border-[#FF1493] shadow-[0_0_20px_rgba(255,20,147,0.6)]' 
                    : 'border-white/20 hover:border-white/40'
                  }
                  transition-colors duration-150
                `}
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                }}
              >
                {/* Tab icon */}
                <span className={`
                  text-xs mb-2
                  ${active ? 'text-white' : 'text-white/40 group-hover:text-white/70'}
                `}>
                  {tab.icon}
                </span>

                {/* Tab label */}
                <span className={`
                  font-mono text-[10px] font-bold uppercase tracking-[0.15em]
                  ${active ? 'text-white' : 'text-white/50 group-hover:text-white'}
                `}>
                  {tab.label}
                </span>

                {/* Active LED dot */}
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white"
                    style={{ boxShadow: '0 0 8px #FFF, 0 0 16px #FF1493' }}
                  />
                )}

                {/* Badge count */}
                {tab.badgeKey && badgeCounts[tab.badgeKey] > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-[#FF1493] text-white text-[8px] font-black px-1"
                    style={{ boxShadow: '0 0 10px rgba(255,20,147,0.6)' }}
                  >
                    {badgeCounts[tab.badgeKey] > 99 ? '99+' : badgeCounts[tab.badgeKey]}
                  </motion.span>
                )}
              </motion.div>

              {/* Hover tooltip */}
              <AnimatePresence>
                {hovered && !active && (
                  <motion.div
                    initial={{ opacity: 0, x: position === 'right' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: position === 'right' ? 10 : -10 }}
                    className={`
                      absolute top-1/2 -translate-y-1/2
                      ${position === 'right' ? 'right-full mr-3' : 'left-full ml-3'}
                      px-3 py-1.5 bg-black border-2 border-white/30
                      font-mono text-[10px] uppercase tracking-wider text-white
                      whitespace-nowrap
                    `}
                  >
                    {tab.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>

      {/* Version stamp */}
      <div 
        className="mt-4 font-mono text-[8px] text-white/20 uppercase tracking-wider text-center"
        style={{ writingMode: 'vertical-rl' }}
      >
        HM.v3
      </div>
    </nav>
  );
}

/**
 * Bottom Filing Tabs for Mobile
 * Horizontal version of the filing cabinet tabs
 */
export function BottomFilingTabs({
  tabs = DEFAULT_TABS,
  currentPage,
  onTabChange,
  badgeCounts = {}, // { messages: 5, events: 2 }
}) {
  const location = useLocation();

  const isActive = (path) => {
    if (currentPage) return currentPage === path;
    const currentPath = location.pathname.toLowerCase();
    const tabPath = createPageUrl(path).toLowerCase();
    return currentPath === tabPath;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] lg:hidden bg-black border-t-2 border-white"
      aria-label="Main navigation"
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = isActive(tab.path);

          return (
            <Link
              key={tab.id}
              to={createPageUrl(tab.path)}
              onClick={() => onTabChange?.(tab)}
              className={`
                relative flex-1 flex flex-col items-center justify-center
                py-3 min-h-[60px]
                border-r border-white/10 last:border-r-0
                transition-all duration-150
                ${active 
                  ? 'bg-[#FF1493] text-white' 
                  : 'text-white/50 active:bg-white/5'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon */}
              <span className="text-sm mb-0.5">{tab.icon}</span>
              
              {/* Label */}
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>

              {/* Badge count */}
              {tab.badgeKey && badgeCounts[tab.badgeKey] > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-[#00D9FF] text-black text-[9px] font-black px-1"
                  style={{ boxShadow: '0 0 10px rgba(0,217,255,0.6)' }}
                >
                  {badgeCounts[tab.badgeKey] > 99 ? '99+' : badgeCounts[tab.badgeKey]}
                </motion.span>
              )}

              {/* Active LED underline */}
              {active && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
                  style={{ boxShadow: '0 0 10px #FFF' }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black" />
    </nav>
  );
}

/**
 * Expandable Filing Drawer
 * A tab that expands to show sub-items
 */
export function FilingDrawer({
  label,
  icon,
  items,
  isOpen,
  onToggle,
  position = 'right',
}) {
  return (
    <div className="relative">
      {/* Main tab */}
      <button
        onClick={onToggle}
        className={`
          w-12 py-5 flex items-center justify-center
          border-b border-white/10
          ${position === 'right' ? 'border-l-2' : 'border-r-2'}
          ${isOpen ? 'border-[#FF1493] bg-[#FF1493]' : 'border-white/20 bg-black'}
          transition-all duration-150
        `}
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
      >
        <span className={`text-xs mb-2 ${isOpen ? 'text-white' : 'text-white/40'}`}>
          {icon}
        </span>
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${isOpen ? 'text-white' : 'text-white/50'}`}>
          {label}
        </span>
      </button>

      {/* Expanded drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute top-0 ${position === 'right' ? 'right-full' : 'left-full'}
              bg-black border-2 border-white/20 overflow-hidden
            `}
          >
            <div className="p-4 min-w-[200px]">
              {items.map((item, index) => (
                <Link
                  key={item.id || index}
                  to={item.path}
                  className="block py-2 px-3 mb-1 last:mb-0 font-mono text-xs uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/20 transition-all"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FilingTabs;
