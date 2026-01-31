/**
 * HOTMESS Safety Switch API
 * Emergency control for cities and categories
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // GET: Return current safety state
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'safety_switch')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const settings = data?.value || {
        disabled_cities: [],
        disabled_categories: [],
        global_disabled: false,
      };

      return res.status(200).json(settings);
    } catch (err) {
      console.error('Safety-switch GET error:', err);
      return res.status(500).json({ error: 'Failed to get safety state' });
    }
  }

  // POST: Apply safety switch action
  if (req.method === 'POST') {
    const { action, target, reason, admin_id, timestamp } = req.body;

    if (!admin_id) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    try {
      const { data: current } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'safety_switch')
        .single();

      const state = current?.value || {
        disabled_cities: [],
        disabled_categories: [],
        global_disabled: false,
      };

      switch (action) {
        case 'disable_city':
          if (!state.disabled_cities.includes(target)) {
            state.disabled_cities.push(target.toLowerCase());
          }
          break;
        case 'enable_city':
          state.disabled_cities = state.disabled_cities.filter(c => c !== target.toLowerCase());
          break;
        case 'disable_category':
          if (!state.disabled_categories.includes(target)) {
            state.disabled_categories.push(target.toLowerCase());
          }
          break;
        case 'enable_category':
          state.disabled_categories = state.disabled_categories.filter(c => c !== target.toLowerCase());
          break;
        case 'disable_global':
          state.global_disabled = true;
          break;
        case 'enable_global':
          state.global_disabled = false;
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({
          category: 'safety_switch',
          value: state,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'category' });

      if (upsertError) throw upsertError;

      await supabase.from('audit_log').insert({
        action_type: 'safety_switch',
        action,
        target,
        reason,
        admin_id,
        timestamp: timestamp || new Date().toISOString(),
      });

      return res.status(200).json({ success: true, state });
    } catch (err) {
      console.error('Safety-switch POST error:', err);
      return res.status(500).json({ error: 'Failed to apply safety switch' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
