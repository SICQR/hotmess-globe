import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, user_count } = await req.json();

    if (!lat || !lng || !user_count) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Generate AI vibe tooltip based on zone density and time
    const hour = new Date().getHours();
    const timeContext = hour < 6 ? 'late night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    const prompt = `Generate a 2-word atmospheric vibe for an urban zone with ${user_count} active users during ${timeContext}. 

Make it edgy, cyberpunk, and evocative. Use ALL CAPS. Examples:
- HEAVY PULSE
- NEON SWARM  
- SHADOW TIDE
- CYBER HIVE
- GHOST ZONE
- VOLTAGE SURGE
- VOID CLUSTER

Respond with ONLY the 2 words, nothing else.`;

    const vibe = await base44.integrations.Core.InvokeLLM({
      prompt
    });

    return Response.json({
      success: true,
      vibe_tooltip: vibe.trim().toUpperCase(),
      lat,
      lng,
      user_count
    });

  } catch (error) {
    console.error('Vibe tooltip generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});