/**
 * ConsentFlow — 4-screen first-time consent (location, presence, social, AI).
 *
 * Triggered after onboarding if required consent records are missing.
 * Each screen persists to user_consents + user_privacy_settings.
 * Users can skip optional consents — product degrades gracefully.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Eye, Users, Sparkles, ChevronRight, Shield } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';

const AMBER = '#C8962C';

interface ConsentFlowProps {
  onComplete: () => void;
}

interface Screen {
  key: string;
  icon: React.ElementType;
  title: string;
  body: string;
  acceptLabel: string;
  skipLabel: string;
  consentType: string;
  onAccept: () => Partial<Record<string, unknown>>;
  onSkip: () => Partial<Record<string, unknown>>;
}

export default function ConsentFlow({ onComplete }: ConsentFlowProps) {
  const [step, setStep] = useState(0);
  const { update } = usePrivacySettings();

  const screens: Screen[] = [
    {
      key: 'location',
      icon: MapPin,
      title: 'See what\u2019s around you',
      body: 'See what\u2019s happening nearby in real time. Your exact location is never shown to others.',
      acceptLabel: 'Allow location',
      skipLabel: 'Continue without',
      consentType: 'location',
      onAccept: () => ({ location_enabled: true }),
      onSkip: () => ({ location_enabled: false }),
    },
    {
      key: 'presence',
      icon: Eye,
      title: 'Show yourself',
      body: 'Appear on the map when you\u2019re out. You can turn this off anytime in Settings.',
      acceptLabel: 'Show me',
      skipLabel: 'Stay private',
      consentType: 'presence',
      onAccept: () => ({ visibility: 'visible', show_at_venues: true, show_nearby: true }),
      onSkip: () => ({ visibility: 'invisible', show_at_venues: false, show_nearby: false }),
    },
    {
      key: 'social',
      icon: Users,
      title: 'Be discoverable',
      body: 'Let others see you nearby or at venues. You choose when and where.',
      acceptLabel: 'Enable',
      skipLabel: 'Skip',
      consentType: 'social_visibility',
      onAccept: () => ({ show_at_venues: true, show_nearby: true }),
      onSkip: () => ({ show_at_venues: false, show_nearby: false }),
    },
    {
      key: 'ai',
      icon: Sparkles,
      title: 'Smart suggestions',
      body: 'Get suggestions based on what\u2019s happening around you. No hidden profiling \u2014 just context.',
      acceptLabel: 'Enable',
      skipLabel: 'Skip',
      consentType: 'ai_features',
      onAccept: () => ({ ai_suggestions: true }),
      onSkip: () => ({ ai_suggestions: false }),
    },
  ];

  const current = screens[step];

  const persistConsent = useCallback(async (consentType: string, granted: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from('user_consents').upsert(
      {
        user_id: session.user.id,
        consent_type: consentType,
        granted,
        granted_at: new Date().toISOString(),
        accepted: granted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,consent_type' }
    ).catch(() => {});
  }, []);

  const advance = useCallback(async (accepted: boolean) => {
    const screen = screens[step];
    const patch = accepted ? screen.onAccept() : screen.onSkip();

    // Persist consent record
    await persistConsent(screen.consentType, accepted);

    // Update privacy settings
    await update(patch as any).catch(() => {});

    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }, [step, screens, persistConsent, update, onComplete]);

  if (!current) return null;

  const Icon = current.icon;
  const progress = ((step + 1) / screens.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
      style={{ background: '#050507' }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full"
          style={{ background: AMBER }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Step indicator */}
      <p className="absolute top-6 right-6 text-white/30 text-xs font-medium">
        {step + 1} of {screens.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
            style={{ background: `${AMBER}15`, border: `1px solid ${AMBER}25` }}
          >
            <Icon className="w-10 h-10" style={{ color: AMBER }} />
          </div>

          {/* Title */}
          <h1 className="text-white font-bold text-2xl mb-3">{current.title}</h1>

          {/* Body */}
          <p className="text-white/50 text-sm leading-relaxed mb-10">{current.body}</p>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => advance(true)}
              className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.97] transition-transform"
              style={{ background: AMBER, color: '#000' }}
            >
              {current.acceptLabel}
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => advance(false)}
              className="w-full h-12 rounded-2xl flex items-center justify-center text-sm font-medium active:scale-[0.97] transition-transform"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {current.skipLabel}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Trust footer */}
      <div className="absolute bottom-8 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-white/20" />
        <p className="text-white/20 text-[11px]">You can change any of this anytime in Settings.</p>
      </div>
    </div>
  );
}
