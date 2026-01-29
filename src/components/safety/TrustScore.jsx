/**
 * Trust Score System
 * 
 * Displays and calculates user trust scores based on:
 * - ID verification status
 * - Account age
 * - Community activity
 * - Safety check-in history
 * - Reports/flags
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  BadgeCheck,
  Clock,
  Users,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Camera,
  Fingerprint,
  FileCheck,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Trust score tiers
const TRUST_TIERS = {
  NEW: { min: 0, max: 20, label: 'New', color: '#64748b', icon: Shield },
  BASIC: { min: 21, max: 40, label: 'Basic', color: '#00D9FF', icon: Shield },
  TRUSTED: { min: 41, max: 60, label: 'Trusted', color: '#39FF14', icon: ShieldCheck },
  VERIFIED: { min: 61, max: 80, label: 'Verified', color: '#FF1493', icon: ShieldCheck },
  ELITE: { min: 81, max: 100, label: 'Elite', color: '#FFD700', icon: BadgeCheck },
};

// Get tier from score
function getTierFromScore(score) {
  for (const [key, tier] of Object.entries(TRUST_TIERS)) {
    if (score >= tier.min && score <= tier.max) {
      return { key, ...tier };
    }
  }
  return { key: 'NEW', ...TRUST_TIERS.NEW };
}

/**
 * Calculate trust score from user data
 */
export function calculateTrustScore(user) {
  if (!user) return 0;

  let score = 0;
  const breakdown = [];

  // ID Verification (30 points max)
  if (user.id_verified) {
    score += 30;
    breakdown.push({ label: 'ID Verified', points: 30, max: 30, icon: BadgeCheck });
  } else if (user.selfie_verified) {
    score += 15;
    breakdown.push({ label: 'Selfie Verified', points: 15, max: 30, icon: Camera });
  } else {
    breakdown.push({ label: 'Not Verified', points: 0, max: 30, icon: XCircle });
  }

  // Account Age (20 points max)
  const accountAgeDays = user.created_at 
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const agePoints = Math.min(20, Math.floor(accountAgeDays / 30) * 5); // 5 points per month, max 20
  score += agePoints;
  breakdown.push({ 
    label: `Account Age (${accountAgeDays}d)`, 
    points: agePoints, 
    max: 20, 
    icon: Clock 
  });

  // Profile Completeness (15 points max)
  const profileFields = ['full_name', 'bio', 'avatar_url', 'interests', 'looking_for'];
  const filledFields = profileFields.filter(f => user[f] && String(user[f]).trim()).length;
  const profilePoints = Math.floor((filledFields / profileFields.length) * 15);
  score += profilePoints;
  breakdown.push({ 
    label: 'Profile Complete', 
    points: profilePoints, 
    max: 15, 
    icon: FileCheck 
  });

  // Community Activity (15 points max)
  const activityScore = Math.min(15, (user.xp || 0) / 100);
  score += activityScore;
  breakdown.push({ 
    label: 'Community Activity', 
    points: Math.round(activityScore), 
    max: 15, 
    icon: Users 
  });

  // Safety Check-ins (10 points max)
  const safetyPoints = Math.min(10, (user.safety_checkins || 0) * 2);
  score += safetyPoints;
  breakdown.push({ 
    label: 'Safety Check-ins', 
    points: safetyPoints, 
    max: 10, 
    icon: ShieldCheck 
  });

  // Negative: Reports (deduct up to 20 points)
  const reportPenalty = Math.min(20, (user.report_count || 0) * 5);
  score -= reportPenalty;
  if (reportPenalty > 0) {
    breakdown.push({ 
      label: 'Report Penalty', 
      points: -reportPenalty, 
      max: 0, 
      icon: AlertTriangle,
      negative: true 
    });
  }

  // Premium bonus (10 points)
  if (user.membership_tier && user.membership_tier !== 'basic') {
    score += 10;
    breakdown.push({ 
      label: 'Premium Member', 
      points: 10, 
      max: 10, 
      icon: BadgeCheck 
    });
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    breakdown,
    tier: getTierFromScore(Math.max(0, Math.min(100, score))),
  };
}

