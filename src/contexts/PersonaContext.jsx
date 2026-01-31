import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Persona Context
 * Manages active persona presentation layer
 * 
 * Rules:
 * - No permissions change
 * - No discoverability bypass
 * - Visual presentation only
 */

const PersonaContext = createContext(null);

export const PERSONA_TYPES = {
  MAIN: 'main',
  TRAVEL: 'travel',
  WEEKEND: 'weekend',
  CUSTOM: 'custom',
};

export function PersonaProvider({ children }) {
  const [activePersona, setActivePersona] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPersonas = useCallback(async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setPersonas(data || []);
      
      const active = data?.find(p => p.is_active);
      setActivePersona(active || data?.[0] || null);
    } catch (err) {
      console.error('Failed to load personas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchPersona = useCallback(async (personaId) => {
    try {
      const { error } = await supabase
        .rpc('switch_persona', { 
          p_user_id: activePersona?.user_id,
          p_new_persona_id: personaId 
        });
      
      if (error) throw error;
      
      setPersonas(prev => prev.map(p => ({
        ...p,
        is_active: p.id === personaId,
      })));
      setActivePersona(personas.find(p => p.id === personaId));
      
      return true;
    } catch (err) {
      console.error('Failed to switch persona:', err);
      return false;
    }
  }, [activePersona, personas]);

  const value = {
    activePersona,
    personas,
    isLoading,
    loadPersonas,
    switchPersona,
  };

  return (
    <PersonaContext.Provider value={value}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}

export default PersonaContext;
