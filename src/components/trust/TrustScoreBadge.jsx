/**
 * TrustScoreBadge - Visual trust score display
 * 
 * Shows trust score with tier badge, breakdown on hover,
 * and verification indicators
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, ShieldCheck, ShieldAlert, Crown, Star,
  Phone, Camera, CreditCard, Check, ChevronUp, Info
} from 'lucide-react';

// Tier configurations
const TIERS = {
  diamond: {
    label: 'Diamond',
    color: '#E5A820',
    bgColor: 'rgba(229, 168, 32, 0.2)',
    borderColor: 'rgba(229, 168, 32, 0.6)',
    icon: Crown,
    min: 91,
  },
  gold: {
    label: 'Gold',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
    icon: Star,
    min: 76,
  },
  silver: {
    label: 'Silver',
    color: '#C0C0C0',
    bgColor: 'rgba(192, 192, 192, 0.2)',
    borderColor: 'rgba(192, 192, 192, 0.6)',
    icon: ShieldCheck,
    min: 51,
  },
  bronze: {
    label: 'Bronze',
    color: '#CD7F32',
    bgColor: 'rgba(205, 127, 50, 0.2)',
    borderColor: 'rgba(205, 127, 50, 0.6)',
    icon: Shield,
    min: 21,
  },
  new: {
    label: 'New',
    color: '#666666',
    bgColor: 'rgba(102, 102, 102, 0.2)',
    borderColor: 'rgba(102, 102, 102, 0.6)',
    icon: ShieldAlert,
    min: 0,
  },
};

export function TrustScoreBadge({
  score = 0,
  tier = 'new',
  verification = {},
  showDetails = true,
  size = 'default', // 'small', 'default', 'large'
  className = '',
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const config = TIERS[tier] || TIERS.new;
  const TierIcon = config.icon;

  const sizes = {
    small: {
      badge: 'w-6 h-6',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    default: {
      badge: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-sm',
    },
    large: {
      badge: 'w-14 h-14',
      icon: 'w-7 h-7',
      text: 'text-base',
    },
  };

  const sizeConfig = sizes[size];

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* Main Badge */}
      <motion.button
        onClick={() => showDetails && setShowBreakdown(!showBreakdown)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          ${sizeConfig.badge} flex items-center justify-center
          border-2 transition-all cursor-pointer
        `}
        style={{ 
          borderColor: config.borderColor,
          backgroundColor: config.bgColor,
          boxShadow: `0 0 15px ${config.bgColor}`,
        }}
      >
        <TierIcon className={sizeConfig.icon} style={{ color: config.color }} />
      </motion.button>

      {/* Score Display */}
      {size !== 'small' && (
        <div className="flex flex-col">
          <span 
            className={`font-bold font-mono ${sizeConfig.text}`}
            style={{ color: config.color }}
          >
            {score}
          </span>
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            {config.label}
          </span>
        </div>
      )}

      {/* Verification Icons */}
      {size === 'large' && (
        <div className="flex gap-1 ml-2">
          <VerificationIcon 
            verified={verification.phone} 
            icon={Phone} 
            label="Phone" 
          />
          <VerificationIcon 
            verified={verification.selfie} 
            icon={Camera} 
            label="Selfie" 
          />
          <VerificationIcon 
            verified={verification.id} 
            icon={CreditCard} 
            label="ID" 
          />
        </div>
      )}

      {/* Breakdown Popover */}
      <AnimatePresence>
        {showBreakdown && (
          <TrustBreakdown
            score={score}
            tier={tier}
            config={config}
            verification={verification}
            onClose={() => setShowBreakdown(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VerificationIcon({ verified, icon: Icon, label }) {
  return (
    <div 
      className={`
        w-6 h-6 flex items-center justify-center border
        ${verified 
          ? 'border-green-500 bg-green-500/20' 
          : 'border-white/20 bg-white/5'
        }
      `}
      title={`${label} ${verified ? 'verified' : 'not verified'}`}
    >
      {verified ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Icon className="w-3 h-3 text-white/40" />
      )}
    </div>
  );
}

function TrustBreakdown({ score, tier, config, verification, onClose }) {
  const breakdown = [
    { 
      label: 'Profile', 
      max: 10, 
      value: Math.min(10, score * 0.1), 
      color: '#E62020' 
    },
    { 
      label: 'Verification', 
      max: 35, 
      value: (verification.phone ? 10 : 0) + (verification.selfie ? 15 : 0) + (verification.id ? 10 : 0),
      color: '#E5A820' 
    },
    { 
      label: 'Behavior', 
      max: 30, 
      value: Math.min(30, score * 0.3), 
      color: '#4CAF50' 
    },
    { 
      label: 'Community', 
      max: 25, 
      value: Math.min(25, score * 0.25), 
      color: '#2196F3' 
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-full left-0 mt-2 z-50 w-72 bg-black border-2 border-white/20 p-4"
      style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <config.icon className="w-5 h-5" style={{ color: config.color }} />
          <span className="font-bold tracking-wider">{config.label} Trust</span>
        </div>
        <span 
          className="text-2xl font-bold font-mono"
          style={{ color: config.color }}
        >
          {score}
        </span>
      </div>

      {/* Breakdown Bars */}
      <div className="space-y-3 mb-4">
        {breakdown.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">{item.label}</span>
              <span className="font-mono text-white/80">
                {Math.round(item.value)}/{item.max}
              </span>
            </div>
            <div className="h-1.5 bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / item.max) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="h-full"
                style={{ 
                  backgroundColor: item.color,
                  boxShadow: `0 0 8px ${item.color}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Verification Status */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-xs text-white/60 mb-2">VERIFICATIONS</div>
        <div className="flex gap-2">
          <VerificationPill 
            verified={verification.phone} 
            icon={Phone} 
            label="Phone" 
            points={10}
          />
          <VerificationPill 
            verified={verification.selfie} 
            icon={Camera} 
            label="Selfie" 
            points={15}
          />
          <VerificationPill 
            verified={verification.id} 
            icon={CreditCard} 
            label="ID" 
            points={10}
          />
        </div>
      </div>

      {/* Close hint */}
      <button 
        onClick={onClose}
        className="absolute -top-2 -right-2 w-6 h-6 bg-white/10 flex items-center justify-center
                   hover:bg-white/20 transition-colors"
      >
        <ChevronUp className="w-4 h-4 text-white/60" />
      </button>
    </motion.div>
  );
}

