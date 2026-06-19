-- ---------------------------------------------------------------------------
-- Expand the leads.status CHECK constraint.
--
-- The live database has a constraint `leads_status_check` that only allowed the
-- original sales statuses (New | Discussion | Follow-up | Converted | Failed).
-- The admin Pending Review flow needs two more states:
--   * "Rejected"  -> lead sent to Trash
--   * "Pending"   -> alternate awaiting-review label
-- and "In Progress" is used by the sales lead modal. This widens the allowed
-- set to the full application vocabulary.
--
-- Safe + idempotent: the new set is a superset of the old one, so existing rows
-- always satisfy it. Run this in the Supabase SQL Editor.
-- ---------------------------------------------------------------------------

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in (
    'New',
    'Pending',
    'Discussion',
    'Follow-up',
    'In Progress',
    'Converted',
    'Failed',
    'Rejected'
  ));
