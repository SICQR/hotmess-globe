import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing collaboration request ID' });
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

  // GET: Fetch single collaboration request
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('collaboration_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Collaboration request not found' });
      }

      // Verify access
      if (data.requester_email !== user.email && data.creator_email !== user.email) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.status(200).json({ request: data });
    } catch (error) {
      console.error('[collaborations/id] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH: Update collaboration request (accept/decline)
  if (req.method === 'PATCH') {
    const { action, response_message } = req.body;

    if (!action || !['accept', 'decline', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: accept, decline, or cancel' });
    }

    try {
      // Fetch request
      const { data: request, error: fetchError } = await supabase
        .from('collaboration_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !request) {
        return res.status(404).json({ error: 'Collaboration request not found' });
      }

      // Check permissions based on action
      if (action === 'cancel') {
        // Only requester can cancel
        if (request.requester_email !== user.email) {
          return res.status(403).json({ error: 'Only the requester can cancel' });
        }
      } else {
        // Only creator can accept/decline
        if (request.creator_email !== user.email) {
          return res.status(403).json({ error: 'Only the creator can accept or decline' });
        }
      }

      // Check if already processed
      if (request.status !== 'pending') {
        return res.status(400).json({ 
          error: `Request already ${request.status}`,
          current_status: request.status,
        });
      }

      // Map action to status
      const statusMap = {
        accept: 'accepted',
        decline: 'declined',
        cancel: 'cancelled',
      };

      const { data: updated, error: updateError } = await supabase
        .from('collaboration_requests')
        .update({
          status: statusMap[action],
          response_message: response_message || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('[collaborations/id] Update error:', updateError);
        return res.status(500).json({ error: 'Failed to update request' });
      }

      // If accepted, create collaboration record
      if (action === 'accept') {
        await supabase.from('collaborations').insert({
          creator_emails: [request.requester_email, request.creator_email],
          collaboration_type: request.collaboration_type,
          event_id: request.event_id,
          metadata: {
            request_id: id,
            message: request.message,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Request ${statusMap[action]}`,
        request: updated,
      });
    } catch (error) {
      console.error('[collaborations/id] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
