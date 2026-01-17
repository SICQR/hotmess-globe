-- hotmess-globe: polish tables for notification preferences, subscriptions, receipts, GDPR requests

create extension if not exists pgcrypto;

-- Notification preferences (persist Settings toggles)
create table if not exists public.notification_preferences (
  user_email text primary key,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  marketing_enabled boolean not null default false,
  order_updates boolean not null default true,
  message_updates boolean not null default true,
  event_updates boolean not null default true,
  safety_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_self on public.notification_preferences;
create policy notification_preferences_select_self
  on public.notification_preferences
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists notification_preferences_write_self on public.notification_preferences;
create policy notification_preferences_write_self
  on public.notification_preferences
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists notification_preferences_update_self on public.notification_preferences;
create policy notification_preferences_update_self
  on public.notification_preferences
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Subscriptions (canonical membership state; billing provider integration can be added later)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  tier text not null default 'basic',
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (user_email, provider_subscription_id)
);

create index if not exists idx_subscriptions_user_email on public.subscriptions (user_email);
create index if not exists idx_subscriptions_auth_user_id on public.subscriptions (auth_user_id);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self
  on public.subscriptions
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists subscriptions_write_self on public.subscriptions;
create policy subscriptions_write_self
  on public.subscriptions
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists subscriptions_update_self on public.subscriptions;
create policy subscriptions_update_self
  on public.subscriptions
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Billing receipts (for email receipts / audit)
create table if not exists public.billing_receipts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  provider text,
  reference_id text,
  amount_cents integer,
  currency text default 'gbp',
  status text not null default 'issued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now()
);
create index if not exists idx_billing_receipts_user_email on public.billing_receipts (user_email);

alter table public.billing_receipts enable row level security;

drop policy if exists billing_receipts_select_self on public.billing_receipts;
create policy billing_receipts_select_self
  on public.billing_receipts
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists billing_receipts_insert_self on public.billing_receipts;
create policy billing_receipts_insert_self
  on public.billing_receipts
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- GDPR requests (export/delete)
create table if not exists public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  request_type text not null check (request_type in ('export', 'delete')),
  status text not null default 'requested' check (status in ('requested', 'in_progress', 'completed', 'rejected')),
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_gdpr_requests_user_email on public.gdpr_requests (user_email);
create index if not exists idx_gdpr_requests_status_created_date on public.gdpr_requests (status, created_date desc);

alter table public.gdpr_requests enable row level security;

drop policy if exists gdpr_requests_select_self_or_admin on public.gdpr_requests;
create policy gdpr_requests_select_self_or_admin
  on public.gdpr_requests
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'email') = user_email
    or exists (
      select 1
      from public."User" u
      where u.email = (auth.jwt() ->> 'email')
        and u.role = 'admin'
    )
  );

drop policy if exists gdpr_requests_insert_self on public.gdpr_requests;
create policy gdpr_requests_insert_self
  on public.gdpr_requests
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- updated_at / updated_date triggers when available.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_notification_preferences_set_updated_timestamps on public.notification_preferences';
    execute 'create trigger trg_notification_preferences_set_updated_timestamps before update on public.notification_preferences for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_subscriptions_set_updated_timestamps on public.subscriptions';
    execute 'create trigger trg_subscriptions_set_updated_timestamps before update on public.subscriptions for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_gdpr_requests_set_updated_timestamps on public.gdpr_requests';
    execute 'create trigger trg_gdpr_requests_set_updated_timestamps before update on public.gdpr_requests for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;

-- Extend notification_outbox for multi-channel sending (email/push) without breaking existing rows
alter table if exists public.notification_outbox
  add column if not exists channel text not null default 'in_app',
  add column if not exists to_email text,
  add column if not exists template_id text;
