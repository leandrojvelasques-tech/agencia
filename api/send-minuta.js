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

  const {
    eventTitle,
    eventDate,
    coordinator,
    summary,
    observations = [],
    photoUrl,
    presentationLink,
    extraFiles = [],
    attendees = [],
    emails = [],
    surveyLink
  } = req.body;

  if (emails.length === 0) {
    return res.status(400).json({ error: 'No se especificaron destinatarios (emails).' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Notificaciones Leandro Velasques <onboarding@resend.dev>';

  if (!resendApiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY no está configurado en las variables de entorno de Vercel.' });
  }

  try {
    // Format date in Spanish (es-AR)
    let formattedDate = eventDate || '';
    if (eventDate) {
      try {
        const dateObj = new Date(eventDate + 'T12:00:00');
        formattedDate = dateObj.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } catch (e) {
        console.error('Error formatting date:', e);
      }
    }

    // Construct attendees HTML section
    let attendeesHtml = '';
    if (Array.isArray(attendees) && attendees.length > 0) {
      attendeesHtml = `
        <div style="margin-top: 12px; border-top: 1px solid rgba(40, 90, 71, 0.1); padding-top: 12px;">
          <p style="margin: 0; font-weight: bold; color: #285A47;">Asistentes:</p>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 13px; line-height: 1.45;">
            ${attendees.join(', ')}
          </p>
        </div>
      `;
    }

    // Construct photo HTML section
    let photoHtml = '';
    if (photoUrl) {
      photoHtml = `
        <div style="margin-bottom: 25px; text-align: center;">
          <img src="${photoUrl}" alt="Foto del evento" style="max-width: 100%; height: auto; max-height: 320px; object-fit: cover; border-radius: 10px; border: 1px solid #eee; display: block; margin: 0 auto;" />
        </div>
      `;
    }

    // Construct observations HTML section
    let observationsHtml = '';
    if (Array.isArray(observations) && observations.length > 0) {
      observationsHtml = `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #285A47; font-size: 16px; border-bottom: 2px solid #f3f7f5; padding-bottom: 8px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">Observaciones y Próximos Pasos</h3>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 15px; font-size: 14px; font-family: sans-serif;">
            ${observations.map((obs, idx) => `
              <div style="margin-bottom: ${idx < observations.length - 1 ? '15px' : '0'}; ${idx > 0 ? 'border-top: 1px solid #fef3c7; padding-top: 15px; margin-top: 15px;' : ''}">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px;">Observación ${idx + 1}</p>
                <p style="margin: 0; line-height: 1.5; color: #451a03; white-space: pre-wrap;">${obs}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Construct attachments/materials HTML section
    let materialsHtml = '';
    const hasPresentation = !!presentationLink;
    const hasPhoto = !!photoUrl;
    const hasExtra = Array.isArray(extraFiles) && extraFiles.length > 0 && !!extraFiles[0];

    if (hasPresentation || hasPhoto || hasExtra) {
      materialsHtml = `
        <div style="margin-top: 30px; padding-top: 25px; border-top: 1px dashed #e5e7eb; font-family: sans-serif;">
          <h3 style="color: #285A47; font-size: 16px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">Materiales del Evento</h3>
          <div style="margin-top: 15px;">
      `;

      if (hasPresentation) {
        materialsHtml += `
          <div style="margin-bottom: 12px;">
            <a href="${presentationLink}" target="_blank" style="display: inline-block; padding: 10px 18px; background-color: #285A47; border-radius: 6px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif;">
              📄 Ver Presentación Utilizada (PDF / Diapositivas)
            </a>
          </div>
        `;
      }

      if (hasPhoto) {
        materialsHtml += `
          <div style="margin-bottom: 12px;">
            <a href="${photoUrl}" target="_blank" style="display: inline-block; padding: 10px 18px; background-color: #f3f7f5; border: 1px solid #285A47; border-radius: 6px; font-size: 13px; font-weight: bold; color: #285A47; text-decoration: none; font-family: sans-serif;">
              📸 Ver Álbum / Foto del Evento
            </a>
          </div>
        `;
      }

      if (hasExtra) {
        materialsHtml += `
          <div style="margin-bottom: 12px;">
            <a href="${extraFiles[0]}" target="_blank" style="display: inline-block; padding: 10px 18px; background-color: #ededed; border-radius: 6px; font-size: 13px; font-weight: bold; color: #333333; text-decoration: none; font-family: sans-serif;">
              📂 Ver Archivos Adicionales
            </a>
          </div>
        `;
      }

      materialsHtml += `
          </div>
        </div>
      `;
    }

    // Build the final HTML email body
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Minuta - ${eventTitle}</title>
      </head>
      <body style="font-family: sans-serif; color: #333333; background-color: #f9f9f9; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #eeeeee; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <div style="background-color: #285A47; padding: 35px 30px; text-align: center; color: #ffffff; font-family: sans-serif;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.5px;">¡Gracias por participar!</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.85; font-weight: 500;">Resumen del evento: ${eventTitle}</p>
          </div>
          
          <!-- Content Body -->
          <div style="padding: 30px; font-family: sans-serif;">
            <!-- Metadata Box -->
            <div style="background-color: #f3f7f5; border: 1px solid #e1ede8; border-radius: 8px; padding: 18px; margin-bottom: 25px; font-size: 14px; color: #2e4a3f; font-family: sans-serif;">
              <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${formattedDate}</p>
              <p style="margin: 0;"><strong>Coordinador:</strong> ${coordinator}</p>
              ${attendeesHtml}
            </div>

            <!-- Optional Image -->
            ${photoHtml}

            <!-- Summary Section -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #285A47; font-size: 16px; border-bottom: 2px solid #f3f7f5; padding-bottom: 8px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">Resumen del Evento</h3>
              <div style="font-size: 15px; line-height: 1.6; color: #444444; border-left: 3px solid #285A47; padding-left: 15px; white-space: pre-wrap; font-family: sans-serif;">${summary}</div>
            </div>

            <!-- Observations Section -->
            ${observationsHtml}

            <!-- Material Attachments -->
            ${materialsHtml}

            <!-- Survey Callout Section -->
            ${surveyLink ? `
              <div style="margin-top: 30px; padding: 22px; bg-color: #fffbeb; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; text-align: center; font-family: sans-serif;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #b45309;">⭐ ¡Tu opinión nos importa!</p>
                <p style="margin: 0 0 15px 0; font-size: 12px; color: #78350f; line-height: 1.45;">Te invitamos a responder una breve encuesta de satisfacción de 5 preguntas sobre tu experiencia.</p>
                <a href="${surveyLink}" target="_blank" style="display: inline-block; padding: 11px 22px; background-color: #d97706; border-radius: 6px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif; box-shadow: 0 2px 4px rgba(217, 119, 6, 0.15);">
                  Completar Encuesta de Satisfacción
                </a>
              </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;" />
            <p style="font-size: 11px; color: #999999; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 0; font-weight: bold; font-family: sans-serif;">Enviado por Leandro Velasques</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Resend email sending payload:
    // To respect attendee privacy, send to the first email, and set the rest in bcc.
    const toField = [emails[0]];
    const bccField = emails.slice(1);

    const emailPayload = {
      from: emailFrom,
      to: toField,
      subject: `Minuta - ${eventTitle}`,
      html: emailHtml
    };

    if (bccField.length > 0) {
      emailPayload.bcc = bccField;
    }

    console.log('Sending request to Resend API...', { to: toField, bccCount: bccField.length });

    const resendResponse = await safeFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: emailPayload
    });

    const resendResult = await resendResponse.json();

    if (resendResponse.status >= 200 && resendResponse.status < 300) {
      return res.status(200).json({ success: true, messageId: resendResult.id });
    } else {
      console.error('Resend API returned error:', resendResult);
      return res.status(resendResponse.status).json({
        error: `Resend respondió con error ${resendResponse.status}`,
        details: resendResult
      });
    }
  } catch (err) {
    console.error('Error in send-minuta serverless route:', err);
    return res.status(500).json({ error: 'Error interno en la API al procesar el correo: ' + err.message });
  }
};
