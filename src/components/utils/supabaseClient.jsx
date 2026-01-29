import { createClient } from '@supabase/supabase-js';

// Helper to create page URLs - matches Base44 pattern
const createPageUrl = (pageName) => `/${pageName}`;

// Vercel–Supabase integration sets NEXT_PUBLIC_SUPABASE_*; we also support VITE_*.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.vite_publicSUPABASE_URL ||
  '';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.vite_publicSUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[supabase] Missing Supabase env. Use VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, ' +
    'or connect via Vercel ↔ Supabase (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).'
  );
}

// If env vars are missing, createClient still needs a URL/key.
// Use a clearly-invalid URL so failures are obvious and debuggable.
// Singleton pattern: prevent multiple instances in HMR/dev mode
let _supabaseInstance = null;

export const supabase = (() => {
  if (_supabaseInstance) return _supabaseInstance;
  
  _supabaseInstance = createClient(
    supabaseUrl || 'http://invalid.localhost',
    supabaseKey || 'invalid-anon-key',
    {
      auth: {
        storageKey: 'sb-axxwdjmbwkvqhcpwsters-auth-token', // Unique per project
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
  
  return _supabaseInstance;
})();

const safeArray = (value) => (Array.isArray(value) ? value : []);

const SHOPIFY_SELLER_EMAIL = 'shopify@hotmess.london';

const isDevRuntime = import.meta.env.MODE === 'development' || import.meta.env.DEV;

const fakeFromSchema = (schema) => {
  if (!schema || typeof schema !== 'object') return null;

  const type = schema.type;
  if (type === 'string') return '';
  if (type === 'number') return 0;
  if (type === 'integer') return 0;
  if (type === 'boolean') return true;
  if (type === 'array') return [];

  if (type === 'object') {
    const props = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
    const out = {};
    for (const [key, value] of Object.entries(props)) {
      out[key] = fakeFromSchema(value);
    }
    return out;
  }

  return null;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeProductDetails = (details) => {
  if (!details) return {};
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const getShopifyDedupeKey = (product) => {
  const sellerEmail = normalizeEmail(product?.seller_email);
  const details = normalizeProductDetails(product?.details);

  // Dedupe should ONLY apply to Shopify-imported products.
  // Do not use tags/category heuristics here, otherwise unrelated products can be collapsed.
  const isShopifyLike =
    sellerEmail === SHOPIFY_SELLER_EMAIL ||
    !!details?.shopify_id ||
    !!details?.shopify_handle ||
    !!details?.shopify_variant_id;

  if (!isShopifyLike) return null;

  const shopifyId = details?.shopify_id ? String(details.shopify_id) : null;
  const handle = details?.shopify_handle ? String(details.shopify_handle) : null;

  if (shopifyId) return `shopify:id:${shopifyId}`;
  if (handle) return `shopify:handle:${handle}`;

  // Last resort: fall back to a name-based key so we don't spam duplicates
  // if older rows were imported without details.
  const name = String(product?.name || '').trim().toLowerCase();
  return name ? `shopify:name:${name}` : null;
};

const pickPreferredProduct = (current, candidate) => {
  if (!current) return candidate;
  if (!candidate) return current;

  const currentImages = Array.isArray(current.image_urls) ? current.image_urls.length : 0;
  const candidateImages = Array.isArray(candidate.image_urls) ? candidate.image_urls.length : 0;
  if (candidateImages > currentImages) return candidate;
  if (currentImages > candidateImages) return current;

  const currentUpdated = Date.parse(current.updated_at || current.updated_date || current.created_at || current.created_date || 0) || 0;
  const candidateUpdated = Date.parse(candidate.updated_at || candidate.updated_date || candidate.created_at || candidate.created_date || 0) || 0;
  return candidateUpdated > currentUpdated ? candidate : current;
};

const dedupeProducts = (rows) => {
  const products = safeArray(rows);
  if (!products.length) return products;

  const byKey = new Map();
  const order = [];

  for (const product of products) {
    const key = getShopifyDedupeKey(product);
    if (!key) {
      order.push({ key: null, product });
      continue;
    }

    if (!byKey.has(key)) {
      byKey.set(key, product);
      order.push({ key, product: null });
      continue;
    }

    const preferred = pickPreferredProduct(byKey.get(key), product);
    byKey.set(key, preferred);
  }

  const out = [];
  for (const item of order) {
    if (!item.key) out.push(item.product);
    else out.push(byKey.get(item.key));
  }

  // Ensure we don't emit the same object twice if multiple duplicates existed.
  const seenIds = new Set();
  return out.filter((p) => {
    const id = p?.id ? String(p.id) : null;
    if (!id) return true;
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
};

const isMissingTableError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  // PostgREST missing table/view: "Could not find the table ... in the schema cache".
  // This commonly surfaces as `PGRST205`.
  if (code === 'PGRST205') return true;

  // Postgres missing relation.
  if (code === '42P01') return true;

  return (
    error?.status === 404 ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
};

const isMissingColumnError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  // PostgREST missing column: "Could not find the 'col' column of 'table' in the schema cache".
  // This commonly surfaces as `PGRST204`.
  if (code === 'PGRST204') return true;

  // Postgres missing column.
  if (code === '42703') return true;

  return (
    message.includes('could not find') &&
    message.includes('column')
  ) || (
    message.includes('column') &&
    message.includes('does not exist')
  );
};

const getMissingColumnName = (error) => {
  const message = String(error?.message || '');

  // PostgREST: "Could not find the 'capacity' column of 'beacons' in the schema cache"
  let match = message.match(/Could not find the '([^']+)' column/i);
  if (match?.[1]) return match[1];

  // Postgres: "column beacons.organizer_email does not exist"
  match = message.match(/column\s+[^.]+\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (match?.[1]) return match[1];

  return null;
};

const runWithTableOrColumnFallback = async (tables, buildQuery) => {
  for (let i = 0; i < tables.length; i += 1) {
    const table = tables[i];
    try {
      const { data, error } = await buildQuery(table);
      if (!error) return { data, table };
      if ((isMissingTableError(error) || isMissingColumnError(error)) && i < tables.length - 1) {
        continue;
      }
      throw error;
    } catch (error) {
      if ((isMissingTableError(error) || isMissingColumnError(error)) && i < tables.length - 1) {
        continue;
      }
      throw error;
    }
  }
  return { data: null, table: tables[0] };
};

const stripUnknownColumnsAndRetry = async ({ payload, requiredKeys = [], attempt }) => {
  const required = new Set(requiredKeys);
  let working = { ...(payload || {}) };

  for (let i = 0; i < 6; i += 1) {
    const { data, error } = await attempt(working);
    if (!error) return { data, payload: working };

    if (!isMissingColumnError(error)) throw error;
    const missing = getMissingColumnName(error);
    if (!missing || !(missing in working) || required.has(missing)) throw error;

    delete working[missing];
  }

  throw new Error('Failed after stripping unknown columns');
};

const loggedOnce = new Set();
const warnOnce = (key, ...args) => {
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  // Keep this quiet: we only want one breadcrumb per missing table.
  console.warn(...args);
};

const runWithTableFallback = async (tables, buildQuery) => {
  for (let i = 0; i < tables.length; i += 1) {
    const table = tables[i];
    const { data, error } = await buildQuery(table);
    if (!error) return { data, table };
    if (!isMissingTableError(error) || i === tables.length - 1) throw error;
  }
  return { data: null, table: tables[0] };
};

const USER_TABLES = ['User', 'users'];
const BEACON_TABLES = ['Beacon', 'beacons'];
const AUDIO_METADATA_TABLES = ['audio_metadata', 'AudioMetadata'];
const CITY_TABLES = ['cities', 'City'];
const USER_INTENT_TABLES = ['user_intents', 'UserIntent'];
const USER_ACTIVITY_TABLES = ['user_activities', 'UserActivity'];

const isUniqueViolationError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  return code === '23505';
};

const stripUndefinedKeys = (obj) => {
  const out = { ...(obj || {}) };
  Object.keys(out).forEach((key) => {
    if (out[key] === undefined) delete out[key];
  });
  return out;
};

const ensureUserProfileRow = async ({ user, seed = {} }) => {
  const email = normalizeEmail(user?.email);
  const authUserId = user?.id ? String(user.id) : null;
  if (!email || !authUserId) return null;

  const nowIso = new Date().toISOString();
  const baseSeed = stripUndefinedKeys(seed);

  for (let i = 0; i < USER_TABLES.length; i += 1) {
    const table = USER_TABLES[i];

    try {
      const { data: existing, error: existingError } = await supabase
        .from(table)
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        // If this is a legacy row missing auth_user_id, link it.
        if (!existing?.auth_user_id) {
          const updatePayload = stripUndefinedKeys({
            ...baseSeed,
            auth_user_id: authUserId,
            updated_at: nowIso,
            updated_date: nowIso,
          });

          const attempt = async (payload) => {
            const { data, error } = await supabase
              .from(table)
              .update(payload)
              .eq('email', email)
              .select()
              .maybeSingle();
            return { data, error };
          };

          try {
            const { data } = await stripUnknownColumnsAndRetry({
              payload: updatePayload,
              requiredKeys: [],
              attempt,
            });
            return data || existing;
          } catch {
            return existing;
          }
        }

        return existing;
      }

      const insertPayload = stripUndefinedKeys({
        email,
        auth_user_id: authUserId,
        ...baseSeed,
        created_at: nowIso,
        created_date: nowIso,
        updated_at: nowIso,
        updated_date: nowIso,
      });

      const attempt = async (payload) => {
        const { data, error } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single();
        return { data, error };
      };

      try {
        const { data } = await stripUnknownColumnsAndRetry({
          payload: insertPayload,
          requiredKeys: ['email'],
          attempt,
        });

        return data || null;
      } catch (insertError) {
        // If another client created the row concurrently, re-select and continue.
        if (isUniqueViolationError(insertError)) {
          const { data: row } = await supabase
            .from(table)
            .select('*')
            .eq('email', email)
            .maybeSingle();
          if (row) return row;
        }
        throw insertError;
      }
    } catch (error) {
      const canRetryNext = i < USER_TABLES.length - 1;
      if ((isMissingTableError(error) || isMissingColumnError(error)) && canRetryNext) {
        continue;
      }
      // Non-fatal: profile creation is best-effort.
      return null;
    }
  }

  return null;
};

// Base44-compatible API wrapper
export const base44 = {
  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      // Base44 pages frequently call `me()` on boot to decide whether to show
      // logged-in UI. Returning `null` keeps that flow clean and avoids
      // noisy console errors when browsing unauthenticated.
      if (error || !user) return null;

      // Back-compat for older schema/table naming:
      // - Some migrations create public."User" and store auth user id in auth_user_id.
      // - Older code used public.users keyed by id.
      let profile = null;
      try {
        const result = await runWithTableFallback(USER_TABLES, (table) =>
          supabase
            .from(table)
            .select('*')
            .eq('email', user.email)
            .maybeSingle()
        );
        profile = result?.data ?? null;
      } catch (profileError) {
        // If RLS/policies are missing, don't hard-fail auth; fall back to auth user + metadata.
        console.warn('[base44.auth.me] Profile table unavailable; using auth user metadata only', profileError);
      }

      // Ensure a profile row exists (best-effort). This prevents downstream lookups
      // (e.g. /api/profile?uid=authUid) from returning 404 for newly-created users.
      if (!profile) {
        try {
          profile = await ensureUserProfileRow({
            user,
            seed: {
              full_name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
            },
          });
        } catch {
          // ignore
        }
      }

      return {
        ...user,
        ...(profile || {}),
        ...(user.user_metadata || {}),
        // Always preserve the Supabase auth UID even if profile tables also have an `id`.
        auth_user_id: user.id,
        email: user.email || profile?.email,
      };
    },
    
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    
    updateMe: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Always persist to auth user metadata so gates can rely on it even if
      // public.User/public.users tables or RLS policies are missing.
      const { data: updatedAuth, error: authUpdateError } = await supabase.auth.updateUser({
        data: { ...(data || {}) },
      });
      if (authUpdateError) throw authUpdateError;

      const nowIso = new Date().toISOString();
      try {
        // Ensure a profile row exists before updating (best-effort).
        await ensureUserProfileRow({
          user,
          seed: {
            full_name: data?.full_name ?? user.user_metadata?.full_name,
            avatar_url: data?.avatar_url ?? user.user_metadata?.avatar_url,
          },
        });

        const { data: updatedProfile } = await runWithTableFallback(USER_TABLES, (table) =>
          supabase
            .from(table)
            .update({ ...data, updated_at: nowIso, updated_date: nowIso })
            .eq('email', user.email)
            .select()
            .single()
        );

        return {
          ...(updatedAuth?.user || user),
          ...(updatedProfile || {}),
          ...((updatedAuth?.user?.user_metadata || {}) ?? {}),
          email: user.email,
        };
      } catch (profileError) {
        console.warn('[base44.auth.updateMe] Profile table update failed; kept auth metadata update', profileError);
        return {
          ...(updatedAuth?.user || user),
          ...((updatedAuth?.user?.user_metadata || {}) ?? {}),
          email: user.email,
        };
      }
    },
    
    logout: async (redirectUrl) => {
      await supabase.auth.signOut();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.reload();
      }
    },
    
    redirectToLogin: (nextUrl) => {
      window.location.href = createPageUrl('Auth') + (nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : '');
    }
  },
  
  entities: {
    User: {
      list: async (orderBy = '-created_date', limit) => {
        const run = async (table) => {
          let query = supabase.from(table).select('*');

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          return query;
        };

        try {
          const { data } = await runWithTableFallback(USER_TABLES, run);
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.User.list] Failed, returning []', error);
          return [];
        }
      },

      filter: async (filters, orderBy, limit) => {
        const run = async (table) => {
          let query = supabase.from(table).select('*');

          Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          return query;
        };

        try {
          const { data } = await runWithTableFallback(USER_TABLES, run);
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.User.filter] Failed, returning []', error);
          return [];
        }
      },

      create: async (data) => {
        const nowIso = new Date().toISOString();
        const { data: created } = await runWithTableFallback(USER_TABLES, (table) =>
          supabase
            .from(table)
            .insert({ ...data, created_at: nowIso, created_date: nowIso, updated_at: nowIso, updated_date: nowIso })
            .select()
            .single()
        );
        return created;
      },

      update: async (id, data) => {
        const nowIso = new Date().toISOString();
        const { data: updated } = await runWithTableFallback(USER_TABLES, (table) =>
          supabase
            .from(table)
            .update({ ...data, updated_at: nowIso, updated_date: nowIso })
            .eq('id', id)
            .select()
            .single()
        );
        return updated;
      },

      delete: async (id) => {
        await runWithTableFallback(USER_TABLES, (table) => supabase.from(table).delete().eq('id', id));
      },
    },

    Beacon: {
      list: async (orderBy = '-created_date', limit) => {
        const run = async (table) => {
          let query = supabase.from(table).select('*');
        
          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          return query;
        };

        try {
          const tryList = async (table, orderByOverride) => {
            const finalOrderBy = orderByOverride ?? orderBy;
            let query = supabase.from(table).select('*');
            if (finalOrderBy) {
              const desc = finalOrderBy.startsWith('-');
              const column = desc ? finalOrderBy.slice(1) : finalOrderBy;
              query = query.order(column, { ascending: !desc });
            }
            if (limit) query = query.limit(limit);
            return query;
          };

          try {
            const { data } = await runWithTableOrColumnFallback(BEACON_TABLES, (table) => tryList(table));
            return safeArray(data);
          } catch (error) {
            // Back-compat: some tables use created_at instead of created_date.
            const message = String(error?.message || '').toLowerCase();
            if (orderBy?.includes('created_date') && message.includes('column')) {
              const { data } = await runWithTableOrColumnFallback(BEACON_TABLES, (table) =>
                tryList(table, orderBy.replace('created_date', 'created_at'))
              );
              return safeArray(data);
            }
            throw error;
          }
        } catch (error) {
          console.error('[base44.entities.Beacon.list] Failed, returning []', error);
          return [];
        }
      },
      
      filter: async (filters, orderBy, limit) => {
        try {
          const safeFilters = filters && typeof filters === 'object' ? { ...filters } : {};

          const run = async (table, overrides = {}) => {
            let query = supabase.from(table).select('*');

            const merged = { ...safeFilters, ...(overrides.filters || {}) };
            Object.entries(merged || {}).forEach(([key, value]) => {
              query = query.eq(key, value);
            });

            const finalOrderBy = overrides.orderBy ?? orderBy;
            if (finalOrderBy) {
              const desc = finalOrderBy.startsWith('-');
              const column = desc ? finalOrderBy.slice(1) : finalOrderBy;
              query = query.order(column, { ascending: !desc });
            }

            if (limit) query = query.limit(limit);
            return query;
          };

          try {
            const { data } = await runWithTableOrColumnFallback(BEACON_TABLES, (table) => run(table));
            return safeArray(data);
          } catch (error) {
            // Back-compat: created_date vs created_at
            const message = String(error?.message || '').toLowerCase();
            if (orderBy?.includes('created_date') && message.includes('column')) {
              const { data } = await runWithTableOrColumnFallback(BEACON_TABLES, (table) =>
                run(table, { orderBy: orderBy.replace('created_date', 'created_at') })
              );
              return safeArray(data);
            }
            throw error;
          }
        } catch (error) {
          console.error('[base44.entities.Beacon.filter] Failed, returning []', error);
          return [];
        }
      },
      
      create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        const basePayload = { ...(data || {}) };

        const requiredKeys = ['title', 'kind'];

        const { data: created } = await runWithTableOrColumnFallback(BEACON_TABLES, async (table) => {
          const tablePayload =
            table === 'Beacon'
              ? { ...basePayload, owner_email: user?.email }
              : { ...basePayload, created_by: user?.email };

          const attempt = async (payload) => {
            const { data, error } = await supabase.from(table).insert(payload).select().single();
            return { data, error };
          };

          const result = await stripUnknownColumnsAndRetry({
            payload: tablePayload,
            requiredKeys,
            attempt,
          });

          return { data: result.data, error: null };
        });

        return created;
      },
      
      update: async (id, data) => {
        const nowIso = new Date().toISOString();
        const basePayload = { ...(data || {}), updated_at: nowIso, updated_date: nowIso };

        const { data: updated } = await runWithTableOrColumnFallback(BEACON_TABLES, async (table) => {
          const attempt = async (payload) => {
            const { data, error } = await supabase
              .from(table)
              .update(payload)
              .eq('id', id)
              .select()
              .single();
            return { data, error };
          };

          const result = await stripUnknownColumnsAndRetry({
            payload: basePayload,
            requiredKeys: [],
            attempt,
          });

          return { data: result.data, error: null };
        });

        return updated;
      },
      
      delete: async (id) => {
        await runWithTableOrColumnFallback(BEACON_TABLES, (table) => supabase.from(table).delete().eq('id', id));
      }
    },

    AudioMetadata: {
      list: async (orderBy = '-created_date', limit) => {
        const run = async (table, orderByOverride) => {
          let query = supabase.from(table).select('*');

          const finalOrderBy = orderByOverride ?? orderBy;
          if (finalOrderBy) {
            const desc = finalOrderBy.startsWith('-');
            const column = desc ? finalOrderBy.slice(1) : finalOrderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          return query;
        };

        try {
          const { data } = await runWithTableFallback(AUDIO_METADATA_TABLES, (table) => run(table));
          return safeArray(data);
        } catch (error) {
          // Common mismatch: order by created_date when table uses created_at.
          const message = (error?.message || '').toLowerCase();
          if (orderBy?.includes('created_date') && message.includes('column')) {
            try {
              const { data } = await runWithTableFallback(AUDIO_METADATA_TABLES, (table) =>
                run(table, orderBy.replace('created_date', 'created_at'))
              );
              return safeArray(data);
            } catch (retryError) {
              console.error('[base44.entities.AudioMetadata.list] Failed, returning []', retryError);
              return [];
            }
          }

          console.error('[base44.entities.AudioMetadata.list] Failed, returning []', error);
          return [];
        }
      },

      filter: async (filters, orderBy, limit) => {
        const run = async (table) => {
          let query = supabase.from(table).select('*');

          Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          return query;
        };

        try {
          const { data } = await runWithTableFallback(AUDIO_METADATA_TABLES, run);
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.AudioMetadata.filter] Failed, returning []', error);
          return [];
        }
      },

      create: async (data) => {
        try {
          const { data: created } = await runWithTableFallback(AUDIO_METADATA_TABLES, (table) =>
            supabase.from(table).insert(data).select().single()
          );
          return created;
        } catch (error) {
          console.error('[base44.entities.AudioMetadata.create] Failed', error);
          throw error;
        }
      },

      update: async (id, data) => {
        const nowIso = new Date().toISOString();
        try {
          const { data: updated } = await runWithTableFallback(AUDIO_METADATA_TABLES, (table) =>
            supabase
              .from(table)
              .update({ ...data, updated_at: nowIso, updated_date: nowIso })
              .eq('id', id)
              .select()
              .single()
          );
          return updated;
        } catch (error) {
          console.error('[base44.entities.AudioMetadata.update] Failed', error);
          throw error;
        }
      },
    },
    
    Product: {
      list: async (orderBy = '-created_at', limit) => {
        let query = supabase.from('products').select('*').eq('status', 'active');
        
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const column = desc ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !desc });
        }
        
        if (limit) query = query.limit(limit);
        
        try {
          const { data, error } = await query;
          if (error) throw error;
          return dedupeProducts(data);
        } catch (error) {
          console.error('[base44.entities.Product.list] Failed, returning []', error);
          return [];
        }
      },
      
      filter: async (filters, orderBy, limit) => {
        let query = supabase.from('products').select('*');
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const column = desc ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !desc });
        }
        
        if (limit) query = query.limit(limit);
        
        try {
          const { data, error } = await query;
          if (error) throw error;
          return dedupeProducts(data);
        } catch (error) {
          console.error('[base44.entities.Product.filter] Failed, returning []', error);
          return [];
        }
      },
      
      create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: created, error } = await supabase
          .from('products')
          .insert({ ...data, created_by: user?.email })
          .select()
          .single();
        
        if (error) throw error;
        return created;
      },
      
      update: async (id, data) => {
        const { data: updated, error } = await supabase
          .from('products')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      },
      
      delete: async (id) => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      }
    },

    City: {
      list: async (orderBy = '-created_date', limit) => {
        try {
          const { data } = await runWithTableFallback(CITY_TABLES, (table) => {
            let query = supabase.from(table).select('*');
            if (orderBy) {
              const desc = orderBy.startsWith('-');
              const column = desc ? orderBy.slice(1) : orderBy;
              query = query.order(column, { ascending: !desc });
            }
            if (limit) query = query.limit(limit);
            return query;
          });
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.City.list] Failed, returning []', error);
          return [];
        }
      },
      filter: async (filters, orderBy, limit) => {
        const safeFilters = filters && typeof filters === 'object' ? filters : {};

        const run = async (table, filterOverrides) => {
          let query = supabase.from(table).select('*');
          Object.entries(filterOverrides || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }
          if (limit) query = query.limit(limit);
          return query;
        };

        try {
          const { data } = await runWithTableFallback(CITY_TABLES, (table) => run(table, safeFilters));
          return safeArray(data);
        } catch (error) {
          // Back-compat: some UI code still filters on `active`, but the `cities` table may not have it.
          if (safeFilters && Object.prototype.hasOwnProperty.call(safeFilters, 'active') && isMissingColumnError(error)) {
            try {
              const retryFilters = { ...safeFilters };
              delete retryFilters.active;
              const { data } = await runWithTableFallback(CITY_TABLES, (table) => run(table, retryFilters));
              return safeArray(data);
            } catch (retryError) {
              console.error('[base44.entities.City.filter] Failed after retry, returning []', retryError);
              return [];
            }
          }

          console.error('[base44.entities.City.filter] Failed, returning []', error);
          return [];
        }
      }
    },

    UserIntent: {
      list: async (orderBy = '-created_date', limit) => {
        try {
          const { data } = await runWithTableFallback(USER_INTENT_TABLES, (table) => {
            let query = supabase.from(table).select('*');
            if (orderBy) {
              const desc = orderBy.startsWith('-');
              const column = desc ? orderBy.slice(1) : orderBy;
              query = query.order(column, { ascending: !desc });
            }
            if (limit) query = query.limit(limit);
            return query;
          });
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.UserIntent.list] Failed, returning []', error);
          return [];
        }
      },
      filter: async (filters, orderBy, limit) => {
        try {
          const { data } = await runWithTableFallback(USER_INTENT_TABLES, (table) => {
            let query = supabase.from(table).select('*');
            Object.entries(filters || {}).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
            if (orderBy) {
              const desc = orderBy.startsWith('-');
              const column = desc ? orderBy.slice(1) : orderBy;
              query = query.order(column, { ascending: !desc });
            }
            if (limit) query = query.limit(limit);
            return query;
          });
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.UserIntent.filter] Failed, returning []', error);
          return [];
        }
      },
      create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: created } = await runWithTableFallback(USER_INTENT_TABLES, (table) =>
          supabase.from(table).insert({ ...data, created_by: user?.email }).select().single()
        );
        return created;
      }
    },

    UserActivity: {
      list: async (orderBy = '-created_date', limit) => {
        try {
          const { data } = await runWithTableFallback(USER_ACTIVITY_TABLES, (table) => {
            let query = supabase.from(table).select('*');
            if (orderBy) {
              const desc = orderBy.startsWith('-');
              const column = desc ? orderBy.slice(1) : orderBy;
              query = query.order(column, { ascending: !desc });
            }
            if (limit) query = query.limit(limit);
            return query;
          });
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.UserActivity.list] Failed, returning []', error);
          return [];
        }
      },
      filter: async (filters, orderBy, limit) => {
        try {
          const { data } = await runWithTableFallback(USER_ACTIVITY_TABLES, (table) => {
            let query = supabase.from(table).select('*');
            Object.entries(filters || {}).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
            if (orderBy) {
              const desc = orderBy.startsWith('-');
              const column = desc ? orderBy.slice(1) : orderBy;
              query = query.order(column, { ascending: !desc });
            }
            if (limit) query = query.limit(limit);
            return query;
          });
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.UserActivity.filter] Failed, returning []', error);
          return [];
        }
      },
      create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: created } = await runWithTableFallback(USER_ACTIVITY_TABLES, (table) =>
          supabase.from(table).insert({ ...data, created_by: user?.email }).select().single()
        );
        return created;
      }
    },

    // Premium content subscriptions
    Subscription: {
      list: async (orderBy = '-created_at', limit) => {
        try {
          let query = supabase.from('subscriptions').select('*');
          
          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          
          const { data } = await query;
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.Subscription.list] Failed, returning []', error);
          return [];
        }
      },

      filter: async (filters, orderBy, limit) => {
        try {
          let query = supabase.from('subscriptions').select('*');

          Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          
          const { data } = await query;
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.Subscription.filter] Failed, returning []', error);
          return [];
        }
      },

      get: async (id) => {
        try {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return data;
        } catch (error) {
          console.error('[base44.entities.Subscription.get] Failed', error);
          return null;
        }
      },

      create: async (data) => {
        const nowIso = new Date().toISOString();
        try {
          const { data: created, error } = await supabase
            .from('subscriptions')
            .insert({ ...data, created_at: nowIso, updated_at: nowIso })
            .select()
            .single();
          
          if (error) throw error;
          return created;
        } catch (error) {
          console.error('[base44.entities.Subscription.create] Failed', error);
          throw error;
        }
      },

      update: async (id, data) => {
        const nowIso = new Date().toISOString();
        try {
          const { data: updated, error } = await supabase
            .from('subscriptions')
            .update({ ...data, updated_at: nowIso })
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          return updated;
        } catch (error) {
          console.error('[base44.entities.Subscription.update] Failed', error);
          throw error;
        }
      },

      delete: async (id) => {
        try {
          await supabase.from('subscriptions').delete().eq('id', id);
        } catch (error) {
          console.error('[base44.entities.Subscription.delete] Failed', error);
          throw error;
        }
      },
    },

    // Premium content unlocks
    PremiumUnlock: {
      list: async (orderBy = '-purchased_at', limit) => {
        try {
          let query = supabase.from('premium_unlocks').select('*');
          
          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          
          const { data } = await query;
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.PremiumUnlock.list] Failed, returning []', error);
          return [];
        }
      },

      filter: async (filters, orderBy, limit) => {
        try {
          let query = supabase.from('premium_unlocks').select('*');

          Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          
          const { data } = await query;
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.PremiumUnlock.filter] Failed, returning []', error);
          return [];
        }
      },

      get: async (id) => {
        try {
          const { data, error } = await supabase
            .from('premium_unlocks')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return data;
        } catch (error) {
          console.error('[base44.entities.PremiumUnlock.get] Failed', error);
          return null;
        }
      },

      create: async (data) => {
        const nowIso = new Date().toISOString();
        try {
          const { data: created, error } = await supabase
            .from('premium_unlocks')
            .insert({ ...data, created_at: nowIso })
            .select()
            .single();
          
          if (error) throw error;
          return created;
        } catch (error) {
          console.error('[base44.entities.PremiumUnlock.create] Failed', error);
          throw error;
        }
      },

      update: async (id, data) => {
        try {
          const { data: updated, error } = await supabase
            .from('premium_unlocks')
            .update(data)
            .eq('id', id)
            .select()
            .single();
          
          if (error) throw error;
          return updated;
        } catch (error) {
          console.error('[base44.entities.PremiumUnlock.update] Failed', error);
          throw error;
        }
      },

      delete: async (id) => {
        try {
          await supabase.from('premium_unlocks').delete().eq('id', id);
        } catch (error) {
          console.error('[base44.entities.PremiumUnlock.delete] Failed', error);
          throw error;
        }
      },
    },

    // Supporting entities for stats - read-only operations
    // These are primarily used for calculating organizer statistics
    BeaconCheckIn: {
      filter: async (filters, orderBy, limit) => {
        try {
          let query = supabase.from('beacon_check_ins').select('*');

          Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          
          const { data } = await query;
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.BeaconCheckIn.filter] Failed, returning []', error);
          return [];
        }
      },
    },

    EventRSVP: {
      filter: async (filters, orderBy, limit) => {
        try {
          let query = supabase.from('event_rsvps').select('*');

          Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const column = desc ? orderBy.slice(1) : orderBy;
            query = query.order(column, { ascending: !desc });
          }

          if (limit) query = query.limit(limit);
          
          const { data } = await query;
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.EventRSVP.filter] Failed, returning []', error);
          return [];
        }
      },
    },
  },
  
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(fileName);
        
        return { file_url: publicUrl };
      },
      
      /**
       * Send email via Vercel API route
       * @param {Object} options - Email options
       * @param {string} options.to - Recipient email address
       * @param {string} options.subject - Email subject
       * @param {string} options.body - Plain text email body
       * @param {string} [options.html] - HTML email body (optional)
       * @returns {Promise<{success: boolean, id?: string}>}
       */
      SendEmail: async ({ to, subject, body, html }) => {
        try {
          const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, subject, body, html }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            console.error('[SendEmail] Failed:', data);
            throw new Error(data.error || 'Failed to send email');
          }
          
          return data;
        } catch (error) {
          console.error('[SendEmail] Error:', error);
          // Don't throw - let the caller handle failures gracefully
          return { success: false, error: error.message };
        }
      },

      InvokeLLM: async (args = {}) => {
        // This repo uses a Supabase-backed Base44 compatibility layer.
        // There is no LLM provider wired by default, so provide a safe fallback.
        // In dev, return deterministic stub outputs to keep flows unblocked.
        // In prod, return a clear message rather than throwing a TypeError.
        const schema = args?.response_json_schema;
        if (schema && isDevRuntime) {
          return fakeFromSchema(schema);
        }

        if (schema) {
          return fakeFromSchema(schema);
        }

        return isDevRuntime
          ? 'AI is not configured in this environment.'
          : 'AI is not available.';
      },
    }
  }
};

