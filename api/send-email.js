const https = require('https');

// Helper to make HTTPS requests without external dependencies
function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Vercel Serverless)',
      'Content-Type': 'application/json',
      ...options.headers
    };

    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: headers
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          json: () => {
            try {
              return Promise.resolve(JSON.parse(data));
            } catch (e) {
              return Promise.resolve(data ? { raw: data } : {});
            }
          }
        });
      });
    });

    req.on('error', (err) => {
      console.error('Socket error in safeFetch:', err);
      reject(err);
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function formatAgendaHtml(agenda) {
  if (!Array.isArray(agenda) || agenda.length === 0) return 'No hay agenda definida para este evento.';
  
  let html = '<div style="font-family: sans-serif; border-left: 3px solid #0b5e3a; padding-left: 15px; margin: 15px 0;">';
  
  if (agenda[0] && 'blocks' in agenda[0]) {
    // New format (nested classes/blocks)
    agenda.forEach((c) => {
      html += `<div style="margin-bottom: 20px;">`;
      html += `<h4 style="margin: 0 0 5px 0; color: #0b5e3a; font-size: 16px;">${c.title}`;
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
      
      if (c.break_duration > 0) {
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
        html += `${item.topic}</p>`;
        html += `</div>`;
      }
    });
  }
  
  html += '</div>';
  return html.replace(/\n/g, ''); // Remove newlines so they are not replaced by <br> in email mapping
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' });
  }

  const { registrationId, type } = req.body;

  if (!registrationId || !type) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: registrationId y type.' });
  }

  if (type !== 'welcome' && type !== 'cancellation') {
    return res.status(400).json({ error: 'El parámetro "type" debe ser "welcome" o "cancellation".' });
  }

  const supabaseUrl = 'https://oaapnglvbkvxyydjnmun.supabase.co';
  // Use service role key if defined in env, otherwise fallback to the default anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0';

  const authHeaders = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };

  try {
    // 1. Obtener la inscripción y sus relaciones (participante y evento)
    const regUrl = `${supabaseUrl}/rest/v1/registrations?id=eq.${registrationId}&select=*,participants(*),events(*)`;
    const regResponse = await safeFetch(regUrl, { headers: authHeaders });
    const regData = await regResponse.json();
    const registration = regData && regData.length > 0 ? regData[0] : null;

    if (!registration) {
      return res.status(404).json({ error: `Inscripción no encontrada para ID: ${registrationId}` });
    }

    const participant = registration.participants;
    const event = registration.events;

    if (!participant || !event) {
      return res.status(404).json({ error: 'Participante o evento asociado no encontrado en la inscripción.' });
    }

    // 2. Obtener la plantilla de correo
    const templateUrl = `${supabaseUrl}/rest/v1/email_templates?id=eq.${type}&select=*`;
    const tempResponse = await safeFetch(templateUrl, { headers: authHeaders });
    const tempData = await tempResponse.json();
    const template = tempData && tempData.length > 0 ? tempData[0] : null;

    if (!template) {
      return res.status(404).json({ error: `Plantilla de correo "${type}" no encontrada.` });
    }

    // 3. Reemplazar placeholders en la plantilla
    // Formatear fecha
    let dateStr = event.event_date || '';
    if (registration.selected_date) {
      dateStr = registration.selected_date;
    }
    
    // Formato de modalidad descriptivo
    const modalityStr = registration.attendance_mode === 'virtual' ? 'Virtual (Online)' : 'Presencial';

    // Generar enlaces dinámicos
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'www.leandrovelasques.com.ar';
    const domain = `${protocol}://${host}`;
    const eventUrl = `${domain}/evento/${event.slug}`;
    const liveLink = event.live_link || '';

    const placeholders = {
      '{{nombre}}': participant.first_name || '',
      '{{apellido}}': participant.last_name || '',
      '{{evento}}': event.title || '',
      '{{fecha}}': dateStr,
      '{{horario}}': event.start_time || '',
      '{{modalidad}}': modalityStr,
      '{{coordinador}}': event.coordinator || 'Leandro Velasques',
      '{{agenda}}': formatAgendaHtml(event.agenda),
      '{{link_inscripcion}}': eventUrl,
      '{{link_evento}}': eventUrl,
      '{{link_reunion}}': liveLink,
      '{{link_acceso}}': liveLink
    };

    let resolvedSubject = template.subject;
    let resolvedBody = template.body;

    for (const [key, value] of Object.entries(placeholders)) {
      resolvedSubject = resolvedSubject.replaceAll(key, value);
      resolvedBody = resolvedBody.replaceAll(key, value);
    }

    const emailHtml = resolvedBody.replace(/\n/g, '<br>');

    // 4. Preparar el envío de email
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'Notificaciones Leandro Velasques <onboarding@resend.dev>';
    
    // Función auxiliar para realizar el envío y registrar el log en Supabase
    async function sendAndLogEmail(toEmail, toName, emailSubject, htmlContent, isCoordinator = false) {
      let status = 'pending';
      let errorMessage = null;

      if (toEmail) {
        if (resendApiKey) {
          try {
            const sendResponse = await safeFetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: {
                from: emailFrom,
                to: [toEmail],
                subject: emailSubject,
                html: htmlContent
              }
            });
            const sendResult = await sendResponse.json();
            if (sendResponse.status >= 200 && sendResponse.status < 300) {
              status = 'sent';
            } else {
              status = 'failed';
              errorMessage = sendResult.message || `Error con código de estado: ${sendResponse.status}`;
            }
          } catch (err) {
            status = 'failed';
            errorMessage = err.message || String(err);
          }
        } else {
          // Simulado
          status = 'simulated';
          errorMessage = 'Simulación: RESEND_API_KEY no configurado en Vercel.';
        }

        // Insertar log en la tabla email_logs
        try {
          await safeFetch(`${supabaseUrl}/rest/v1/email_logs`, {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Prefer': 'return=minimal'
            },
            body: {
              event_id: event.id,
              recipient_email: toEmail,
              recipient_name: toName,
              type: isCoordinator ? `coordinator_${type}` : type,
              subject: emailSubject,
              body: htmlContent,
              status: status,
              error_message: errorMessage
            }
          });
        } catch (dbErr) {
          console.error('Error guardando logs en Supabase:', dbErr);
        }
      }
      return { status, errorMessage };
    }

    // 5. Enviar correo al participante si tiene email registrado
    let participantResult = { status: 'skipped' };
    if (participant.email) {
      participantResult = await sendAndLogEmail(
        participant.email,
        `${participant.first_name} ${participant.last_name}`,
        resolvedSubject,
        emailHtml,
        false
      );
    }

    // 6. Enviar notificaciones a coordinadores/seguidores configurados en el evento
    const coordinators = event.notification_recipients || [];
    const coordinatorResults = [];

    if (coordinators.length > 0) {
      const coordSubject = isCancellation => 
        isCancellation 
          ? `[Cancelación] Inscripción cancelada en: ${event.title}`
          : `[Inscripción] Nuevo inscripto en: ${event.title}`;

      const coordTitle = type === 'cancellation' ? 'Inscripción Cancelada' : 'Nueva Inscripción';
      const coordIntro = type === 'cancellation' 
        ? `Se ha cancelado una inscripción para el evento <strong>${event.title}</strong>.` 
        : `Se ha registrado una nueva inscripción para el evento <strong>${event.title}</strong>.`;

      // Generar detalles de encuesta/formulario si existen
      let surveyDetails = '';
      if (registration.survey_responses) {
        surveyDetails = '<h3>Respuestas del Formulario:</h3><ul>';
        for (const [key, value] of Object.entries(registration.survey_responses)) {
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
            <li><strong>Observaciones:</strong> ${registration.notes || 'Ninguna'}</li>
          </ul>
          ${surveyDetails}
          <br>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p style="font-size: 11px; color: #777;">Este es un correo automático enviado por el Gestor de Eventos de Leandro Velasques.</p>
        </div>
      `;

      for (const coordinator of coordinators) {
        if (coordinator.email) {
          const res = await sendAndLogEmail(
            coordinator.email,
            coordinator.name || 'Coordinador',
            coordSubject(type === 'cancellation'),
            coordHtml,
            true
          );
          coordinatorResults.push({ email: coordinator.email, result: res });
        }
      }
    }

    return res.status(200).json({
      success: true,
      participant: participantResult,
      coordinators: coordinatorResults
    });

  } catch (error) {
    console.error('Error general en send-email serverless function:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
};
