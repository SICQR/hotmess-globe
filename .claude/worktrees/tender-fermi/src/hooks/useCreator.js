import { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export const CREATOR_TYPES = ['dj', 'artist', 'designer', 'host', 'writer', 'performer'];
export const PRODUCT_KINDS = ['radio_show', 'ticket', 'drop', 'digital'];

export function useCreatorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('creator_profiles').select('*').eq('user_id', user.id).single();
    setProfile(data);
    setLoading(false);
  };

  const createProfile = async (type, city) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('creator_profiles').insert({ user_id: user.id, type, city }).select().single();
    if (!error) setProfile(data);
    return data;
  };

  const updateProfile = async (updates) => {
    if (!profile) return null;
    const { data, error } = await supabase.from('creator_profiles').update(updates).eq('id', profile.id).select().single();
    if (!error) setProfile(data);
    return data;
  };

  return { profile, loading, createProfile, updateProfile, reload: loadProfile };
}

export function useCreatorProducts(creatorId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (creatorId) loadProducts();
  }, [creatorId]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('creator_products').select('*').eq('creator_id', creatorId).order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const createProduct = async (product) => {
    const { data, error } = await supabase.from('creator_products').insert({ ...product, creator_id: creatorId }).select().single();
    if (!error) setProducts(prev => [data, ...prev]);
    return data;
  };

  const updateProduct = async (id, updates) => {
    const { data, error } = await supabase.from('creator_products').update(updates).eq('id', id).select().single();
    if (!error) setProducts(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  return { products, loading, createProduct, updateProduct, reload: loadProducts };
}

export function useCityReadiness() {
  const [readiness, setReadiness] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReadiness(); }, []);

  const loadReadiness = async () => {
    setLoading(true);
    const { data } = await supabase.from('city_readiness').select('*').order('calculated_at', { ascending: false });
    const latest = {};
    for (const c of data || []) {
      if (!latest[c.city] || new Date(c.calculated_at) > new Date(latest[c.city].calculated_at)) {
        latest[c.city] = c;
      }
    }
    setReadiness(latest);
    setLoading(false);
  };

  const calculateReadiness = async (city) => {
    const { data } = await supabase.rpc('calculate_city_readiness', { p_city: city });
    if (data) setReadiness(prev => ({ ...prev, [city]: data }));
    return data;
  };

  return { readiness, loading, calculateReadiness, reload: loadReadiness };
}
