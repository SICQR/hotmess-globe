import { getEnv, getQueryParam, json, readJsonBody } from '../shopify/_utils.js';
import { createClient } from '@supabase/supabase-js';
import { fetchEventsFromConfiguredSources, generateEventsWithOpenAI, toBeaconRow } from './_scrape.js';

const coerceArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCities = (value) => {
  const cities = coerceArray(value)
    .map((c) => String(c || '').trim())
    .filter(Boolean);
  return Array.from(new Set(cities));
};

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const isVercelCronRequest = (req) => {
  const cronHeader = req.headers?.['x-vercel-cron'];
  return cronHeader === '1' || cronHeader === 1 || cronHeader === true;
};

const isAuthorizedCron = (req) => {
  const secret = getEnv('EVENT_SCRAPER_CRON_SECRET');
  const onVercel = isRunningOnVercel();
  const allowVercelCron = onVercel && isVercelCronRequest(req);
  const isPreview = process.env.VERCEL_ENV === 'preview';

  // Best practice:
  // - scheduled runs: allow Vercel Cron header
  // - manual/admin runs: allow secret (header or query)
  // - preview deployments: allow for testing (no secret required)
  
  // Allow Vercel Cron header always
  if (allowVercelCron) return true;
  
  // Allow preview deployments for testing
  if (isPreview) return true;
  
  // If a secret is configured, allow with valid secret
  if (secret) {
    const header = req.headers?.authorization || req.headers?.Authorization;
    const match = header && String(header).match(/^Bearer\s+(.+)$/i);
    const headerToken = match?.[1] || null;
    const queryToken = getQueryParam(req, 'secret');
    return headerToken === secret || queryToken === secret;
  }

  // Local/dev: allow for convenience
  if (!onVercel) return true;
  
  return false;
};

const findExistingBeaconId = async ({ serviceClient, city, title, eventDateIso }) => {
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
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!isAuthorizedCron(req)) {
    return json(res, 401, {
      error: 'Unauthorized',
      details:
        'Run via Vercel Cron (x-vercel-cron header) or set EVENT_SCRAPER_CRON_SECRET and call with ?secret=... or Authorization: Bearer ...',
    });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(res, 500, {
      error: 'Supabase server env not configured',
      details: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server env.',
    });
  }

  const body = (await readJsonBody(req)) || {};
  const cities = normalizeCities(body.cities || ['London', 'Manchester', 'Brighton']);
  const daysAhead = Number.isFinite(Number(body.daysAhead)) ? Number(body.daysAhead) : 14;
  const dryRun = !!body.dryRun;

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let events = coerceArray(body.events);
  const sourceErrors = [];
  const runId = crypto.randomUUID();

  // Log run start
  await serviceClient.from('event_scraper_runs').insert({
    id: runId,
    status: 'running',
    mode: body.events ? 'manual' : 'cron',
    target_cities: cities,
    initiator: 'cron',
  });

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
            'No events supplied and no configured sources. Set EVENT_SCRAPER_SOURCES_JSON or set OPENAI_API_KEY to enable LLM generation.',
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
    if (!Number.isFinite(eventMs) || eventMs > maxEventDate) continue;

    try {
      const existing = await findExistingBeaconId({
        serviceClient,
        city: row.city,
        title: row.title,
        eventDateIso: row.event_date,
      });

      if (existing.error) throw existing.error;

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
    message: 'Cron scrape complete',
    results,
  });
}
