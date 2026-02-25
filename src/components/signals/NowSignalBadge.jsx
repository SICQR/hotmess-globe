/**
 * NowSignalBadge
 * Displays contextual NOW signals on profile cards in Ghosted grid.
 */

import React from 'react';

const SIGNAL_STYLES = {
  now_nearby: { label: 'Now nearby', bg: 'bg-gradient-to-r from-[#00D9FF] to-[#00D9FF]/80', text: 'text-black', icon: '📍' },
  active_tonight: { label: 'Active tonight', bg: 'bg-gradient-to-r from-[#C8962C] to-[#C8962C]/80', text: 'text-white', icon: '🌙' },
  looking_right_now: { label: 'Looking now', bg: 'bg-gradient-to-r from-[#C8962C] to-[#00D9FF]', text: 'text-white', icon: '👀', pulse: true },
  matched_before: { label: 'Matched', bg: 'bg-white/20 backdrop-blur-sm', text: 'text-white', icon: '✨' },
  high_chemistry: { label: 'High chemistry', bg: 'bg-gradient-to-r from-[#C8962C] to-[#FF6B6B]', text: 'text-white', icon: '🔥', pulse: true },
  followed_active: { label: 'Following • Active', bg: 'bg-[#00D9FF]/90', text: 'text-black', icon: '💫' },
  chemistry_nearby: { label: 'Chemistry nearby', bg: 'bg-gradient-to-r from-[#C8962C]/90 to-[#C8962C]/70', text: 'text-white', icon: '⚡' },
};

export function NowSignalBadge({ signal, size = 'sm', className = '', onClick }) {
  if (!signal) return null;
  const style = SIGNAL_STYLES[signal.type] || SIGNAL_STYLES.now_nearby;
  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${style.bg} ${style.text} ${sizeClasses} ${style.pulse ? 'animate-pulse' : ''} ${onClick ? 'cursor-pointer hover:brightness-110' : ''} transition-all ${className}`}
    >
      <span className="text-[8px]">{style.icon}</span>
      <span>{style.label}</span>
    </div>
  );
}

export function NowSignalOverlay({ signal, onClick }) {
  if (!signal) return null;
  const style = SIGNAL_STYLES[signal.type] || SIGNAL_STYLES.now_nearby;

  return (
    <div className="absolute bottom-0 inset-x-0 z-20">
      <div className={`mx-2 mb-2 rounded-lg ${style.bg} p-2 backdrop-blur-md border border-white/10 ${onClick ? 'cursor-pointer hover:brightness-110' : ''} transition-all`} onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{style.icon}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold ${style.text}`}>{style.label}</div>
            {signal.message && <div className={`text-[10px] ${style.text} opacity-80 truncate`}>{signal.message}</div>}
          </div>
          {signal.action && <div className={`text-[10px] font-bold ${style.text} opacity-70`}>{signal.action.label} →</div>}
        </div>
      </div>
    </div>
  );
}

export function NowSignalTray({ signals = [], onSignalClick, className = '' }) {
  if (!signals.length) return null;
  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 ${className}`}>
      {signals.slice(0, 3).map((signal) => (
        <NowSignalBadge key={signal.id} signal={signal} size="sm" onClick={() => onSignalClick?.(signal)} className="shrink-0" />
      ))}
    </div>
  );
}

export default NowSignalBadge;
