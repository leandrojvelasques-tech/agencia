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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Secreto de cron/autorización
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || process.env.REMINDERS_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && req.query.secret !== cronSecret) {
    return res.status(401).json({ error: 'No autorizado. Token de cron inválido.' });
  }

  const supabaseUrl = 'https://oaapnglvbkvxyydjnmun.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0';

  const authHeaders = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };

  try {
    // 1. Obtener fecha de hoy y de mañana en Buenos Aires (GMT-3)
    const todayGMT3 = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    const todayStr = todayGMT3.toISOString().split('T')[0];

    const tomorrowGMT3 = new Date(todayGMT3.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrowGMT3.toISOString().split('T')[0];

    console.log(`Buscando eventos para hoy (${todayStr}) y mañana (${tomorrowStr})...`);

    // 2. Obtener todas las plantillas de correo
    const templatesUrl = `${supabaseUrl}/rest/v1/email_templates?select=*`;
    const tempResponse = await safeFetch(templatesUrl, { headers: authHeaders });
    const templatesData = await tempResponse.json();
    const templates = {};
    if (Array.isArray(templatesData)) {
      templatesData.forEach(t => { templates[t.id] = t; });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'Notificaciones Leandro Velasques <onboarding@resend.dev>';

    const results = [];

    // Helper para procesar recordatorios por fecha
    async function processRemindersForDate(dateStr, type) {
      const template = templates[type];
      if (!template) {
        console.warn(`Plantilla "${type}" no encontrada en la base de datos.`);
        return;
      }

      // Obtener eventos publicados para la fecha indicada
      const eventsUrl = `${supabaseUrl}/rest/v1/events?event_date=eq.${dateStr}&status=eq.published&select=*`;
      const eventsRes = await safeFetch(eventsUrl, { headers: authHeaders });
      const events = await eventsRes.json();

      if (!Array.isArray(events) || events.length === 0) {
        console.log(`No hay eventos publicados para la fecha: ${dateStr}`);
        return;
      }

      for (const event of events) {
        console.log(`Procesando recordatorios para el evento: "${event.title}" (${type})`);

        // Obtener inscritos activos (no cancelados)
        const regsUrl = `${supabaseUrl}/rest/v1/registrations?event_id=eq.${event.id}&status=neq.cancelled&select=*,participants(*)`;
        const regsRes = await safeFetch(regsUrl, { headers: authHeaders });
        const registrations = await regsRes.json();

        if (!Array.isArray(registrations) || registrations.length === 0) {
          console.log(`No hay inscriptos para el evento: "${event.title}"`);
          continue;
        }

        // Obtener logs ya enviados para evitar duplicados
        const logsUrl = `${supabaseUrl}/rest/v1/email_logs?event_id=eq.${event.id}&type=eq.${type}&select=recipient_email`;
        const logsRes = await safeFetch(logsUrl, { headers: authHeaders });
        const logsData = await logsRes.json();
        const sentEmails = new Set();
        if (Array.isArray(logsData)) {
          logsData.forEach(log => {
            if (log.recipient_email) sentEmails.add(log.recipient_email.toLowerCase());
          });
        }

        for (const reg of registrations) {
          const participant = reg.participants;
          if (!participant || !participant.email) continue;

          const emailLower = participant.email.toLowerCase();
          if (sentEmails.has(emailLower)) {
            console.log(`Recordatorio "${type}" ya fue enviado anteriormente a: ${participant.email}`);
            continue;
          }

          // Preparar placeholders
          let dateFormatted = event.event_date || '';
          if (reg.selected_date) {
            dateFormatted = reg.selected_date;
          }
          const modalityStr = reg.attendance_mode === 'virtual' ? 'Virtual (Online)' : 'Presencial';
          const protocol = req.headers['x-forwarded-proto'] || 'https';
          const host = req.headers.host || 'www.leandrovelasques.com.ar';
          const domain = `${protocol}://${host}`;
          const eventUrl = `${domain}/evento/${event.slug}`;
          const liveLink = event.live_link || '';

          const placeholders = {
            '{{nombre}}': participant.first_name || '',
            '{{apellido}}': participant.last_name || '',
            '{{evento}}': event.title || '',
            '{{fecha}}': dateFormatted,
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

          // Enviar email
          let status = 'pending';
          let errorMessage = null;

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
                  to: [participant.email],
                  subject: resolvedSubject,
                  html: emailHtml
                }
              });
              const sendResult = await sendResponse.json();
              if (sendResponse.status >= 200 && sendResponse.status < 300) {
                status = 'sent';
              } else {
                status = 'failed';
                errorMessage = sendResult.message || `Error status: ${sendResponse.status}`;
              }
            } catch (err) {
              status = 'failed';
              errorMessage = err.message || String(err);
            }
          } else {
            status = 'simulated';
            errorMessage = 'Simulación: RESEND_API_KEY no configurado en el servidor.';
          }

          // Guardar log del envío
          try {
            await safeFetch(`${supabaseUrl}/rest/v1/email_logs`, {
              method: 'POST',
              headers: {
                ...authHeaders,
                'Prefer': 'return=minimal'
              },
              body: {
                event_id: event.id,
                recipient_email: participant.email,
                recipient_name: `${participant.first_name} ${participant.last_name}`,
                type: type,
                subject: resolvedSubject,
                body: emailHtml,
                status: status,
                error_message: errorMessage
              }
            });
          } catch (dbErr) {
            console.error('Error guardando logs en Supabase:', dbErr);
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

    // Procesar los dos tipos de recordatorios
    // 1. Recordatorio 24hs antes del evento (se busca para eventos de mañana)
    await processRemindersForDate(tomorrowStr, 'reminder_24h');

    // 2. Recordatorio del mismo día (se busca para eventos de hoy)
    await processRemindersForDate(todayStr, 'reminder_same_day');

    return res.status(200).json({
      success: true,
      processed: results.length,
      details: results
    });

  } catch (error) {
    console.error('Error general en send-reminders serverless function:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
};
