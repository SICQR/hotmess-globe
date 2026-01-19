import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Production readiness: this function previously simulated Telegram IDs and stored messages locally.
  // If Telegram integration is a real requirement, wire the Telegram Bot API (or remove Telegram claims from the UI).
  return Response.json(
    {
      error: 'Not implemented',
      details:
        'Telegram proxy is not wired to Telegram. Implement real Telegram integration (bot token + chat mapping) or disable Telegram-specific messaging claims.',
    },
    { status: 501 }
  );

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, thread_id, message, recipient_email } = await req.json();

    if (!action) {
      return Response.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    // Get or create chat thread
    let thread;
    if (thread_id) {
      const threads = await base44.asServiceRole.entities.ChatThread.filter({ id: thread_id });
      thread = threads[0];
    } else if (recipient_email) {
      // Find existing thread or create new
      const existingThreads = await base44.asServiceRole.entities.ChatThread.list();
      thread = existingThreads.find(t => 
        t.participant_emails.includes(user.email) && 
        t.participant_emails.includes(recipient_email)
      );

      if (!thread) {
        // Create new thread
        thread = await base44.asServiceRole.entities.ChatThread.create({
          participant_emails: [user.email, recipient_email],
          thread_type: 'dm',
          telegram_chat_id: `tg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }
    }

    switch (action) {
      case 'send_message':
        if (!message || !thread) {
          return Response.json({ error: 'Missing message or thread' }, { status: 400 });
        }

        // Create message in database
        const msg = await base44.asServiceRole.entities.Message.create({
          thread_id: thread.id,
          sender_email: user.email,
          message_text: message,
          telegram_message_id: `tg_msg_${Date.now()}`
        });

        // Update thread last message
        await base44.asServiceRole.entities.ChatThread.update(thread.id, {
          last_message: message.substring(0, 100),
          last_message_at: new Date().toISOString()
        });

        // Send notification to recipients
        const recipients = thread.participant_emails.filter(e => e !== user.email);
        for (const recipientEmail of recipients) {
          await base44.asServiceRole.entities.NotificationOutbox.create({
            user_email: recipientEmail,
            notification_type: 'message_received',
            title: 'New Message',
            message: `${user.full_name}: ${message.substring(0, 50)}`,
            metadata: {
              thread_id: thread.id,
              sender_email: user.email
            }
          });
        }

        return Response.json({
          success: true,
          message_id: msg.id,
          thread_id: thread.id,
          telegram_chat_id: thread.telegram_chat_id
        });

      case 'get_messages':
        if (!thread) {
          return Response.json({ error: 'Thread not found' }, { status: 404 });
        }

        const messages = await base44.asServiceRole.entities.Message.filter(
          { thread_id: thread.id },
          '-created_date',
          100
        );

        return Response.json({
          success: true,
          thread_id: thread.id,
          messages: messages.reverse()
        });

      case 'get_threads':
        const allThreads = await base44.asServiceRole.entities.ChatThread.list();
        const userThreads = allThreads.filter(t => 
          t.participant_emails.includes(user.email) && t.active
        ).sort((a, b) => 
          new Date(b.last_message_at || b.created_date) - new Date(a.last_message_at || a.created_date)
        );

        return Response.json({
          success: true,
          threads: userThreads
        });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Telegram proxy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});