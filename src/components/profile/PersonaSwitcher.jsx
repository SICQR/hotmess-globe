/**
 * Persona Switcher Component
 * 
 * Allows users to switch between their profiles/personas.
 * Shows active persona and quick-switch options.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Plane, 
  PartyPopper, 
  Sparkles,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Persona type configs
const PERSONA_TYPES = {
  MAIN: {
    icon: User,
    label: 'Main',
    color: '#FFFFFF',
    description: 'Your primary profile'
  },
  TRAVEL: {
    icon: Plane,
    label: 'Travel',
    color: '#00D9FF',
    description: 'For when you\'re exploring'
  },
  WEEKEND: {
    icon: PartyPopper,
    label: 'Weekend',
    color: '#FF1493',
    description: 'Party mode'
  },
  CUSTOM: {
    icon: Sparkles,
    label: 'Custom',
    color: '#B026FF',
    description: 'Your custom persona'
  }
};

// Visibility icons
const VISIBILITY_ICONS = {
  PUBLIC: Eye,
  MATCHES_ONLY: Eye,
  ALLOWLIST: Eye,
  HIDDEN: EyeOff
};

export default function PersonaSwitcher({ 
  compact = false,
  className = '' 
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch user's personas
  useEffect(() => {
    async function fetchPersonas() {
      if (!user?.id) return;

      setLoading(true);

      // Get main profile and all secondary profiles
      const { data, error } = await supabase
        .from('User')
        .select('id, display_name, avatar_url, persona_type, persona_visibility, parent_profile_id')
        .or(`id.eq.${user.id},parent_profile_id.eq.${user.id}`)
        .order('persona_type', { ascending: true });

      if (error) {
        console.error('Failed to fetch personas:', error);
        setLoading(false);
        return;
      }

      // Separate main and secondary
      const mainProfile = data?.find(p => !p.parent_profile_id) || data?.[0];
      const secondaryProfiles = data?.filter(p => p.parent_profile_id) || [];

      setPersonas([mainProfile, ...secondaryProfiles].filter(Boolean));
      
      // Set active - could be stored in user context or local storage
      const activeId = localStorage.getItem('activePersonaId') || mainProfile?.id;
      const active = data?.find(p => p.id === activeId) || mainProfile;
      setActivePersona(active);

      setLoading(false);
    }

    fetchPersonas();
  }, [user?.id]);

  // Switch persona
  const handleSwitch = async (persona) => {
    if (persona.id === activePersona?.id) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);

    try {
      // Update user's active persona in DB
      await supabase
        .from('User')
        .update({ active_persona_id: persona.id })
        .eq('id', user.id);

      // Store locally
      localStorage.setItem('activePersonaId', persona.id);

      setActivePersona(persona);
      setIsOpen(false);

      // Trigger refresh of profile data
      window.dispatchEvent(new CustomEvent('personaChanged', { detail: persona }));

    } catch (error) {
      console.error('Failed to switch persona:', error);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-white/40" />
      </div>
    );
  }

  if (!activePersona) return null;

  const activeConfig = PERSONA_TYPES[activePersona.persona_type] || PERSONA_TYPES.MAIN;
  const ActiveIcon = activeConfig.icon;
  const VisibilityIcon = VISIBILITY_ICONS[activePersona.persona_visibility] || Eye;

  // Compact mode - just shows active with dropdown
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 
                     hover:border-white/30 transition-colors"
        >
          <ActiveIcon className="w-4 h-4" style={{ color: activeConfig.color }} />
          <span className="text-sm font-medium text-white">{activePersona.display_name}</span>
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <PersonaDropdown
              personas={personas}
              activePersona={activePersona}
              onSelect={handleSwitch}
              onClose={() => setIsOpen(false)}
              switching={switching}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full mode - card with more details
  return (
    <div className={`${className}`}>
      <div className="p-4 bg-black border border-white/10">
        {/* Active persona header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 flex items-center justify-center"
              style={{ backgroundColor: `${activeConfig.color}20` }}
            >
              <ActiveIcon className="w-5 h-5" style={{ color: activeConfig.color }} />
            </div>
            <div>
              <p className="font-bold text-white">{activePersona.display_name}</p>
              <p className="text-xs text-white/60">{activeConfig.label} Profile</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-white/40">
              <VisibilityIcon className="w-3 h-3" />
              {activePersona.persona_visibility?.toLowerCase().replace('_', ' ')}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/profile/personas')}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Persona grid */}
        <div className="grid grid-cols-4 gap-2">
          {personas.map((persona) => {
            const config = PERSONA_TYPES[persona.persona_type] || PERSONA_TYPES.MAIN;
            const Icon = config.icon;
            const isActive = persona.id === activePersona.id;

            return (
              <button
                key={persona.id}
                onClick={() => handleSwitch(persona)}
                disabled={switching}
                className={`
                  p-3 flex flex-col items-center gap-1 border transition-all
                  ${isActive 
                    ? 'border-white bg-white/10' 
                    : 'border-white/10 hover:border-white/30 bg-transparent'
                  }
                `}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
                <span className="text-[10px] text-white/60">{config.label}</span>
                {isActive && (
                  <Check className="w-3 h-3 text-[#39FF14] absolute top-1 right-1" />
                )}
              </button>
            );
          })}

          {/* Add new persona */}
          {personas.length < 5 && (
            <button
              onClick={() => navigate('/profile/personas/new')}
              className="p-3 flex flex-col items-center gap-1 border border-dashed border-white/20 
                         hover:border-[#FF1493] transition-colors"
            >
              <Plus className="w-5 h-5 text-white/40" />
              <span className="text-[10px] text-white/40">Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Dropdown component
function PersonaDropdown({ personas, activePersona, onSelect, onClose, switching }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 mt-1 z-50 bg-black border border-white/20 shadow-xl"
    >
      {personas.map((persona) => {
        const config = PERSONA_TYPES[persona.persona_type] || PERSONA_TYPES.MAIN;
        const Icon = config.icon;
        const isActive = persona.id === activePersona.id;

        return (
          <button
            key={persona.id}
            onClick={() => onSelect(persona)}
            disabled={switching}
            className={`
              w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors
              ${isActive ? 'bg-white/10' : ''}
            `}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">{persona.display_name}</p>
              <p className="text-[10px] text-white/50">{config.description}</p>
            </div>
            {isActive && <Check className="w-4 h-4 text-[#39FF14]" />}
          </button>
        );
      })}

      <div className="border-t border-white/10 p-2">
        <button
          onClick={() => {
            onClose();
            navigate('/profile/personas');
          }}
          className="w-full p-2 text-xs text-white/60 hover:text-white flex items-center justify-center gap-2"
        >
          <Settings className="w-3 h-3" />
          Manage Personas
        </button>
      </div>
    </motion.div>
  );
}
