import { getEnv, safeJsonParse } from '../shopify/_utils.js';

const coerceArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCity = (value) => String(value || '').trim();

const parseEventDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return d.toISOString();
};

/**
 * Convert an incoming event object to a Beacon row.
 * Matches the minimal schema defined in supabase/migrations/20260103000002_create_beacon_eventrsvp.sql
 */
export const toBeaconRow = (event) => {
  const title = String(event?.title || event?.name || '').trim();
  const city = normalizeCity(event?.city);
  const eventDate = parseEventDate(event?.event_date || event?.date_time || event?.date);

  return {
    kind: 'event',
    status: 'published',
    active: true,
    title: title || null,
    description: event?.description ? String(event.description) : null,
    venue_name: event?.venue_name ? String(event.venue_name) : null,
    city: city || null,
    mode: event?.mode ? String(event.mode) : null,
    event_date: eventDate,
    // owner_email intentionally omitted for service-role writes
  };
};

/**
 * Optional JSON-source scraper.
 *
 * Configure env var EVENT_SCRAPER_SOURCES_JSON as JSON.
 * Example:
 * {
 *   "London": ["https://example.com/events-london.json"],
 *   "Manchester": ["https://example.com/events-manchester.json"]
 * }
 *
 * Each URL may return either:
 * - { "events": [ ... ] }
 * - [ ... ]
 */
export const fetchEventsFromConfiguredSources = async ({ cities, serviceClient }) => {
  let parsed = {};

  // Try DB first if client provided
  if (serviceClient) {
    const { data: sources, error } = await serviceClient
      .from('event_scraper_sources')
      .select('city, source_url')
      .eq('enabled', true);

    if (!error && sources?.length > 0) {
      // Convert DB rows to expected format: { "City": ["url1", "url2"] }
      parsed = sources.reduce((acc, row) => {
        const c = row.city;
        if (!acc[c]) acc[c] = [];
        acc[c].push(row.source_url);
        return acc;
      }, {});
    }
  }

  // Fallback to env var if empty
  if (Object.keys(parsed).length === 0) {
    const raw = getEnv('EVENT_SCRAPER_SOURCES_JSON');
    if (raw) {
      const fromEnv = safeJsonParse(raw);
      if (fromEnv && typeof fromEnv === 'object') {
        parsed = fromEnv;
      }
    }
  }

  if (Object.keys(parsed).length === 0) {
     return { ok: false, error: 'No configured sources (DB or ENV)' };
  }

  const out = [];
  const errors = [];

  const normalizeKey = (value) => String(value || '').trim().toLowerCase();
  const sourcesByCity = new Map();

  for (const [rawKey, rawValue] of Object.entries(parsed)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    const urls = coerceArray(rawValue)
      .map((u) => String(u || '').trim())
      .filter(Boolean);
    if (!urls.length) continue;

    const existing = sourcesByCity.get(key) || [];
    sourcesByCity.set(key, existing.concat(urls));
  }

  const globalUrls = Array.from(
    new Set([...(sourcesByCity.get('*') || []), ...(sourcesByCity.get('all') || [])])
  );

  for (const city of cities) {
    const key = normalizeKey(city);
    const urls = Array.from(new Set([...(sourcesByCity.get(key) || []), ...globalUrls]));
    if (!urls.length) continue;

    for (const url of urls) {
      try {
        const resp = await fetch(String(url), {
          headers: { 'accept': 'application/json' },
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`Fetch failed (${resp.status}): ${text || resp.statusText}`);
        }

        const payload = await resp.json();
        const events = Array.isArray(payload) ? payload : coerceArray(payload?.events);
        for (const e of events) {
          out.push({ ...e, city: e?.city || city });
        }
      } catch (e) {
        errors.push(`${city}: ${String(url)} -> ${e?.message || String(e)}`);
      }
    }
  }

  return { ok: true, events: out, errors };
};

