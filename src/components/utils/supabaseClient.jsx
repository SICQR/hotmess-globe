import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klsywpvncqqglhnhrjbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc3l3cHZuY3FxZ2xobmhyamJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTEyMzIsImV4cCI6MjA4MjY2NzIzMn0.WhPthNardVU6yLmrBDy6poDmdt12MDV0h-QCuhSD5vQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Base44-compatible API wrapper
export const base44 = {
  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      return { ...user, ...profile, email: user.email };
    },
    
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    
    updateMe: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: updated, error } = await supabase
        .from('users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
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
      window.location.href = `/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`;
    }
  },
  
  entities: {
    Beacon: {
      list: async (orderBy = '-created_at', limit) => {
        let query = supabase.from('beacons').select('*');
        
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const column = desc ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !desc });
        }
        
        if (limit) query = query.limit(limit);
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      
      filter: async (filters, orderBy, limit) => {
        let query = supabase.from('beacons').select('*');
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const column = desc ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !desc });
        }
        
        if (limit) query = query.limit(limit);
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      
      create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: created, error } = await supabase
          .from('beacons')
          .insert({ ...data, created_by: user?.email })
          .select()
          .single();
        
        if (error) throw error;
        return created;
      },
      
      update: async (id, data) => {
        const { data: updated, error } = await supabase
          .from('beacons')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      },
      
      delete: async (id) => {
        const { error } = await supabase.from('beacons').delete().eq('id', id);
        if (error) throw error;
      }
    },
    
    Product: {
      list: async (orderBy = '-created_at', limit) => {
        let query = supabase.from('products').select('*');
        
        if (orderBy) {
          const desc = orderBy.startsWith('-');
          const column = desc ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !desc });
        }
        
        if (limit) query = query.limit(limit);
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
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
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
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
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return data || [];
      },
      
      filter: async (filters) => {
        let query = supabase.from('users').select('*');
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
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
  'challenge_completions'
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
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    
    filter: async (filters, orderBy, limit) => {
      let query = supabase.from(table).select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const column = desc ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !desc });
      }
      
      if (limit) query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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
});

// Auth helpers
export const auth = {
  signUp: (email, password, metadata = {}) => 
    supabase.auth.signUp({ email, password, options: { data: metadata } }),
  
  signIn: (email, password) => 
    supabase.auth.signInWithPassword({ email, password }),
  
  signOut: () => 
    supabase.auth.signOut(),
  
  getUser: () => 
    supabase.auth.getUser(),
  
  getSession: () => 
    supabase.auth.getSession(),
  
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