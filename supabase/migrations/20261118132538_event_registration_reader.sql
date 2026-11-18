-- Prepared locally only. No credential is provisioned by this migration.
begin;
create schema cpce_registration_private;
revoke all on schema cpce_registration_private from public;

create table cpce_registration_private.reader_credential (
  singleton boolean primary key default true check (singleton),
  token_sha256 text not null check (token_sha256 ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default false,
  expires_at timestamptz not null
);
alter table cpce_registration_private.reader_credential enable row level security;
revoke all on cpce_registration_private.reader_credential from public, anon, authenticated;

-- This elevated function is necessary because the caller must not receive any
-- table privileges. Authentication uses a dedicated random secret, not auth.uid():
-- it is an unattended reader, not an existing administrative user.
create function cpce_registration_private.read_snapshot(
  p_credential text, p_from timestamptz, p_cutoff timestamptz, p_verify_only boolean
) returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog
as $$
declare result jsonb;
begin
  if p_credential is null or p_credential !~ '^[A-Za-z0-9_-]{43,128}$'
    or not exists (
      select 1 from cpce_registration_private.reader_credential c
      where c.enabled and c.expires_at > statement_timestamp()
        and c.token_sha256 = encode(sha256(convert_to(p_credential, 'UTF8')), 'hex')
    ) then
    raise exception using errcode = '42501', message = 'reader_forbidden';
  end if;
  if p_verify_only is true then return jsonb_build_object('authorized', true); end if;
  if p_cutoff is null or not isfinite(p_cutoff) or p_cutoff > statement_timestamp()
    or p_cutoff < '2000-01-01'::timestamptz
    or (p_from is not null and (not isfinite(p_from) or p_from < '2000-01-01'::timestamptz
      or p_from >= p_cutoff or p_cutoff - p_from > interval '366 days')) then
    raise exception using errcode = '22023', message = 'reader_invalid_interval';
  end if;

  -- One SQL statement / MVCC snapshot for count and all interval rows. The JSON
  -- scalar avoids PostgREST's row cap; application pagination uses this snapshot.
  with scoped as materialized (
    select r.id, r.created_at, r.participant_id, r.survey_responses
    from public.registrations r
    where r.event_id = 'd9962e70-4b7a-44be-b6f3-20151c810bdb'::uuid
      and r.created_at < p_cutoff
  ), recent as materialized (
    select s.* from scoped s where p_from is not null and s.created_at >= p_from
    order by s.created_at, s.id limit 10001
  )
  select jsonb_build_object(
    'total', (select count(*) from scoped),
    'inscriptions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'created_at', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'first_name', p.first_name, 'last_name', p.last_name, 'email', p.email,
      'profession', coalesce(nullif(r.survey_responses->>'profesion_carrera', ''),
        nullif(r.survey_responses->>'profesion_otro', ''), r.survey_responses->>'profesion'),
      'residence_city', r.survey_responses->>'Ciudad de residencia'
    ) order by r.created_at, r.id)
    from recent r join public.participants p on p.id = r.participant_id), '[]'::jsonb)
  ) into result;
  if jsonb_array_length(result->'inscriptions') > 10000 then
    raise exception using errcode = '54000', message = 'reader_interval_too_large';
  end if;
  return result;
end;
$$;
revoke all on function cpce_registration_private.read_snapshot(text,timestamptz,timestamptz,boolean) from public, anon, authenticated;

create function public.read_cpce_registration_snapshot(
  p_credential text, p_from timestamptz, p_cutoff timestamptz, p_verify_only boolean default false
) returns jsonb language sql stable security invoker
set search_path = pg_catalog
as $$
  select cpce_registration_private.read_snapshot(p_credential, p_from, p_cutoff, p_verify_only);
$$;
revoke all on function public.read_cpce_registration_snapshot(text,timestamptz,timestamptz,boolean) from public, anon, authenticated;
grant usage on schema cpce_registration_private to anon;
grant execute on function cpce_registration_private.read_snapshot(text,timestamptz,timestamptz,boolean) to anon;
grant execute on function public.read_cpce_registration_snapshot(text,timestamptz,timestamptz,boolean) to anon;
commit;
