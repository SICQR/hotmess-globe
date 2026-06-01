/**
 * /api/cron/shopify-auto-publish
 *
 * Purpose: auto-tick the "hotmess headless" (or any headless/storefront) sales
 * channel on newly added Shopify products so they appear in the app without
 * Phil having to manually tick the channel in Shopify Admin.
 *
 * Trigger: Vercel Cron — every 15 minutes (see vercel.json).
 *
 * Why this exists: Phil flagged "I added a new product to Shopify expecting
 * it to show in the shop but it didn't happen" (#463). Root cause: new products
 * in Shopify default to the channels you have ticked, and the "hotmess headless"
 * publication (which the app's Storefront API token reads from) was NOT in the
 * default-publish set. Manual ticking per product is a Phil-tax we kill here.
 *
 * Algorithm:
 *   1. Query Shopify Admin GraphQL for the publication whose name contains
 *      "headless" (case-insensitive) — discovered dynamically so no env var
 *      needs maintaining. If multiple, picks the first; logs the choice.
 *   2. Query products created in the last 7 days (window safety net — older
 *      drift would have been hit by a prior run) along with their publication
 *      state for that headless publication via `publishedOnPublication`.
 *   3. For each product NOT published there, call `publishablePublish`.
 *   4. Return summary { discovered_publication, scanned, already_published,
 *      newly_published, errors }. Logs to Vercel observability.
 *
 * Auth: protected by Vercel cron — checks `Authorization: Bearer ${CRON_SECRET}`
 * header that Vercel attaches automatically when running scheduled crons. Manual
 * calls require the same bearer. No user auth.
 *
 * Env required:
 *   - SHOPIFY_SHOP_DOMAIN (or SHOPIFY_STORE_DOMAIN / SHOPIFY_STORE_URL / SHOPIFY_DOMAIN)
 *   - SHOPIFY_ADMIN_ACCESS_TOKEN (or SHOPIFY_ACCESS_TOKEN) — must have write_publications scope
 *   - CRON_SECRET — Vercel-managed
 *
 * Fail modes (each returns 2xx with an error in the body so Vercel doesn't
 * page the cron as failed — drift is a soft condition, not infra failure):
 *   - Missing env: returns { ok: false, skipped: "env_missing", details }
 *   - No headless publication found: returns { ok: false, skipped: "no_headless_publication" }
 *   - Admin token doesn't have write_publications: surfaced in `errors[]`
 */

import { getEnv, json, normalizeShopDomain } from '../shopify/_utils.js';

const API_VERSION = '2024-10';

