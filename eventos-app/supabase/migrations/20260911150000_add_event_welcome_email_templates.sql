alter table public.events
  add column if not exists welcome_email_template_id text;

insert into public.email_templates (id, name, subject, body, send_time)
select
  'welcome_chatgpt_work',
  'Bienvenida · ChatGPT Work',
  subject,
  replace(
    body,
    '<!-- Pie institucional -->',
    '<!-- Información específica de ChatGPT Work -->
<tr>
  <td style="padding:0 36px 28px 36px;">
    <div style="background-color:#F1F7F4; border-left:4px solid #A8D5C1; border-radius:6px; padding:16px 18px;">
      <p style="margin:0 0 10px 0; color:#4F4C4D; font-size:14px; line-height:1.65;"><strong style="color:#285A47;">Esta inscripción comprende las dos jornadas</strong> del workshop, el jueves 24 y viernes 25 de septiembre de 2026, de 14:00 a 16:30 hs.</p>
      <p style="margin:0 0 10px 0; color:#4F4C4D; font-size:14px; line-height:1.65;">Dentro de las 24 horas previas al evento recibirás el recordatorio y el enlace de Zoom para conectarte.</p>
      <p style="margin:0; color:#4F4C4D; font-size:14px; line-height:1.65;">Por consultas, podés comunicarte con la Delegación Comodoro del Consejo Profesional de Ciencias Económicas del Chubut, de 9:00 a 15:00 hs, por WhatsApp al <strong>+54 9 2974 08-6332</strong> o por correo a <a href="mailto:comodoro@cpcechubut.org.ar" style="color:#285A47; font-weight:700;">comodoro@cpcechubut.org.ar</a>.</p>
    </div>
  </td>
</tr>

<!-- Pie institucional -->'
  ),
  send_time
from public.email_templates
where id = 'welcome'
on conflict (id) do update set
  name = excluded.name,
  subject = excluded.subject,
  body = excluded.body,
  send_time = excluded.send_time,
  updated_at = now();

update public.events
set welcome_email_template_id = 'welcome_chatgpt_work'
where id = '68f818b4-a1ca-44af-bd03-8cf158d12a64';

update public.events
set welcome_email_template_id = 'welcome'
where welcome_email_template_id is null;
