alter table public.change_requests
  add column if not exists summary text;

alter table public.change_requests
  drop constraint if exists change_requests_priority_check;

alter table public.change_requests
  add constraint change_requests_priority_check
  check (priority = any (array['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]));
