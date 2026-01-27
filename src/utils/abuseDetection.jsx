/**
 * Client-side abuse detection and prevention utilities
 * 
 * Features:
 * - Detect spam patterns
 * - Bot activity detection
 * - Harassment pattern detection
 * - Rate limit UI feedback
 * - Automatic backoff on rate limits
 */

// Storage keys
const STORAGE_KEYS = {
  ACTIONS: 'hotmess_user_actions',
  VIOLATIONS: 'hotmess_violations',
  BACKOFF: 'hotmess_backoff',
};

// Configuration
const CONFIG = {
  // Action tracking window (5 minutes)
  actionWindow: 5 * 60 * 1000,
  
  // Spam detection thresholds
  spamThresholds: {
    messages: { count: 10, window: 60 * 1000 },      // 10 messages per minute
    comments: { count: 5, window: 60 * 1000 },       // 5 comments per minute
    posts: { count: 3, window: 60 * 1000 },          // 3 posts per minute
    searches: { count: 20, window: 60 * 1000 },      // 20 searches per minute
    likes: { count: 30, window: 60 * 1000 },         // 30 likes per minute
    follows: { count: 20, window: 60 * 1000 },       // 20 follows per minute
  },
  
  // Bot detection patterns
  botPatterns: {
    minTimeBetweenActions: 100, // ms - too fast is suspicious
    maxActionsPerSecond: 5,
    repetitiveActionThreshold: 10, // Same action 10 times is suspicious
  },
  
  // Backoff configuration
  backoff: {
    initial: 1000,      // 1 second
    multiplier: 2,
    max: 60 * 1000,     // 1 minute max
    resetAfter: 5 * 60 * 1000, // Reset after 5 minutes of good behavior
  },
};

// In-memory action log
let actionLog = [];

/**
 * Initialize action log from storage
 */
function initActionLog() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    if (stored) {
      actionLog = JSON.parse(stored);
      // Clean old entries
      const cutoff = Date.now() - CONFIG.actionWindow;
      actionLog = actionLog.filter(a => a.timestamp > cutoff);
    }
  } catch {
    actionLog = [];
  }
}

/**
 * Save action log to storage
 */
function saveActionLog() {
  try {
    // Keep only recent actions
    const cutoff = Date.now() - CONFIG.actionWindow;
    actionLog = actionLog.filter(a => a.timestamp > cutoff);
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actionLog));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Log a user action
 */
export function logAction(actionType, metadata = {}) {
  const now = Date.now();
  
  actionLog.push({
    type: actionType,
    timestamp: now,
    metadata,
  });
  
  saveActionLog();
  
  return {
    allowed: !isActionBlocked(actionType),
    warning: shouldWarn(actionType),
  };
}

/**
 * Check if an action type is currently blocked
 */
export function isActionBlocked(actionType) {
  const threshold = CONFIG.spamThresholds[actionType];
  if (!threshold) return false;
  
  const cutoff = Date.now() - threshold.window;
  const recentActions = actionLog.filter(
    a => a.type === actionType && a.timestamp > cutoff
  );
  
  return recentActions.length >= threshold.count;
}

/**
 * Check if user should be warned about their activity
 */
function shouldWarn(actionType) {
  const threshold = CONFIG.spamThresholds[actionType];
  if (!threshold) return false;
  
  const cutoff = Date.now() - threshold.window;
  const recentActions = actionLog.filter(
    a => a.type === actionType && a.timestamp > cutoff
  );
  
  // Warn at 70% of threshold
  return recentActions.length >= threshold.count * 0.7;
}

/**
 * Detect bot-like behavior
 */
