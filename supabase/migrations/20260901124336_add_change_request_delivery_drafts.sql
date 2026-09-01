alter table public.change_request_deliveries
  alter column sent_at drop not null,
  alter column sent_at drop default;

alter table public.change_request_deliveries
  alter column recipient_email drop not null,
  alter column subject drop not null,
  alter column message drop not null;

alter table public.change_request_deliveries
  add column if not exists status text not null default 'sent';

alter table public.change_request_deliveries
  add constraint change_request_deliveries_status_check
  check (status in ('draft', 'sent'));

create index if not exists change_request_deliveries_request_status_idx
  on public.change_request_deliveries (request_id, status, created_at desc);
