/**
 * useProfiles Hook
 * 
 * Manages multiple profiles/personas for the same user.
 * Enables main profile + secondary profiles (travel, weekend, custom).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from './useUserContext';
import logger from '@/utils/logger';

// Persona types
const PERSONA_TYPES = {
  MAIN: 'main',
  TRAVEL: 'travel',
  WEEKEND: 'weekend',
  CUSTOM: 'custom'
};

// Default inheritance settings
const DEFAULT_INHERITANCE = {
  photos: true,
  interests: true,
  tribes: false,
  music_taste: true,
  looking_for: false,
  location: false
};

export function useProfiles() {
  const { user, email, isPremium, isElite } = useUserContext();
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch user's personas
  useEffect(() => {
    async function fetchPersonas() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setPersonas(data);
        
        // Set active persona (stored in localStorage)
        const storedActive = localStorage.getItem(`active_persona_${user.id}`);
        if (storedActive && data.some(p => p.id === storedActive)) {
          setActivePersonaId(storedActive);
        } else {
          // Default to main or first persona
          const main = data.find(p => p.persona_type === 'main');
          if (main) setActivePersonaId(main.id);
        }
      }
    }

    fetchPersonas();
  }, [user?.id]);

  // Get active persona
  const activePersona = personas.find(p => p.id === activePersonaId);

  // Get main profile
  const mainProfile = personas.find(p => p.persona_type === 'main') || {
    ...user,
    persona_type: 'main'
  };

  // Check if user can create more personas
  const canCreatePersona = useCallback(() => {
    if (!isPremium) return { allowed: false, reason: 'Premium required' };
    
    const maxPersonas = isElite ? 4 : 2;
    if (personas.length >= maxPersonas) {
      return { allowed: false, reason: `Maximum ${maxPersonas} personas allowed` };
    }
    
    return { allowed: true };
  }, [isPremium, isElite, personas.length]);

  // Create a new persona
  const createPersona = useCallback(async (type, data = {}) => {
    const check = canCreatePersona();
    if (!check.allowed) return { error: check.reason };

    if (!user?.id) return { error: 'Not logged in' };

    setLoading(true);

    try {
      const personaData = {
        user_id: user.id,
        persona_type: type,
        display_name: data.display_name || `${user.display_name || user.username} (${type})`,
        bio: data.bio || null,
        photos: data.photos || [],
        visibility_rules: data.visibility_rules || { visibility: 'public' },
        inherit_from_main: data.inherit_from_main || DEFAULT_INHERITANCE,
        is_active: false
      };

      const { data: newPersona, error } = await supabase
        .from('personas')
        .insert(personaData)
        .select()
        .single();

      if (error) throw error;

      setPersonas(prev => [...prev, newPersona]);
      return { data: newPersona };
    } catch (err) {
      logger.error('Error creating persona:', err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, canCreatePersona]);

  // Update a persona
  const updatePersona = useCallback(async (personaId, updates) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('personas')
        .update(updates)
        .eq('id', personaId)
        .select()
        .single();

      if (error) throw error;

      setPersonas(prev => prev.map(p => p.id === personaId ? data : p));
      return { data };
    } catch (err) {
      logger.error('Error updating persona:', err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a persona
  const deletePersona = useCallback(async (personaId) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona?.persona_type === 'main') {
      return { error: 'Cannot delete main profile' };
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', personaId);

      if (error) throw error;

      setPersonas(prev => prev.filter(p => p.id !== personaId));
      
      // If deleted active persona, switch to main
      if (activePersonaId === personaId) {
        const main = personas.find(p => p.persona_type === 'main');
        if (main) switchPersona(main.id);
      }

      return { success: true };
    } catch (err) {
      logger.error('Error deleting persona:', err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [personas, activePersonaId]);

  // Switch active persona
  const switchPersona = useCallback((personaId) => {
    if (!personas.some(p => p.id === personaId)) {
      return { error: 'Invalid persona' };
    }

    setActivePersonaId(personaId);
    
    // Persist selection
    if (user?.id) {
      localStorage.setItem(`active_persona_${user.id}`, personaId);
    }

    // Update is_active flags in database
    supabase
      .from('personas')
      .update({ is_active: false })
      .eq('user_id', user?.id)
      .then(() => {
        supabase
          .from('personas')
          .update({ is_active: true })
          .eq('id', personaId);
      });

    return { success: true };
  }, [personas, user?.id]);

  // Get effective profile (with inheritance applied)
  const getEffectiveProfile = useCallback((persona) => {
    if (!persona || persona.persona_type === 'main') {
      return mainProfile;
    }

    const inheritance = persona.inherit_from_main || {};
    const effective = { ...persona };

    // Apply inherited fields from main profile
    Object.keys(inheritance).forEach(field => {
      if (inheritance[field] && mainProfile[field]) {
        // Merge arrays, overwrite scalars
        if (Array.isArray(mainProfile[field]) && Array.isArray(persona[field])) {
          effective[field] = [...new Set([...mainProfile[field], ...(persona[field] || [])])];
        } else if (!persona[field]) {
          effective[field] = mainProfile[field];
        }
      }
    });

    return effective;
  }, [mainProfile]);

  return {
    // State
    personas,
    activePersona,
    activePersonaId,
    mainProfile,
    loading,

    // Computed
    effectiveProfile: getEffectiveProfile(activePersona),
    canCreatePersona: canCreatePersona(),
    personaCount: personas.length,

    // Actions
    createPersona,
    updatePersona,
    deletePersona,
    switchPersona,
    getEffectiveProfile,

    // Constants
    PERSONA_TYPES,
    DEFAULT_INHERITANCE
  };
}

export default useProfiles;
