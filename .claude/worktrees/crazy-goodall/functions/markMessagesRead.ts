import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { thread_id } = await req.json();

    if (!thread_id) {
      return Response.json({ error: 'Missing thread_id' }, { status: 400 });
    }

    // Get thread
    const threads = await base44.asServiceRole.entities.ChatThread.filter({ id: thread_id });
    if (threads.length === 0) {
      return Response.json({ error: 'Thread not found' }, { status: 404 });
    }

    const thread = threads[0];

    // Verify user is participant
    if (!thread.participant_emails.includes(user.email)) {
      return Response.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Update unread count
    const unreadCount = thread.unread_count || {};
    unreadCount[user.email] = 0;

    await base44.asServiceRole.entities.ChatThread.update(thread_id, {
      unread_count: unreadCount
    });

    return Response.json({
      success: true,
      thread_id
    });

  } catch (error) {
    console.error('Mark messages read error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});