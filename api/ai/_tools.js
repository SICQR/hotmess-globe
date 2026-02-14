/**
 * HOTMESS AI - Function Calling Tool Definitions
 * 
 * Defines tools the AI can invoke during conversations.
 * Each tool maps to an actual database query or API call.
 */

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      _supabase = createClient(url, key);
    }
  }
  return _supabase;
}

/**
 * Tool definitions for OpenAI function calling
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description: 'Search MESSMARKET products by query, category, or price range',
      parameters: {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: 'Search term for product name/description' 
          },
          category: { 
            type: 'string', 
            enum: ['clothing', 'accessories', 'lube', 'wellness', 'music', 'tickets'],
            description: 'Product category filter' 
          },
          maxPrice: { 
            type: 'number', 
            description: 'Maximum price in GBP' 
          },
          brand: {
            type: 'string',
            enum: ['RAW', 'HUNG', 'HIGH', 'HNH MESS'],
            description: 'Filter by HOTMESS brand'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'findEvents',
      description: 'Find events, parties, and club nights',
      parameters: {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: 'Search term for event name/description' 
          },
          city: { 
            type: 'string', 
            default: 'London',
            description: 'City to search in' 
          },
          dateRange: {
            type: 'string',
            enum: ['tonight', 'this_weekend', 'this_week', 'this_month'],
            description: 'Time period for events'
          },
          type: {
            type: 'string',
            enum: ['club', 'bar', 'party', 'pride', 'fetish', 'chill', 'day_party'],
            description: 'Type of event'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getRadioSchedule',
      description: 'Get RAW CONVICT RADIO show schedule',
      parameters: {
        type: 'object',
        properties: {
          when: {
            type: 'string',
            enum: ['now', 'today', 'this_week'],
            description: 'Time period for schedule'
          }
        },
        required: ['when']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUserStats',
      description: 'Get current user stats: XP balance, tier, achievements, streaks',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'findNearbyVenues',
      description: 'Find LGBT venues in London by type and area',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['club', 'bar', 'sauna', 'cafe', 'cruising', 'any'],
            description: 'Type of venue'
          },
          area: {
            type: 'string',
            description: 'Area in London (e.g., Soho, Vauxhall, Shoreditch)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'explainTerm',
      description: 'Explain LGBT/gay scene terminology',
      parameters: {
        type: 'object',
        properties: {
          term: {
            type: 'string',
            description: 'The term to explain'
          }
        },
        required: ['term']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSafetyResources',
      description: 'Get safety, health, and support resources',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['sexual_health', 'mental_health', 'crisis', 'prep', 'harm_reduction', 'domestic_violence'],
            description: 'Type of resource needed'
          }
        },
        required: ['topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateTo',
      description: 'Navigate user to a specific page in the app',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['home', 'pulse', 'events', 'market', 'social', 'music', 'profile', 'settings', 'safety', 'messages'],
            description: 'Page to navigate to'
          },
          params: {
            type: 'object',
            description: 'Optional parameters for the page'
          }
        },
        required: ['page']
      }
    }
  }
];

/**
 * Execute a tool call and return results
 */
