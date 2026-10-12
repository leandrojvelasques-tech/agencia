-- Archiving is independent of the commercial outcome. Keep status and approval history.
alter table public.crm_proposals
  add column if not exists archived_at timestamptz;

create index if not exists crm_proposals_archived_at_idx
  on public.crm_proposals (archived_at)
  where archived_at is not null;
