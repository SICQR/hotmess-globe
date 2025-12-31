import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const ABTestContext = createContext();

/**
 * A/B Testing Framework for HOTMESS
 * Supports variant assignment, tracking, and analytics
 */

// Test configurations
const AB_TESTS = {
  'connect_layout': {
    variants: ['grid', 'list'],
    default: 'grid',
    weights: [0.5, 0.5] // 50/50 split
  },
  'cta_color': {
    variants: ['pink', 'cyan', 'yellow'],
    default: 'pink',
    weights: [0.33, 0.33, 0.34]
  },
  'marketplace_sort': {
    variants: ['newest', 'popular'],
    default: 'newest',
    weights: [0.5, 0.5]
  }
};

/**
 * Assign user to a variant based on email hash
 * Ensures consistent assignment across sessions
 */
function assignVariant(testId, userEmail) {
  const test = AB_TESTS[testId];
  if (!test) return test?.default || null;

  // Hash email to get consistent assignment
  let hash = 0;
  const str = `${testId}-${userEmail}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  
  const normalized = Math.abs(hash) / 2147483647;
  
  // Weighted random assignment
  let cumulative = 0;
  for (let i = 0; i < test.variants.length; i++) {
    cumulative += test.weights[i];
    if (normalized < cumulative) {
      return test.variants[i];
    }
  }
  
  return test.default;
}

/**
 * Track A/B test event
 */
async function trackEvent(testId, variant, event, userEmail) {
  try {
    await base44.entities.UserActivity.create({
      user_email: userEmail,
      activity_type: 'ab_test',
      metadata: {
        test_id: testId,
        variant,
        event,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to track A/B test event:', error);
  }
}

export function ABTestProvider({ children, user }) {
  const [variants, setVariants] = useState({});

  useEffect(() => {
    if (user?.email) {
      // Assign variants for all active tests
      const assignments = {};
      Object.keys(AB_TESTS).forEach((testId) => {
        assignments[testId] = assignVariant(testId, user.email);
      });
      setVariants(assignments);

      // Track initial assignment
      Object.entries(assignments).forEach(([testId, variant]) => {
        trackEvent(testId, variant, 'assigned', user.email);
      });
    }
  }, [user?.email]);

  const getVariant = (testId) => {
    return variants[testId] || AB_TESTS[testId]?.default;
  };

  const track = (testId, event) => {
    if (user?.email && variants[testId]) {
      trackEvent(testId, variants[testId], event, user.email);
    }
  };

  return (
    <ABTestContext.Provider value={{ getVariant, track, variants }}>
      {children}
    </ABTestContext.Provider>
  );
}

export function useABTest(testId) {
  const context = useContext(ABTestContext);
  if (!context) {
    throw new Error('useABTest must be used within ABTestProvider');
  }
  
  return {
    variant: context.getVariant(testId),
    track: (event) => context.track(testId, event)
  };
}

// Admin dashboard component for A/B test results
export function ABTestResults() {
  const [results, setResults] = useState({});

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const activities = await base44.entities.UserActivity.filter(
          { activity_type: 'ab_test' },
          '-created_date',
          1000
        );

        const analysis = {};
        
        activities.forEach((activity) => {
          const { test_id, variant, event } = activity.metadata || {};
          if (!test_id || !variant) return;

          if (!analysis[test_id]) {
            analysis[test_id] = {};
          }
          if (!analysis[test_id][variant]) {
            analysis[test_id][variant] = { assigned: 0, conversions: 0, clicks: 0 };
          }

          if (event === 'assigned') analysis[test_id][variant].assigned++;
          if (event === 'conversion') analysis[test_id][variant].conversions++;
          if (event === 'click') analysis[test_id][variant].clicks++;
        });

        setResults(analysis);
      } catch (error) {
        console.error('Failed to fetch A/B test results:', error);
      }
    };

    fetchResults();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">A/B Test Results</h2>
      {Object.entries(results).map(([testId, variants]) => (
        <div key={testId} className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 uppercase">{testId.replace(/_/g, ' ')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(variants).map(([variant, stats]) => {
              const conversionRate = stats.assigned > 0 
                ? ((stats.conversions / stats.assigned) * 100).toFixed(1)
                : 0;
              
              return (
                <div key={variant} className="bg-black/40 border border-white/20 rounded-lg p-4">
                  <div className="text-sm text-white/60 uppercase mb-2">{variant}</div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-white/40">Assigned:</span>
                      <span className="ml-2 font-bold">{stats.assigned}</span>
                    </div>
                    <div>
                      <span className="text-xs text-white/40">Conversions:</span>
                      <span className="ml-2 font-bold text-[#39FF14]">{stats.conversions}</span>
                    </div>
                    <div>
                      <span className="text-xs text-white/40">Rate:</span>
                      <span className="ml-2 font-bold text-[#FF1493]">{conversionRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {Object.keys(results).length === 0 && (
        <p className="text-white/40 text-center py-8">No A/B test data yet</p>
      )}
    </div>
  );
}