export function detectBotBehavior() {
  if (actionLog.length < 2) return { isBot: false, confidence: 0 };
  
  const now = Date.now();
  const recentActions = actionLog.filter(
    a => a.timestamp > now - 10000 // Last 10 seconds
  );
  
  let suspicionScore = 0;
  const reasons = [];
  
  // Check 1: Actions per second
  const actionsPerSecond = recentActions.length / 10;
  if (actionsPerSecond > CONFIG.botPatterns.maxActionsPerSecond) {
    suspicionScore += 30;
    reasons.push('High action rate');
  }
  
  // Check 2: Time between actions
  for (let i = 1; i < recentActions.length; i++) {
    const timeDiff = recentActions[i].timestamp - recentActions[i - 1].timestamp;
    if (timeDiff < CONFIG.botPatterns.minTimeBetweenActions) {
      suspicionScore += 20;
      reasons.push('Actions too fast');
      break;
    }
  }
  
  // Check 3: Repetitive actions
  const actionCounts = {};
  for (const action of recentActions) {
    const key = `${action.type}:${JSON.stringify(action.metadata)}`;
    actionCounts[key] = (actionCounts[key] || 0) + 1;
  }
  
  for (const count of Object.values(actionCounts)) {
    if (count >= CONFIG.botPatterns.repetitiveActionThreshold) {
      suspicionScore += 40;
      reasons.push('Repetitive actions');
      break;
    }
  }
  
  // Check 4: Consistent timing (bots often have very consistent intervals)
  if (recentActions.length >= 5) {
    const intervals = [];
    for (let i = 1; i < recentActions.length; i++) {
      intervals.push(recentActions[i].timestamp - recentActions[i - 1].timestamp);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Very low variance suggests automated behavior
    if (avgInterval > 0 && stdDev / avgInterval < 0.1) {
      suspicionScore += 30;
      reasons.push('Suspiciously consistent timing');
    }
  }
  
  return {
    isBot: suspicionScore >= 50,
    confidence: Math.min(100, suspicionScore),
    reasons,
  };
}

/**
 * Detect harassment patterns
 */
export function detectHarassment(targetUserId, messageContent = '') {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  
  // Get messages to this user
  const messagesToUser = actionLog.filter(
    a => a.type === 'messages' && 
         a.metadata?.targetUser === targetUserId &&
         a.timestamp > now - window
  );
  
  let suspicionScore = 0;
  const reasons = [];
  
  // Check 1: Too many messages to same user
  if (messagesToUser.length > 20) {
    suspicionScore += 30;
    reasons.push('Excessive messages to same user');
  }
  
  // Check 2: Messages after being ignored (no response)
  // This would require response tracking
  
  // Check 3: Offensive content detection (basic)
  const offensivePatterns = [
    /\b(hate|kill|die|threat|harass)\b/i,
    /\b(stupid|idiot|moron|loser)\b/i,
  ];
  
  for (const pattern of offensivePatterns) {
    if (pattern.test(messageContent)) {
      suspicionScore += 40;
      reasons.push('Potentially offensive content');
      break;
    }
  }
  
  return {
    isHarassment: suspicionScore >= 50,
    confidence: Math.min(100, suspicionScore),
    reasons,
  };
}

/**
 * Get current backoff delay
 */
export function getBackoffDelay() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BACKOFF);
    if (!stored) return 0;
    
    const backoff = JSON.parse(stored);
    const now = Date.now();
    
    // Reset backoff after good behavior
    if (now - backoff.lastViolation > CONFIG.backoff.resetAfter) {
      localStorage.removeItem(STORAGE_KEYS.BACKOFF);
      return 0;
    }
    
    // Check if still in backoff period
    if (now < backoff.until) {
      return backoff.until - now;
    }
    
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Apply backoff after rate limit hit
 */
export function applyBackoff() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BACKOFF);
    let backoff = stored ? JSON.parse(stored) : {
      delay: CONFIG.backoff.initial,
      lastViolation: 0,
      until: 0,
    };
    
    const now = Date.now();
    
    // Increase delay (exponential backoff)
    backoff.delay = Math.min(
      backoff.delay * CONFIG.backoff.multiplier,
      CONFIG.backoff.max
    );
    backoff.lastViolation = now;
    backoff.until = now + backoff.delay;
    
    localStorage.setItem(STORAGE_KEYS.BACKOFF, JSON.stringify(backoff));
    
    return backoff.delay;
  } catch {
    return CONFIG.backoff.initial;
  }
}

/**
 * Reset backoff (call after successful action)
 */
export function resetBackoff() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BACKOFF);
    if (stored) {
      const backoff = JSON.parse(stored);
      // Gradually reduce delay on successful actions
      backoff.delay = Math.max(CONFIG.backoff.initial, backoff.delay / 2);
      localStorage.setItem(STORAGE_KEYS.BACKOFF, JSON.stringify(backoff));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get rate limit status for UI display
 */
export function getRateLimitStatus(actionType) {
  const threshold = CONFIG.spamThresholds[actionType];
  if (!threshold) {
    return { remaining: Infinity, total: Infinity, percentage: 0 };
  }
  
  const cutoff = Date.now() - threshold.window;
  const recentActions = actionLog.filter(
    a => a.type === actionType && a.timestamp > cutoff
  );
  
  return {
    remaining: Math.max(0, threshold.count - recentActions.length),
    total: threshold.count,
    percentage: (recentActions.length / threshold.count) * 100,
    resetIn: threshold.window,
  };
}

/**
 * Wrapper for API calls with rate limit handling
 */
export async function withRateLimitHandling(apiCall, actionType) {
  // Check local rate limit first
  if (isActionBlocked(actionType)) {
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }
  
  // Check backoff
  const backoffDelay = getBackoffDelay();
  if (backoffDelay > 0) {
    throw new Error(`Please wait ${Math.ceil(backoffDelay / 1000)} seconds before trying again.`);
  }
  
  // Log the action
  logAction(actionType);
  
  try {
    const response = await apiCall();
    resetBackoff();
    return response;
  } catch (error) {
    // Handle rate limit responses from server
    if (error.status === 429 || error.message?.includes('rate limit')) {
      applyBackoff();
    }
    throw error;
  }
}

/**
 * Clear all abuse detection data (for testing/logout)
 */
export function clearAbuseData() {
  actionLog = [];
  localStorage.removeItem(STORAGE_KEYS.ACTIONS);
  localStorage.removeItem(STORAGE_KEYS.VIOLATIONS);
  localStorage.removeItem(STORAGE_KEYS.BACKOFF);
}

// Initialize on load
if (typeof window !== 'undefined') {
  initActionLog();
}

