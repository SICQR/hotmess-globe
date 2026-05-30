import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const thread_id = formData.get('thread_id');

    if (!file || !thread_id) {
      return Response.json({ error: 'Missing file or thread_id' }, { status: 400 });
    }

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Create message with media
    await base44.asServiceRole.entities.Message.create({
      thread_id,
      sender_email: user.email,
      message_text: '',
      media_url: file_url,
      media_type: file.type
    });

    return Response.json({
      success: true,
      media_url: file_url
    });

  } catch (error) {
    console.error('Upload message media error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});