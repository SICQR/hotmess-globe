import React from 'react';
import { Zap, Clock, Home, Car, Building, HelpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LOGISTICS_ICONS = {
  can_host: Home,
  can_travel: Car,
  hotel: Building,
  undecided: HelpCircle
};

export default function RightNowIndicator({ status, compact = false }) {
  if (!status || !status.active || new Date(status.expires_at) <= new Date()) {
    return null;
  }

  const timeRemaining = formatDistanceToNow(new Date(status.expires_at), { addSuffix: false });

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#FF1493] text-black text-xs font-black uppercase border-2 border-white animate-pulse">
        <Zap className="w-3 h-3" />
        LIVE
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#FF1493]/20 to-[#FF1493]/10 border-2 border-[#FF1493] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#FF1493] rounded-full animate-pulse" />
          <span className="text-xs font-black uppercase text-[#FF1493]">RIGHT NOW</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/60">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{timeRemaining} left</span>
        </div>
      </div>

      {/* Logistics */}
      {status.logistics && status.logistics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {status.logistics.map(log => {
            const Icon = LOGISTICS_ICONS[log] || Zap;
            return (
              <div
                key={log}
                className="flex items-center gap-1 px-2 py-1 bg-black/40 border border-[#FF1493]/40 text-[#FF1493] text-xs font-bold uppercase"
              >
                <Icon className="w-3 h-3" />
                {log.replace('_', ' ')}
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-expire info */}
      <p className="text-[10px] text-white/40 font-mono uppercase">
        Auto-expires • No ghost status
      </p>
    </div>
  );
}