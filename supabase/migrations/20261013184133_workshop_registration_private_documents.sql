insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-registration-documents', 'event-registration-documents', false, 5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Workshop applicants upload private documents"
on storage.objects for insert to anon, authenticated
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
      and (now() at time zone 'America/Argentina/Buenos_Aires')::date
        between date '2026-10-15' and date '2026-11-13'
  )
);

-- Only the consultant's existing verified accounts can read/sign applicant files.
create policy "Workshop owner reads private documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'event-registration-documents'
  and (select auth.uid()) is not null
  and (select auth.jwt()->>'email') in ('leandrojvelasques@gmail.com', 'info@leandrovelasques.com.ar')
);

create policy "Workshop owner deletes private documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-registration-documents'
  and (select auth.uid()) is not null
  and (select auth.jwt()->>'email') in ('leandrojvelasques@gmail.com', 'info@leandrovelasques.com.ar')
);
