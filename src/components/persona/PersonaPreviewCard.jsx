import { cn } from '@/lib/utils';
import { User, Plane, PartyPopper, Sparkles } from 'lucide-react';

/**
 * Persona Preview Card
 * Shows persona presentation in compact form
 */

const PERSONA_ICONS = {
  main: User,
  travel: Plane,
  weekend: PartyPopper,
  custom: Sparkles,
};

export function PersonaPreviewCard({ persona, isActive = false, className }) {
  if (!persona) return null;
  
  const Icon = PERSONA_ICONS[persona.persona_type] || User;
  const photos = Array.isArray(persona.photos) ? persona.photos : [];
  const primaryPhoto = photos[0]?.url || photos[0] || null;

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden border transition-all',
      isActive 
        ? 'border-[#00D9FF]/50 shadow-lg shadow-[#00D9FF]/20'
        : 'border-white/10',
      className
    )}>
      {/* Photo or gradient background */}
      <div className="aspect-[3/4] bg-gradient-to-br from-white/10 to-black/40">
        {primaryPhoto && (
          <img 
            src={primaryPhoto} 
            alt={persona.display_name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Type indicator */}
      <div className="absolute top-2 left-2">
        <div className={cn(
          'p-1.5 rounded-full',
          isActive ? 'bg-[#00D9FF]/30' : 'bg-black/50'
        )}>
          <Icon size={14} className={isActive ? 'text-[#00D9FF]' : 'text-white/60'} />
        </div>
      </div>

      {/* Active badge */}
      {isActive && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#00D9FF] bg-black/50 px-1.5 py-0.5 rounded">
            Active
          </span>
        </div>
      )}

      {/* Info */}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <div className="text-sm font-bold text-white truncate">
          {persona.display_name || 'Unnamed'}
        </div>
        {persona.bio && (
          <div className="text-xs text-white/60 truncate mt-0.5">
            {persona.bio}
          </div>
        )}
      </div>
    </div>
  );
}

export default PersonaPreviewCard;