// Create entity helpers for all tables
const entityTables = [
  'orders', 'xp_ledger', 'sweat_coins', 'beacon_checkins', 
  'user_achievements', 'achievements', 'user_friendships', 
  'user_follows', 'right_now_status', 'event_rsvps', 'messages',
  'chat_threads', 'squads', 'squad_members', 'user_highlights',
  'profile_views', 'bot_sessions', 'user_vibes', 'notifications',
  'reports', 'user_blocks', 'beacon_comments', 'daily_challenges',
  'challenge_completions',

  // Discovery / taxonomy
  'cities',
  'user_intents',

  // Community
  'community_posts',
  'post_likes',
  'post_comments',

  // Safety
  'trusted_contacts',
  'safety_checkins',
  'notification_outbox',

  // Bookmarks / favorites
  'beacon_bookmarks',
  'product_favorites',

  // Reviews + analytics
  'reviews',
  'marketplace_reviews',
  'product_views',
  'event_views',

  // Gamification
  'user_streaks',
  'venue_kings',
  'seller_ratings',

  // Marketplace cart
  'cart_items',

  // Tags and Tribes
  'user_tags',
  'user_tribes',

  // Social/AI interaction tracking
  'user_interactions',
  'user_tribes',

  // Feed
  'activity_feed',

  // Marketplace / seller tables used by the UI
  'order_items',
  'promotions',
  'seller_payouts',
  'featured_listings',
];

