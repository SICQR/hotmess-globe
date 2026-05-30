-- Fix missing INSERT/UPDATE RLS policies for video calling

-- Allow authenticated users to INSERT rtc_signals (as from_user_id)
DO $$ BEGIN
  CREATE POLICY "Users can insert signals"
    ON rtc_signals FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = from_user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow callers to create video_calls rows
DO $$ BEGIN
  CREATE POLICY "Users can create calls"
    ON video_calls FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = caller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow caller or callee to update call status (accept/reject/end)
DO $$ BEGIN
  CREATE POLICY "Users can update own calls"
    ON video_calls FOR UPDATE
    TO authenticated
    USING (auth.uid() = caller_id OR auth.uid() = callee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
