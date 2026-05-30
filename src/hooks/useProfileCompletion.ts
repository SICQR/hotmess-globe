/**
 * useProfileCompletion
 * Calculates profile completion % from the current user's profiles row.
 * Returns a value 0–100 and a list of incomplete steps for the nudge UI.
 */

import { useMemo } from 'react';
import { useBootGuard } from '@/contexts/BootGuardContext';

export interface CompletionStep {
  label: string;
  done: boolean;
  weight: number;
}

const STEPS = [
  { key: 'display_name', label: 'Add your name',            weight: 25 },
  { key: 'avatar_url',   label: 'Upload a photo',           weight: 20 },
  { key: 'bio',          label: 'Write a bio',              weight: 20 },
  { key: 'community',    label: 'Community verified',       weight: 20 },
  { key: 'push_opt_in',  label: 'Enable notifications',     weight: 15 },
] as const;

export function useProfileCompletion(): {
  pct: number;
  steps: CompletionStep[];
  displayName: string;
  avatarUrl: string | null;
} {
  const { profile } = useBootGuard();

  return useMemo(() => {
    const steps: CompletionStep[] = STEPS.map((s) => {
      let done = false;
      switch (s.key) {
        case 'display_name': done = !!profile?.display_name?.trim(); break;
        case 'avatar_url':   done = !!profile?.avatar_url;           break;
        case 'bio':          done = !!profile?.bio?.trim();          break;
        case 'community':    done = !!profile?.community_attested_at; break;
        case 'push_opt_in':  done = !!profile?.push_opt_in;          break;
      }
      return { label: s.label, done, weight: s.weight };
    });

    const pct = steps.reduce((acc, s) => acc + (s.done ? s.weight : 0), 0);

    return {
      pct,
      steps,
      displayName: profile?.display_name || 'You',
      avatarUrl: profile?.avatar_url ?? null,
    };
  }, [profile]);
}
