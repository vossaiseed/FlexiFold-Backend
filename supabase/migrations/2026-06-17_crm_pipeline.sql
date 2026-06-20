-- ---------------------------------------------------------------------------
-- CRM fulfilment pipeline tables.
--
-- Adds the entities used after a lead is approved & assigned:
--   project_managers -> login accounts for the Project Manager role
--   site_visits      -> site visits created by the sales team
--   measurements     -> measurement details + uploaded files/images
--   models           -> design/model documents
--   projects         -> execution record owned by a Project Manager
--
-- Run this in the Supabase SQL Editor (the server's supabase-js client cannot
-- run DDL). Safe + idempotent: uses `if not exists` / `drop ... if exists`.
-- ---------------------------------------------------------------------------

-- Sales-team assignment on leads. assigned_to FKs users(id); sales staff live in
-- the separate salesstaff table, so store their id/name in dedicated columns
-- (no FK) to avoid violating the users FK. ------------------------------------
alter table public.leads add column if not exists assigned_sales_id   text;
alter table public.leads add column if not exists assigned_sales_name text;

-- Project Managers (login table, mirrors lead_managers) -----------------------
create table if not exists project_managers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  location    text,
  password    text,
  photo       text,
  created_at  timestamptz not null default now()
);

-- Site visits ----------------------------------------------------------------
create table if not exists site_visits (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads(id) on delete cascade,
  assigned_to uuid,                                   -- sales staff who handled it
  visit_date  timestamptz,
  location    text,
  notes       text,
  status      text default 'Scheduled'
              check (status in ('Scheduled','Completed','Cancelled','Rescheduled')),
  created_at  timestamptz not null default now()
);

-- Measurements (details + uploaded files/images) -----------------------------
create table if not exists measurements (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete cascade,
  site_visit_id uuid references site_visits(id) on delete set null,
  details       text,
  file_urls     text[] default '{}',                 -- Supabase Storage public URLs
  uploaded_by   uuid,
  status        text default 'Uploaded'
                check (status in ('Pending','Uploaded','Approved','Rejected')),
  created_at    timestamptz not null default now()
);

-- Models / design documents --------------------------------------------------
create table if not exists models (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid references leads(id) on delete cascade,
  measurement_id uuid references measurements(id) on delete set null,
  title          text,
  notes          text,
  file_urls      text[] default '{}',
  uploaded_by    uuid,
  status         text default 'Uploaded'
                 check (status in ('Pending','Uploaded','Approved','Rejected')),
  created_at     timestamptz not null default now()
);

-- Projects (execution stage, owned by a Project Manager) ---------------------
create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid references leads(id) on delete cascade,
  project_manager_id uuid references project_managers(id) on delete set null,
  status             text default 'Pending'
                     check (status in ('Pending','In Progress','Completed','On Hold')),
  notes              text,
  assigned_at        timestamptz default now(),
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- Helpful indexes ------------------------------------------------------------
create index if not exists idx_site_visits_lead   on site_visits(lead_id);
create index if not exists idx_measurements_lead  on measurements(lead_id);
create index if not exists idx_models_lead        on models(lead_id);
create unique index if not exists uq_projects_lead on projects(lead_id);
create index if not exists idx_projects_pm        on projects(project_manager_id);

-- Row Level Security: match the rest of the schema (open allow_all; the server
-- uses the service-role key which bypasses RLS anyway). -----------------------
do $$
declare t text;
begin
  foreach t in array array['project_managers','site_visits','measurements','models','projects']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "allow_all" on public.%I;', t);
    execute format('create policy "allow_all" on public.%I for all using (true) with check (true);', t);
  end loop;
end $$;