export async function executeTool(name, args, userContext = {}) {
  const handlers = {
    searchProducts,
    findEvents,
    getRadioSchedule,
    getUserStats,
    findNearbyVenues,
    explainTerm,
    getSafetyResources,
    navigateTo
  };

  const handler = handlers[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    return await handler(args, userContext);
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================
// Tool Implementation Functions
// ============================================

async function searchProducts({ query, category, maxPrice, brand }, userContext) {
  let queryBuilder = getSupabase()
    .from('products')
    .select('id, title, description, price, category, brand, image_url, slug')
    .eq('is_active', true)
    .limit(10);

  if (query) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }
  if (maxPrice) {
    queryBuilder = queryBuilder.lte('price', maxPrice);
  }
  if (brand) {
    queryBuilder = queryBuilder.eq('brand', brand);
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    return { error: 'Failed to search products' };
  }

  return {
    products: data || [],
    count: data?.length || 0,
    message: data?.length 
      ? `Found ${data.length} products` 
      : 'No products found matching your search'
  };
}

async function findEvents({ query, city = 'London', dateRange, type }, userContext) {
  const now = new Date();
  let startDate = now;
  let endDate = new Date(now);

  // Set date range
  switch (dateRange) {
    case 'tonight':
      endDate.setHours(23, 59, 59);
      break;
    case 'this_weekend':
      const dayOfWeek = now.getDay();
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 0;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + daysUntilFriday);
      startDate.setHours(18, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);
      endDate.setHours(6, 0, 0);
      break;
    case 'this_week':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'this_month':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    default:
      endDate.setDate(endDate.getDate() + 7);
  }

  let queryBuilder = getSupabase()
    .from('Beacon')
    .select('id, title, description, start_date, end_date, location_name, location_area, beacon_type, metadata')
    .eq('beacon_type', 'event')
    .gte('start_date', startDate.toISOString())
    .lte('start_date', endDate.toISOString())
    .order('start_date', { ascending: true })
    .limit(10);

  if (query) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (type) {
    queryBuilder = queryBuilder.contains('metadata', { event_type: type });
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return { error: 'Failed to search events' };
  }

  return {
    events: data?.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description?.slice(0, 150),
      date: e.start_date,
      location: e.location_name || e.location_area,
      type: e.metadata?.event_type
    })) || [],
    count: data?.length || 0,
    message: data?.length 
      ? `Found ${data.length} events` 
      : 'No events found for that time period'
  };
}

async function getRadioSchedule({ when }, userContext) {
  // This would ideally come from a schedule table, but for now return static
  const schedule = {
    now: {
      show: 'RAW CONVICT RADIO',
      description: '24/7 Underground Electronic',
      isLive: true,
      url: '/music'
    },
    today: [
      { time: '06:00', show: 'Wake the Mess', host: 'Morning crew' },
      { time: '10:00', show: 'Midday Heat', host: 'Various DJs' },
      { time: '14:00', show: 'Afternoon Sessions', host: 'Guest mixes' },
      { time: '18:00', show: 'Rush Hour', host: 'Peak time energy' },
      { time: '22:00', show: 'Night Shift', host: 'Late night vibes' },
      { time: '02:00', show: 'After Hours', host: 'Deep cuts' }
    ],
    this_week: [
      { day: 'Friday', highlight: 'SMASH DADDYS Live Set @ 10pm' },
      { day: 'Saturday', highlight: 'Weekend Warm-up @ 8pm' },
      { day: 'Sunday', highlight: 'Recovery Mix @ 2pm' }
    ]
  };

  return {
    schedule: schedule[when] || schedule.now,
    message: when === 'now' 
      ? 'Currently playing: RAW CONVICT RADIO - 24/7 Underground Electronic'
      : `Here's the ${when.replace('_', ' ')} schedule`
  };
}

async function getUserStats(args, userContext) {
  if (!userContext?.email && !userContext?.id) {
    return { 
      error: 'Not logged in',
      message: 'Please log in to view your stats'
    };
  }

  const { data, error } = await getSupabase()
    .from('User')
    .select('xp_balance, subscription_tier, current_streak, achievements, level')
    .eq('email', userContext.email)
    .single();

  if (error || !data) {
    return { error: 'Failed to fetch user stats' };
  }

  return {
    xp: data.xp_balance || 0,
    tier: data.subscription_tier || 'FREE',
    level: data.level || 1,
    streak: data.current_streak || 0,
    achievements: data.achievements || [],
    message: `You have ${data.xp_balance || 0} XP (Level ${data.level || 1})`
  };
}

