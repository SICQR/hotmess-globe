import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's vibe, interactions, and preferences
    const [userVibe, rsvps, checkIns, allEvents] = await Promise.all([
      base44.entities.UserVibe.filter({ user_email: user.email }),
      base44.entities.EventRSVP.filter({ user_email: user.email }, '-created_date', 50),
      base44.entities.BeaconCheckIn.filter({ user_email: user.email }, '-created_date', 100),
      base44.entities.Beacon.filter({ 
        kind: 'event', 
        status: 'published',
        active: true 
      })
    ]);

    const vibe = userVibe[0];

    // Filter upcoming events
    const upcomingEvents = allEvents.filter(e => {
      if (!e.event_date) return false;
      return new Date(e.event_date) > new Date();
    });

    // Build user preference profile
    const userProfile = {
      archetype: vibe?.archetype || 'explorer',
      traits: vibe?.traits || [],
      interests: user.interests || [],
      event_preferences: user.event_preferences || [],
      music_taste: user.music_taste || [],
      personality: user.personality_traits || {},
      past_event_types: rsvps.map(r => r.event_title),
      visited_venues: [...new Set(checkIns.map(c => c.beacon_title))]
    };

    // Score each event
    const scoredEvents = upcomingEvents.map(event => {
      let score = 0;
      const reasons = [];

      // 1. Archetype match (30 points)
      if (event.recommended_archetypes?.includes(userProfile.archetype)) {
        score += 30;
        reasons.push(`Perfect for ${userProfile.archetype}s`);
      }

      // 2. Tag overlap with interests (25 points)
      const eventTags = new Set(event.event_tags || []);
      const matchingTags = userProfile.interests.filter(i => eventTags.has(i));
      if (matchingTags.length > 0) {
        const tagScore = Math.min(25, matchingTags.length * 8);
        score += tagScore;
        reasons.push(`${matchingTags.length} matching interests`);
      }

      // 3. Music taste alignment (20 points)
      const musicMatches = userProfile.music_taste.filter(m => 
        event.description?.toLowerCase().includes(m.toLowerCase()) ||
        event.title?.toLowerCase().includes(m.toLowerCase())
      );
      if (musicMatches.length > 0) {
        score += 20;
        reasons.push('Matches your music taste');
      }

      // 4. Vibe intensity match (15 points)
      if (event.vibe_intensity && userProfile.personality?.intensity) {
        const intensityDiff = Math.abs(event.vibe_intensity - userProfile.personality.intensity);
        const intensityScore = Math.max(0, 15 - (intensityDiff / 10));
        score += intensityScore;
        if (intensityScore > 10) {
          reasons.push('Perfect vibe intensity');
        }
      }

      // 5. Venue familiarity bonus (10 points)
      if (userProfile.visited_venues.includes(event.venue_name)) {
        score += 10;
        reasons.push('Venue you know');
      }

      return {
        event,
        score: Math.round(score),
        reasons
      };
    });

    // Get top recommendations
    const recommendations = scoredEvents
      .filter(e => e.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Use AI to enhance top 3 recommendations with explanations
    const topThree = recommendations.slice(0, 3);
    
    for (const rec of topThree) {
      if (rec.score >= 70) {
        try {
          const prompt = `You're the HOTMESS AI Event Curator. Explain in ONE catchy sentence (15 words max, ALL CAPS) why this event is perfect for a ${userProfile.archetype} who loves ${userProfile.interests.slice(0, 3).join(', ')}.

Event: ${rec.event.title}
Description: ${rec.event.description?.slice(0, 200)}
Match Score: ${rec.score}%`;

          const explanation = await base44.integrations.Core.InvokeLLM({ prompt });
          rec.ai_explanation = explanation.toUpperCase();
        } catch (error) {
          console.log('AI explanation failed for event:', rec.event.id);
        }
      }
    }

    return Response.json({
      success: true,
      recommendations,
      user_profile: {
        archetype: userProfile.archetype,
        interests: userProfile.interests.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('AI event recommendations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});