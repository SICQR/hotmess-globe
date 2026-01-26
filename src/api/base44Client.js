// Legacy compatibility: many components still import from '@/api/base44Client'.
// In this repo, the Base44 SDK client causes noisy 401s in local/dev.
// Re-export the Supabase-backed compatibility wrapper instead.
export { base44, supabase } from '@/components/utils/supabaseClient';
