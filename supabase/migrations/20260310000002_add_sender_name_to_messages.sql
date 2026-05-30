-- Add sender_name column to messages table.
-- This is a denormalized display name captured at send time,
-- used by L2ChatSheet, useChat, useUnreadCount, and SquadChat.
-- The column was referenced in all INSERT callsites but never created.
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS sender_name text;

-- Backfill existing messages from profiles where possible
UPDATE public.messages m
SET sender_name = COALESCE(p.display_name, p.username, m.sender_email)
FROM public.profiles p
WHERE m.sender_name IS NULL
AND m.sender_email = p.email;
