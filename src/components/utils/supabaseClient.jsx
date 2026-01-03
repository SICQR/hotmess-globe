import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klsywpvncqqglhnhrjbh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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