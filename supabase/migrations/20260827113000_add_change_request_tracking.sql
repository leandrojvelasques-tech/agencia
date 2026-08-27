-- Add stable chronological identifiers and an independent topic for change requests.
alter table public.change_requests
  add column if not exists request_number bigint,
  add column if not exists request_code text,
  add column if not exists category text default 'other';

with numbered as (
  select id,
         row_number() over (order by created_at asc nulls last, id asc)::bigint as number,
         to_char(coalesce(created_at, now()), 'YYYY') as year
  from public.change_requests
)
update public.change_requests as requests
set request_number = numbered.number,
    request_code = format('SC-%s-%s', numbered.year, lpad(numbered.number::text, 4, '0')),
    category = coalesce(nullif(trim(requests.category), ''), 'other')
from numbered
where requests.id = numbered.id;

update public.change_requests
set category = 'other'
where category is null or btrim(category) = '';

alter table public.change_requests
  alter column category set default 'other',
  alter column category set not null;

create sequence if not exists public.change_request_number_seq;

select setval(
  'public.change_request_number_seq',
  coalesce((select max(request_number) from public.change_requests), 0),
  true
);

create or replace function public.set_change_request_tracking_fields()
returns trigger
language plpgsql
as $$
begin
  if new.request_number is null then
    new.request_number := nextval('public.change_request_number_seq');
  end if;

  if new.request_code is null or btrim(new.request_code) = '' then
    new.request_code := format(
      'SC-%s-%s',
      to_char(coalesce(new.created_at, now()), 'YYYY'),
      lpad(new.request_number::text, 4, '0')
    );
  end if;

  if new.category is null or btrim(new.category) = '' then
    new.category := 'other';
  end if;

  return new;
end;
$$;

drop trigger if exists set_change_request_tracking_fields on public.change_requests;
create trigger set_change_request_tracking_fields
before insert on public.change_requests
for each row execute function public.set_change_request_tracking_fields();

create unique index if not exists change_requests_request_number_key
  on public.change_requests (request_number);

create unique index if not exists change_requests_request_code_key
  on public.change_requests (request_code);
