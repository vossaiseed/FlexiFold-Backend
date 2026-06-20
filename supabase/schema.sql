-- FlexiFold CRM — Supabase / Postgres schema (beginner version)
-- Simple CREATE TABLE statements for the core data the frontend uses.
-- Run this in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- users  (everyone: admin, partner, lead-manager, sales, telecaller)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text unique,
  password   text,
  phone      text,
  role       text not null default 'partner',   -- admin | partner | lead-manager | sales | telecaller
  profession text,                               -- Freelancer | Consultant | Business Owner | Employee
  company    text,
  location   text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads  (from the Add Lead form)
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                      -- client name
  phone       text not null,                      -- mobile number
  whatsapp    text,

  email       text,
  location    text,
  state       text,
  requirement text,
  units       integer,
  urgency     text default 'Medium',              -- High | Medium | Low
  designation text default 'Architect',           -- Architect | Builder | Contractor | ...
  language    text default 'English',             -- English | Hindi | Malayalam | Tamil | Arabic
  status      text default 'New'
              check (status in ('New','Pending','Discussion','Follow-up','In Progress','Converted','Failed','Rejected')),
  notes       text,
  partner_id  uuid references users(id),          -- partner who added the lead
  assigned_to uuid references users(id),          -- sales/telecaller handling it
  assigned_sales_id   text,                        -- salesstaff.id (no FK; separate table)
  assigned_sales_name text,                        -- denormalized for easy display
  assigned_telecaller_id   text,                   -- telecallers.id (no FK; separate table)
  assigned_telecaller_name text,                   -- denormalized for easy display
  conversion_amount   numeric,                     -- final deal value (set by Sales)
  sale_notes          text,                         -- Sales remarks
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- lead_managers  (admin "Add Lead Manager" form)
-- ---------------------------------------------------------------------------
create table if not exists lead_managers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  email      text,
  location   text,
  password   text,
  photo      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversions  (admin conversion requests)
-- ---------------------------------------------------------------------------
create table if not exists conversions (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid references leads(id),
  sales_staff_id uuid references users(id),
  customer_name  text,
  amount         numeric,
  status         text default 'Pending',          -- Pending | Approved | Rejected
  notes          text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- earnings  (partner earnings)
-- ---------------------------------------------------------------------------
create table if not exists earnings (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid references users(id),
  lead_id    uuid references leads(id),
  amount     numeric not null,
  type       text default 'royalty',              -- royalty | commission | bonus
  status     text default 'Pending',              -- Pending | Paid
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- withdrawals  (partner withdrawals)
-- ---------------------------------------------------------------------------
create table if not exists withdrawals (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid references users(id),
  amount     numeric not null,
  method     text default 'Bank Transfer',        -- Bank Transfer | UPI
  status     text default 'Processing',           -- Processing | Completed | Rejected
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- follow_ups  (telecaller follow-ups)
-- ---------------------------------------------------------------------------
create table if not exists follow_ups (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references leads(id),
  assigned_to  uuid references users(id),
  scheduled_at timestamptz,
  note         text,
  status       text default 'Pending',            -- Pending | Completed | Missed
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- call_logs  (telecaller call logs)
-- ---------------------------------------------------------------------------
create table if not exists call_logs (
  id            uuid primary key default gen_random_uuid(),
  telecaller_id uuid references users(id),
  lead_id       uuid references leads(id),
  phone         text,
  duration      integer default 0,                -- seconds
  outcome       text default 'Connected',         -- Connected | Not Reachable | Busy
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications  (per user)
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id),
  text       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- partner  (admin "Add Partner" form)
-- ---------------------------------------------------------------------------
create table if not exists partner (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique,
  phone       text,
  city        text,
  state       text,
  password    text,
  companyname text,
  role        text not null default 'partner',   -- admin | partner | lead-manager | sales | telecaller
  image       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- salesstaff  (admin "Add Sales Member" form)
-- ---------------------------------------------------------------------------
create table if not exists salesstaff (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  phone             text not null,
  email             text unique,
  password          text,
  city              text,
  state             text,
  closing_capacity  text,                              -- fixed: was "closingcapcity"
  max_lead_capacity integer default 10,
  language          text,                              -- primary language (see note below)
  proficiency       integer,                           -- 1-10
  full_access       boolean not null default true,     -- "Full Access — Can see all leads" toggle
  role              text not null default 'sales',     -- Official Sales Person | Telecaller
  photo             text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- telecallers  (admin "Add Telecaller" form / Telecaller login)
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

-- ---------------------------------------------------------------------------
-- project_managers  (admin "Add Project Manager" form / Project Manager login)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- CRM fulfilment pipeline (after a lead is approved & assigned)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- Supabase blocks inserts/selects when RLS is enabled but no policy exists
-- (error: "new row violates row-level security policy ...").
-- These tables are reached only through the trusted Express backend, so we
-- allow full access. Run this block in the Supabase SQL editor.
--
-- NOTE: For production, prefer using the service_role key on the server
-- (it bypasses RLS) and replace these open policies with stricter,
-- role-based ones.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'leads', 'lead_managers', 'conversions', 'earnings',
    'withdrawals', 'follow_ups', 'call_logs', 'notifications',
    'partner', 'salesstaff', 'telecallers', 'project_managers', 'site_visits',
    'measurements', 'models', 'projects'
  ]
  loop
    -- skip tables that don't exist so the whole block can't abort
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "allow_all" on public.%I;', t);
    execute format(
      'create policy "allow_all" on public.%I for all using (true) with check (true);',
      t
    );
  end loop;
end $$;