entityTables.forEach(table => {
  const entityName = table.split('_').map((word, i) => 
    i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');

  const normalizeFilterKey = (rawKey) => {
    if (!rawKey || typeof rawKey !== 'string') return rawKey;
    if (!rawKey.includes('.')) return rawKey;
    const parts = rawKey.split('.');
    if (parts.length === 2) return `${parts[0]}->>${parts[1]}`;
    return rawKey;
  };

  const buildOrExpression = (orArray) => {
    if (!Array.isArray(orArray) || !orArray.length) return null;

    const parts = orArray
      .map((clause) => {
        if (!clause || typeof clause !== 'object') return null;
        const entries = Object.entries(clause).filter(([, v]) => v !== undefined && v !== null);
        if (!entries.length) return null;

        const conds = entries.map(([k, v]) => {
          const key = normalizeFilterKey(k);
          if (Array.isArray(v)) {
            const values = v.map((item) => String(item));
            return `${key}.in.(${values.join(',')})`;
          }
          return `${key}.eq.${String(v)}`;
        });

        return conds.length === 1 ? conds[0] : `and(${conds.join(',')})`;
      })
      .filter(Boolean);

    return parts.length ? parts.join(',') : null;
  };
  
  base44.entities[entityName] = {
    list: async (orderBy = '-created_at', limit) => {
      let query = supabase.from(table).select('*');
      
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const column = desc ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !desc });
      }
      
      if (limit) query = query.limit(limit);
      
      try {
        const { data, error } = await query;
        if (error) throw error;
        return safeArray(data);
      } catch (error) {
        if (isMissingTableError(error)) {
          warnOnce(
            `missing-table:${table}:list`,
            `[base44.entities.${entityName}.list] Missing table/view "${table}"; returning []`
          );
          return [];
        }

        console.error(`[base44.entities.${entityName}.list] Failed, returning []`, error);
        return [];
      }
    },
    
    filter: async (filters, orderBy, limit) => {
      let query = supabase.from(table).select('*');

      const safeFilters = filters && typeof filters === 'object' ? filters : {};

      // Base44-style OR support:
      // { $or: [ { col: value }, { other_col: value } ] }
      if (Array.isArray(safeFilters.$or)) {
        const expr = buildOrExpression(safeFilters.$or);
        if (expr) query = query.or(expr);
      }

      const remaining = { ...safeFilters };
      delete remaining.$or;

      Object.entries(remaining).forEach(([rawKey, rawValue]) => {
        // Skip undefined/null values
        if (rawValue === undefined || rawValue === null) return;
        
        const key = normalizeFilterKey(rawKey);

        // Support "IN" filters (e.g. { user_email: ['admin', email] })
        if (Array.isArray(rawValue)) {
          // Only use .in() for arrays of primitives, not arrays of objects
          const hasObjects = rawValue.some(v => v !== null && typeof v === 'object');
          if (hasObjects) {
            console.warn(`[base44.entities.${entityName}.filter] Skipping complex array filter for key "${rawKey}"`);
            return;
          }
          query = query.in(key, rawValue);
          return;
        }

        // Skip object values (can't use .eq() with objects)
        if (typeof rawValue === 'object') {
          console.warn(`[base44.entities.${entityName}.filter] Skipping object filter for key "${rawKey}"`);
          return;
        }

        query = query.eq(key, rawValue);
      });
      
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const column = desc ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !desc });
      }
      
      if (limit) query = query.limit(limit);
      
      try {
        const { data, error } = await query;
        if (error) throw error;
        return safeArray(data);
      } catch (error) {
        if (isMissingTableError(error)) {
          warnOnce(
            `missing-table:${table}:filter`,
            `[base44.entities.${entityName}.filter] Missing table/view "${table}"; returning []`
          );
          return [];
        }

        console.error(`[base44.entities.${entityName}.filter] Failed, returning []`, error);
        return [];
      }
    },
    
    create: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from(table)
        .insert({ ...data, created_by: user?.email })
        .select()
        .single();
      
      if (error) throw error;
      return created;
    },
    
    update: async (id, data) => {
      const { data: updated, error } = await supabase
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    
    delete: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }
  };

  // Base44 UI frequently uses singular entity names (e.g. UserFollow) even when the
  // underlying table is plural (user_follows). Create a best-effort singular alias.
  if (table.endsWith('s') && !table.endsWith('status')) {
    const singularName = entityName.endsWith('s') ? entityName.slice(0, -1) : null;
    if (singularName && !base44.entities[singularName]) {
      base44.entities[singularName] = base44.entities[entityName];
    }
  }
});

