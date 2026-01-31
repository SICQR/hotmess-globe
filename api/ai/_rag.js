/**
 * HOTMESS AI - RAG (Retrieval Augmented Generation)
 * 
 * Searches knowledge bases for relevant context to include in AI prompts.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate embedding for a text query
 */
async function getEmbedding(text) {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, skipping embedding');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.trim().slice(0, 8000)
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('OpenAI embedding error:', data.error);
      return null;
    }

    return data?.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

/**
 * Search platform knowledge base
 */
export async function searchPlatformKnowledge(query, options = {}) {
  const {
    category = null,
    limit = 5,
    threshold = 0.7
  } = options;

  const embedding = await getEmbedding(query);
  
  if (!embedding) {
    // Fallback to text search if embedding fails
    return fallbackTextSearch('platform_knowledge', query, category, limit);
  }

  const { data, error } = await supabase.rpc('search_platform_knowledge', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit
  });

  if (error) {
    console.error('Platform knowledge search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Search gay world knowledge base
 */
export async function searchGayWorldKnowledge(query, options = {}) {
  const {
    category = null,
    city = null,
    limit = 5,
    threshold = 0.7
  } = options;

  const embedding = await getEmbedding(query);
  
  if (!embedding) {
    // Fallback to text search
    return fallbackTextSearch('gay_world_knowledge', query, category, limit);
  }

  const { data, error } = await supabase.rpc('search_gay_world_knowledge', {
    query_embedding: embedding,
    filter_category: category,
    filter_city: city,
    match_threshold: threshold,
    match_count: limit
  });

  if (error) {
    console.error('Gay world knowledge search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Combined search across both knowledge bases
 */
export async function searchAllKnowledge(query, options = {}) {
  const {
    platformLimit = 3,
    gayWorldLimit = 3,
    city = 'London',
    threshold = 0.65
  } = options;

  // Parallel search both knowledge bases
  const [platformResults, gayWorldResults] = await Promise.all([
    searchPlatformKnowledge(query, { limit: platformLimit, threshold }),
    searchGayWorldKnowledge(query, { city, limit: gayWorldLimit, threshold })
  ]);

  return {
    platform: platformResults,
    gayWorld: gayWorldResults,
    combined: [...platformResults, ...gayWorldResults]
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  };
}

/**
 * Format knowledge results for inclusion in prompt
 */
export function formatKnowledgeForPrompt(results) {
  if (!results || results.combined?.length === 0) {
    return '';
  }

  const sections = [];

  if (results.platform?.length > 0) {
    sections.push('### Platform Information\n' + 
      results.platform.map(r => `- **${r.title || r.category}**: ${r.content}`).join('\n')
    );
  }

  if (results.gayWorld?.length > 0) {
    sections.push('### Relevant Knowledge\n' + 
      results.gayWorld.map(r => {
        const location = r.location_area ? ` (${r.location_area})` : '';
        return `- **${r.title}**${location}: ${r.content}`;
      }).join('\n')
    );
  }

  return sections.length > 0 
    ? `## Retrieved Context\n\n${sections.join('\n\n')}`
    : '';
}

/**
 * Fallback text search when embeddings unavailable
 */
async function fallbackTextSearch(table, query, category, limit) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  let queryBuilder = supabase
    .from(table)
    .select('*')
    .limit(limit);

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  // Simple text matching on content and title
  if (words.length > 0) {
    const searchPattern = words.join(' | ');
    queryBuilder = queryBuilder.or(`content.ilike.%${words[0]}%,title.ilike.%${words[0]}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Fallback search error:', error);
    return [];
  }

  // Add fake similarity score for consistency
  return (data || []).map(r => ({ ...r, similarity: 0.5 }));
}

/**
 * Detect query intent to optimize search
 */
export function detectQueryIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  const intents = {
    venue: /\b(club|bar|sauna|venue|place|where|go out|tonight|vauxhall|soho)\b/.test(lowerQuery),
    terminology: /\b(what is|what does|mean|explain|define|term)\b/.test(lowerQuery),
    health: /\b(prep|pep|clinic|test|sti|hiv|health|safe)\b/.test(lowerQuery),
    feature: /\b(how|feature|use|work|app|hotmess|xp|beacon|right now)\b/.test(lowerQuery),
    event: /\b(event|party|night|pride|circuit|happening)\b/.test(lowerQuery),
    product: /\b(buy|product|merch|clothing|marketplace|lube|hnh)\b/.test(lowerQuery),
    profile: /\b(profile|match|message|connect|chat)\b/.test(lowerQuery)
  };

  // Return primary intent
  for (const [intent, matches] of Object.entries(intents)) {
    if (matches) return intent;
  }

  return 'general';
}

/**
 * Smart search based on detected intent
 */
export async function smartSearch(query, userContext = {}) {
  const intent = detectQueryIntent(query);
  const city = userContext.city || 'London';

  const searchOptions = {
    venue: { gayWorldLimit: 5, platformLimit: 1, category: 'venue' },
    terminology: { gayWorldLimit: 3, platformLimit: 2, category: 'terminology' },
    health: { gayWorldLimit: 4, platformLimit: 1, category: 'health' },
    feature: { gayWorldLimit: 1, platformLimit: 5 },
    event: { gayWorldLimit: 3, platformLimit: 2, category: 'event_type' },
    product: { gayWorldLimit: 1, platformLimit: 4 },
    profile: { gayWorldLimit: 1, platformLimit: 4 },
    general: { gayWorldLimit: 3, platformLimit: 3 }
  };

  const options = { ...searchOptions[intent], city };
  const results = await searchAllKnowledge(query, options);

  return {
    intent,
    ...results
  };
}

export default {
  searchPlatformKnowledge,
  searchGayWorldKnowledge,
  searchAllKnowledge,
  smartSearch,
  formatKnowledgeForPrompt,
  detectQueryIntent,
  getEmbedding
};
