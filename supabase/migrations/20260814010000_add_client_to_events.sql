-- Vincula eventos con clientes del CRM para usar su identidad en las minutas.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_client ON public.events(client_id);
