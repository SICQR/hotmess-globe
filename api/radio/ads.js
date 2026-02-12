import { json } from '../shopify/_utils.js';

/**
 * RadioAd Schema
 * @typedef {Object} RadioAd
 * @property {string} id - Unique identifier
 * @property {string} title - Ad title
 * @property {string} description - Ad description/Subtitle
 * @property {string} audio_url - URL to the audio file
 * @property {number} duration - Duration in seconds
 * @property {string[]} target_personas - Array of target personas (e.g., 'Tourist', 'Local')
 * @property {Object} [geo_fence] - Optional location targeting
 * @property {number} geo_fence.lat
 * @property {number} geo_fence.lng
 * @property {number} geo_fence.radius - Radius in km
 * @property {number} weight - Probability weight (0-100)
 */

// Mock Ads Database
const ADS_DB = [
  {
    id: 'ad_uber_001',
    title: 'Uber: Ride Safe',
    description: 'Get home safe tonight with Uber.',
    audio_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=commerecial-break-15-secs-14146.mp3', // Generic ad placeholder
    duration: 15,
    target_personas: ['Tourist'],
    weight: 80
  },
  {
    id: 'ad_local_club_001',
    title: 'Fabric: Tonight',
    description: 'Underground vibes until 6AM.',
    audio_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=commerecial-break-15-secs-14146.mp3', // Generic ad placeholder
    duration: 20,
    target_personas: ['Local', 'Party Animal'],
    weight: 70
  },
  {
    id: 'ad_generic_001',
    title: 'HOTMESS Premium',
    description: 'Go CHROME for an ad-free experience.',
    audio_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=commerecial-break-15-secs-14146.mp3', // Generic ad placeholder
    duration: 10,
    target_personas: ['All'],
    weight: 30
  }
];

/**
 * Fetch relevant ads for a user based on their profile/persona.
 * @param {Object} user - User profile object
 * @returns {Promise<RadioAd|null>} - Selected ad or null
 */
async function getRelevantAd(user) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Determine user persona (simplified logic)
  let userPersona = 'Local';
  
  if (user) {
      // Check for specific persona fields or infer from city/home
      if (user.city && user.city.toLowerCase() !== 'london') {
          userPersona = 'Tourist';
      }
      // Assuming 'persona_type' might exist on the user object if they selected one
      if (user.persona_type === 'travel') {
          userPersona = 'Tourist';
      }
  }

  // Filter ads
  const eligibleAds = ADS_DB.filter(ad => {
    if (ad.target_personas.includes('All')) return true;
    return ad.target_personas.includes(userPersona);
  });

  if (eligibleAds.length === 0) {
      // Fallback to generic if no specific ads found
      return ADS_DB.find(ad => ad.target_personas.includes('All'));
  }

  // Weighted random selection
  // Simple random for prototype
  const randomIndex = Math.floor(Math.random() * eligibleAds.length);
  const selectedAd = eligibleAds[randomIndex];

  return {
      ...selectedAd,
      isAd: true // Flag to identify it's an ad
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  let body = req.body;

  // Fallback for body parsing if not provided by framework/middleware
  if (!body || Object.keys(body).length === 0) {
      try {
        const buffers = [];
        for await (const chunk of req) {
            buffers.push(chunk);
        }
        const data = Buffer.concat(buffers).toString();
        if (data) {
            body = JSON.parse(data);
        }
      } catch (e) {
        console.warn('Failed to parse body in ad handler', e);
      }
  }

  const { user } = body || {};
  const ad = await getRelevantAd(user);
  
  return json(res, 200, { ad });
}
