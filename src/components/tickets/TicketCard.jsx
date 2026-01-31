import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Ticket, MessageCircle, Shield, TrendingUp } from 'lucide-react';

/**
 * Ticket Card
 * Displays resale ticket with CTAs
 * 
 * CTAs:
 * - "Enter chat" (mandatory before purchase)
 * - "Verify ticket"
 * - "Pay securely"
 */

export function TicketCard({ 
  ticket, 
  onChat, 
  onVerify,
  onBuy,
  className 
}) {
  const event = ticket?.event || {};
  const seller = ticket?.seller || {};
  
  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden border border-white/10 bg-white/5',
      className
    )}>
      {/* Event header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {event.name || 'Event'}
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              {event.venue} • {event.date}
            </p>
          </div>
          <Ticket className="text-[#FF1493] shrink-0" size={20} />
        </div>
      </div>

      {/* Ticket details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 uppercase tracking-wider">
            {ticket.ticket_type || 'General'}
          </span>
          <span className="text-lg font-black text-[#00D9FF]">
            £{ticket.price?.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>Seller: {seller.display_name || 'Anonymous'}</span>
          {seller.is_verified && (
            <Shield size={12} className="text-green-400" />
          )}
        </div>

        {/* Demand indicator */}
        {ticket.demand_level && (
          <TicketDemandIndicator level={ticket.demand_level} />
        )}
      </div>

      {/* CTAs */}
      <div className="p-4 pt-0 flex gap-2">
        <Button
          variant="glass"
          size="sm"
          className="flex-1"
          onClick={() => onChat?.(ticket)}
        >
          <MessageCircle size={14} className="mr-1" />
          Enter chat
        </Button>
        <Button
          variant="cyan"
          size="sm"
          className="flex-1"
          onClick={() => onBuy?.(ticket)}
        >
          Pay securely
        </Button>
      </div>

      {/* Chat requirement banner */}
      <TicketChatBanner />
    </div>
  );
}

/**
 * Ticket Demand Indicator
 * Shows demand spike with visual intensity
 */
export function TicketDemandIndicator({ level = 'normal' }) {
  const levels = {
    low: { label: 'Low demand', color: 'text-white/40', bg: 'bg-white/5' },
    normal: { label: 'Normal', color: 'text-white/60', bg: 'bg-white/10' },
    high: { label: 'High demand', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    hot: { label: 'Selling fast', color: 'text-[#FF1493]', bg: 'bg-[#FF1493]/20' },
  };

  const config = levels[level] || levels.normal;

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded', config.bg)}>
      <TrendingUp size={12} className={config.color} />
      <span className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  );
}

/**
 * Ticket Chat Banner
 * Mandatory chat requirement notice
 */
export function TicketChatBanner() {
  return (
    <div className="bg-[#00D9FF]/10 border-t border-[#00D9FF]/20 px-4 py-2">
      <p className="text-[10px] text-[#00D9FF]/80 text-center">
        Chat with seller required before purchase • Fraud protection enabled
      </p>
    </div>
  );
}

export default TicketCard;
