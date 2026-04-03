-- Add community attestation timestamp to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_attested_at timestamptz;

-- Index for fast boot guard check (null = not yet attested)
CREATE INDEX IF NOT EXISTS profiles_community_attested_idx
  ON profiles(id) WHERE community_attested_at IS NULL;
