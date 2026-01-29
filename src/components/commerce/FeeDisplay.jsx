/**
 * FeeDisplay - Compact fee information components
 * 
 * Reusable components for displaying pricing/fee information
 * throughout the app (marketplace, ticket resale, etc.)
 */

import { Info, Shield, Percent, Check } from 'lucide-react';
import { 
  MESSMARKET_SELLER, 
  MESSMARKET_BUYER, 
  TICKET_RESALE,
  formatPrice,
  calculateSellerEarnings,
  calculateTicketFees,
} from '@/lib/pricing';
import { cn } from '@/lib/utils';

// =============================================================================
// SELLER FEE BADGE
// =============================================================================

/**
 * Compact badge showing seller commission rate
 */
export function SellerFeeBadge({ 
  type = 'standard', // 'standard' | 'verified' | 'volume'
  className = '' 
}) {
  const commission = MESSMARKET_SELLER.commission[type];
  const rate = commission?.rate || 0.10;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      type === 'verified' ? 'bg-emerald-500/20 text-emerald-400' :
      type === 'volume' ? 'bg-purple-500/20 text-purple-400' :
      'bg-white/10 text-white/60',
      className
    )}>
      <Percent className="w-3 h-3" />
      {(rate * 100).toFixed(0)}% fee
    </span>
  );
}

// =============================================================================
// SELLER EARNINGS CALCULATOR (INLINE)
// =============================================================================

/**
 * Inline display of seller earnings after commission
 */
