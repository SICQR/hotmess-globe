
/**
 * Advanced Event Recommendation Engine
 * Uses collaborative filtering, content-based filtering, and behavioral analysis
 */
export class EventRecommendationEngine {
  constructor(currentUser, allEvents, allRsvps, userCheckIns = [], eventViews = []) {
    this.currentUser = currentUser;
    this.allEvents = allEvents;
    this.allRsvps = allRsvps;
    this.userCheckIns = userCheckIns;
    this.eventViews = eventViews;
  }

  /**
   * Get personalized event recommendations
   */
  getRecommendations(limit = 6, minScore = 15) {
    const scoredEvents = this.allEvents.map(event => {
      const score = this.calculateScore(event);
      return { ...event, recommendationScore: Math.round(score) };
    });

    return scoredEvents
      .filter(e => e.recommendationScore > minScore)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Calculate recommendation score for an event
   */
  calculateScore(event) {
    let score = 0;

    // 1. Location-based scoring (30 points)
    score += this.getLocationScore(event);

    // 2. Mode/Type preference (25 points)
    score += this.getModeScore(event);

    // 3. Interest matching (20 points)
    score += this.getInterestScore(event);

    // 4. Collaborative filtering (15 points)
    score += this.getCollaborativeScore(event);

    // 5. Behavioral patterns (10 points)
    score += this.getBehavioralScore(event);

    // 6. Popularity/Trending (10 points)
    score += this.getPopularityScore(event);

    // 7. Recency/Timing (10 points)
    score += this.getTimingScore(event);

    return score;
  }

  /**
   * Location-based scoring
   */
  getLocationScore(event) {
    let score = 0;

    // Same city as user (30 points)
    if (event.city === this.currentUser.city) {
      score += 30;
      return score;
    }

    // Proximity to past venues (20 points)
    const nearbyCheckIns = this.userCheckIns.filter(ci => {
      if (!ci.lat || !ci.lng || !event.lat || !event.lng) return false;
      const distance = this.haversineDistance(ci.lat, ci.lng, event.lat, event.lng);
      return distance < 2; // Within 2km
    });
    if (nearbyCheckIns.length > 0) {
      score += 20;
    }

    // Cities frequently visited (10 points)
    const cityCounts = this.userCheckIns.reduce((acc, ci) => {
      acc[ci.city] = (acc[ci.city] || 0) + 1;
      return acc;
    }, {});
    const topCities = Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a]).slice(0, 3);
    if (topCities.includes(event.city)) {
      score += 10;
    }

