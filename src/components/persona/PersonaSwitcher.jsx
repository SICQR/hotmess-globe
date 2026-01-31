import { useState, useCallback } from 'react';
import { usePersona } from '@/contexts/PersonaContext';
import { usePulse } from '@/contexts/PulseContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Plane, PartyPopper, Sparkles } from 'lucide-react';

/**
 * Persona Switcher
 * Allows user to switch presentation persona
 * 
 * CTAs:
 * - "Use for travel"
 * - "Use locally"
 * 
 * Signal: Persona change → colour ripple from user city
 */

const PERSONA_ICONS = {
  main: User,
  travel: Plane,
  weekend: PartyPopper,
  custom: Sparkles,
};

const PERSONA_LABELS = {
  main: 'Main',
  travel: 'Travel',
  weekend: 'Weekend',
  custom: 'Custom',
};

export function PersonaSwitcher({ className }) {
  const { personas, activePersona, switchPersona, isLoading } = usePersona();
  const { ripple } = usePulse();
  const [switching, setSwitching] = useState(null);

  const handleSwitch = useCallback(async (personaId) => {
    setSwitching(personaId);
    const success = await switchPersona(personaId);
    if (success) {
      ripple({ type: 'persona_change' });
    }
    setSwitching(null);
  }, [switchPersona, ripple]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-white/5 rounded-xl p-4', className)}>
        Loading personas...
      </div>
    );
  }

  if (!personas.length) {
    return (
      <div className={cn('text-white/60 text-sm', className)}>
        No personas configured
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
        Active Persona
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {personas.map((persona) => {
          const Icon = PERSONA_ICONS[persona.persona_type] || User;
          const isActive = persona.id === activePersona?.id;
          const isSwitching = persona.id === switching;
          
          return (
            <button
              key={persona.id}
              onClick={() => !isActive && handleSwitch(persona.id)}
              disabled={isActive || isSwitching}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                isActive
                  ? 'bg-gradient-to-r from-[#FF1493]/20 to-[#00D9FF]/20 border-white/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10',
                isSwitching && 'opacity-50'
              )}
            >
              <Icon size={20} className={isActive ? 'text-[#00D9FF]' : 'text-white/60'} />
              <div className="text-left">
                <div className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-white' : 'text-white/80'
                )}>
                  {persona.display_name || PERSONA_LABELS[persona.persona_type]}
                </div>
                <div className="text-xs text-white/50">
                  {PERSONA_LABELS[persona.persona_type]}
                </div>
              </div>
              {isActive && (
                <span className="ml-auto text-[10px] font-bold text-[#00D9FF] uppercase">
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="glass" size="sm" className="flex-1">
          Use for travel
        </Button>
        <Button variant="glass" size="sm" className="flex-1">
          Use locally
        </Button>
      </div>
    </div>
  );
}

export default PersonaSwitcher;