function VerificationPill({ verified, icon: Icon, label, points }) {
  return (
    <div 
      className={`
        flex items-center gap-1 px-2 py-1 text-xs border
        ${verified 
          ? 'border-green-500/50 bg-green-500/10 text-green-400' 
          : 'border-white/20 bg-white/5 text-white/40'
        }
      `}
    >
      {verified ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
      <span>{label}</span>
      {!verified && (
        <span className="text-[#E62020] ml-1">+{points}</span>
      )}
    </div>
  );
}

// Compact inline version for grids
export function TrustBadgeInline({ score, tier, verification = {}, className = '' }) {
  const config = TIERS[tier] || TIERS.new;
  const TierIcon = config.icon;

  const verifiedCount = [
    verification.phone,
    verification.selfie,
    verification.id,
  ].filter(Boolean).length;

  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 border ${className}`}
      style={{ 
        borderColor: config.borderColor,
        backgroundColor: config.bgColor,
      }}
    >
      <TierIcon className="w-3 h-3" style={{ color: config.color }} />
      <span 
        className="text-xs font-mono font-bold"
        style={{ color: config.color }}
      >
        {score}
      </span>
      {verifiedCount > 0 && (
        <div className="flex items-center ml-1">
          {verification.phone && <Phone className="w-2.5 h-2.5 text-green-500" />}
          {verification.selfie && <Camera className="w-2.5 h-2.5 text-green-500" />}
          {verification.id && <CreditCard className="w-2.5 h-2.5 text-green-500" />}
        </div>
      )}
    </div>
  );
}

// Full trust card for profile pages
export function TrustScoreCard({ 
  score, 
  tier, 
  verification = {},
  suggestions = [],
  onVerify,
  className = '',
}) {
  const config = TIERS[tier] || TIERS.new;
  const TierIcon = config.icon;

  return (
    <div 
      className={`bg-black/50 border-2 p-4 ${className}`}
      style={{ borderColor: config.borderColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 flex items-center justify-center border-2"
            style={{ 
              borderColor: config.borderColor,
              backgroundColor: config.bgColor,
              boxShadow: `0 0 20px ${config.bgColor}`,
            }}
          >
            <TierIcon className="w-6 h-6" style={{ color: config.color }} />
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Trust Score</div>
            <div 
              className="text-3xl font-bold font-mono"
              style={{ color: config.color }}
            >
              {score}
            </div>
          </div>
        </div>
        <div 
          className="px-3 py-1 border text-sm font-bold tracking-wider"
          style={{ 
            borderColor: config.borderColor,
            color: config.color,
          }}
        >
          {config.label.toUpperCase()}
        </div>
      </div>

      {/* Verification Status */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <VerificationCard 
          verified={verification.phone} 
          icon={Phone} 
          label="Phone" 
          points={10}
          onClick={() => !verification.phone && onVerify?.('phone')}
        />
        <VerificationCard 
          verified={verification.selfie} 
          icon={Camera} 
          label="Selfie" 
          points={15}
          onClick={() => !verification.selfie && onVerify?.('selfie')}
        />
        <VerificationCard 
          verified={verification.id} 
          icon={CreditCard} 
          label="ID" 
          points={10}
          onClick={() => !verification.id && onVerify?.('id')}
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
            <Info className="w-3 h-3" />
            <span>IMPROVE YOUR SCORE</span>
          </div>
          <ul className="space-y-1">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                <ChevronUp className="w-4 h-4 text-[#E62020] flex-shrink-0 mt-0.5" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VerificationCard({ verified, icon: Icon, label, points, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={verified}
      className={`
        p-3 border text-center transition-all
        ${verified 
          ? 'border-green-500/50 bg-green-500/10 cursor-default' 
          : 'border-white/20 hover:border-[#E62020] hover:bg-[#E62020]/10 cursor-pointer'
        }
      `}
    >
      <div className="flex justify-center mb-2">
        {verified ? (
          <Check className="w-6 h-6 text-green-500" />
        ) : (
          <Icon className="w-6 h-6 text-white/60" />
        )}
      </div>
      <div className="text-xs text-white/80">{label}</div>
      {!verified && (
        <div className="text-xs text-[#E62020] font-mono mt-1">+{points}</div>
      )}
    </button>
  );
}

export default TrustScoreBadge;
