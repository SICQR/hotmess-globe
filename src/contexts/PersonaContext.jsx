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
 *
 * DB column: persona_type (not "type")
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
  const [personas, setPersonas]           = useState([]);
  const [isLoading, setIsLoading]         = useState(false);

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
        .rpc('switch_persona', { p_persona_id: personaId });

      if (error) throw error;

      setPersonas(prev => {
        const updated = prev.map(p => ({ ...p, is_active: p.id === personaId }));
        setActivePersona(updated.find(p => p.id === personaId) ?? null);
        return updated;
      });

      return true;
    } catch (err) {
      console.error('Failed to switch persona:', err);
      return false;
    }
  }, []);

  const createPersona = useCallback(async ({ personaType, displayName, bio }) => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('personas')
        .insert({
          user_id:      user.id,
          persona_type: personaType,
          display_name: displayName,
          bio:          bio || null,
          is_active:    false,
        })
        .select('*')
        .single();

      if (error) throw error;

      setPersonas(prev => [...prev, data]);
      return { persona: data, error: null };
    } catch (err) {
      console.error('Failed to create persona:', err);
      return { persona: null, error: err };
    }
  }, []);

  const deletePersona = useCallback(async (personaId) => {
    try {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', personaId);

      if (error) throw error;

      setPersonas(prev => {
        const updated = prev.filter(p => p.id !== personaId);
        // If we deleted the active persona, fall back to first remaining
        setActivePersona(updated.find(p => p.is_active) || updated[0] || null);
        return updated;
      });

      return true;
    } catch (err) {
      console.error('Failed to delete persona:', err);
      return false;
    }
  }, []);

  const value = {
    activePersona,
    personas,
    isLoading,
    loadPersonas,
    switchPersona,
    createPersona,
    deletePersona,
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
