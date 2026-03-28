import { getBearerToken, getEnv, json, readJsonBody } from '../shopify/_utils.js';
import { createSupabaseClients, getAuthedEmail, isAdminUser } from './_admin.js';
import { fetchEventsFromConfiguredSources, generateEventsWithOpenAI, toBeaconRow } from './_scrape.js';

const coerceArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCities = (value) => {
  const cities = coerceArray(value)
    .map((c) => String(c || '').trim())
    .filter(Boolean);
  return Array.from(new Set(cities));
};

const findExistingBeaconId = async ({ serviceClient, city, title, eventDateIso }) => {
  // Minimal dedupe key: kind + city + title + event_date
  const { data, error } = await serviceClient
    .from('Beacon')
    .select('id')
    .eq('kind', 'event')
    .eq('city', city)
    .eq('title', title)
    .eq('event_date', eventDateIso)
    .limit(1);

  if (error) return { id: null, error };
  const row = Array.isArray(data) ? data[0] : null;
  return { id: row?.id || null, error: null };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json(res, 500, {
      error: 'Supabase server env not configured',
      details: 'Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in server env.',
    });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing Authorization bearer token' });
  }

  const { anonClient, serviceClient } = createSupabaseClients({
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  });

  const { email } = await getAuthedEmail({ anonClient, accessToken });
  if (!email) {
    return json(res, 401, { error: 'Invalid auth token' });
  }

  const adminOk = await isAdminUser({ anonClient, serviceClient, accessToken, email });
  if (!adminOk) {
    return json(res, 403, { error: 'Admin required' });
  }

  const body = (await readJsonBody(req)) || {};
  const cities = normalizeCities(body.cities || ['London', 'Manchester', 'Brighton']);
  const daysAhead = Number.isFinite(Number(body.daysAhead)) ? Number(body.daysAhead) : 14;
  const dryRun = !!body.dryRun;
  const runId = crypto.randomUUID();

  // Log run start
  await serviceClient.from('event_scraper_runs').insert({
    id: runId,
    status: 'running',
    mode: body.events ? 'manual' : 'sources',
    target_cities: cities,
    initiator: `admin:${email}`,
  });

  // Source events can be supplied directly (recommended if you have your own scraper)
  // OR fetched from configured JSON sources (EVENT_SCRAPER_SOURCES_JSON).
  let events = coerceArray(body.events);
  const sourceErrors = [];

  if (!events.length) {
    const fetched = await fetchEventsFromConfiguredSources({ cities, daysAhead, serviceClient });
    if (fetched.ok) {
      events = fetched.events;
      sourceErrors.push(...(fetched.errors || []));
    } else {
      const generated = await generateEventsWithOpenAI({ cities, daysAhead });
      if (!generated.ok) {
        return json(res, 400, {
          success: false,
          error:
            'No events supplied and no configured sources. Provide body.events[], set EVENT_SCRAPER_SOURCES_JSON, or set OPENAI_API_KEY to enable LLM generation.',
          details: { sources: fetched.error, llm: generated.error },
        });
      }
      events = generated.events;
      sourceErrors.push(`LLM_MODE:${generated.mode || 'openai'}`);
    }
  }

  const results = {
    created: 0,
    updated: 0,
    errors: [],
    sourceErrors,
    dryRun,
  };

  const now = Date.now();
  const maxEventDate = now + daysAhead * 24 * 60 * 60 * 1000;

  for (const rawEvent of events) {
    const row = toBeaconRow(rawEvent);

    if (!row.title || !row.city || !row.event_date) {
      results.errors.push(
        `Invalid event (missing title/city/event_date): ${JSON.stringify({
          title: row.title,
          city: row.city,
          event_date: row.event_date,
        })}`
      );
      continue;
    }

    const eventMs = Date.parse(row.event_date);
    if (!Number.isFinite(eventMs) || eventMs > maxEventDate) {
      // Skip far-future or unparsable dates
      continue;
    }

    try {
      const existing = await findExistingBeaconId({
        serviceClient,
        city: row.city,
        title: row.title,
        eventDateIso: row.event_date,
      });

      if (existing.error) {
        throw existing.error;
      }

      if (dryRun) {
        if (existing.id) results.updated++;
        else results.created++;
        continue;
      }

      if (existing.id) {
        const { error } = await serviceClient.from('Beacon').update(row).eq('id', existing.id);
        if (error) throw error;
        results.updated++;
      } else {
        const { error } = await serviceClient.from('Beacon').insert(row);
        if (error) throw error;
        results.created++;
      }
    } catch (e) {
      results.errors.push(`Failed to upsert ${row.title} (${row.city}): ${e?.message || String(e)}`);
    }
  }

  // Update run log
  await serviceClient.from('event_scraper_runs').update({
    status: results.errors.length === 0 ? 'completed' : 'partial',
    finished_at: new Date().toISOString(),
    events_found: events.length,
    events_created: results.created,
    events_updated: results.updated,
    error_count: results.errors.length + results.sourceErrors.length,
    logs: results.errors,
  }).eq('id', runId);

  return json(res, 200, {
    success: results.errors.length === 0,
    message: `Processed events for ${cities.join(', ')}`,
    results,
  });
}
