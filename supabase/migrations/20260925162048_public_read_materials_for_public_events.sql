CREATE POLICY "Public can read materials for visible events"
ON public.event_materials
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.events AS e
    WHERE e.id = event_materials.event_id
      AND e.is_public IS TRUE
      AND e.status IN ('published', 'in_progress', 'completed')
  )
);
