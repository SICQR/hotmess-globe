/**
 * CTAButton - Branded Call to Action Button
 * 
 * Uses the centralized CTA configuration for consistent styling
 * and behavior across the platform.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
// Button imported for documentation purposes but not directly used
// import { Button } from '@/components/ui/button';
import { 
  Zap, ArrowRight, Users, Heart, ShoppingBag, CreditCard, 
  Store, MessageCircle, Plus, Calendar, MapPin, Shield, 
  Phone, Gift, Trophy, Radio, Crown, Lock, Sparkles
} from 'lucide-react';

// Icon mapping
const ICONS = {
  Zap, ArrowRight, Users, Heart, ShoppingBag, CreditCard,
  Store, MessageCircle, Plus, Calendar, MapPin, Shield,
  Phone, Gift, Trophy, Radio, Crown, Lock, Sparkles,
};

// Variant styles
const VARIANT_STYLES = {
  'hot': 'bg-[#C8962C] hover:bg-[#C8962C]/90 text-white',
  'hot-gradient': 'bg-gradient-to-r from-[#C8962C] to-[#B026FF] hover:opacity-90 text-white',
  'cyan': 'bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black',
  'cyan-gradient': 'bg-gradient-to-r from-[#00D9FF] to-[#0066FF] hover:opacity-90 text-white',
  'purple': 'bg-[#B026FF] hover:bg-[#B026FF]/90 text-white',
  'gold': 'bg-[#FFD700] hover:bg-[#FFD700]/90 text-black',
  'lime': 'bg-[#39FF14] hover:bg-[#39FF14]/90 text-black',
  'black': 'bg-black hover:bg-black/90 text-white border border-white/20',
  'outline': 'bg-transparent hover:bg-white/10 text-white border-2 border-white/30',
  'outline-hot': 'bg-transparent hover:bg-[#C8962C]/10 text-[#C8962C] border-2 border-[#C8962C]',
  'outline-cyan': 'bg-transparent hover:bg-[#00D9FF]/10 text-[#00D9FF] border-2 border-[#00D9FF]',
  'destructive': 'bg-red-600 hover:bg-red-700 text-white',
  'ghost': 'bg-transparent hover:bg-white/10 text-white',
};

export default function CTAButton({
  // Content
  text,
  icon,
  badge,
  
  // Styling
  variant = 'hot',
  size = 'default',
  glow = false,
  pulse = false,
  fullWidth = false,
  className = '',
  
  // Behavior
  action,
  onClick,
  href,
  disabled = false,
  loading = false,
  
  // Data
  xp,
  tier,
}) {
  const navigate = useNavigate();
  
  // Process text with variables
  const processedText = text
    ?.replace('{xp}', xp || '0')
    ?.replace('{tier}', tier || '');
  
  // Get icon component
  const IconComponent = typeof icon === 'string' ? ICONS[icon] : icon;
  
  // Handle click
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    
    if (action?.startsWith('navigate:')) {
      const path = action.replace('navigate:', '');
      navigate(path);
      return;
    }
    
    if (href) {
      if (href.startsWith('http')) {
        window.open(href, '_blank');
      } else {
        navigate(href);
      }
    }
  };
  
  // Size classes
  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    default: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  };
  
  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        relative inline-flex items-center justify-center gap-2
        font-black uppercase tracking-wider
        rounded-none transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_STYLES[variant] || VARIANT_STYLES.hot}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${glow ? 'shadow-[0_0_20px_rgba(255,20,147,0.5)]' : ''}
        ${className}
      `}
      style={glow ? {
        boxShadow: variant.includes('cyan') 
          ? '0 0 20px rgba(0, 217, 255, 0.5)'
          : variant.includes('gold')
            ? '0 0 20px rgba(255, 215, 0, 0.5)'
            : '0 0 20px rgba(255, 20, 147, 0.5)',
      } : {}}
    >
      {/* Pulse animation */}
      {pulse && (
        <span className="absolute inset-0 rounded-none animate-ping opacity-30" 
          style={{ backgroundColor: 'currentColor' }} 
        />
      )}
      
      {/* Loading spinner */}
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          {IconComponent && <IconComponent className="w-5 h-5" />}
          <span>{processedText}</span>
        </>
      )}
      
      {/* Badge */}
      {badge && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-black bg-[#FFD700] text-black rounded-full">
          {badge}
        </span>
      )}
    </motion.button>
  );
}

// Pre-configured CTA variants
export function GoLiveCTA(props) {
  return (
    <CTAButton
      text="GO LIVE"
      icon="Zap"
      variant="hot-gradient"
      glow
      {...props}
    />
  );
}

export function GetStartedCTA(props) {
  return (
    <CTAButton
      text="GET STARTED FREE"
      icon="ArrowRight"
      variant="hot-gradient"
      glow
      action="navigate:/auth"
      {...props}
    />
  );
}

export function UpgradePlusCTA(props) {
  return (
    <CTAButton
      text="UPGRADE TO PLUS"
      icon="Zap"
      variant="hot"
      badge="2x XP"
      action="navigate:/membership?tier=plus"
      {...props}
    />
  );
}

export function UpgradeChromeCTA(props) {
  return (
    <CTAButton
      text="GO CHROME"
      icon="Crown"
      variant="cyan"
      badge="BEST"
      action="navigate:/membership?tier=pro"
      {...props}
    />
  );
}

export function ShopNowCTA(props) {
  return (
    <CTAButton
      text="SHOP NOW"
      icon="ShoppingBag"
      variant="outline"
      action="navigate:/market"
      {...props}
    />
  );
}

export function StartSellingCTA(props) {
  return (
    <CTAButton
      text="START SELLING"
      icon="Store"
      variant="purple"
      action="navigate:/seller-dashboard"
      {...props}
    />
  );
}

export function ListenLiveCTA(props) {
  return (
    <CTAButton
      text="LISTEN LIVE"
      icon="Radio"
      variant="black"
      {...props}
    />
  );
}

export function MessageCTA(props) {
  return (
    <CTAButton
      text="MESSAGE"
      icon="MessageCircle"
      variant="hot"
      {...props}
    />
  );
}

export function RSVPCTA(props) {
  return (
    <CTAButton
      text="RSVP"
      icon="Calendar"
      variant="cyan"
      {...props}
    />
  );
}