const adminFetch = async ({ shopDomain, token, query, variables }) => {
  const endpoint = `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });
  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = payload?.errors?.[0]?.message || resp.statusText;
    const err = new Error(`Shopify Admin API: ${msg}`);
    err.status = resp.status;
    err.payload = payload;
    throw err;
  }
  if (payload?.errors?.length) {
    const err = new Error(payload.errors[0]?.message || 'Shopify Admin API error');
    err.status = 502;
    err.payload = payload;
    throw err;
  }
  return payload?.data || null;
};

const findHeadlessPublication = async ({ shopDomain, token }) => {
  const query = `#graphql
    query {
      publications(first: 25) {
        nodes { id name }
      }
    }
  `;
  const data = await adminFetch({ shopDomain, token, query });
  const nodes = data?.publications?.nodes || [];
  // Prefer exact substring "headless"; fall back to "hydrogen" / "storefront api"
  const prefer = ['headless', 'hydrogen', 'storefront'];
  for (const needle of prefer) {
    const hit = nodes.find((p) => String(p.name || '').toLowerCase().includes(needle));
    if (hit) return { ...hit, matched_on: needle };
  }
  return null;
};

const fetchRecentProductsWithStatus = async ({ shopDomain, token, publicationId }) => {
  // Created in the last 7 days. Window is a safety net; with cron at */15 the
  // typical lag from a Phil-add to publish is < 15 min.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const query = `#graphql
    query ProductsSince($q: String!, $first: Int!, $publicationId: ID!) {
      products(first: $first, query: $q, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          status
          publishedOnPublication(publicationId: $publicationId)
        }
      }
    }
  `;
  const variables = {
    q: `created_at:>=${since}`,
    first: 50,
    publicationId,
  };
  const data = await adminFetch({ shopDomain, token, query, variables });
  return data?.products?.nodes || [];
};

const publishProduct = async ({ shopDomain, token, productId, publicationId }) => {
  const mutation = `#graphql
    mutation PublishToHeadless($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }
  `;
  const variables = {
    id: productId,
    input: [{ publicationId }],
  };
  const data = await adminFetch({ shopDomain, token, query: mutation, variables });
  const errors = data?.publishablePublish?.userErrors || [];
  return { ok: errors.length === 0, errors };
};

const verifyCronAuth = (req) => {
  const expected = getEnv('CRON_SECRET');
  if (!expected) return { ok: true, skipped_auth_check: true }; // local dev / not configured
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const provided = String(header).replace(/^Bearer\s+/i, '');
  return { ok: provided === expected };
};

export default async function handler(req, res) {
  // Allow GET (Vercel cron) and POST (manual triggers); reject anything else.
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const auth = verifyCronAuth(req);
  if (!auth.ok) {
    return json(res, 401, { error: 'Unauthorized', details: 'Missing or invalid CRON_SECRET bearer' });
  }

  const shopDomain = normalizeShopDomain(
    getEnv('SHOPIFY_SHOP_DOMAIN', ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_STORE_URL', 'SHOPIFY_DOMAIN'])
  );
  const adminToken = getEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', ['SHOPIFY_ACCESS_TOKEN']);

  if (!shopDomain || !adminToken) {
    // Soft fail — return 200 so cron isn't paged. Drift is fixable without infra.
    return json(res, 200, {
      ok: false,
      skipped: 'env_missing',
      details: 'SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN required',
      env_present: {
        shop_domain: !!shopDomain,
        admin_token: !!adminToken,
      },
    });
  }

  try {
    // Step 1: discover the headless publication
    const publication = await findHeadlessPublication({ shopDomain, token: adminToken });
    if (!publication) {
      return json(res, 200, {
        ok: false,
        skipped: 'no_headless_publication',
        details:
          'No publication name matched "headless", "hydrogen" or "storefront". ' +
          'Confirm the app sales channel exists in Shopify Admin.',
      });
    }

    // Step 2: list recent products and their publication status
    const products = await fetchRecentProductsWithStatus({
      shopDomain,
      token: adminToken,
      publicationId: publication.id,
    });

    const alreadyPublished = products.filter((p) => p.publishedOnPublication === true);
    const needsPublish = products.filter(
      (p) => p.publishedOnPublication !== true && p.status === 'ACTIVE'
    );

    // Step 3: publish the missing ones
    const newly_published = [];
    const errors = [];

    for (const p of needsPublish) {
      try {
        const result = await publishProduct({
          shopDomain,
          token: adminToken,
          productId: p.id,
          publicationId: publication.id,
        });
        if (result.ok) {
          newly_published.push({ handle: p.handle, title: p.title });
        } else {
          errors.push({ handle: p.handle, userErrors: result.errors });
        }
      } catch (err) {
        errors.push({ handle: p.handle, error: err?.message || 'unknown' });
      }
    }

    const summary = {
      ok: true,
      ran_at: new Date().toISOString(),
      discovered_publication: {
        id: publication.id,
        name: publication.name,
        matched_on: publication.matched_on,
      },
      scanned: products.length,
      already_published: alreadyPublished.length,
      newly_published_count: newly_published.length,
      newly_published,
      errors_count: errors.length,
      errors,
    };

    // Vercel observability
    if (newly_published.length > 0 || errors.length > 0) {
      console.log('[shopify-auto-publish]', JSON.stringify(summary));
    }

    return json(res, 200, summary);
  } catch (error) {
    // Even errors return 200 — Vercel cron status should reflect infra health,
    // not Shopify drift state.
    console.error('[shopify-auto-publish] error:', error);
    return json(res, 200, {
      ok: false,
      error: error?.message || 'unknown',
      ran_at: new Date().toISOString(),
    });
  }
}
