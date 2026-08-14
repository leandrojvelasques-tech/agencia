-- Programa efectivamente tratado, incluido opcionalmente en la minuta post-evento.
ALTER TABLE public.event_reports
  ADD COLUMN IF NOT EXISTS program TEXT,
  ADD COLUMN IF NOT EXISTS include_program BOOLEAN NOT NULL DEFAULT TRUE;
