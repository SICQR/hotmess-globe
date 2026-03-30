import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { thread_id, mute } = await req.json();

    if (!thread_id || mute === undefined) {
      return Response.json({ error: 'Missing thread_id or mute parameter' }, { status: 400 });
    }

    const threads = await base44.asServiceRole.entities.ChatThread.filter({ id: thread_id });
    if (threads.length === 0) {
      return Response.json({ error: 'Thread not found' }, { status: 404 });
    }

    const thread = threads[0];
    const mutedBy = thread.muted_by || [];

    if (mute && !mutedBy.includes(user.email)) {
      mutedBy.push(user.email);
    } else if (!mute) {
      const index = mutedBy.indexOf(user.email);
      if (index > -1) mutedBy.splice(index, 1);
    }

    await base44.asServiceRole.entities.ChatThread.update(thread_id, {
      muted_by: mutedBy
    });

    return Response.json({
      success: true,
      muted: mute
    });

  } catch (error) {
    console.error('Mute conversation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});