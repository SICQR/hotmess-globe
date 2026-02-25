import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Home, Car, Building, CheckCircle, XCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const LOGISTICS_ICONS = {
  can_host: Home,
  can_travel: Car,
  hotel: Building
};

export default function RightNowHistory({ userEmail }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['right-now-history', userEmail],
    queryFn: () => base44.entities.RightNowStatus.filter({ user_email: userEmail }, '-created_date', 20),
    enabled: !!userEmail
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Zap className="w-8 h-8 text-white/20 mx-auto mb-2 animate-pulse" />
        <p className="text-white/40 text-xs">Loading history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Zap className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm uppercase">No Right Now history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((status, idx) => {
        const isExpired = new Date(status.expires_at) <= new Date();
        const wasDeactivated = !status.active;
        
        return (
          <motion.div
            key={status.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`border-2 p-4 ${
              !isExpired && status.active
                ? 'bg-[#C8962C]/10 border-[#C8962C]'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${!isExpired && status.active ? 'text-[#C8962C]' : 'text-white/40'}`} />
                <span className="text-xs font-black uppercase">
                  {status.duration_minutes === 480 ? 'TONIGHT' : `${status.duration_minutes} MIN`}
                </span>
              </div>
              
              {!isExpired && status.active ? (
                <span className="flex items-center gap-1 text-[10px] text-[#39FF14] font-bold uppercase">
                  <div className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse" />
                  LIVE
                </span>
              ) : wasDeactivated ? (
                <span className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase">
                  <XCircle className="w-3 h-3" />
                  ENDED EARLY
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase">
                  <CheckCircle className="w-3 h-3" />
                  EXPIRED
                </span>
              )}
            </div>

            {/* Logistics */}
            {status.logistics && status.logistics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {status.logistics.map(log => {
                  const Icon = LOGISTICS_ICONS[log] || Zap;
                  return (
                    <span
                      key={log}
                      className="flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/20 text-white/60 text-[10px] font-bold uppercase"
                    >
                      <Icon className="w-2.5 h-2.5" />
                      {log.replace('_', ' ')}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono">
              <span>{format(new Date(status.created_date), 'MMM d, HH:mm')}</span>
              {!isExpired && status.active && (
                <>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(status.expires_at))} left</span>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}