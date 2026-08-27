-- Publication controls whether registrations may be active. Visibility controls
-- whether the event is discoverable from its public slug or only by private link.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.event_stats AS
SELECT
  e.id AS event_id,
  e.title,
  e.status,
  e.event_date,
  e.type,
  e.start_time,
  e.organizer,
  e.show_on_home,
  e.max_capacity_presencial,
  e.max_capacity_virtual,
  e.offered_dates,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'cancelled') AS total_registered,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('present', 'late')) AS present,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'absent') AS absent,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'sent') AS certificates_sent,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'pending') AS certificates_pending,
  e.is_public
FROM public.events e
LEFT JOIN public.registrations r ON r.event_id = e.id
LEFT JOIN public.attendance a ON a.registration_id = r.id
LEFT JOIN public.certificates c ON c.registration_id = r.id
GROUP BY e.id, e.title, e.status, e.event_date, e.type, e.start_time, e.organizer,
  e.show_on_home, e.max_capacity_presencial, e.max_capacity_virtual, e.offered_dates, e.is_public;