/**
 * Trust Score Badge (compact)
 */
export function TrustBadge({ score, size = 'md', showLabel = true, className }) {
  const tier = getTierFromScore(score);
  const Icon = tier.icon;

  const sizes = {
    sm: 'h-5 text-[10px] px-1.5',
    md: 'h-6 text-xs px-2',
    lg: 'h-8 text-sm px-3',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold',
        sizes[size],
        className
      )}
      style={{
        backgroundColor: `${tier.color}20`,
        color: tier.color,
        border: `1px solid ${tier.color}40`,
      }}
      title={`Trust Score: ${score}`}
    >
      <Icon className={cn(
        size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
      )} />
      {showLabel && <span>{score}</span>}
    </div>
  );
}

/**
 * Trust Score Card (detailed view)
 */
export function TrustScoreCard({ user, className }) {
  const { score, breakdown, tier } = calculateTrustScore(user);
  const Icon = tier.icon;
  const navigate = useNavigate();

  return (
    <div className={cn(
      'bg-white/5 border border-white/10 rounded-lg overflow-hidden',
      className
    )}>
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${tier.color}20, transparent)` }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${tier.color}30` }}
        >
          <Icon className="w-8 h-8" style={{ color: tier.color }} />
        </div>
        <div>
          <div className="text-sm text-white/60 uppercase tracking-wider">Trust Score</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black" style={{ color: tier.color }}>
              {score}
            </span>
            <span className="text-white/40">/100</span>
          </div>
          <div 
            className="text-sm font-bold uppercase"
            style={{ color: tier.color }}
          >
            {tier.label}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: tier.color }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
          Score Breakdown
        </div>
        {breakdown.map((item, i) => {
          const ItemIcon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <ItemIcon className={cn(
                'w-4 h-4',
                item.negative ? 'text-red-400' : item.points === item.max ? 'text-green-400' : 'text-white/40'
              )} />
              <span className="flex-1 text-sm text-white/70">{item.label}</span>
              <span className={cn(
                'text-sm font-bold',
                item.negative ? 'text-red-400' : item.points === item.max ? 'text-green-400' : 'text-white'
              )}>
                {item.points > 0 ? '+' : ''}{item.points}
              </span>
            </div>
          );
        })}
      </div>

      {/* Improve CTA */}
      {score < 60 && (
        <div className="border-t border-white/10 p-4">
          <Button
            onClick={() => navigate('/settings')}
            className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Improve Your Score
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Trust Score Ring (circular display)
 */
export function TrustScoreRing({ score, size = 100, strokeWidth = 8, className }) {
  const tier = getTierFromScore(score);
  const Icon = tier.icon;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className="w-6 h-6 mb-1" style={{ color: tier.color }} />
        <span className="text-2xl font-black" style={{ color: tier.color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/**
 * Verification Status Component
 */
export function VerificationStatus({ user, className }) {
  const navigate = useNavigate();
  
  const verifications = [
    {
      key: 'email',
      label: 'Email Verified',
      icon: MessageCircle,
      verified: user?.email_verified,
    },
    {
      key: 'phone',
      label: 'Phone Verified',
      icon: MessageCircle,
      verified: user?.phone_verified,
    },
    {
      key: 'selfie',
      label: 'Selfie Verified',
      icon: Camera,
      verified: user?.selfie_verified,
    },
    {
      key: 'id',
      label: 'ID Verified',
      icon: Fingerprint,
      verified: user?.id_verified,
    },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="text-xs text-white/40 uppercase tracking-wider">
        Verification Status
      </div>
      {verifications.map((v) => {
        const Icon = v.icon;
        return (
          <div
            key={v.key}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border',
              v.verified 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-white/5 border-white/10'
            )}
          >
            <Icon className={cn(
              'w-5 h-5',
              v.verified ? 'text-green-400' : 'text-white/40'
            )} />
            <span className="flex-1 text-sm">{v.label}</span>
            {v.verified ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/settings')}
                className="h-7 text-xs"
              >
                Verify
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TrustScoreCard;
