-- hotmess-globe: align public.user_tags with UI payloads (label/category/visibility + Base44 timestamps)

create extension if not exists pgcrypto;

alter table if exists public.user_tags
  add column if not exists tag_label text,
  add column if not exists category_id text,
  add column if not exists visibility text not null default 'public',
  add column if not exists created_date timestamptz not null default now(),
  add column if not exists updated_date timestamptz not null default now();

-- Keep updated_date fresh when the shared trigger helper exists.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_user_tags_set_updated_timestamps on public.user_tags';
    execute 'create trigger trg_user_tags_set_updated_timestamps before update on public.user_tags for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;
