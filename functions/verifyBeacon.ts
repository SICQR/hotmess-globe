import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { beacon_id, verified } = await req.json();

    if (!beacon_id || verified === undefined) {
      return Response.json({ error: 'Missing beacon_id or verified parameter' }, { status: 400 });
    }

    // Get beacon
    const beacons = await base44.asServiceRole.entities.Beacon.filter({ id: beacon_id });
    if (beacons.length === 0) {
      return Response.json({ error: 'Beacon not found' }, { status: 404 });
    }

    const beacon = beacons[0];

    // Update verification status
    await base44.asServiceRole.entities.Beacon.update(beacon_id, {
      is_verified: verified,
      is_shadow: false,
      status: verified ? 'published' : beacon.status
    });

    // Notify beacon creator
    if (beacon.created_by) {
      await base44.asServiceRole.entities.NotificationOutbox.create({
        user_email: beacon.created_by,
        notification_type: verified ? 'challenge_complete' : 'message_received',
        title: verified ? 'Beacon Verified' : 'Beacon Rejected',
        message: verified 
          ? `Your beacon "${beacon.title}" has been verified and is now live!`
          : `Your beacon "${beacon.title}" could not be verified.`,
        metadata: {
          beacon_id,
          verified
        }
      });
    }

    return Response.json({
      success: true,
      beacon_id,
      verified
    });

  } catch (error) {
    console.error('Verify beacon error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});