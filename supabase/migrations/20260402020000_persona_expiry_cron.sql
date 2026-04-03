-- Deactivate expired personas every 5 minutes
SELECT cron.schedule(
  'deactivate-expired-personas',
  '*/5 * * * *',
  $$ UPDATE public.personas SET is_active=false, updated_at=NOW()
     WHERE is_active=true AND expires_at IS NOT NULL AND expires_at<=NOW(); $$
);
