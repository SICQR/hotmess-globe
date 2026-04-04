import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { getRateLimitStatus, getBackoffDelay } from '@/utils/abuseDetection';

/**
 * Rate Limit Indicator Component
 * Shows remaining rate limit for an action type
 */
export function RateLimitIndicator({ actionType, showWhenOk = false }) {
  const status = getRateLimitStatus(actionType);
  const backoffDelay = getBackoffDelay();
  
  // Don't show if everything is OK and showWhenOk is false
  if (!showWhenOk && status.percentage < 70 && backoffDelay === 0) {
    return null;
  }
  
  const isWarning = status.percentage >= 70 && status.percentage < 100;
  const isBlocked = status.remaining === 0 || backoffDelay > 0;
  
  return (
    <div className={`
      flex items-center gap-2 text-xs px-3 py-1.5 rounded-full
      ${isBlocked 
        ? 'bg-red-500/20 text-red-500 border border-red-500/40' 
        : isWarning 
          ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/40'
          : 'bg-white/10 text-white/60 border border-white/20'
      }
    `}>
      {isBlocked ? (
        <>
          <Clock className="w-3 h-3" />
          <span>
            {backoffDelay > 0 
              ? `Wait ${Math.ceil(backoffDelay / 1000)}s` 
              : 'Rate limited'
            }
          </span>
        </>
      ) : isWarning ? (
        <>
          <AlertTriangle className="w-3 h-3" />
          <span>{status.remaining} remaining</span>
        </>
      ) : (
        <span>{status.remaining}/{status.total}</span>
      )}
    </div>
  );
}

/**
 * Rate Limit Progress Bar
 * Shows a visual progress bar of rate limit usage
 */
export function RateLimitProgress({ actionType, className = '' }) {
  const status = getRateLimitStatus(actionType);
  
  const getColor = () => {
    if (status.percentage >= 100) return 'bg-red-500';
    if (status.percentage >= 70) return 'bg-yellow-500';
    return 'bg-[#39FF14]';
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-white/60 mb-1">
        <span>{actionType}</span>
        <span>{status.remaining}/{status.total}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${Math.min(100, status.percentage)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Rate Limit Warning Banner
 * Shows a dismissible warning when approaching rate limits
 */
export function RateLimitWarning({ actionType, onDismiss }) {
  const status = getRateLimitStatus(actionType);
  const backoffDelay = getBackoffDelay();
  
  if (status.percentage < 70 && backoffDelay === 0) {
    return null;
  }
  
  const isBlocked = status.remaining === 0 || backoffDelay > 0;
  
  return (
    <div className={`
      p-4 rounded-lg mb-4 flex items-start gap-3
      ${isBlocked 
        ? 'bg-red-500/20 border border-red-500/40' 
        : 'bg-yellow-500/20 border border-yellow-500/40'
      }
    `}>
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
        isBlocked ? 'text-red-500' : 'text-yellow-500'
      }`} />
      <div className="flex-1">
        <p className={`font-semibold ${isBlocked ? 'text-red-500' : 'text-yellow-500'}`}>
          {isBlocked ? 'Action temporarily blocked' : 'Slow down'}
        </p>
        <p className="text-sm text-white/80 mt-1">
          {isBlocked 
            ? backoffDelay > 0 
              ? `Please wait ${Math.ceil(backoffDelay / 1000)} seconds before trying again.`
              : 'You\'ve reached the rate limit. Please wait a moment.'
            : `You're approaching the rate limit. ${status.remaining} actions remaining.`
          }
        </p>
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="text-white/60 hover:text-white"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default RateLimitIndicator;
