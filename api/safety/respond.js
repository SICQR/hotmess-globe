/**
 * Safety Check-in Response Handler
 * 
 * POST /api/safety/respond
 * 
 * Handles user responses to safety check-ins.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { checkinId, response } = req.body;

    if (!checkinId || !response) {
      return res.status(400).json({ error: 'Missing checkinId or response' });
    }

    const validResponses = ['all_good', 'need_minute', 'help'];
    if (!validResponses.includes(response)) {
      return res.status(400).json({ error: 'Invalid response type' });
    }

    // Get the check-in
    const { data: checkin, error: fetchError } = await supabase
      .from('safety_checkins')
      .select('*')
      .eq('id', checkinId)
      .single();

    if (fetchError || !checkin) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    // Update check-in status
    const { error: updateError } = await supabase
      .from('safety_checkins')
      .update({
        status: 'responded',
        response,
        responded_at: new Date().toISOString()
      })
      .eq('id', checkinId);

    if (updateError) {
      throw updateError;
    }

    let result = {
      success: true,
      response,
      xpAwarded: 0,
      followUp: null
    };

    // Handle different responses
    switch (response) {
      case 'all_good':
        // Award XP for responding
        await supabase
          .from('User')
          .update({ 
            xp_balance: supabase.rpc('increment_xp', { amount: 5 })
          })
          .eq('email', checkin.user_email);

        // Log XP transaction
        await supabase
          .from('xp_transactions')
          .insert({
            user_email: checkin.user_email,
            amount: 5,
            transaction_type: 'reward',
            reference_type: 'safety_checkin',
            reference_id: checkinId,
            notes: 'Safety check-in response'
          });

        result.xpAwarded = 5;
        result.followUp = null;
        break;

      case 'need_minute':
        // Schedule a follow-up in 30 minutes
        await supabase
          .from('notification_outbox')
          .insert({
            user_email: checkin.user_email,
            notification_type: 'safety_followup',
            title: 'Checking back in',
            message: "Just wanted to follow up. Still doing okay? I'm here. 💚",
            channel: 'in_app',
            send_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            metadata: {
              trigger: 'need_minute_followup',
              original_checkin_id: checkinId
            }
          });

        result.followUp = 'Scheduled follow-up in 30 minutes';
        break;

      case 'help':
        // Show crisis resources immediately
        result.followUp = 'crisis_resources';
        
        // Notify trusted contacts
        const { data: contacts } = await supabase
          .from('trusted_contacts')
          .select('*')
          .eq('user_email', checkin.user_email)
          .eq('notify_on_checkin', true);

        for (const contact of contacts || []) {
          if (contact.contact_email) {
            await supabase
              .from('notification_outbox')
              .insert({
                user_email: contact.contact_email,
                notification_type: 'trusted_contact_help',
                title: 'URGENT: Your friend needs help',
                message: 'Your friend indicated they need help during a safety check-in on HOTMESS. Please reach out to them.',
                channel: 'email',
                metadata: {
                  type: 'help_requested',
                  user_email: checkin.user_email
                }
              });
          }
        }

        // Log for admin review
        await supabase
          .from('notification_outbox')
          .insert({
            user_email: 'admin',
            notification_type: 'safety_help_requested',
            title: 'User Requested Help',
            message: `User ${checkin.user_email} indicated they need help during a safety check-in.`,
            channel: 'in_app',
            metadata: {
              user_email: checkin.user_email,
              checkin_id: checkinId,
              trigger_type: checkin.trigger_type
            }
          });

        break;
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Safety respond error:', error);
    return res.status(500).json({ error: error.message });
  }
}
