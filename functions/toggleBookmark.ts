import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { beacon_id } = await req.json();

    if (!beacon_id) {
      return Response.json({ error: 'Missing beacon_id' }, { status: 400 });
    }

    // Check if bookmark exists
    const existingBookmarks = await base44.asServiceRole.entities.BeaconBookmark.filter({
      user_email: user.email,
      beacon_id
    });

    if (existingBookmarks.length > 0) {
      // Remove bookmark
      await base44.asServiceRole.entities.BeaconBookmark.delete(existingBookmarks[0].id);
      
      return Response.json({
        success: true,
        bookmarked: false
      });
    } else {
      // Add bookmark
      await base44.asServiceRole.entities.BeaconBookmark.create({
        user_email: user.email,
        beacon_id
      });

      return Response.json({
        success: true,
        bookmarked: true
      });
    }

  } catch (error) {
    console.error('Toggle bookmark error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});