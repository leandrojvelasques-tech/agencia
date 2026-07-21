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

    const body = await req.json();
    let registrationId = '';
    let emailType = '';

    // Check if triggered by database webhook
    if (body.type && body.table === 'registrations') {
      const { type, record, old_record } = body;
      registrationId = record.id;
      
      if (type === 'INSERT') {
        emailType = 'welcome';
      } else if (type === 'UPDATE' && record.status === 'cancelled' && old_record.status !== 'cancelled') {
        emailType = 'cancellation';
      } else {
        return new Response(JSON.stringify({ message: 'Ignored webhook trigger' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else {
      // Direct invocation
      registrationId = body.registrationId;
      emailType = body.type;
    }

    if (!emailType) {
      return new Response(JSON.stringify({ error: 'Missing type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch registration, participant, and event
    let reg;
    if (registrationId && registrationId !== 'latest') {
      const { data, error: regErr } = await supabase
        .from('registrations')
        .select('*, participants(*), events(*)')
        .eq('id', registrationId)
        .single();
        
      if (regErr || !data) {
        return new Response(JSON.stringify({ error: `Registration not found: ${regErr?.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      reg = data;
    } else {
      let query = supabase
        .from('registrations')
        .select('*, participants(*), events(*)')
        .order('created_at', { ascending: false });

      if (body.eventId) {
        query = query.eq('event_id', body.eventId);
      }

      const { data, error: regErr } = await query.limit(1);
        
      if (!data || data.length === 0) {
        // If no registrations for this event, construct a mock one
        if (body.eventId) {
          const { data: eventData } = await supabase
            .from('events')
            .select('*')
            .eq('id', body.eventId)
            .single();

          if (eventData) {
            reg = {
              attendance_mode: 'virtual',
              unique_token: 'test-token',
              participants: {
                first_name: 'Juan',
                last_name: 'Pérez',
                email: body.testEmail || 'leandrojvelasques@gmail.com'
              },
              events: eventData
            };
          }
        }

        if (!reg) {
          return new Response(JSON.stringify({ error: `No se encontraron inscripciones ni eventos registrados en el sistema para simular los datos de prueba.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          });
        }
      } else {
        reg = data[0];
      }
    }

    const participant = reg.participants;
    const event = reg.events;

    if (!participant || !event) {
      return new Response(JSON.stringify({ error: 'Participant or event not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Fetch email template
    const { data: template, error: tempErr } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', emailType)
      .single();

    if (tempErr || !template) {
      return new Response(JSON.stringify({ error: `Template "${emailType}" not found` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 3. Format placeholders
    let dateStr = event.event_date || '';
    if (reg.selected_date) {
      dateStr = reg.selected_date;
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
      '{{fecha}}': dateStr,
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

    // 4. Send email helper
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') || Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Notificaciones Leandro Velasques <info@leandrovelasques.com.ar>';

    async function sendAndLogEmail(
      toEmail: string,
      toName: string,
      emailSubject: string,
      htmlContent: string,
      isCoordinator = false,
      replyTo?: string | string[]
    ) {
      let status = 'pending';
      let errorMessage: string | null = null;

      if (brevoApiKey) {
        try {
          console.log(`Intentando enviar correo a: ${toEmail} | Asunto: ${emailSubject}`);
          const payload = {
            sender: parseSender(emailFrom),
            to: [{ email: toEmail, name: toName }],
            subject: emailSubject,
            htmlContent: htmlContent,
            ...(parseReplyTo(replyTo) ? { replyTo: parseReplyTo(replyTo) } : {})
          };
          console.log("Payload enviado a Brevo:", JSON.stringify(payload).substring(0, 500) + "...");
          
          const sendResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          const sendResult = await sendResponse.json();
          console.log(`Respuesta de Brevo (Status ${sendResponse.status}):`, JSON.stringify(sendResult));
          
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
          console.error("Error capturado durante el fetch a Brevo:", err);
        }
      } else {
        status = 'simulated';
        errorMessage = 'Simulación: BREVO_API_KEY no configurado en Supabase.';
      }

      try {
        await supabase.from('email_logs').insert({
          event_id: event.id,
          recipient_email: toEmail,
          recipient_name: toName,
          type: isCoordinator ? `coordinator_${emailType}` : emailType,
          subject: emailSubject,
          body: htmlContent,
          status: status,
          error_message: errorMessage
        });
      } catch (dbErr) {
        console.error('Error guardando logs en Supabase:', dbErr);
      }

      return { status, errorMessage };
    }

    // 5. Setup replyTo arrays
    const coordinators = event.notification_recipients || [];
    const coordinatorEmails = coordinators.map((c: any) => c.email).filter(Boolean);
    const eventReplyTo = coordinatorEmails.length > 0 ? coordinatorEmails : ['leandrojvelasques@gmail.com'];

    // 6. Send email to participant (or test email)
    let participantResult = { status: 'skipped', errorMessage: null as string | null };
    const targetEmail = body.testEmail || participant.email;
    const targetSubject = resolvedSubject;

    if (targetEmail) {
      participantResult = await sendAndLogEmail(
        targetEmail,
        `${participant.first_name} ${participant.last_name}`,
        targetSubject,
        emailHtml,
        false,
        eventReplyTo
      );
    }

    // 7. Send email to coordinators (skip if testEmail is set)
    if (coordinators.length > 0 && !body.testEmail) {
      const isCancellation = emailType === 'cancellation';
      const coordSubject = isCancellation
        ? `[Cancelación] Inscripción cancelada en: ${event.title}`
        : `[Inscripción] Nuevo inscripto en: ${event.title}`;

      const coordTitle = isCancellation ? 'Inscripción Cancelada' : 'Nueva Inscripción';
      const coordIntro = isCancellation
        ? `Se ha cancelado una inscripción para el evento <strong>${event.title}</strong>.`
        : `Se ha registrado una nueva inscripción para el evento <strong>${event.title}</strong>.`;

      let surveyDetails = '';
      if (reg.survey_responses) {
        surveyDetails = '<h3>Respuestas del Formulario:</h3><ul>';
        for (const [key, value] of Object.entries(reg.survey_responses)) {
          if (value !== null && value !== undefined && value !== '') {
            const dispValue = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value;
            surveyDetails += `<li><strong>${key}:</strong> ${dispValue}</li>`;
          }
        }
        surveyDetails += '</ul>';
      }

      const coordHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #0b5e3a; border-bottom: 2px solid #0b5e3a; padding-bottom: 10px;">${coordTitle}</h2>
          <p>${coordIntro}</p>
          <h3>Datos del Participante:</h3>
          <ul>
            <li><strong>Nombre Completo:</strong> ${participant.first_name} ${participant.last_name}</li>
            <li><strong>Email:</strong> ${participant.email || 'No proporcionado'}</li>
            <li><strong>Teléfono:</strong> ${participant.phone || 'No proporcionado'}</li>
            <li><strong>Modalidad elegida:</strong> ${modalityStr}</li>
            <li><strong>Fecha seleccionada:</strong> ${dateStr}</li>
            <li><strong>Observaciones:</strong> ${reg.notes || 'Ninguna'}</li>
          </ul>
          ${surveyDetails}
          <br>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p style="font-size: 11px; color: #777;">Este es un correo automático enviado por el Gestor de Eventos de Leandro Velasques.</p>
        </div>
      `;

      for (const coordinator of coordinators) {
        if (coordinator.email) {
          await sendAndLogEmail(
            coordinator.email,
            coordinator.name || 'Coordinador',
            coordSubject,
            coordHtml,
            true,
            participant.email || undefined
          );
        }
      }
    }

    return new Response(JSON.stringify({ success: true, status: participantResult.status, error: participantResult.errorMessage }), {
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
