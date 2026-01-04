-- hotmess-globe: minimal RLS policies to unblock the app
-- Managed via Supabase CLI migrations.
-- NOTE: This is intentionally minimal and may need tightening for production.

-- 1) User table: allow a logged-in user to select/update/upsert their own row by email
alter table if exists public."User" enable row level security;

drop policy if exists "user_select_self" on public."User";
create policy "user_select_self"
on public."User"
for select
to authenticated
using ((auth.jwt() ->> 'email') = email);

drop policy if exists "user_update_self" on public."User";
create policy "user_update_self"
on public."User"
for update
to authenticated
using ((auth.jwt() ->> 'email') = email)
with check ((auth.jwt() ->> 'email') = email);

drop policy if exists "user_insert_self" on public."User";
create policy "user_insert_self"
on public."User"
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = email);

-- 2) Beacon table: common pattern for publicly visible content
do $$
begin
	if to_regclass('public."Beacon"') is not null then
		execute 'alter table public."Beacon" enable row level security';
		execute 'drop policy if exists "beacon_select_public" on public."Beacon"';
		execute $beacon_policy$
			create policy "beacon_select_public"
			on public."Beacon"
			for select
			to anon, authenticated
			using (active = true and status = 'published');
		$beacon_policy$;
	elsif to_regclass('public.beacon') is not null then
		execute 'alter table public.beacon enable row level security';
		execute 'drop policy if exists "beacon_select_public" on public.beacon';
		execute $beacon_policy2$
			create policy "beacon_select_public"
			on public.beacon
			for select
			to anon, authenticated
			using (active = true and status = 'published');
		$beacon_policy2$;
	end if;
end $$;

-- 3) EventRSVP table: allow authenticated users to RSVP and read RSVP counts
-- Assumptions:
-- - The table has a user_email column containing the RSVP owner's email.
-- NOTE: The Events page currently loads *all* RSVPs (for popularity sorting).
-- This policy allows any authenticated user to read RSVPs. Tighten later by
-- replacing this with an aggregate RPC/view that only exposes counts.
do $$
begin
	if to_regclass('public."EventRSVP"') is not null then
		execute 'alter table public."EventRSVP" enable row level security';

		execute 'drop policy if exists "eventrsvp_select_authenticated" on public."EventRSVP"';
		execute $er_select$
			create policy "eventrsvp_select_authenticated"
			on public."EventRSVP"
			for select
			to authenticated
			using (true);
		$er_select$;

		execute 'drop policy if exists "eventrsvp_insert_self" on public."EventRSVP"';
		execute $er_insert$
			create policy "eventrsvp_insert_self"
			on public."EventRSVP"
			for insert
			to authenticated
			with check ((auth.jwt() ->> 'email') = user_email);
		$er_insert$;

		execute 'drop policy if exists "eventrsvp_update_self" on public."EventRSVP"';
		execute $er_update$
			create policy "eventrsvp_update_self"
			on public."EventRSVP"
			for update
			to authenticated
			using ((auth.jwt() ->> 'email') = user_email)
			with check ((auth.jwt() ->> 'email') = user_email);
		$er_update$;

		execute 'drop policy if exists "eventrsvp_delete_self" on public."EventRSVP"';
		execute $er_delete$
			create policy "eventrsvp_delete_self"
			on public."EventRSVP"
			for delete
			to authenticated
			using ((auth.jwt() ->> 'email') = user_email);
		$er_delete$;
	elsif to_regclass('public.eventrsvp') is not null then
		execute 'alter table public.eventrsvp enable row level security';

		execute 'drop policy if exists "eventrsvp_select_authenticated" on public.eventrsvp';
		execute $er2_select$
			create policy "eventrsvp_select_authenticated"
			on public.eventrsvp
			for select
			to authenticated
			using (true);
		$er2_select$;

		execute 'drop policy if exists "eventrsvp_insert_self" on public.eventrsvp';
		execute $er2_insert$
			create policy "eventrsvp_insert_self"
			on public.eventrsvp
			for insert
			to authenticated
			with check ((auth.jwt() ->> 'email') = user_email);
		$er2_insert$;

		execute 'drop policy if exists "eventrsvp_update_self" on public.eventrsvp';
		execute $er2_update$
			create policy "eventrsvp_update_self"
			on public.eventrsvp
			for update
			to authenticated
			using ((auth.jwt() ->> 'email') = user_email)
			with check ((auth.jwt() ->> 'email') = user_email);
		$er2_update$;

		execute 'drop policy if exists "eventrsvp_delete_self" on public.eventrsvp';
		execute $er2_delete$
			create policy "eventrsvp_delete_self"
			on public.eventrsvp
			for delete
			to authenticated
			using ((auth.jwt() ->> 'email') = user_email);
		$er2_delete$;
	end if;
end $$;
