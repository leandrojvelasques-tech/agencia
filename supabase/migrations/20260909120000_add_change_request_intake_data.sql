alter table public.change_requests
  add column if not exists intake_data jsonb not null default '{}'::jsonb;

comment on column public.change_requests.intake_data is 'Campos estructurados del relevamiento de pedidos web.';