export function SellerEarnings({ 
  salePrice, 
  commissionRate = 0.10,
  showBreakdown = false,
  className = '' 
}) {
  const earnings = calculateSellerEarnings(salePrice, commissionRate);
  
  if (showBreakdown) {
    return (
      <div className={cn('space-y-1 text-sm', className)}>
        <div className="flex justify-between">
          <span className="text-white/60">Sale price</span>
          <span>{formatPrice(earnings.salePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Platform fee ({earnings.commissionRate})</span>
          <span className="text-red-400">-{formatPrice(earnings.commission)}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-white/10 pt-1">
          <span>Your earnings</span>
          <span className="text-emerald-400">{formatPrice(earnings.earnings)}</span>
        </div>
      </div>
    );
  }
  
  return (
    <span className={cn('text-emerald-400 font-medium', className)}>
      You earn: {formatPrice(earnings.earnings)}
    </span>
  );
}

// =============================================================================
// BUYER PROTECTION BADGE
// =============================================================================

/**
 * Badge showing buyer protection status
 */
export function BuyerProtectionBadge({ 
  type = 'standard', // 'standard' | 'premium'
  className = '' 
}) {
  const protection = MESSMARKET_BUYER.protections[type];
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      type === 'premium' ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-white/5',
      className
    )}>
      <Shield className={cn(
        'w-4 h-4',
        type === 'premium' ? 'text-cyan-400' : 'text-emerald-400'
      )} />
      <div>
        <p className="text-sm font-medium">{protection.name}</p>
        <p className="text-xs text-white/60">
          {type === 'premium' ? '30-day protection' : 'Escrow-protected'}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// TICKET FEE SUMMARY
// =============================================================================

/**
 * Display ticket resale fees for sellers and buyers
 */
export function TicketFeeSummary({ 
  ticketPrice, 
  faceValue = null,
  view = 'both', // 'seller' | 'buyer' | 'both'
  className = '' 
}) {
  const fees = calculateTicketFees(ticketPrice, faceValue);
  
  return (
    <div className={cn('space-y-2', className)}>
      {(view === 'seller' || view === 'both') && (
        <div className="flex justify-between text-sm">
          <span className="text-white/60">
            Seller receives ({TICKET_RESALE.seller.commission.rate * 100}% fee)
          </span>
          <span className="text-emerald-400 font-medium">
            {formatPrice(fees.sellerEarnings)}
          </span>
        </div>
      )}
      
      {(view === 'buyer' || view === 'both') && (
        <div className="flex justify-between text-sm">
          <span className="text-white/60">
            Buyer total ({TICKET_RESALE.buyer.serviceFee.rate * 100}% fee)
          </span>
          <span className="font-medium">
            {formatPrice(fees.buyerTotal)}
          </span>
        </div>
      )}
      
      {faceValue && !fees.withinPriceCap && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Info className="w-3 h-3" />
          Above 150% price cap - may be adjusted
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PRICE CAP WARNING
// =============================================================================

/**
 * Warning badge for ticket price cap violations
 */
export function PriceCapWarning({ 
  ticketPrice, 
  faceValue,
  className = '' 
}) {
  const maxAllowed = faceValue * TICKET_RESALE.priceCaps.maxMarkup;
  const exceeds = ticketPrice > maxAllowed;
  
  if (!exceeds) return null;
  
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30',
      className
    )}>
      <Info className="w-4 h-4 text-amber-400 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-400">Price exceeds cap</p>
        <p className="text-xs text-white/60">
          Maximum allowed: {formatPrice(maxAllowed)} (150% of face value)
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// COMMISSION TIERS DISPLAY
// =============================================================================

/**
 * Display available commission tiers for sellers
 */
export function CommissionTiers({ 
  currentTier = 'standard',
  showRequirements = true,
  className = '' 
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Object.entries(MESSMARKET_SELLER.commission).map(([key, tier]) => (
        <div 
          key={key}
          className={cn(
            'flex items-center justify-between p-3 rounded-lg border',
            currentTier === key 
              ? 'border-hot-500 bg-hot-500/10' 
              : 'border-white/10 bg-white/5'
          )}
        >
          <div>
            <p className="font-medium capitalize">{key}</p>
            {showRequirements && tier.requirements && (
              <p className="text-xs text-white/40">
                {tier.requirements.join(' • ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{(tier.rate * 100).toFixed(0)}%</p>
            <p className="text-xs text-white/40">commission</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// NO FEES BANNER
// =============================================================================

/**
 * Banner highlighting no buyer fees
 */
export function NoBuyerFeesBanner({ className = '' }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20',
      className
    )}>
      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <p className="font-bold text-emerald-400">No Hidden Fees for Buyers</p>
        <p className="text-sm text-white/60">
          Price shown is price paid. Buyer protection included free.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT FEE INFO TOOLTIP CONTENT
// =============================================================================

/**
 * Content for fee information tooltips
 */
export function FeeInfoContent({ type = 'seller' }) {
  if (type === 'seller') {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-bold">Seller Fees</p>
        <ul className="space-y-1 text-white/80">
          <li>• Standard: 10% commission</li>
          <li>• Verified sellers: 8%</li>
          <li>• High volume (£5k+/mo): 7%</li>
        </ul>
        <p className="text-xs text-white/60 mt-2">
          No listing fees. Only pay when you sell.
        </p>
      </div>
    );
  }
  
  if (type === 'buyer') {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-bold">Buyer Protection</p>
        <ul className="space-y-1 text-white/80">
          <li>✓ Escrow-protected payment</li>
          <li>✓ Full refund if not received</li>
          <li>✓ 14-day dispute window</li>
        </ul>
        <p className="text-xs text-white/60 mt-2">
          No extra fees - included free.
        </p>
      </div>
    );
  }
  
  if (type === 'ticket') {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-bold">Ticket Fees</p>
        <ul className="space-y-1 text-white/80">
          <li>• Seller: 10% commission</li>
          <li>• Buyer: 2.5% service fee</li>
          <li>• Max markup: 150% of face value</li>
        </ul>
        <p className="text-xs text-white/60 mt-2">
          Ticket guarantee included for buyers.
        </p>
      </div>
    );
  }
  
  return null;
}

export default {
  SellerFeeBadge,
  SellerEarnings,
  BuyerProtectionBadge,
  TicketFeeSummary,
  PriceCapWarning,
  CommissionTiers,
  NoBuyerFeesBanner,
  FeeInfoContent,
};
