import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { track_id, audio_url } = await req.json();

    if (!track_id || !audio_url) {
      return Response.json({ error: 'Missing track_id or audio_url' }, { status: 400 });
    }

    // Use AI to analyze audio metadata
    const prompt = `Analyze this audio track and extract metadata for visual sync.
    
Track: ${track_id}

Estimate and provide:
1. BPM (beats per minute) - typical range 60-180
2. Energy level (0-1) - how intense/aggressive the track is
3. Mood - choose from: aggressive, hypnotic, melancholic, euphoric, dark, ambient
4. Fog density (0-1) - how dense the visual fog should be
5. Shadow intensity (0-1) - darkness level

Respond in JSON format only.`;

    const metadata = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          bpm: { type: 'number' },
          energy: { type: 'number' },
          mood: { type: 'string' },
          fog_density: { type: 'number' },
          shadow_intensity: { type: 'number' }
        }
      }
    });

    // Update beacon with metadata
    const beacons = await base44.asServiceRole.entities.Beacon.filter({ track_id });
    if (beacons.length > 0) {
      await base44.asServiceRole.entities.Beacon.update(beacons[0].id, {
        metadata: {
          ...beacons[0].metadata,
          audio_sync: metadata
        }
      });
    }

    return Response.json({
      success: true,
      track_id,
      metadata
    });

  } catch (error) {
    console.error('Audio metadata sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});