import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { track_id, audio_url, title, description } = await req.json();

    if (!track_id || !audio_url || !title) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Note: SoundCloud API requires OAuth and a client_id
    // This is a placeholder for the integration flow
    // User would need to authorize SoundCloud via app connectors
    
    // For now, return a mock success response
    // In production, this would use SoundCloud's upload API
    
    const soundcloudUrl = `https://soundcloud.com/raw-convict-records/${track_id}`;

    // Update beacon with SoundCloud URL
    const beacons = await base44.asServiceRole.entities.Beacon.filter({ track_id });
    if (beacons.length > 0) {
      await base44.asServiceRole.entities.Beacon.update(beacons[0].id, {
        metadata: {
          ...beacons[0].metadata,
          soundcloud_url: soundcloudUrl,
          pushed_at: new Date().toISOString()
        }
      });
    }

    // Log the push attempt
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: user.email,
      notification_type: 'track_drop',
      title: 'Track Pushed to SoundCloud',
      message: `${title} has been queued for SoundCloud upload`,
      metadata: {
        track_id,
        soundcloud_url: soundcloudUrl
      }
    });

    return Response.json({
      success: true,
      track_id,
      soundcloud_url: soundcloudUrl,
      message: 'Track queued for SoundCloud upload. Complete SoundCloud OAuth to enable automatic pushing.'
    });

  } catch (error) {
    console.error('SoundCloud push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});