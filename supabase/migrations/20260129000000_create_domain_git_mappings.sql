-- Create domain_git_mappings table for managing domain to git branch assignments
CREATE TABLE IF NOT EXISTS domain_git_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  git_branch TEXT NOT NULL,
  environment TEXT DEFAULT 'preview' CHECK (environment IN ('production', 'preview')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_domain_per_user UNIQUE (user_id, domain)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_domain_git_mappings_user_id ON domain_git_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_git_mappings_email ON domain_git_mappings(email);

-- Enable Row Level Security
ALTER TABLE domain_git_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own domain mappings
CREATE POLICY "Users can view their own domain mappings"
  ON domain_git_mappings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domain mappings"
  ON domain_git_mappings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domain mappings"
  ON domain_git_mappings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domain mappings"
  ON domain_git_mappings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_domain_git_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_domain_git_mappings_updated_at
  BEFORE UPDATE ON domain_git_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_git_mappings_updated_at();
