import { createClient } from '@supabase/supabase-js';
import { notifyCollaborationRequest } from '../notifications/premium.js';
import { withRateLimit } from '../middleware/rateLimiter.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Get authenticated user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // GET: Fetch collaboration requests
  if (req.method === 'GET') {
    const { type = 'received', status } = req.query;

    try {
      let query = supabase.from('collaboration_requests').select('*');

      if (type === 'received') {
        query = query.eq('creator_email', user.email);
      } else if (type === 'sent') {
        query = query.eq('requester_email', user.email);
      }

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[collaborations] Fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch collaboration requests' });
      }

      // Enrich with user info
      const emails = [...new Set(data.flatMap(r => [r.requester_email, r.creator_email]))];
      const { data: users } = await supabase
        .from('User')
        .select('email, full_name, avatar_url, profile_type')
        .in('email', emails);

      const userMap = Object.fromEntries((users || []).map(u => [u.email, u]));

      const enriched = data.map(request => ({
        ...request,
        requester: userMap[request.requester_email] || null,
        creator: userMap[request.creator_email] || null,
      }));

      return res.status(200).json({ requests: enriched });
    } catch (error) {
      console.error('[collaborations] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST: Create collaboration request
  if (req.method === 'POST') {
    const { creator_email, event_id, collaboration_type = 'general', message } = req.body;

    if (!creator_email) {
      return res.status(400).json({ error: 'Missing required field: creator_email' });
    }

    if (creator_email === user.email) {
      return res.status(400).json({ error: 'Cannot request collaboration with yourself' });
    }

    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from('collaboration_requests')
        .select('*')
        .eq('requester_email', user.email)
        .eq('creator_email', creator_email)
        .eq('collaboration_type', collaboration_type)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ 
          error: 'Collaboration request already exists',
          existing_status: existing.status,
        });
      }

      // Get requester info
      const { data: requester } = await supabase
        .from('User')
        .select('email, full_name, avatar_url')
        .eq('email', user.email)
        .single();

      // Create request
      const { data: request, error } = await supabase
        .from('collaboration_requests')
        .insert({
          requester_email: user.email,
          creator_email,
          event_id: event_id || null,
          collaboration_type,
          message: message || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[collaborations] Insert error:', error);
        return res.status(500).json({ error: 'Failed to create collaboration request' });
      }

      // Send notification (non-blocking)
      notifyCollaborationRequest({
        creatorEmail: creator_email,
        requesterName: requester?.full_name || user.email,
        requesterEmail: user.email,
        collaborationType: collaboration_type,
        eventId: event_id,
        message,
      }).catch(err => {
        console.error('[collaborations] Notification error:', err);
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Collaboration request sent',
        request,
      });
    } catch (error) {
      console.error('[collaborations] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withRateLimit(handler, { tier: 'create' });
