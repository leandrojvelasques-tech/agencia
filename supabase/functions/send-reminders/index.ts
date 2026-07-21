import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgendaItem {
  time?: string;
  block?: string;
  topic?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  blocks?: Array<{ title?: string; description?: string }>;
}

function formatAgendaHtml(agenda: AgendaItem[] | null | undefined): string {
  if (!Array.isArray(agenda) || agenda.length === 0) return 'No hay agenda definida para este evento.';
  
  let html = '<div style="font-family: sans-serif; border-left: 3px solid #0b5e3a; padding-left: 15px; margin: 15px 0;">';
  
  if (agenda[0] && ('blocks' in agenda[0] || 'title' in agenda[0])) {
    // New format (nested classes/blocks)
    agenda.forEach((c) => {
      html += `<div style="margin-bottom: 20px;">`;
      html += `<h4 style="margin: 0 0 5px 0; color: #0b5e3a; font-size: 16px;">${c.title || 'Clase / Sesión'}`;
      if (c.start_time || c.end_time) {
        html += ` <span style="font-size: 12px; color: #666; font-weight: normal;">(${c.start_time || '—'}${c.end_time ? ` - ${c.end_time}` : ''} hs)</span>`;
      }
      html += `</h4>`;
      
      if (Array.isArray(c.blocks) && c.blocks.length > 0) {
        html += `<div style="margin-left: 15px; border-left: 1px solid #ddd; padding-left: 10px;">`;
        c.blocks.forEach((b) => {
          html += `<div style="margin-bottom: 10px;">`;
          if (b.title) {
            html += `<p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #0b5e3a;">${b.title}</p>`;
          }
          if (b.description) {
            html += `<p style="margin: 2px 0 0 0; font-size: 13px; color: #444; line-height: 1.4;">${b.description}</p>`;
          }
          html += `</div>`;
        });
        html += `</div>`;
      }
      
      if (c.break_duration && c.break_duration > 0) {
        html += `<p style="margin: 5px 0 0 15px; font-size: 12px; color: #0b5e3a; font-style: italic;">☕ Break / Receso (${c.break_duration} min)</p>`;
      }
      html += `</div>`;
    });
  } else {
    // Old format fallback
    agenda.forEach((item) => {
      if (item.topic || item.block) {
        html += `<div style="margin-bottom: 12px;">`;
        let timeHeader = '';
        if (item.time) {
          timeHeader = `<strong style="color: #0b5e3a;">${item.time} hs</strong>: `;
        }
        html += `<p style="margin: 0; font-size: 13px; color: #333;">${timeHeader}`;
        if (item.block) {
          html += `<span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #888;">[${item.block}]</span> `;
        }
        html += `${item.topic || ''}</p>`;
        html += `</div>`;
      }
    });
  }
  
  html += '</div>';
  return html.replace(/\n/g, ''); // Remove newlines so they are not replaced by <br> in email mapping
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '2 horas';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} minutos`;
  }
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  
  if (remainingMinutes === 30) {
    return hours === 1 ? '1 hora y media' : `${hours} horas y media`;
  }
  
  return hours === 1 
    ? `1 hora y ${remainingMinutes} minutos` 
    : `${hours} horas y ${remainingMinutes} minutos`;
}

function buildAccessSectionHtml(attendanceMode: string, liveLink: string, zoomDetails: string, location: string): string {
  let html = '';
  if (attendanceMode === 'virtual') {
    if (liveLink) {
      const isZoom = liveLink.includes('zoom.us');
      let buttonHtml = '';
      if (isZoom) {
        buttonHtml = `
          <a href="${liveLink}" target="_blank" style="display:inline-block; padding:15px 25px; color:#FFFFFF; font-size:15px; line-height:1; font-weight:700; text-decoration:none; border-radius:8px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Zoom_video_communications_logo.svg/120px-Zoom_video_communications_logo.svg.png" width="18" height="18" style="display:inline-block; vertical-align:middle; margin-right:8px; border:0;" alt="Zoom" />
            <span style="vertical-align:middle;">Ingresar a Zoom / Unirse al Encuentro</span>
          </a>
        `;
      } else {
        buttonHtml = `
          <a href="${liveLink}" target="_blank" style="display:inline-block; padding:15px 25px; color:#FFFFFF; font-size:15px; line-height:1; font-weight:700; text-decoration:none; border-radius:8px;">
            Ingresar a la Sala / Unirse al Encuentro
          </a>
        `;
      }
      html += `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; margin: 0 auto;">
          <tr>
            <td align="center" bgcolor="#285A47" style="border-radius:8px;">
              ${buttonHtml}
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0 0; color:#8A9490; font-size:12px; line-height:1.6; text-align:center;">
          Vínculo directo: <a href="${liveLink}" target="_blank" style="color:#285A47; font-weight:bold; text-decoration:none;">${liveLink}</a>
        </p>
      `;
    }
    if (zoomDetails) {
      const formattedZoom = zoomDetails.replace(/\n/g, '<br>');
      
      const idMatch = zoomDetails.match(/(?:ID de reunión|Meeting ID):\s*([0-9\s-]+)/i);
      const passMatch = zoomDetails.match(/(?:Código de acceso|Passcode):\s*([0-9a-zA-Z]+)/i);
      const phoneMatch = zoomDetails.match(/(\+\d+[\d,]*#)/);
      
      const zoomId = idMatch ? idMatch[1].trim() : '';
      const zoomPass = passMatch ? passMatch[1].trim() : '';
      const oneTouchPhone = phoneMatch ? phoneMatch[1].trim() : '';
      
      if (zoomId && zoomPass) {
        html += `
          <div style="margin-top: 20px; text-align: left; background-color: #F4F8F6; border: 1px solid #D1E4DA; border-radius: 12px; padding: 20px; font-family: Arial, sans-serif;">
            <strong style="color: #285A47; font-size: 14px; display: block; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🔑 Datos de Acceso a Zoom:</strong>
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin-bottom:12px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #5A6E65; font-size: 13px; width: 130px; font-weight: bold;">ID de Reunión:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #1E2824; font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px;">${zoomId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #5A6E65; font-size: 13px; font-weight: bold;">Código de acceso:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #1E2824; font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px;">${zoomPass}</td>
              </tr>
              ${oneTouchPhone ? `
              <tr>
                <td style="padding: 8px 0; color: #5A6E65; font-size: 13px; font-weight: bold;">Móvil un toque:</td>
                <td style="padding: 8px 0; color: #285A47; font-size: 13px; font-weight: bold; font-family: monospace;">
                  <a href="tel:${oneTouchPhone}" style="color: #285A47; text-decoration: underline;">${oneTouchPhone}</a>
                </td>
              </tr>
              ` : ''}
            </table>
            
            <div style="border-top: 1px dashed #C8DDD3; padding-top: 12px; margin-top: 6px;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #72857C; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Detalles Completos de la Invitación:</p>
              <div style="font-size: 11px; line-height: 1.45; color: #5A6E65; font-family: monospace; background-color: #FFFFFF; border: 1px solid #E2EDE8; border-radius: 6px; padding: 12px; max-height: 110px; overflow-y: auto; white-space: pre-wrap;">${formattedZoom}</div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="margin-top: 20px; text-align: left; background-color: #F7FAF8; border: 1px solid #D9E8E0; border-radius: 12px; padding: 20px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.55; color: #303A36;">
            <strong style="color: #285A47; font-size: 14px; display: block; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">🔑 Datos de Acceso a la Reunión:</strong>
            <div style="white-space: pre-wrap; font-family: monospace; background: #ffffff; border: 1px solid #e2ece7; border-radius: 6px; padding: 12px; color: #4F4C4D;">${formattedZoom}</div>
          </div>
        `;
      }
    }
    if (!liveLink && !zoomDetails) {
      html += `
        <p style="margin:0; color:#4F4C4D; font-size:14px; line-height:1.6; text-align:center;">
          El enlace de acceso virtual estará disponible próximamente.
        </p>
      `;
    }
  } else {
    const loc = location || 'Sede del Consejo Profesional de Ciencias Económicas del Chubut';
    html += `
      <div style="text-align: left; background-color: #F7FAF8; border: 1px solid #D9E8E0; border-radius: 10px; padding: 18px; font-family: Arial, sans-serif;">
        <strong style="color: #285A47; font-size: 14px; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">📍 Lugar del Encuentro (Presencial):</strong>
        <p style="margin: 0; color: #303A36; font-size: 15px; font-weight: bold;">${loc}</p>
        <p style="margin: 6px 0 0 0; color: #747D79; font-size: 13px; line-height: 1.45;">Te esperamos directamente en la dirección indicada. ¡Por favor planifica tu llegada con tiempo!</p>
      </div>
    `;
  }
  return html.replace(/\n/g, ''); // Remove newlines for template safety
}

function parseSender(emailFrom: string) {
  const match = emailFrom.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "Leandro Velasques", email: emailFrom.trim() };
}

function parseReplyTo(replyTo: any) {
  if (Array.isArray(replyTo) && replyTo.length > 0) {
    return { email: replyTo[0] };
  }
  if (typeof replyTo === 'string' && replyTo.includes('@')) {
    return { email: replyTo };
  }
  return undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const brevoApiKey = Deno.env.get('BREVO_API_KEY') || Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Notificaciones Leandro Velasques <info@leandrovelasques.com.ar>';

    // Parse body for manual/test triggers
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      // Empty body is fine for CRON triggers
    }

    const isManualOrTest = !!(body.eventId || body.testEmail || body.type);

    // 1. Obtener fecha de hoy, mañana y ayer en Buenos Aires (GMT-3)
    const todayGMT3 = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    const todayStr = todayGMT3.toISOString().split('T')[0];
    const currentHour = todayGMT3.getHours();

    const tomorrowGMT3 = new Date(todayGMT3.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrowGMT3.toISOString().split('T')[0];

    console.log(`Buscando eventos para hoy (${todayStr}), mañana (${tomorrowStr})... Hora actual: ${currentHour}hs`);

    // 2. Obtener todas las plantillas de correo
    const { data: templatesData, error: tempErr } = await supabase
      .from('email_templates')
      .select('*');

    if (tempErr || !templatesData) {
      return new Response(JSON.stringify({ error: `Templates not loaded: ${tempErr?.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const templates: Record<string, any> = {};
    templatesData.forEach(t => { templates[t.id] = t; });

    const results: any[] = [];

    // Helper para procesar recordatorios
    async function processRemindersForDate(dateStr: string, type: string) {
      const template = templates[type];
      if (!template) {
        console.warn(`Plantilla "${type}" no encontrada en la base de datos.`);
        return;
      }

      // Validar hora de envío si no es ejecución manual o de test
      const sendTime = template.send_time || '08:00';
      const scheduledHour = parseInt(sendTime.split(':')[0], 10);
      if (!isManualOrTest && scheduledHour !== currentHour) {
        console.log(`Omitiendo recordatorio "${type}" porque está programado para las ${sendTime} y la hora actual es ${currentHour}hs.`);
        return;
      }

      // Obtener eventos publicados para la fecha (o el evento específico si es manual)
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'published');

      if (body.eventId) {
        query = query.eq('id', body.eventId);
      } else {
        query = query.eq('event_date', dateStr);
      }

      const { data: events, error: evErr } = await query;

      if (evErr || !events || events.length === 0) {
        console.log(`No hay eventos coincidentes para procesar en la fecha: ${dateStr} (Recordatorio: ${type})`);
        return;
      }

      for (const event of events) {
        // Validar si el recordatorio está activo para este evento en particular
        let isReminderEnabled = true;
        if (type === 'reminder_48h') isReminderEnabled = event.send_reminder_48h !== false;
        else if (type === 'reminder_24h') isReminderEnabled = event.send_reminder_24h !== false;
        else if (type === 'reminder_same_day') isReminderEnabled = event.send_reminder_same_day !== false;
        else if (type === 'reminder_next_day') {
          isReminderEnabled = event.send_reminder_next_day === true && event.has_satisfaction_survey === true;
        }

        if (!isReminderEnabled) {
          console.log(`Recordatorio "${type}" desactivado para el evento: "${event.title}". Omitiendo.`);
          continue;
        }

        console.log(`Procesando recordatorio "${type}" para el evento: "${event.title}"`);

        // Obtener inscritos activos
        let regQuery = supabase
          .from('registrations')
          .select('*, participants(*)')
          .eq('event_id', event.id)
          .neq('status', 'cancelled');

        let registrations: any[] = [];
        if (body.testEmail) {
          // Simulación de prueba para Leandro
          const { data: testRegs } = await regQuery;
          const matchingReg = testRegs?.find(r => r.participants?.email?.toLowerCase() === body.testEmail.toLowerCase());
          if (matchingReg) {
            registrations = [matchingReg];
          } else {
            registrations = [{
              attendance_mode: 'virtual',
              unique_token: 'test-token-reminder',
              participants: {
                first_name: 'Juan (Test)',
                last_name: 'Pérez',
                email: body.testEmail
              }
            }];
          }
        } else {
          const { data: regData, error: regErr } = await regQuery;
          if (regErr || !regData || regData.length === 0) {
            console.log(`No hay inscriptos para el evento: "${event.title}"`);
            continue;
          }
          registrations = regData;
        }

        // Obtener logs ya enviados para evitar duplicados (sólo si no es un correo de prueba específico)
        const sentEmails = new Set();
        if (!body.testEmail) {
          const { data: logsData } = await supabase
            .from('email_logs')
            .select('recipient_email')
            .eq('event_id', event.id)
            .eq('type', type);

          if (logsData) {
            logsData.forEach(log => {
              if (log.recipient_email) sentEmails.add(log.recipient_email.toLowerCase());
            });
          }
        }

        for (const reg of registrations) {
          const participant = reg.participants;
          if (!participant || !participant.email) continue;

          const emailLower = participant.email.toLowerCase();
          if (!body.testEmail && sentEmails.has(emailLower)) {
            console.log(`Recordatorio "${type}" ya fue enviado anteriormente a: ${participant.email}`);
            continue;
          }

          // Preparar placeholders
          let dateFormatted = event.event_date || '';
          if (reg.selected_date) {
            dateFormatted = reg.selected_date;
          }
          const modalityStr = reg.attendance_mode === 'virtual' ? 'Virtual (Online)' : 'Presencial';
          const domain = 'https://www.leandrovelasques.com.ar';
          const eventUrl = `${domain}/evento/${event.slug}`;
          const liveLink = event.live_link || '';

          const accessSectionHtml = buildAccessSectionHtml(
            reg.attendance_mode || 'presencial',
            event.live_link || '',
            event.zoom_details || '',
            event.location || ''
          );

          let tipoEventoStr = 'Taller';
          if (event.type === 'charla') {
            tipoEventoStr = 'Charla';
          }
          if (event.title.toLowerCase().includes('inteligencia artificial') || event.title.toLowerCase().includes('ia ')) {
            tipoEventoStr = 'Taller de Inteligencia Artificial';
          } else if (event.title.toLowerCase().includes('tango')) {
            tipoEventoStr = 'Clase de Tango';
          }

          const placeholders: Record<string, string> = {
            '{{nombre}}': participant.first_name || '',
            '{{apellido}}': participant.last_name || '',
            '{{evento}}': event.title || '',
            '{{fecha}}': dateFormatted,
            '{{horario}}': event.start_time || '',
            '{{modalidad}}': modalityStr,
            '{{tipo_evento}}': tipoEventoStr,
            '{{duracion}}': formatDuration(event.duration_minutes),
            '{{coordinador}}': event.coordinator || 'Leandro Velasques',
            '{{agenda}}': formatAgendaHtml(event.agenda),
            '{{link_inscripcion}}': eventUrl,
            '{{link_evento}}': eventUrl,
            '{{link_reunion}}': liveLink,
            '{{link_acceso}}': liveLink,
            '{{seccion_acceso}}': accessSectionHtml,
            '{{link_encuesta}}': `${domain}/encuesta/${event.slug}`,
            '{{link_cancelacion}}': `https://www.leandrovelasques.com.ar/cancelar.html?token=${reg.unique_token}`
          };

          let resolvedSubject = template.subject;
          let resolvedBody = template.body;

          for (const [key, value] of Object.entries(placeholders)) {
            resolvedSubject = resolvedSubject.replaceAll(key, value);
            resolvedBody = resolvedBody.replaceAll(key, value);
          }

          const emailHtml = resolvedBody.trim().startsWith('<') || resolvedBody.includes('<div') || resolvedBody.includes('<table') || resolvedBody.includes('<html')
            ? resolvedBody
            : resolvedBody.replace(/\n/g, '<br>');

          // Preparar replyTo
          const coordinators = event.notification_recipients || [];
          const coordinatorEmails = coordinators.map((c: any) => c.email).filter(Boolean);
          const replyTo = coordinatorEmails.length > 0 ? coordinatorEmails : ['leandrojvelasques@gmail.com'];

          // Enviar email
          let status = 'pending';
          let errorMessage = null;

          if (brevoApiKey) {
            try {
              const sendResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                  'api-key': brevoApiKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  sender: parseSender(emailFrom),
                  to: [{ email: participant.email, name: `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || 'Participante' }],
                  subject: resolvedSubject,
                  htmlContent: emailHtml,
                  ...(parseReplyTo(replyTo) ? { replyTo: parseReplyTo(replyTo) } : {})
                })
              });
              const sendResult = await sendResponse.json();
              if (sendResponse.status >= 200 && sendResponse.status < 300) {
                status = 'sent';
                errorMessage = `SUCCESS: ${JSON.stringify(sendResult)}`;
              } else {
                status = 'failed';
                errorMessage = sendResult.message || `Error status: ${sendResponse.status}`;
              }
            } catch (err: any) {
              status = 'failed';
              errorMessage = err.message || String(err);
            }
          } else {
            status = 'simulated';
            errorMessage = 'Simulación: BREVO_API_KEY no configurado en Supabase.';
          }

          // Guardar log si no es una prueba específica para Leandro
          if (!body.testEmail) {
            try {
              await supabase.from('email_logs').insert({
                event_id: event.id,
                recipient_email: participant.email,
                recipient_name: `${participant.first_name} ${participant.last_name}`,
                type: type,
                subject: resolvedSubject,
                body: emailHtml,
                status: status,
                error_message: errorMessage
              });
            } catch (dbErr) {
              console.error('Error guardando logs en Supabase:', dbErr);
            }
          }

          results.push({
            email: participant.email,
            event: event.title,
            type: type,
            status: status,
            error: errorMessage
          });
        }
      }
    }

    if (body.type) {
      if (body.type === 'reminder_48h') {
        const afterTomorrowGMT3 = new Date(todayGMT3.getTime() + 2 * 24 * 60 * 60 * 1000);
        const afterTomorrowStr = afterTomorrowGMT3.toISOString().split('T')[0];
        await processRemindersForDate(afterTomorrowStr, 'reminder_48h');
      } else if (body.type === 'reminder_24h') {
        await processRemindersForDate(tomorrowStr, 'reminder_24h');
      } else if (body.type === 'reminder_same_day') {
        await processRemindersForDate(todayStr, 'reminder_same_day');
      } else if (body.type === 'reminder_next_day') {
        const yesterdayGMT3 = new Date(todayGMT3.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterdayGMT3.toISOString().split('T')[0];
        await processRemindersForDate(yesterdayStr, 'reminder_next_day');
      }
    } else {
      // 1. Procesar recordatorio de 48hs antes del evento (para pasado mañana)
      const afterTomorrowGMT3 = new Date(todayGMT3.getTime() + 2 * 24 * 60 * 60 * 1000);
      const afterTomorrowStr = afterTomorrowGMT3.toISOString().split('T')[0];
      await processRemindersForDate(afterTomorrowStr, 'reminder_48h');

      // 2. Procesar recordatorio de 24hs antes del evento (para mañana)
      await processRemindersForDate(tomorrowStr, 'reminder_24h');

      // 3. Procesar recordatorio del mismo día (para hoy)
      await processRemindersForDate(todayStr, 'reminder_same_day');

      // 4. Procesar recordatorio del día siguiente (para ayer)
      const yesterdayGMT3 = new Date(todayGMT3.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterdayGMT3.toISOString().split('T')[0];
      await processRemindersForDate(yesterdayStr, 'reminder_next_day');
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