const buildEventResearchPrompt = ({ cities, daysAhead, maxPerCity }) => {
  return `You are an LGBT nightlife events researcher.

Task: Find REAL upcoming LGBT events in the following cities: ${cities.join(', ')}.

Requirements:
- Time window: next ${daysAhead} days
- Return up to ${maxPerCity} events per city
- Use reputable sources (venue sites, ticketing pages, listings)
- Each event MUST include a source_url (direct page for the event or listing)
- Prefer LGBT-specific venues and events
- Avoid duplicates

For each event return:
- name
- city
- venue_name
- address (if known)
- date_time (ISO 8601)
- description (2-3 sentences)
- event_type (club_night, drag_show, party, social, pride_event, meetup)
- ticket_url (if available)
- source_url

Return ONLY valid JSON per the schema.`;
};

const openaiPostJson = async ({ url, apiKey, body }) => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text().catch(() => '');
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!resp.ok) {
    const msg = json?.error?.message || json?.message || text || `OpenAI error (${resp.status})`;
    const err = new Error(msg);
    err.status = resp.status;
    err.payload = json;
    throw err;
  }

  return json;
};

const extractJsonFromText = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  const text = String(value).trim();
  if (!text) return null;
  return safeJsonParse(text);
};

/**
 * Generate events via OpenAI when configured.
 *
 * Env:
 * - OPENAI_API_KEY (required)
 * - OPENAI_MODEL (optional)
 * - EVENT_SCRAPER_MAX_EVENTS_PER_CITY (optional)
 * - EVENT_SCRAPER_USE_WEB_SEARCH (optional: true/false; best-effort)
 */
export const generateEventsWithOpenAI = async ({ cities, daysAhead }) => {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) return { ok: false, error: 'Missing OPENAI_API_KEY' };

  const model = getEnv('OPENAI_MODEL') || 'gpt-4o-mini';
  const maxPerCity = Number(getEnv('EVENT_SCRAPER_MAX_EVENTS_PER_CITY') || 15);
  const useWebSearch = String(getEnv('EVENT_SCRAPER_USE_WEB_SEARCH') || '').toLowerCase() === 'true';

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            name: { type: 'string' },
            city: { type: 'string' },
            venue_name: { type: 'string' },
            address: { type: 'string' },
            date_time: { type: 'string' },
            description: { type: 'string' },
            event_type: { type: 'string' },
            ticket_url: { type: 'string' },
            source_url: { type: 'string' },
          },
          required: ['name', 'city', 'date_time', 'source_url'],
        },
      },
    },
    required: ['events'],
  };

  const prompt = buildEventResearchPrompt({ cities, daysAhead, maxPerCity });

  // Primary attempt: Chat Completions with JSON schema response_format.
  // This is widely supported and avoids hard dependency on web-search tooling.
  const chatBody = {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'event_list',
        schema,
      },
    },
  };

  try {
    const payload = await openaiPostJson({
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey,
      body: chatBody,
    });

    const content = payload?.choices?.[0]?.message?.content;
    const parsed = extractJsonFromText(content);
    const events = coerceArray(parsed?.events);
    return { ok: true, events, mode: 'openai_chat' };
  } catch (e) {
    // Optional best-effort: Responses API with web search (only if enabled).
    if (!useWebSearch) {
      return { ok: false, error: e?.message || String(e) };
    }

    try {
      const responsesBody = {
        model,
        input: prompt,
        // Best-effort tool; if the account/model doesn't support it, this call may fail.
        tools: [{ type: 'web_search_preview' }],
        text: {
          format: {
            type: 'json_schema',
            name: 'event_list',
            schema,
          },
        },
      };

      const payload = await openaiPostJson({
        url: 'https://api.openai.com/v1/responses',
        apiKey,
        body: responsesBody,
      });

      const outputText = payload?.output_text;
      const parsed = extractJsonFromText(outputText);
      const events = coerceArray(parsed?.events);
      return { ok: true, events, mode: 'openai_responses_web_search' };
    } catch (e2) {
      return { ok: false, error: e2?.message || e?.message || String(e2) };
    }
  }
};
