import { base44 } from '@/api/base44Client';

/**
 * AI-powered matchmaking engine
 * Generates personalized match explanations for top compatibility matches
 */
export async function generateMatchExplanations(currentUser, topMatches) {
  if (!currentUser || !topMatches || topMatches.length === 0) {
    return {};
  }

  try {
    // Build user profiles summary
    const matchProfiles = topMatches.slice(0, 6).map(user => ({
      id: user.id,
      name: user.full_name,
      bio: user.bio,
      interests: user.event_preferences || [],
      music: user.music_taste || [],
      city: user.city
    }));

    const prompt = `You are an LGBT dating compatibility expert. Review these matches for the logged-in user and explain why each is a good match.

Logged-in User:
- Bio: ${currentUser.bio || 'No bio'}
- Interests: ${(currentUser.event_preferences || []).join(', ')}
- Music: ${(currentUser.music_taste || []).join(', ')}
- City: ${currentUser.city}

Potential Matches:
${matchProfiles.map((m, i) => `
${i + 1}. ${m.name} (ID: ${m.id})
- Bio: ${m.bio || 'No bio'}
- Interests: ${m.interests.join(', ')}
- Music: ${m.music.join(', ')}
- City: ${m.city}
`).join('\n')}

For each match, write ONE SHORT SENTENCE (max 12 words) explaining why they're compatible. Focus on shared interests, values, or complementary traits. Be genuine and specific.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          explanations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Convert to lookup object
    const explanationMap = {};
    response.explanations?.forEach(exp => {
      explanationMap[exp.user_id] = exp.reason;
    });

    return explanationMap;
  } catch (error) {
    console.error('Failed to generate match explanations:', error);
    return {};
  }
}

/**
 * Sort users to promote top AI-recommended matches
 */
export function promoteTopMatches(users, matchExplanations) {
  const usersWithExplanations = users.filter(u => matchExplanations[u.id]);
  const usersWithoutExplanations = users.filter(u => !matchExplanations[u.id]);

  return [...usersWithExplanations, ...usersWithoutExplanations];
}