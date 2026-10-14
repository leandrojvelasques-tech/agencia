-- Use the same event configuration as the registration page, rather than a
-- second hardcoded opening date. Keep applicant documents private.
alter policy "Workshop applicants upload private documents"
on storage.objects
with check (
  bucket_id = 'event-registration-documents'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1 from public.events e
    where e.id::text = (storage.foldername(name))[1]
      and e.slug = 'chatgpt-work-de-0-a-100-noviembre-2026'
      and e.status = 'published'
      and e.registrations_open is true
      and e.registration_mode in ('self', 'both')
      and (now() at time zone 'America/Argentina/Buenos_Aires')::date >= (
        select min((tier->>'start_date')::date)
        from jsonb_array_elements(e.prices) tier
        where tier->>'pricing_mode' = 'date'
      )
      and (now() at time zone 'America/Argentina/Buenos_Aires')::date <= coalesce((
        select max(day::date)
        from jsonb_array_elements_text(e.offered_dates) day
      ), e.event_date::date)
  )
);
