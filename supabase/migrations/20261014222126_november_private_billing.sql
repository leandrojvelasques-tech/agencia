-- Identity, billing and marketing choices must not be exposed through public registrations.
create table public.workshop_registration_private (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  dni text not null check (dni ~ '^[0-9]{7,8}$'),
  invoice_requested boolean not null default false,
  invoice_cuit text,
  invoice_name text,
  invoice_notes text,
  newsletter_opt_in boolean not null default false,
  newsletter_consented_at timestamptz,
  newsletter_consent_text text,
  created_at timestamptz not null default now(),
  check (not invoice_requested or (invoice_cuit ~ '^[0-9]{11}$' and length(trim(invoice_name)) between 2 and 200)),
  check (length(coalesce(invoice_notes,'')) <= 1000),
  check (not newsletter_opt_in or (newsletter_consented_at is not null and newsletter_consent_text is not null))
);
alter table public.workshop_registration_private enable row level security;
revoke all on public.workshop_registration_private from anon, authenticated;
grant select on public.workshop_registration_private to authenticated;
grant all on public.workshop_registration_private to service_role;
create policy "Consultant reads private workshop details"
on public.workshop_registration_private for select to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.jwt()->>'email') in ('info@leandrovelasques.com.ar','leandrojvelasques@gmail.com')
);
create index workshop_private_event_idx on public.workshop_registration_private(event_id);

