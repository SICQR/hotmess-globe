/**
 * Vercel Cron: Persona Activity Prompts
 * 
 * Sends context-aware notifications to users about their secondary personas.
 * 
 * Prompts:
 * - Inactive personas: "Your Travel persona hasn't been active in London - activate it?"
 * - Weekend approaching: "Weekend approaching - activate your Weekend persona?"
 * - Location match: "You're in Paris - activate your Travel persona?"
 * 
 * Schedule: 0 9 * * * (9am daily)
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// Days of inactivity before prompting
const INACTIVE_THRESHOLD_DAYS = 7;

// Persona type to prompt mapping
const PERSONA_PROMPTS = {
  TRAVEL: {
    inactive: (label, location) => ({
      title: `Your ${label || 'Travel'} persona is waiting`,
      message: location 
        ? `Activate it when you're visiting ${location}`
        : 'Activate it for your next trip',
    }),
    contextual: (label) => ({
      title: `Travelling? Activate ${label || 'Travel'}`,
      message: 'Show a different side of you while exploring',
    }),
  },
  WEEKEND: {
    inactive: (label) => ({
      title: `Weekend approaching!`,
      message: `Activate your ${label || 'Weekend'} persona for the weekend`,
    }),
    contextual: (label) => ({
      title: `It's the weekend!`,
      message: `Your ${label || 'Weekend'} persona is ready to go`,
    }),
  },
  EVENTS: {
    inactive: (label) => ({
      title: `Events coming up`,
      message: `Activate your ${label || 'Events'} persona to meet people`,
    }),
    contextual: (label, eventName) => ({
      title: eventName ? `Going to ${eventName}?` : `Event time!`,
      message: `Activate your ${label || 'Events'} persona`,
    }),
  },
  DEFAULT: {
    inactive: (label) => ({
      title: `Your ${label || 'persona'} is inactive`,
      message: `It's been a while - consider reactivating it`,
    }),
    contextual: (label) => ({
      title: `Activate ${label || 'your persona'}?`,
      message: 'Switch up your profile for different situations',
    }),
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (cronSecret && auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return json(res, 401, { error: 'Unauthorized' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(res, 200, { success: true, message: 'Skipped (missing env)', processed: 0 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
    const inactiveThreshold = new Date(now.getTime() - INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Fetch inactive secondary personas
    const { data: inactivePersonas, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        account_id,
        type_key,
        type_label,
        active,
        override_location_label,
        updated_at
      `)
      .eq('kind', 'SECONDARY')
      .eq('active', false)
      .is('deleted_at', null)
      .lt('updated_at', inactiveThreshold.toISOString())
      .limit(200);

    if (fetchError) {
      console.error('[PersonaPrompts] Fetch error:', fetchError);
      return json(res, 500, { error: 'Failed to fetch personas' });
    }

    if (!inactivePersonas?.length) {
      return json(res, 200, { success: true, message: 'No inactive personas', processed: 0 });
    }

    // Get user emails for these personas
    const accountIds = [...new Set(inactivePersonas.map(p => p.account_id))];
    const { data: users } = await supabase
      .from('User')
      .select('auth_user_id, email')
      .in('auth_user_id', accountIds);

    const userEmailMap = new Map((users || []).map(u => [u.auth_user_id, u.email]));

    // Check who we've already notified today
    const userEmails = [...new Set((users || []).map(u => u.email).filter(Boolean))];
    const { data: alreadyNotified } = await supabase
      .from('notifications')
      .select('user_email')
      .eq('type', 'persona_prompt')
      .gte('created_at', `${today}T00:00:00Z`)
      .in('user_email', userEmails);

    const notifiedSet = new Set((alreadyNotified || []).map(n => n.user_email));

    // Build notifications
    const notifications = [];

    for (const persona of inactivePersonas) {
      const userEmail = userEmailMap.get(persona.account_id);
      if (!userEmail || notifiedSet.has(userEmail)) continue;

      const typeKey = persona.type_key || 'DEFAULT';
      const typeLabel = persona.type_label;
      const promptConfig = PERSONA_PROMPTS[typeKey] || PERSONA_PROMPTS.DEFAULT;

      let prompt;

      // Context-aware prompts
      if (typeKey === 'WEEKEND' && isWeekend) {
        prompt = promptConfig.contextual(typeLabel);
      } else {
        prompt = promptConfig.inactive(typeLabel, persona.override_location_label);
      }

      notifications.push({
        user_email: userEmail,
        type: 'persona_prompt',
        title: prompt.title,
        message: prompt.message,
        link: 'PersonaManagement',
        metadata: {
          persona_id: persona.id,
          persona_type: typeKey,
          persona_label: typeLabel,
        },
        read: false,
        created_at: now.toISOString(),
        created_date: now.toISOString(),
      });

      // Mark this user as notified to avoid duplicate prompts for multiple personas
      notifiedSet.add(userEmail);
    }

    if (!notifications.length) {
      return json(res, 200, { success: true, message: 'No prompts to send', processed: 0 });
    }

    // Insert notifications
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('[PersonaPrompts] Insert error:', insertError);
      return json(res, 500, { error: 'Failed to create notifications' });
    }

    // Also queue for push notification
    const outboxItems = notifications.map(n => ({
      user_email: n.user_email,
      notification_type: 'persona_prompt',
      title: n.title,
      message: n.message,
      metadata: { ...n.metadata, link: 'PersonaManagement' },
      status: 'queued',
      created_at: now.toISOString(),
    }));

    await supabase.from('notification_outbox').insert(outboxItems);

    console.log(`[PersonaPrompts] Sent ${notifications.length} persona prompts`);
    return json(res, 200, {
      success: true,
      processed: notifications.length,
      totalInactive: inactivePersonas.length,
    });

  } catch (error) {
    console.error('[PersonaPrompts] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
