import { createClient } from '@supabase/supabase-js';

// Helper to create page URLs - matches Base44 pattern
const createPageUrl = (pageName) => `/${pageName}`;

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.vite_publicSUPABASE_URL ||
  '';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.vite_publicSUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  // Avoid hard-crashing on import (which can look like a white screen);
  // log a clear error instead so it shows up in Vercel/DevTools.
  console.error(
    '[supabase] Missing required env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// If env vars are missing, createClient still needs a URL/key.
// Use a clearly-invalid URL so failures are obvious and debuggable.
export const supabase = createClient(
  supabaseUrl || 'http://invalid.localhost',
  supabaseKey || 'invalid-anon-key'
);

const safeArray = (value) => (Array.isArray(value) ? value : []);

const SHOPIFY_SELLER_EMAIL = 'shopify@hotmess.london';

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
  const message = (error?.message || '').toLowerCase();
  return (
    error?.status === 404 ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
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
          const { data } = await runWithTableFallback(BEACON_TABLES, run);
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.Beacon.list] Failed, returning []', error);
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
          const { data } = await runWithTableFallback(BEACON_TABLES, run);
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.Beacon.filter] Failed, returning []', error);
          return [];
        }
      },
      
      create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: created } = await runWithTableFallback(BEACON_TABLES, (table) => {
          const payload =
            table === 'Beacon'
              ? { ...data, owner_email: user?.email }
              : { ...data, created_by: user?.email };

          return supabase.from(table).insert(payload).select().single();
        });
        return created;
      },
      
      update: async (id, data) => {
        const nowIso = new Date().toISOString();
        const { data: updated } = await runWithTableFallback(BEACON_TABLES, (table) =>
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
        await runWithTableFallback(BEACON_TABLES, (table) => supabase.from(table).delete().eq('id', id));
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
    
    User: {
      list: async () => {
        try {
          const { data } = await runWithTableFallback(USER_TABLES, (table) =>
            supabase.from(table).select('*')
          );
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.User.list] Failed, returning []', error);
          return [];
        }
      },
      
      filter: async (filters) => {
        try {
          const { data } = await runWithTableFallback(USER_TABLES, (table) => {
            let query = supabase.from(table).select('*');
            Object.entries(filters || {}).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
            return query;
          });
          return safeArray(data);
        } catch (error) {
          console.error('[base44.entities.User.filter] Failed, returning []', error);
          return [];
        }
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
        try {
          const { data } = await runWithTableFallback(CITY_TABLES, (table) => {
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
    }
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
      }
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

  // Marketplace cart
  'cart_items',

  // Tags
  'user_tags',

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
        console.error(`[base44.entities.${entityName}.list] Failed, returning []`, error);
        return [];
      }
    },
    
    filter: async (filters, orderBy, limit) => {
      let query = supabase.from(table).select('*');
      
      Object.entries(filters).forEach(([rawKey, rawValue]) => {
        // Support simple JSON path keys used in the UI (e.g. "metadata.squad_id")
        const key = rawKey.includes('.')
          ? rawKey.split('.').length === 2
            ? `${rawKey.split('.')[0]}->>${rawKey.split('.')[1]}`
            : rawKey
          : rawKey;

        // Support "IN" filters (e.g. { user_email: ['admin', email] })
        if (Array.isArray(rawValue)) {
          query = query.in(key, rawValue);
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