// Back-compat aliases for acronym/casing differences in older UI code.
base44.entities.EventRSVP =
  base44.entities.EventRSVP ??
  base44.entities.EventRsvp ??
  base44.entities.EventRsvps;

// Compatibility: `event_rsvps` is often a read-only view.
// Keep reads on the view (list/filter), but write to the canonical table when present.
if (base44.entities.EventRSVP) {
  const readEntity = base44.entities.EventRSVP;

  base44.entities.EventRSVP = {
    ...readEntity,
    filter: async (filters, orderBy, limit) => {
      // Back-compat: `event_rsvps` is often a view that does not expose `status`.
      // Drop it client-side so we don't spam the network with 400s.
      const safeFilters = filters && typeof filters === 'object' ? { ...filters } : {};
      if (Object.prototype.hasOwnProperty.call(safeFilters, 'status')) {
        delete safeFilters.status;
      }
      return readEntity.filter(safeFilters, orderBy, limit);
    },
    create: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...(data || {}), created_by: user?.email };

      const candidates = ['EventRSVP', 'EventRsvp'];
      for (let i = 0; i < candidates.length; i += 1) {
        const table = candidates[i];
        const { data: created, error } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single();

        if (!error) return created;
        if (!isMissingTableError(error) || i === candidates.length - 1) {
          throw error;
        }

        warnOnce(
          `missing-table:${table}:EventRSVP.create`,
          `[base44.entities.EventRSVP.create] Missing table "${table}"; trying fallback`
        );
      }

      return null;
    },
  };
}

