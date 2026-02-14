/**
 * HOTMESS Safety Switch API
 * Emergency control for cities and categories
 * ADMIN ONLY - requires verified admin token
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify admin from bearer token
async function verifyAdmin(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing bearer token', admin: null };
  }
  
  const token = authHeader.slice(7);
  
  // Verify the token with Supabase auth
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: 'Invalid token', admin: null };
  }
  
  // Check if user has admin role
  const { data: profile } = await supabase
    .from('User')
    .select('id, email, is_admin, roles')
    .eq('auth_user_id', user.id)
    .single();
    
  if (!profile?.is_admin && !profile?.roles?.includes('admin')) {
    return { error: 'Admin access required', admin: null };
  }
  
  return { error: null, admin: profile };
}

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
      return res.status(500).json({ error: 'Failed to get safety state' });
    }
  }

  // POST: Apply safety switch action - ADMIN ONLY
  if (req.method === 'POST') {
    // Verify admin authentication
    const { error: authError, admin } = await verifyAdmin(req);
    if (authError || !admin) {
      return res.status(401).json({ error: authError || 'Admin authentication required' });
    }

    const { action, target, reason, timestamp } = req.body;

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

      // Audit log with verified admin ID
      await supabase.from('audit_log').insert({
        action_type: 'safety_switch',
        action,
        target,
        reason,
        admin_id: admin.id,
        admin_email: admin.email,
        timestamp: timestamp || new Date().toISOString(),
      });

      return res.status(200).json({ success: true, state });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to apply safety switch' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
