create table if not exists public.change_request_deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.change_requests(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  cc jsonb not null default '[]'::jsonb,
  subject text not null,
  message text not null,
  verification_url text,
  evidence jsonb not null default '[]'::jsonb,
  message_id text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists change_request_deliveries_request_sent_at_idx
  on public.change_request_deliveries (request_id, sent_at desc);

alter table public.change_request_deliveries enable row level security;

create policy "Authenticated users can manage change request deliveries"
  on public.change_request_deliveries
  for all
  to authenticated
  using (true)
  with check (true);
