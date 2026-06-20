-- ---------------------------------------------------------------------------
-- Telecallers as their own role/table (split from Sales Team / salesstaff).
--
-- Telecallers call leads, follow up, and convert. Sales Team (salesstaff)
-- handle site visits / measurements / models. Login routing maps the
-- telecallers table -> role "telecaller" and salesstaff -> role "sales".
--
-- Run this in the Supabase SQL Editor. Safe + idempotent.
-- ---------------------------------------------------------------------------
create table if not exists telecallers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  location    text,
  password    text,
  photo       text,
  created_at  timestamptz not null default now()
);

-- Row Level Security: match the rest of the schema (open allow_all; the server
-- uses the service-role key which bypasses RLS anyway).
do $$
begin
  execute 'alter table public.telecallers enable row level security';
  execute 'drop policy if exists "allow_all" on public.telecallers';
  execute 'create policy "allow_all" on public.telecallers for all using (true) with check (true)';
end $$;
