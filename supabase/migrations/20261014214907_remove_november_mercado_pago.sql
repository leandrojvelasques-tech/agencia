-- Keep bank transfer as the only payment option for the November workshop.
update public.events
set payment_methods = E'BANCO ICBC\nAlias: LEANDRO.TANGO\nCBU: 0150846601000134863268\nCUIL/CUIT: 20309551665',
    updated_at = now()
where slug = 'chatgpt-work-de-0-a-100-noviembre-2026';