async function findNearbyVenues({ type, area }, userContext) {
  let queryBuilder = getSupabase()
    .from('gay_world_knowledge')
    .select('title, content, location_area, metadata')
    .eq('category', 'venue')
    .limit(10);

  if (type && type !== 'any') {
    queryBuilder = queryBuilder.eq('subcategory', type);
  }
  if (area) {
    queryBuilder = queryBuilder.ilike('location_area', `%${area}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return { error: 'Failed to search venues' };
  }

  return {
    venues: data?.map(v => ({
      name: v.title,
      description: v.content?.slice(0, 150),
      area: v.location_area,
      type: v.metadata?.type,
      vibe: v.metadata?.vibe
    })) || [],
    count: data?.length || 0,
    message: data?.length 
      ? `Found ${data.length} venues${area ? ` in ${area}` : ''}` 
      : 'No venues found matching your search'
  };
}

async function explainTerm({ term }, userContext) {
  const { data, error } = await getSupabase()
    .from('gay_world_knowledge')
    .select('title, content, metadata')
    .eq('category', 'terminology')
    .ilike('title', `%${term}%`)
    .limit(1)
    .single();

  if (error || !data) {
    // Try broader search
    const { data: broadSearch } = await getSupabase()
      .from('gay_world_knowledge')
      .select('title, content, metadata')
      .eq('category', 'terminology')
      .ilike('content', `%${term}%`)
      .limit(1)
      .single();

    if (!broadSearch) {
      return {
        term,
        definition: null,
        message: `I don't have a definition for "${term}" in my knowledge base, but I can try to explain based on general knowledge.`
      };
    }
    
    return {
      term: broadSearch.title,
      definition: broadSearch.content,
      related: broadSearch.metadata?.related || [],
      message: `Found information about "${broadSearch.title}"`
    };
  }

  return {
    term: data.title,
    definition: data.content,
    related: data.metadata?.related || [],
    source: data.metadata?.source,
    message: `Here's what "${data.title}" means`
  };
}

async function getSafetyResources({ topic }, userContext) {
  const resources = {
    sexual_health: {
      title: 'Sexual Health Resources',
      items: [
        { name: '56 Dean Street', phone: '020 3315 6699', url: 'dean.st', note: 'Walk-in clinic, PrEP, STI testing' },
        { name: 'Terrence Higgins Trust', phone: '0808 802 1221', url: 'tht.org.uk', note: 'HIV support & advice' },
        { name: 'CliniQ', url: 'cliniq.org.uk', note: 'Trans-inclusive sexual health' }
      ]
    },
    mental_health: {
      title: 'Mental Health Support',
      items: [
        { name: 'Switchboard LGBT+', phone: '0300 330 0630', note: '10am-10pm daily' },
        { name: 'MindOut', url: 'mindout.org.uk', note: 'LGBTQ+ mental health' },
        { name: 'Samaritans', phone: '116 123', note: '24/7, free' }
      ]
    },
    crisis: {
      title: 'Crisis Support',
      items: [
        { name: 'Emergency', phone: '999', note: 'Immediate danger' },
        { name: 'Samaritans', phone: '116 123', note: '24/7, free, confidential' },
        { name: 'London Friend', phone: '020 7837 3337', note: 'LGBT helpline' }
      ]
    },
    prep: {
      title: 'PrEP Information',
      items: [
        { name: '56 Dean Street', phone: '020 3315 6699', note: 'Free PrEP on NHS' },
        { name: 'PrEPster', url: 'prepster.info', note: 'Info & resources' },
        { name: 'iWantPrEPNow', url: 'iwantprepnow.co.uk', note: 'Access guide' }
      ]
    },
    harm_reduction: {
      title: 'Harm Reduction',
      items: [
        { name: 'The Loop', url: 'wearetheloop.org', note: 'Drug checking service' },
        { name: 'Release', phone: '020 7324 2989', url: 'release.org.uk', note: 'Drugs & legal advice' },
        { name: 'Antidote (London Friend)', phone: '020 7833 1674', note: 'LGBT drug/alcohol support' }
      ]
    },
    domestic_violence: {
      title: 'Domestic Violence Support',
      items: [
        { name: 'Galop', phone: '0800 999 5428', url: 'galop.org.uk', note: 'LGBT+ anti-violence' },
        { name: 'National Domestic Violence Helpline', phone: '0808 2000 247', note: '24/7' },
        { name: 'Refuge', url: 'refuge.org.uk', note: 'Support & advice' }
      ]
    }
  };

  const resource = resources[topic] || resources.crisis;

  return {
    ...resource,
    message: `Here are ${resource.title.toLowerCase()}. Your safety matters. 💚`
  };
}

function navigateTo({ page, params }, userContext) {
  const routes = {
    home: '/',
    pulse: '/pulse',
    events: '/events',
    market: '/market',
    social: '/social',
    music: '/music',
    profile: '/profile',
    settings: '/settings',
    safety: '/safety',
    messages: '/messages'
  };

  const url = routes[page] || '/';
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';

  return {
    url: url + queryString,
    action: 'navigate',
    message: `Taking you to ${page}`
  };
}

export default {
  TOOL_DEFINITIONS,
  executeTool
};
