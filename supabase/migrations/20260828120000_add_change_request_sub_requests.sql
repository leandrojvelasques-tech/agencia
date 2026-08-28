alter table public.change_requests
  add column if not exists sub_requests jsonb not null default '[]'::jsonb;

comment on column public.change_requests.sub_requests is 'Sub-pedidos internos asociados al mismo tema general.';
