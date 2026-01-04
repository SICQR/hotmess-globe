// @ts-nocheck
// Compatibility layer: keep the existing `base44.*` call sites working while
// migrating auth/CRUD to Supabase.
//
// Long-term goal: migrate call sites to use `supabase` directly.

import { supabase } from '@/api/supabaseClient';

function mapSupabaseUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    ...user.user_metadata,
    __supabase_user: user,
  };
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) {
    const noAuthError = new Error('Authentication required');
    noAuthError.status = 401;
    throw noAuthError;
  }
  return data.user;
}

async function getUserProfileRow(user) {
  if (!user?.id && !user?.email) return null;

  // Prefer auth_user_id-based lookup.
  if (user?.id) {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (!error && data) return data;
  }

  // Fallback for legacy rows keyed by email.
  if (user?.email) {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  }

  return null;
}

async function upsertUserProfileRow(user, updates) {
  if (!user?.email) throw new Error('Missing email');

  // Include auth_user_id so auth.uid()-based RLS passes.
  const payload = {
    email: user.email,
    auth_user_id: user.id,
    ...(updates ?? {}),
  };

  const { data, error } = await supabase
    .from('User')
    .upsert(payload, { onConflict: 'email' })
    .select('*')
    .maybeSingle();

  if (error) {
    // Common during early Supabase setup: RLS enabled with no policies yet.
    // In that case, fall back to user_metadata so the app remains usable.
    return null;
  }

  return data ?? null;
}

function applyFilters(query, where) {
  if (!where) return query;
  Object.entries(where).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query = query.eq(key, value);
  });
  return query;
}

function applySortAndLimit(query, sort, limit) {
  if (sort) {
    const descending = sort.startsWith('-');
    const column = descending ? sort.slice(1) : sort;
    query = query.order(column, { ascending: !descending });
  }
  if (typeof limit === 'number') {
    query = query.limit(limit);
  }
  return query;
}

function createEntityClient(table) {
  return {
    async list() {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return data ?? [];
    },
    async filter(where, sort, limit) {
      let query = supabase.from(table).select('*');
      query = applyFilters(query, where);
      query = applySortAndLimit(query, sort, limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select('*').single();
      if (error) throw error;
      return data;
    },
    async update(id, values) {
      const { data, error } = await supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

const entitiesProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return createEntityClient(prop);
    },
  }
);

const functionsProxy = new Proxy(
  {
    async invoke(name, body) {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      return data;
    },
  },
  {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop];
      return async (body) => {
        const { data, error } = await supabase.functions.invoke(prop, { body });
        if (error) throw error;
        return data;
      };
    },
  }
);

async function uploadFileToStorage({ file }) {
  if (!file) throw new Error('Missing file');
  const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'public';
  const path = `uploads/${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

async function invokeLLM(_args) {
  throw new Error(
    'InvokeLLM is not yet implemented for Supabase. Add a Supabase Edge Function and call it via supabase.functions.invoke().'
  );
}

const base44Impl = {
  auth: {
    async isAuthenticated() {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return !!data?.session;
    },
    async me() {
      const user = await requireUser();
      const base = mapSupabaseUser(user);
      const profile = await getUserProfileRow(user);
      return {
        ...base,
        ...(profile ?? {}),
        // Keep email/id from auth as authoritative
        id: user.id,
        email: user.email,
      };
    },
    async updateMe(updates) {
      const user = await requireUser();

      // Persist into the profile table to preserve legacy expectations (xp, consent flags, etc.)
      // while also storing in user_metadata for quick access.
      await upsertUserProfileRow(user, updates);

      const { data, error } = await supabase.auth.updateUser({ data: updates ?? {} });
      if (error) throw error;

      const base = mapSupabaseUser(data.user);
      const profile = await getUserProfileRow(data.user);
      return {
        ...base,
        ...(profile ?? {}),
        id: data.user.id,
        email: data.user.email,
      };
    },
    async logout(returnUrl) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        const url = typeof returnUrl === 'string' ? returnUrl : window.location.href;
        window.location.href = `/Login?returnUrl=${encodeURIComponent(url)}`;
      }
    },
    redirectToLogin(returnUrl) {
      const url =
        typeof returnUrl === 'string'
          ? returnUrl
          : typeof window !== 'undefined'
            ? window.location.href
            : '/';
      if (typeof window !== 'undefined') {
        window.location.href = `/Login?returnUrl=${encodeURIComponent(url)}`;
      }
    },

    redirectToProfile(returnUrl) {
      const url =
        typeof returnUrl === 'string'
          ? returnUrl
          : typeof window !== 'undefined'
            ? window.location.href
            : '/';
      if (typeof window !== 'undefined') {
        window.location.href = `/Profile?returnUrl=${encodeURIComponent(url)}`;
      }
    },

    async requireProfile(returnUrl) {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        this.redirectToLogin(returnUrl);
        return false;
      }

      let me;
      try {
        me = await this.me();
      } catch {
        this.redirectToLogin(returnUrl);
        return false;
      }

      const isProfileComplete = !!(me?.full_name && me?.avatar_url);
      if (!isProfileComplete) {
        this.redirectToProfile(returnUrl);
        return false;
      }

      return true;
    },
  },
  entities: entitiesProxy,
  functions: functionsProxy,
  integrations: {
    Core: {
      UploadFile: uploadFileToStorage,
      InvokeLLM: invokeLLM,
    },
  },
};

// checkJs/tsc in this repo is intentionally strict and will otherwise complain about
// `base44.entities.<DynamicTable>` access through Proxy.
// Treat `base44` as `any` at typecheck time.
/** @type {any} */
export const base44 = base44Impl;
