-- Video Calling / WebRTC Tables

-- Video call sessions
CREATE TABLE IF NOT EXISTS video_calls (
  id TEXT PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'rejected', 'missed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  end_reason TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_video_calls_caller ON video_calls(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_calls_callee ON video_calls(callee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status) WHERE status IN ('pending', 'ringing', 'active');

-- RTC signaling messages (ephemeral, cleaned up after calls)
CREATE TABLE IF NOT EXISTS rtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Index for receiving signals
CREATE INDEX IF NOT EXISTS idx_rtc_signals_recipient ON rtc_signals(to_user_id, created_at DESC) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_rtc_signals_call ON rtc_signals(call_id, created_at);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE rtc_signals;

-- RLS Policies
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtc_signals ENABLE ROW LEVEL SECURITY;

-- Users can view calls they're part of
CREATE POLICY "Users can view own calls"
  ON video_calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can only see signals addressed to them
CREATE POLICY "Users can view signals addressed to them"
  ON rtc_signals FOR SELECT
  USING (auth.uid() = to_user_id);

-- Users can mark signals as processed
CREATE POLICY "Users can update own signals"
  ON rtc_signals FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Cleanup function for old signals (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rtc_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete signals older than 5 minutes
  DELETE FROM rtc_signals
  WHERE created_at < now() - INTERVAL '5 minutes';
  
  -- Mark calls as missed if pending for more than 1 minute
  UPDATE video_calls
  SET status = 'missed', ended_at = now()
  WHERE status IN ('pending', 'ringing')
  AND created_at < now() - INTERVAL '1 minute';
END;
$$;

-- Calculate call duration on end
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('ended', 'rejected', 'missed', 'failed') AND NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_call_duration
  BEFORE UPDATE ON video_calls
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION calculate_call_duration();
