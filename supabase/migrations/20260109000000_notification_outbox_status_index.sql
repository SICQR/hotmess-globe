-- hotmess-globe: add status index to notification_outbox for efficient processing
-- The notification processor queries by status='queued' frequently

create index if not exists idx_notification_outbox_status on public.notification_outbox (status);
create index if not exists idx_notification_outbox_status_created on public.notification_outbox (status, created_at);
