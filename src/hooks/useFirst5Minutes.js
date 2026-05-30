import { useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useV6Flag as useFlag } from '@/hooks/useV6Flag';

/**
 * useFirst5Minutes — Chunk 06 hook
 * Flag: v6_first_five_minutes
 *
 * Handles:
 * - Stage logging to analytics_events (funnel drop-off visible per stage)
 * - Stage persistence to profiles.onboarding_stage (resume on tab close)
 * - Completion: sets profiles.onboarding_stage = 'complete'
 */

// Canonical stage names for analytics + resume
export const F5M_STAGES = {
  COLD_OPEN:  'f5m_cold_open',
  AUTH:       'f5m_auth',
  AGE:        'f5m_age',
  NAME:       'f5m_name',
  SOUND:      'f5m_sound',
  GHOSTED:    'f5m_ghosted',
  MATCH:      'f5m_match',
  CHAT:       'f5m_chat',
  ARRIVAL:    'f5m_arrival',
  COMPLETE:   'complete',
};

// Map profile onboarding_stage → F5M stage index (for resume)
export const STAGE_TO_INDEX = {
  'start':          0,
  'f5m_cold_open':  0,
  'f5m_auth':       1,
  'f5m_age':        2,
  'f5m_name':       3,
  'f5m_sound':      4,
  'f5m_ghosted':    5,
  'f5m_match':      6,
  'f5m_chat':       7,
  'f5m_arrival':    8,
};

export function useFirst5Minutes() {
  const enabled = useFlag('v6_first_five_minutes');

  /**
   * Log a stage completion to analytics_events + persist to profile.
   * Fire-and-forget — never blocks UI.
   */
  const logStage = useCallback(async (stageName) => {
    if (!enabled) return;

    const { data: { user } } = await supabase.auth.getUser();

    // Log to analytics_events
    supabase.from('analytics_events').insert({
      event_name: 'f5m_stage_complete',
      category: 'onboarding',
      label: stageName,
      user_id: user?.id || null,
      properties: {
        stage: stageName,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      },
    }).then(() => {}).catch(() => {});

    // Persist stage to profile for resume (authenticated users only)
    if (user) {
      supabase.from('profiles')
        .update({ onboarding_stage: stageName, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {}).catch(() => {});
    }
  }, [enabled]);

  /**
   * Mark onboarding complete.
   * Sets profile.onboarding_stage = 'complete'
   */
  const completeOnboarding = useCallback(async () => {
    if (!enabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({
      onboarding_stage: 'complete',
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    await supabase.from('analytics_events').insert({
      event_name: 'f5m_onboarding_complete',
      category: 'onboarding',
      label: 'complete',
      user_id: user.id,
      properties: { timestamp: new Date().toISOString() },
    });
  }, [enabled]);

  /**
   * Get resume index from current profile stage.
   * Falls back to 0 (cold open) for unknown stages.
   */
  const getResumeIndex = useCallback((onboardingStage) => {
    return STAGE_TO_INDEX[onboardingStage] ?? 0;
  }, []);

  return { enabled, logStage, completeOnboarding, getResumeIndex };
}
