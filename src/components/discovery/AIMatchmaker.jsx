
/**
 * AI-powered matchmaking engine
 * Generates personalized match explanations for top compatibility matches
 */
export async function generateMatchExplanations(currentUser, topMatches) {
  if (!currentUser || !topMatches || topMatches.length === 0) {
    return {};
  }

  try {
    /* LLM match explanations disabled */
    return {};
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