-- no-op: verify baseline schema replay
-- This migration intentionally does nothing.
-- Its presence triggers the Supabase Preview GitHub integration so the branch
-- replay pipeline (baseline → 19 tracked migrations → this file) can be tested.
SELECT 1;
