ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_variant TEXT NOT NULL DEFAULT 'council';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_registration_variant_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_registration_variant_check
  CHECK (registration_variant IN ('council', 'company'));

UPDATE public.events
SET registration_variant = 'company',
    client_logo_url = '/oveon-logo.png',
    has_survey = false,
    survey_questions = '[]'::jsonb
WHERE id = 'ac30fc9b-6753-406b-81d5-7ac5d48d0a85';