base44.entities.SafetyCheckIn =
  base44.entities.SafetyCheckIn ??
  base44.entities.SafetyCheckin ??
  base44.entities.SafetyCheckins;

base44.entities.BeaconCheckIn =
  base44.entities.BeaconCheckIn ??
  base44.entities.BeaconCheckin ??
  base44.entities.BeaconCheckins;

// Compatibility: `user_tribes` table may be missing in some environments.
// Reads already degrade to [] via the generic entity wrapper; harden writes to avoid crashing.
base44.entities.UserTribe =
  base44.entities.UserTribe ??
  base44.entities.UserTribes;

if (base44.entities.UserTribe) {
  const writeEntity = base44.entities.UserTribe;

  base44.entities.UserTribe = {
    ...writeEntity,
    create: async (data) => {
      try {
        return await writeEntity.create(data);
      } catch (error) {
        if (isMissingTableError(error)) {
          warnOnce(
            'missing-table:user_tribes:UserTribe.create',
            '[base44.entities.UserTribe.create] Missing table/view "user_tribes"; skipping create'
          );
          return null;
        }
        throw error;
      }
    },
    update: async (id, data) => {
      try {
        return await writeEntity.update(id, data);
      } catch (error) {
        if (isMissingTableError(error)) {
          warnOnce(
            'missing-table:user_tribes:UserTribe.update',
            '[base44.entities.UserTribe.update] Missing table/view "user_tribes"; skipping update'
          );
          return null;
        }
        throw error;
      }
    },
    delete: async (id) => {
      try {
        return await writeEntity.delete(id);
      } catch (error) {
        if (isMissingTableError(error)) {
          warnOnce(
            'missing-table:user_tribes:UserTribe.delete',
            '[base44.entities.UserTribe.delete] Missing table/view "user_tribes"; skipping delete'
          );
          return;
        }
        throw error;
      }
    },
  };
}

