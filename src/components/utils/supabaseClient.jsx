import { createClient } from '@supabase/supabase-js';

// Helper to create page URLs - matches Base44 pattern
const createPageUrl = (pageName) => `/${pageName}`;

// HARDCODED to prevent any env var override
// Correct project: klsywpvncqqglhnhrjbh (HOTMESS BASE44)
const supabaseUrl = 'https://klsywpvncqqglhnhrjbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc3l3cHZuY3FxZ2xobmhyamJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTEyMzIsImV4cCI6MjA4MjY2NzIzMn0.WhPthNardVU6yLmrBDy6poDmdt12MDV0h-QCuhSD5vQ';

console.log('[supabase] Using HARDCODED URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Export page URL helper for use in navigation
export { createPageUrl };