    return score;
  }

  /**
   * Mode/Type preference scoring
   */
  getModeScore(event) {
    let score = 0;

    // Past check-ins with same mode (25 points)
    const userModes = this.userCheckIns.map(ci => ci.beacon_mode).filter(Boolean);
    const modeFrequency = userModes.reduce((acc, mode) => {
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});
    
    if (event.mode && modeFrequency[event.mode]) {
      const normalizedFreq = Math.min(modeFrequency[event.mode] / userModes.length, 1);
      score += normalizedFreq * 25;
    }

    // Past RSVPs with same mode (15 points)
    const userRsvps = this.allRsvps.filter(r => r.user_email === this.currentUser.email);
    const rsvpEvents = this.allEvents.filter(e => userRsvps.some(r => r.event_id === e.id));
    const rsvpModes = rsvpEvents.map(e => e.mode).filter(Boolean);
    
    if (event.mode && rsvpModes.includes(event.mode)) {
      score += 15;
    }

    return score;
  }

  /**
   * Interest/preference matching
   */
  getInterestScore(event) {
    let score = 0;
    const eventText = `${event.title} ${event.description || ''} ${event.mode || ''} ${event.venue_name || ''}`.toLowerCase();

    // Event preferences (15 points)
    const userPrefs = this.currentUser.event_preferences || [];
    const matchingPrefs = userPrefs.filter(pref => eventText.includes(pref.toLowerCase()));
    score += Math.min(matchingPrefs.length * 5, 15);

    // Music taste (10 points)
    const userMusicTaste = this.currentUser.music_taste || [];
    const matchingMusic = userMusicTaste.filter(genre => eventText.includes(genre.toLowerCase()));
    score += Math.min(matchingMusic.length * 3, 10);

    // Bio keywords (5 points)
    const userBio = (this.currentUser.bio || '').toLowerCase();
    const bioKeywords = userBio.split(/\s+/).filter(w => w.length > 3);
    const matchingKeywords = bioKeywords.filter(keyword => eventText.includes(keyword));
    score += Math.min(matchingKeywords.length * 1, 5);

    return score;
  }

  /**
   * Collaborative filtering - find similar users
   */
  getCollaborativeScore(event) {
    let score = 0;

    // Find users with similar RSVP patterns
    const myRsvps = this.allRsvps.filter(r => r.user_email === this.currentUser.email);
    const myEventIds = new Set(myRsvps.map(r => r.event_id));

    // Calculate Jaccard similarity with other users
    const similarUsers = [];
    const otherUsers = [...new Set(this.allRsvps.map(r => r.user_email))];
    
    otherUsers.forEach(otherEmail => {
      if (otherEmail === this.currentUser.email) return;
      
      const theirRsvps = this.allRsvps.filter(r => r.user_email === otherEmail);
      const theirEventIds = new Set(theirRsvps.map(r => r.event_id));
      
      const intersection = [...myEventIds].filter(id => theirEventIds.has(id)).length;
      const union = new Set([...myEventIds, ...theirEventIds]).size;
      
      if (union > 0) {
        const similarity = intersection / union;
        if (similarity > 0.3) { // At least 30% overlap
          similarUsers.push({ email: otherEmail, similarity, rsvps: theirRsvps });
        }
      }
    });

    // Check if similar users are going to this event (15 points)
    const similarUsersGoing = similarUsers.filter(u => 
      u.rsvps.some(r => r.event_id === event.id)
    );
    
    if (similarUsersGoing.length > 0) {
      const avgSimilarity = similarUsersGoing.reduce((sum, u) => sum + u.similarity, 0) / similarUsersGoing.length;
      score += avgSimilarity * 15;
    }

    return score;
  }

  /**
   * Behavioral patterns from browsing history
   */
  getBehavioralScore(event) {
    let score = 0;

    // User has viewed this event before (5 points)
    const hasViewed = this.eventViews.some(v => 
      v.user_email === this.currentUser.email && v.event_id === event.id
    );
    if (hasViewed) {
      score += 5;
    }

    // User frequently views events of this mode (5 points)
    const viewedModes = this.eventViews
      .filter(v => v.user_email === this.currentUser.email)
      .map(v => v.event_mode)
      .filter(Boolean);
    
    if (event.mode && viewedModes.filter(m => m === event.mode).length >= 3) {
      score += 5;
    }

    return score;
  }

  /**
   * Popularity and trending score
   */
  getPopularityScore(event) {
    let score = 0;

    // Number of RSVPs (up to 7 points)
    const attendeeCount = this.allRsvps.filter(r => r.event_id === event.id).length;
    score += Math.min(7, attendeeCount / 5);

    // Recently created (trending) (3 points)
    const daysSinceCreated = (Date.now() - new Date(event.created_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 3) {
      score += 3;
    }

    return score;
  }

  /**
   * Timing optimization
   */
  getTimingScore(event) {
    let score = 0;

    if (!event.event_date) return score;

    const now = new Date();
    const eventDate = new Date(event.event_date);
    const daysUntil = (eventDate - now) / (1000 * 60 * 60 * 24);

    // Events happening soon get priority (up to 10 points)
    if (daysUntil < 0) {
      // Past event - no score
      return 0;
    } else if (daysUntil < 1) {
      // Today - highest priority
      score += 10;
    } else if (daysUntil < 3) {
      // This week
      score += 8;
    } else if (daysUntil < 7) {
      // Within a week
      score += 6;
    } else if (daysUntil < 14) {
      // Within 2 weeks
      score += 4;
    } else if (daysUntil < 30) {
      // Within a month
      score += 2;
    }

    return score;
  }

  /**
   * Haversine distance calculation
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Explain recommendation score (for debugging/transparency)
   */
  explainScore(event) {
    return {
      total: this.calculateScore(event),
      breakdown: {
        location: this.getLocationScore(event),
        mode: this.getModeScore(event),
        interests: this.getInterestScore(event),
        collaborative: this.getCollaborativeScore(event),
        behavioral: this.getBehavioralScore(event),
        popularity: this.getPopularityScore(event),
        timing: this.getTimingScore(event)
      }
    };
  }
}

/**
 * Hook to use the recommendation engine
 */
export function useEventRecommendations(currentUser, allEvents, allRsvps, options = {}) {
  const { limit = 6, minScore = 15 } = options;

  if (!currentUser || !allEvents || allEvents.length === 0) {
    return { recommendations: [], isLoading: false };
  }

  // Get additional data for scoring
  const userCheckIns = []; // Would be fetched via useQuery
  const eventViews = []; // Would be fetched via useQuery

  const engine = new EventRecommendationEngine(
    currentUser,
    allEvents,
    allRsvps,
    userCheckIns,
    eventViews
  );

  const recommendations = engine.getRecommendations(limit, minScore);

  return {
    recommendations,
    isLoading: false,
    explainScore: (event) => engine.explainScore(event)
  };
}