// Back-compat aliases (Base44-style singular + legacy casing)
base44.entities.Order = base44.entities.Order ?? base44.entities.Orders;
base44.entities.OrderItem = base44.entities.OrderItem ?? base44.entities.OrderItems;
base44.entities.Promotion = base44.entities.Promotion ?? base44.entities.Promotions;
base44.entities.SellerPayout = base44.entities.SellerPayout ?? base44.entities.SellerPayouts;
base44.entities.FeaturedListing = base44.entities.FeaturedListing ?? base44.entities.FeaturedListings;
base44.entities.XPLedger = base44.entities.XPLedger ?? base44.entities.XpLedger;
base44.entities.CartItem = base44.entities.CartItem ?? base44.entities.CartItems;

// Auth helpers
export const auth = {
  signUp: (email, password, metadata = {}) => 
    supabase.auth.signUp({ email, password, options: { data: metadata } }),
  
  signIn: (email, password) => 
    supabase.auth.signInWithPassword({ email, password }),

  sendMagicLink: (email, redirectTo) =>
    supabase.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    }),
  
  signOut: () => 
    supabase.auth.signOut(),
  
  getUser: () => 
    supabase.auth.getUser(),
  
  getSession: () => 
    supabase.auth.getSession(),

  resetPasswordForEmail: (email, redirectTo) =>
    supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined),

  updatePassword: (password) =>
    supabase.auth.updateUser({ password }),
  
  onAuthStateChange: (callback) => 
    supabase.auth.onAuthStateChange(callback),

  // =============================================================================
  // SOCIAL LOGIN PROVIDERS (OAuth)
  // =============================================================================

  /**
   * Sign in with Google OAuth
   * Requires Google OAuth to be configured in Supabase Dashboard:
   * Authentication > Providers > Google
   */
  signInWithGoogle: (redirectTo) =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/Auth?provider=google`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),

  /**
   * Sign in with Apple OAuth
   * Requires Apple OAuth to be configured in Supabase Dashboard:
   * Authentication > Providers > Apple
   * Also requires Apple Developer account configuration
   */
  signInWithApple: (redirectTo) =>
    supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/Auth?provider=apple`,
      },
    }),

  /**
   * Link existing account with OAuth provider
   * Useful for adding Google/Apple to an existing email account
   */
  linkWithGoogle: () =>
    supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/settings?linked=google`,
      },
    }),

  linkWithApple: () =>
    supabase.auth.linkIdentity({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/settings?linked=apple`,
      },
    }),

  /**
   * Get linked identities for current user
   */
  getIdentities: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.identities || [];
  },

  /**
   * Unlink an OAuth provider from the account
   */
  unlinkProvider: async (providerId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const identity = user?.identities?.find(i => i.provider === providerId);
    if (!identity) {
      throw new Error(`Provider ${providerId} not linked`);
    }
    return supabase.auth.unlinkIdentity(identity);
  },
};

// Database helpers
export const db = {
  // Generic CRUD operations
  list: (table, options = {}) => {
    let query = supabase.from(table).select('*');
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options.order) {
      const [column, direction = 'asc'] = options.order.split(':');
      query = query.order(column, { ascending: direction === 'asc' });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return query;
  },
  
  get: (table, id) => 
    supabase.from(table).select('*').eq('id', id).single(),
  
  create: (table, data) => 
    supabase.from(table).insert(data).select().single(),
  
  update: (table, id, data) => 
    supabase.from(table).update(data).eq('id', id).select().single(),
  
  delete: (table, id) => 
    supabase.from(table).delete().eq('id', id),
  
  filter: (table, filters) => {
    let query = supabase.from(table).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    return query;
  },
};

// Storage helpers
export const storage = {
  upload: async (bucket, path, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return { file_url: publicUrl };
  },
  
  getPublicUrl: (bucket, path) => 
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  
  delete: (bucket, path) => 
    supabase.storage.from(bucket).remove([path]),
};

export default supabase;