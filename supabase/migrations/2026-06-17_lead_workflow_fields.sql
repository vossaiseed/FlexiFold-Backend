-- ---------------------------------------------------------------------------
-- Lead workflow fields.
--   assigned_telecaller_id / _name : admin assigns a lead to a Telecaller
--                                    (telecallers live in their own table, no FK)
--   conversion_amount / sale_notes : Sales Team finalises the deal value + notes
--
-- Run in the Supabase SQL Editor. Safe + idempotent.
-- ---------------------------------------------------------------------------
alter table public.leads add column if not exists assigned_telecaller_id   text;
alter table public.leads add column if not exists assigned_telecaller_name text;
alter table public.leads add column if not exists conversion_amount        numeric;
alter table public.leads add column if not exists sale_notes               text;