-- A service-only transaction prevents a registration succeeding without its private details.
create function public.register_november_workshop(p_participant jsonb, p_answers jsonb, p_private jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $function$
declare
  workshop public.events%rowtype;
  participant_id uuid;
  registration_id uuid;
  tier jsonb;
  documents jsonb;
  today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  invoice boolean := coalesce((p_private->>'invoice_requested')::boolean,false);
  newsletter boolean := coalesce((p_private->>'newsletter_opt_in')::boolean,false);
  student boolean := coalesce((p_answers->>'student_discount_requested')::boolean,false);
  dni text := trim(coalesce(p_private->>'dni',''));
  cuit text := trim(coalesce(p_private->>'invoice_cuit',''));
  invoice_name text := trim(coalesce(p_private->>'invoice_name',''));
  invoice_notes text := trim(coalesce(p_private->>'invoice_notes',''));
  email text := lower(trim(coalesce(p_participant->>'email','')));
  expected_amount numeric;
  checksum integer := 0;
  checkdigit integer;
  weights integer[] := array[5,4,3,2,7,6,5,4,3,2];
  i integer;
begin
  select * into workshop from public.events
  where slug='chatgpt-work-de-0-a-100-noviembre-2026' for update;
  if workshop.id is null or workshop.status <> 'published' or not workshop.registrations_open
    or workshop.registration_mode not in ('self','both')
    or today > (select max(value::date) from jsonb_array_elements_text(workshop.offered_dates))
  then raise exception 'La inscripción no está disponible.'; end if;
  if dni !~ '^[0-9]{7,8}$' then raise exception 'Revisá el DNI: ingresá 7 u 8 números, sin puntos.'; end if;
  if length(trim(coalesce(p_participant->>'first_name',''))) not between 1 and 100
    or length(trim(coalesce(p_participant->>'last_name',''))) not between 1 and 100
    or length(trim(coalesce(p_participant->>'phone',''))) not between 1 and 60
    or email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(email)>254
  then raise exception 'Revisá tus datos de contacto.'; end if;
  if invoice then
    if cuit !~ '^[0-9]{11}$' or length(invoice_name) not between 2 and 200 or length(invoice_notes)>1000
    then raise exception 'Completá el CUIT y el nombre o razón social para la factura C.'; end if;
    for i in 1..10 loop checksum := checksum + substr(cuit,i,1)::integer * weights[i]; end loop;
    checkdigit := 11 - (checksum % 11);
    if checkdigit=11 then checkdigit:=0; end if;
    if checkdigit=10 or checkdigit<>substr(cuit,11,1)::integer then raise exception 'Revisá el CUIT ingresado.'; end if;
  end if;
  select value into tier from jsonb_array_elements(workshop.prices)
  where value->>'pricing_mode'='date' and (value->>'start_date')::date<=today
    and (nullif(value->>'end_date','') is null or (value->>'end_date')::date>=today)
  order by (value->>'start_date')::date desc limit 1;
  if tier is null then raise exception 'No hay un arancel disponible para hoy.'; end if;
  expected_amount := (tier->>'price')::numeric * case when student then 0.5 else 1 end;
  if (p_answers->>'price_amount')::numeric is distinct from expected_amount
    or p_answers->>'price_applied_date' is distinct from today::text
  then raise exception 'El arancel cambió. Actualizá la página y revisá el importe.'; end if;
  documents := coalesce(p_answers->'documents','[]'::jsonb);
  if jsonb_typeof(documents)<>'array' then raise exception 'Revisá los archivos adjuntos.'; end if;
  if (select count(*) from jsonb_array_elements(documents) d where d->>'kind'='payment_receipt') not between 1 and 2
    or (student and (select count(*) from jsonb_array_elements(documents) d where d->>'kind'='student_certificate')<>1)
    or exists(select 1 from jsonb_array_elements(documents) d
      where d->>'bucket' is distinct from 'event-registration-documents'
        or d->>'kind' not in ('payment_receipt','student_certificate')
        or d->>'path' not like workshop.id::text || '/%'
        or not exists(select 1 from storage.objects o where o.bucket_id='event-registration-documents' and o.name=d->>'path'))
  then raise exception 'Revisá los comprobantes y certificados adjuntos.'; end if;
  if workshop.max_capacity_virtual is not null and workshop.max_capacity_virtual>0 and
    (select count(*) from public.registrations r where r.event_id=workshop.id and r.attendance_mode='virtual' and r.status<>'cancelled') >= workshop.max_capacity_virtual
  then raise exception 'Los cupos virtuales están completos.'; end if;
  select p.id into participant_id from public.participants p where lower(p.email)=email limit 1;
  if participant_id is null then
    insert into public.participants(first_name,last_name,email,phone,telegram)
    values(trim(p_participant->>'first_name'),trim(p_participant->>'last_name'),email,trim(p_participant->>'phone'),left(coalesce(p_participant->>'telegram',''),150))
    returning id into participant_id;
  end if;
  insert into public.registrations(event_id,participant_id,source,status,attendance_mode,survey_responses)
  values(workshop.id,participant_id,'self_registration','registered','virtual',
    jsonb_build_object(
      'registration_schema','workshop_november_2026','profesion',p_answers->'profesion',
      'provincia',p_answers->'provincia','ciudad',p_answers->'ciudad',
      'herramientas_ia',p_answers->'herramientas_ia','otra_herramienta_ia',p_answers->'otra_herramienta_ia',
      'suscripcion_ia_paga',p_answers->'suscripcion_ia_paga','student_discount_requested',student,
      'student_discount_percent',case when student then 50 else 0 end,'pricing_mode','date',
      'price_concept',tier->>'concept','price_base_amount',(tier->>'price')::numeric,
      'price_amount',expected_amount,'price_applied_date',today::text,
      'payment_review_status','pending','documents',documents))
  returning id into registration_id;
  insert into public.workshop_registration_private
    (registration_id,event_id,dni,invoice_requested,invoice_cuit,invoice_name,invoice_notes,
     newsletter_opt_in,newsletter_consented_at,newsletter_consent_text)
  values(registration_id,workshop.id,dni,invoice,case when invoice then cuit end,
    case when invoice then invoice_name end,case when invoice then invoice_notes end,
    newsletter,case when newsletter then now() end,
    case when newsletter then 'Deseo recibir novedades sobre próximos talleres y workshops.' end);
  return jsonb_build_object('success',true,'registration',jsonb_build_object('id',registration_id,'event_id',workshop.id,'status','registered'));
end;
$function$;
revoke all on function public.register_november_workshop(jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.register_november_workshop(jsonb,jsonb,jsonb) to service_role;
