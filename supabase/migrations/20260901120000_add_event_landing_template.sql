ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS landing_template TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_landing_template_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_landing_template_check
  CHECK (landing_template IN ('standard', 'chatgpt-work'));
