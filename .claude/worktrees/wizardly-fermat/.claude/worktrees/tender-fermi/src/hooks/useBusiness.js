/**
 * Business Presence Hooks
 * 
 * For businesses to:
 * - View/update their presence
 * - Schedule signal moments
 * - See analytics
 * - Manage amplification
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// ============================================================================
// BUSINESS PROFILE
// ============================================================================

export function useMyBusiness() {
  const [business, setBusiness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data, error: err } = await supabase
          .from('businesses')
          .select('*, business_presence(*)')
          .or(`owner_id.eq.${user.id},team_members.cs.{${user.id}}`)
          .is('deleted_at', null)
          .single();

        if (err && err.code !== 'PGRST116') throw err;
        if (!cancelled) setBusiness(data || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { business, isLoading, error };
}

// ============================================================================
// BUSINESS PRESENCE (Real-time)
// ============================================================================

export function useBusinessPresence(businessId) {
  const [presence, setPresence] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Initial fetch
    const fetch = async () => {
      const { data } = await supabase
        .from('business_presence')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (!cancelled) {
        setPresence(data);
        setIsLoading(false);
      }
    };

    fetch();

    // Real-time subscription
    const channel = supabase
      .channel(`presence-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_presence',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        setPresence(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  return { presence, isLoading };
}

// ============================================================================
// AMPLIFICATION
// ============================================================================

export function useAmplification(businessId) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const startAmplification = useCallback(async (hours = 1, multiplier = 1.5) => {
    if (!businessId) return;
    setIsPending(true);
    setError(null);

    try {
      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { error: err } = await supabase
        .from('business_presence')
        .update({
          is_amplified: true,
          amplification_ends_at: endsAt,
          amplification_multiplier: multiplier,
        })
        .eq('business_id', businessId);

      if (err) throw err;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  }, [businessId]);

  const stopAmplification = useCallback(async () => {
    if (!businessId) return;
    setIsPending(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('business_presence')
        .update({
          is_amplified: false,
          amplification_ends_at: null,
          amplification_multiplier: 1.0,
        })
        .eq('business_id', businessId);

      if (err) throw err;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  }, [businessId]);

  return { startAmplification, stopAmplification, isPending, error };
}

// ============================================================================
// SIGNAL MOMENTS
// ============================================================================

export function useBusinessSignals(businessId) {
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from('business_signals')
        .select('*')
        .eq('business_id', businessId)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      setSignals(data || []);
      setIsLoading(false);
    };

    fetch();
  }, [businessId]);

  return { signals, isLoading };
}

export function useCreateSignal() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const createSignal = useCallback(async ({
    businessId,
    signalType,
    customLabel,
    startsAt,
    durationMinutes = 30,
    intensity = 50,
    colorOverride,
    cityId,
  }) => {
    setIsPending(true);
    setError(null);

    try {
      const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000);

      // Check scarcity (max 3 signals per city per hour)
      if (cityId) {
        const { count } = await supabase
          .from('business_signals')
          .select('*', { count: 'exact', head: true })
          .eq('city_id', cityId)
          .gte('starts_at', new Date(new Date(startsAt).getTime() - 30 * 60 * 1000).toISOString())
          .lte('starts_at', new Date(new Date(startsAt).getTime() + 30 * 60 * 1000).toISOString());

        if (count >= 3) {
          throw new Error('Signal slot full for this time window. Try a different time.');
        }
      }

      const { data, error: err } = await supabase
        .from('business_signals')
        .insert({
          business_id: businessId,
          signal_type: signalType,
          custom_label: customLabel,
          starts_at: startsAt,
          ends_at: endsAt.toISOString(),
          intensity,
          color_override: colorOverride,
          city_id: cityId,
          is_active: new Date(startsAt) <= new Date() && endsAt > new Date(),
        })
        .select()
        .single();

      if (err) throw err;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  const cancelSignal = useCallback(async (signalId) => {
    setIsPending(true);
    try {
      await supabase
        .from('business_signals')
        .delete()
        .eq('id', signalId);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createSignal, cancelSignal, isPending, error };
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function useBusinessAnalytics(businessId, days = 7) {
  const [analytics, setAnalytics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetch = async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data } = await supabase
        .from('business_analytics_daily')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      setAnalytics(data || []);
      setIsLoading(false);
    };

    fetch();
  }, [businessId, days]);

  // Computed summaries
  const summary = analytics.length > 0 ? {
    totalViews: analytics.reduce((sum, d) => sum + (d.total_views || 0), 0),
    totalCheckins: analytics.reduce((sum, d) => sum + (d.checkins || 0), 0),
    avgHeat: Math.round(analytics.reduce((sum, d) => sum + (d.avg_heat_score || 0), 0) / analytics.length),
    peakHeat: Math.max(...analytics.map((d) => d.peak_heat_score || 0)),
    totalSales: analytics.reduce((sum, d) => sum + (d.ticket_sales || 0) + (d.product_sales || 0), 0),
  } : null;

  return { analytics, summary, isLoading };
}

// ============================================================================
// GLOBE FEED (For rendering businesses on globe)
// ============================================================================

export function useGlobeBusinesses(cityId = null) {
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      let query = supabase
        .from('business_presence')
        .select(`
          *,
          business:businesses(id, name, slug, logo_url, roles, location_geo, verification_status)
        `)
        .gt('heat_score', 10) // Only show active businesses
        .order('heat_score', { ascending: false })
        .limit(100);

      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      const { data } = await query;

      if (!cancelled) {
        setBusinesses(data || []);
        setIsLoading(false);
      }
    };

    fetch();

    // Refresh every 30 seconds
    const interval = setInterval(fetch, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cityId]);

  return { businesses, isLoading };
}

// ============================================================================
// ACTIVE SIGNALS (For globe overlay)
// ============================================================================

export function useActiveSignals(cityId = null) {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const now = new Date().toISOString();

      let query = supabase
        .from('business_signals')
        .select(`
          *,
          business:businesses(id, name, slug, logo_url)
        `)
        .eq('is_active', true)
        .lte('starts_at', now)
        .gt('ends_at', now)
        .order('intensity', { ascending: false });

      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      const { data } = await query;

      if (!cancelled) {
        setSignals(data || []);
      }
    };

    fetch();

    // Refresh every 10 seconds for signals
    const interval = setInterval(fetch, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cityId]);

  return { signals };
}
