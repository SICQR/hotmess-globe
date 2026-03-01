/**
 * Human-readable match insights generator
 * Converts numeric scores into meaningful explanations
 */

import type { MatchBreakdown } from './types';

export type MatchInsight = {
  icon: string;
  text: string;
  score: 'great' | 'good' | 'neutral' | 'low';
  category: string;
};

/**
 * Generate human-readable insights from match breakdown
 */
export function generateMatchInsights(
  breakdown: MatchBreakdown,
  travelTimeMinutes?: number
): MatchInsight[] {
  const insights: MatchInsight[] = [];

  // Travel time insight
  if (travelTimeMinutes !== undefined && travelTimeMinutes !== null) {
    if (travelTimeMinutes <= 10) {
      insights.push({
        icon: '📍',
        text: `Just ${travelTimeMinutes} min away`,
        score: 'great',
        category: 'location',
      });
    } else if (travelTimeMinutes <= 30) {
      insights.push({
        icon: '🚶',
        text: `${travelTimeMinutes} min travel time`,
        score: 'good',
        category: 'location',
      });
    } else if (travelTimeMinutes <= 60) {
      insights.push({
        icon: '🚗',
        text: `About ${Math.round(travelTimeMinutes / 5) * 5} min away`,
        score: 'neutral',
        category: 'location',
      });
    }
  } else if (breakdown.travelTime >= 15) {
    insights.push({
      icon: '📍',
      text: 'Nearby',
      score: 'good',
      category: 'location',
    });
  }

  // Role compatibility insight
  if (breakdown.roleCompat >= 12) {
    insights.push({
      icon: '🔥',
      text: 'Highly compatible roles',
      score: 'great',
      category: 'compatibility',
    });
  } else if (breakdown.roleCompat >= 10) {
    insights.push({
      icon: '✨',
      text: 'Compatible preferences',
      score: 'good',
      category: 'compatibility',
    });
  }

  // Kink overlap insight
  if (breakdown.kinkOverlap >= 12) {
    insights.push({
      icon: '💫',
      text: 'Many shared interests',
      score: 'great',
      category: 'interests',
    });
  } else if (breakdown.kinkOverlap >= 8) {
    insights.push({
      icon: '🎯',
      text: 'Some common interests',
      score: 'good',
      category: 'interests',
    });
  } else if (breakdown.kinkOverlap <= 3) {
    insights.push({
      icon: '⚠️',
      text: 'Different preferences',
      score: 'low',
      category: 'interests',
    });
  }

  // Intent alignment insight
  if (breakdown.intent >= 9) {
    insights.push({
      icon: '💝',
      text: 'Looking for the same thing',
      score: 'great',
      category: 'intent',
    });
  } else if (breakdown.intent >= 6) {
    insights.push({
      icon: '💭',
      text: 'Similar intentions',
      score: 'good',
      category: 'intent',
    });
  }

  // Semantic text insight
  if (breakdown.semantic >= 10) {
    insights.push({
      icon: '📝',
      text: 'Similar vibes from bio',
      score: 'great',
      category: 'personality',
    });
  } else if (breakdown.semantic >= 8) {
    insights.push({
      icon: '💬',
      text: 'Personality click potential',
      score: 'good',
      category: 'personality',
    });
  }

  // Lifestyle insight
  if (breakdown.lifestyle >= 8) {
    insights.push({
      icon: '🌟',
      text: 'Lifestyle match',
      score: 'great',
      category: 'lifestyle',
    });
  } else if (breakdown.lifestyle >= 5) {
    insights.push({
      icon: '☀️',
      text: 'Compatible lifestyle',
      score: 'good',
      category: 'lifestyle',
    });
  }

  // Activity insight
  if (breakdown.activity >= 7) {
    insights.push({
      icon: '🟢',
      text: 'Recently active',
      score: 'great',
      category: 'activity',
    });
  } else if (breakdown.activity >= 5) {
    insights.push({
      icon: '🔵',
      text: 'Active this week',
      score: 'good',
      category: 'activity',
    });
  } else if (breakdown.activity <= 2) {
    insights.push({
      icon: '😴',
      text: 'Not very active',
      score: 'low',
      category: 'activity',
    });
  }

  // Profile completeness insight
  if (breakdown.completeness >= 7) {
    insights.push({
      icon: '✅',
      text: 'Detailed profile',
      score: 'great',
      category: 'profile',
    });
  } else if (breakdown.completeness <= 3) {
    insights.push({
      icon: '📋',
      text: 'Limited profile info',
      score: 'low',
      category: 'profile',
    });
  }

  // Sort by score quality: great first, then good, neutral, low
  const scoreOrder = { great: 0, good: 1, neutral: 2, low: 3 };
  insights.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score]);

  // Return top insights (limit to avoid clutter)
  return insights.slice(0, 4);
}

/**
 * Get the top highlight insight for card display
 */
export function getTopInsight(breakdown: MatchBreakdown, travelTimeMinutes?: number): MatchInsight | null {
  const insights = generateMatchInsights(breakdown, travelTimeMinutes);
  return insights.find(i => i.score === 'great') || insights[0] || null;
}

/**
 * Get match quality tier
 */
export function getMatchTier(matchProbability: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (matchProbability >= 85) {
    return { label: 'Excellent Match', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' };
  }
  if (matchProbability >= 70) {
    return { label: 'Great Match', color: '#C8962C', bgColor: 'rgba(200, 150, 44, 0.2)' };
  }
  if (matchProbability >= 55) {
    return { label: 'Good Match', color: '#C8962C', bgColor: 'rgba(200, 150, 44, 0.2)' };
  }
  if (matchProbability >= 40) {
    return { label: 'Potential', color: '#00D9FF', bgColor: 'rgba(0, 217, 255, 0.2)' };
  }
  return { label: 'Explore', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.2)' };
}

/**
 * Get breakdown category scores as percentages for visual bar
 */
export function getBreakdownPercentages(breakdown: MatchBreakdown): {
  category: string;
  label: string;
  percentage: number;
  maxPoints: number;
  color: string;
}[] {
  return [
    {
      category: 'travelTime',
      label: 'Location',
      percentage: (breakdown.travelTime / 20) * 100,
      maxPoints: 20,
      color: '#C8962C',
    },
    {
      category: 'roleCompat',
      label: 'Roles',
      percentage: (breakdown.roleCompat / 15) * 100,
      maxPoints: 15,
      color: '#C8962C',
    },
    {
      category: 'kinkOverlap',
      label: 'Interests',
      percentage: (breakdown.kinkOverlap / 15) * 100,
      maxPoints: 15,
      color: '#00D9FF',
    },
    {
      category: 'intent',
      label: 'Intent',
      percentage: (breakdown.intent / 12) * 100,
      maxPoints: 12,
      color: '#22c55e',
    },
    {
      category: 'semantic',
      label: 'Vibe',
      percentage: (breakdown.semantic / 12) * 100,
      maxPoints: 12,
      color: '#f59e0b',
    },
    {
      category: 'lifestyle',
      label: 'Lifestyle',
      percentage: (breakdown.lifestyle / 10) * 100,
      maxPoints: 10,
      color: '#ec4899',
    },
    {
      category: 'activity',
      label: 'Active',
      percentage: (breakdown.activity / 8) * 100,
      maxPoints: 8,
      color: '#8b5cf6',
    },
    {
      category: 'completeness',
      label: 'Profile',
      percentage: (breakdown.completeness / 8) * 100,
      maxPoints: 8,
      color: '#64748b',
    },
  ];
}
