/**
 * PrivacySettingsPanel — full privacy control surface.
 *
 * Sections: Visibility, Presence, Vibe, Travel, AI, Analytics, Location.
 * Saves instantly. Reflects immediately in live systems.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, MapPin, Users, Zap, Navigation, Sparkles,
  BarChart3, Shield, ChevronDown,
} from 'lucide-react';
import { usePrivacySettings, type PrivacySettings } from '@/hooks/usePrivacySettings';
import { toast } from 'sonner';

const AMBER = '#C8962C';

// ─── Toggle row ──────────────────────────────────────────────────────────

function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
  icon: Icon,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.99] ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {Icon && <Icon className="w-4.5 h-4.5 text-white/30 flex-shrink-0" />}
      <div className="flex-1 text-left min-w-0">
        <p className="text-white text-sm font-semibold">{label}</p>
        {description && <p className="text-white/35 text-xs mt-0.5">{description}</p>}
      </div>
      <div
        className="w-11 h-6 rounded-full flex-shrink-0 relative transition-colors"
        style={{ background: value ? AMBER : 'rgba(255,255,255,0.1)' }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
          animate={{ left: value ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}

// ─── Selector row ────────────────────────────────────────────────────────

function Selector<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  icon?: React.ElementType;
}) {
  return (
    <div
      className="px-4 py-3.5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        {Icon && <Icon className="w-4.5 h-4.5 text-white/30" />}
        <div>
          <p className="text-white text-sm font-semibold">{label}</p>
          {description && <p className="text-white/35 text-xs mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex-1 h-9 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
            style={{
              background: value === opt.value ? `${AMBER}20` : 'rgba(255,255,255,0.04)',
              color: value === opt.value ? AMBER : 'rgba(255,255,255,0.4)',
              border: `1px solid ${value === opt.value ? `${AMBER}40` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.15em] px-1 mt-6 mb-2">
      {label}
    </p>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────

export default function PrivacySettingsPanel() {
  const { settings, update, isLoading } = usePrivacySettings();

  const handleUpdate = async (patch: Partial<Omit<PrivacySettings, 'user_id'>>) => {
    try {
      await update(patch);
    } catch {
      toast.error('Could not save — try again');
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#C8962C] rounded-full animate-spin" />
      </div>
    );
  }

  const isInvisible = settings.visibility === 'invisible';

  return (
    <div className="space-y-1">
      {/* Trust header */}
      <div className="flex items-center gap-2 px-1 mb-4">
        <Shield className="w-4 h-4" style={{ color: AMBER }} />
        <p className="text-white/40 text-xs">You control who sees you. Change anytime.</p>
      </div>

      {/* ── Visibility ── */}
      <SectionHeader label="Visibility" />
      <Selector
        label="Profile visibility"
        description="Controls how others see you across HOTMESS"
        value={settings.visibility}
        options={[
          { value: 'visible' as const, label: 'Visible' },
          { value: 'low' as const, label: 'Low' },
          { value: 'invisible' as const, label: 'Invisible' },
        ]}
        onChange={(v) => handleUpdate({ visibility: v })}
        icon={isInvisible ? EyeOff : Eye}
      />

      {/* ── Presence ── */}
      <SectionHeader label="Presence" />
      <Toggle
        label="Show me at venues"
        description="Others can see you checked in"
        value={settings.show_at_venues}
        onChange={(v) => handleUpdate({ show_at_venues: v })}
        disabled={isInvisible}
        icon={MapPin}
      />
      <Toggle
        label="Show me nearby"
        description="Appear in nearby people on Ghosted"
        value={settings.show_nearby}
        onChange={(v) => handleUpdate({ show_nearby: v })}
        disabled={isInvisible}
        icon={Users}
      />

      {/* ── Vibe ── */}
      <SectionHeader label="Vibe" />
      <Toggle
        label="Share my vibe"
        description="Contribute to the venue vibe mix"
        value={settings.share_vibe}
        onChange={(v) => handleUpdate({ share_vibe: v })}
        icon={Zap}
      />

      {/* ── Travel ── */}
      <SectionHeader label="Travel" />
      <Selector
        label="Journey sharing"
        description="Who can see your ETA when travelling"
        value={settings.journey_sharing}
        options={[
          { value: 'off' as const, label: 'Off' },
          { value: 'ask' as const, label: 'Ask each time' },
          { value: 'trusted_only' as const, label: 'Trusted only' },
        ]}
        onChange={(v) => handleUpdate({ journey_sharing: v })}
        icon={Navigation}
      />

      {/* ── AI ── */}
      <SectionHeader label="Suggestions" />
      <Toggle
        label="Smart suggestions"
        description="Get nudges based on what's happening around you"
        value={settings.ai_suggestions}
        onChange={(v) => handleUpdate({ ai_suggestions: v })}
        icon={Sparkles}
      />

      {/* ── Analytics ── */}
      <SectionHeader label="Analytics" />
      <Toggle
        label="Performance analytics"
        description="Help us improve HOTMESS with anonymous usage data"
        value={settings.analytics_consent}
        onChange={(v) => handleUpdate({ analytics_consent: v })}
        icon={BarChart3}
      />

      {/* ── Location ── */}
      <SectionHeader label="Location" />
      <Toggle
        label="Location services"
        description="Master toggle for all location features"
        value={settings.location_enabled}
        onChange={(v) => handleUpdate({ location_enabled: v })}
        icon={MapPin}
      />

      {isInvisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 py-3 rounded-2xl mt-4"
          style={{ background: 'rgba(200,150,44,0.08)', border: `1px solid ${AMBER}20` }}
        >
          <p className="text-xs" style={{ color: AMBER }}>
            You're invisible. Venue presence and nearby features are paused.
          </p>
        </motion.div>
      )}
    </div>
  );
}
