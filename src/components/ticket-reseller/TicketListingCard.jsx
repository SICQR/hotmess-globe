/**
 * TicketListingCard - Display card for a single ticket listing
 * Now includes verification status badges
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Ticket, 
  Star, 
  Shield, 
  Eye,
  TrendingDown,
  Clock,
  BadgeCheck,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

// Verification badge styles
const VERIFICATION_BADGES = {
  verified: {
    icon: ShieldCheck,
    label: 'Verified',
    className: 'bg-green-500/20 text-green-400 border-green-500/50',
    description: 'Ticket authenticity confirmed'
  },
  premium: {
    icon: Crown,
    label: 'Premium Verified',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    description: 'Full verification + ID check'
  },
  basic: {
    icon: BadgeCheck,
    label: 'Basic Verified',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    description: 'Confirmation email verified'
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    description: 'Awaiting verification'
  }
};

export default function TicketListingCard({ listing, onSelect }) {
  const eventDate = new Date(listing.event_date);
  const hoursUntilEvent = (eventDate - new Date()) / (1000 * 60 * 60);
  const isUrgent = hoursUntilEvent < 48;
  
  // Format date display
  const getDateDisplay = () => {
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    return format(eventDate, 'EEE, MMM d');
  };
  
  // Calculate discount from original price
  const discount = listing.original_price_gbp > listing.asking_price_gbp
    ? Math.round((1 - listing.asking_price_gbp / listing.original_price_gbp) * 100)
    : null;
  
  // Seller trust indicators
  const seller = listing.seller;
  const sellerBadges = [];
  if (seller?.id_verified) sellerBadges.push('ID Verified');
  if (seller?.trust_score >= 80) sellerBadges.push('Trusted');
  if (seller?.total_sales >= 10) sellerBadges.push('Experienced');

  // Get verification badge
  const verificationStatus = listing.verification_status || 'unverified';
  const verificationBadge = VERIFICATION_BADGES[verificationStatus];
  const isVerified = ['verified', 'premium', 'basic'].includes(verificationStatus);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-pink-500/50 transition-all"
    >
      {/* Header with Event Info */}
      <div className="relative p-4 pb-3">
        {/* Verification Badge - Top Left */}
        {verificationBadge && isVerified && (
          <div className={`absolute top-2 left-2 px-2 py-1 border rounded-full text-xs flex items-center gap-1 ${verificationBadge.className}`} title={verificationBadge.description}>
            <verificationBadge.icon className="w-3 h-3" />
            {verificationBadge.label}
          </div>
        )}

        {/* Urgent Badge - Top Right */}
        {isUrgent && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full text-xs text-orange-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {hoursUntilEvent < 24 ? 'Today' : 'Soon'}
          </div>
        )}
        
        {/* Discount Badge - Below verification if present */}
        {discount > 0 && (
          <div className={`absolute ${verificationBadge && isVerified ? 'top-9' : 'top-2'} left-2 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-xs text-green-400 flex items-center gap-1`}>
            <TrendingDown className="w-3 h-3" />
            {discount}% off
          </div>
        )}
        
        <h3 className="font-semibold text-lg line-clamp-1 pr-16 mt-6">
          {listing.event_name}
        </h3>
        
        <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{listing.event_venue}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{getDateDisplay()}</span>
          <span className="text-gray-600">•</span>
          <span>{format(eventDate, 'HH:mm')}</span>
        </div>
      </div>
      
      {/* Ticket Type & Quantity */}
      <div className="px-4 pb-3">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded-lg text-sm">
          <Ticket className="w-4 h-4 text-pink-400" />
          <span className="capitalize">{listing.ticket_type.replace('_', ' ')}</span>
          {listing.ticket_quantity > 1 && (
            <>
              <span className="text-gray-600">•</span>
              <span>{listing.ticket_quantity}x</span>
            </>
          )}
        </div>
      </div>
      
      {/* Seller Info */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {seller?.average_rating > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{seller.average_rating.toFixed(1)}</span>
          </div>
        )}
        {sellerBadges.length > 0 && (
          <div className="flex items-center gap-1">
            {sellerBadges.map(badge => (
              <span
                key={badge}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  badge === 'Verified' 
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : badge === 'Trusted'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 text-gray-500 text-xs">
          <Eye className="w-3 h-3" />
          {listing.view_count || 0}
        </div>
      </div>
      
      {/* Price & CTA */}
      <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              £{listing.asking_price_gbp.toFixed(2)}
            </span>
            {listing.original_price_gbp !== listing.asking_price_gbp && (
              <span className="text-sm text-gray-500 line-through">
                £{listing.original_price_gbp.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-cyan-400 mt-0.5">
            <Shield className="w-3 h-3" />
            Buyer protected
          </div>
          {isVerified && (
            <div className="flex items-center gap-1 text-xs text-green-400 mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              Ticket verified
            </div>
          )}
        </div>
        
        <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity">
          Buy Now
        </button>
      </div>
    </motion.div>
  );
}
