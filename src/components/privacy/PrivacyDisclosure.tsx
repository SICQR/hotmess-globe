/**
 * PrivacyDisclosure — subtle inline privacy notice for product surfaces.
 *
 * Usage:
 *   <PrivacyDisclosure type="venue" />
 *   <PrivacyDisclosure type="ghosted" />
 *   <PrivacyDisclosure type="travel" />
 *   <PrivacyDisclosure type="ai" />
 *   <PrivacyDisclosure type="community" />
 */

import { Shield, Eye, EyeOff } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';

const COPY: Record<string, { visible: string; private: string }> = {
  venue: {
    visible: 'You\u2019re visible here. Change anytime in Settings.',
    private: 'You\u2019re checked in privately.',
  },
  ghosted: {
    visible: 'You control who sees you.',
    private: 'You\u2019re invisible right now.',
  },
  travel: {
    visible: 'Sharing your journey is optional.',
    private: 'Journey sharing is off.',
  },
  ai: {
    visible: 'Suggestions are based on activity and approximate location.',
    private: 'Smart suggestions are off.',
  },
  community: {
    visible: 'This is a private space. Check-ins stay between you and the venue.',
    private: 'This is a private space. Check-ins stay between you and the venue.',
  },
};

interface Props {
  type: keyof typeof COPY;
  className?: string;
}

export default function PrivacyDisclosure({ type, className = '' }: Props) {
  const { settings } = usePrivacySettings();
  const copy = COPY[type];
  if (!copy) return null;

  const isVisible = settings?.visibility !== 'invisible';
  const isFeatureOn = type === 'ai'
    ? settings?.ai_suggestions !== false
    : type === 'travel'
    ? settings?.journey_sharing !== 'off'
    : type === 'venue'
    ? settings?.show_at_venues !== false && isVisible
    : isVisible;

  const text = isFeatureOn ? copy.visible : copy.private;
  const Icon = isFeatureOn ? Eye : EyeOff;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Icon className="w-3 h-3 text-white/20 flex-shrink-0" />
      <p className="text-white/25 text-[11px]">{text}</p>
    </div>
  );
}
