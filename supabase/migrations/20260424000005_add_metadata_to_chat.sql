-- Add metadata column to chat_messages if it's missing
-- This column is essential for spatial data (location shares), travel ETAs, and media attributes.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS read_by TEXT[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.chat_messages.metadata IS 'Stores structured data for special message types like location, travel, or media.';
COMMENT ON COLUMN public.chat_messages.read_by IS 'Array of participant emails who have read this message.';
