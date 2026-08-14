const https = require('https');

// Helper to make HTTPS requests without external dependencies
function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Serialize body BEFORE setting headers so we can compute Content-Length
    const bodyStr = options.body
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Vercel Serverless)',
      'Content-Type': 'application/json',
      ...options.headers
    };

    // CRITICAL: Set Content-Length to avoid chunked encoding issues with large payloads
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr, 'utf8');
    }

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

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function parseSender(emailFrom) {
  const match = emailFrom.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "Leandro Velasques", email: emailFrom.trim() };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    program,
    client,
    observations = [],
    photoUrl,
    presentationLink,
    attachedSlideInfo,
    extraFiles = [],
    attendees = [],
    emails = [],
    surveyLink,
    attendanceLink
  } = req.body;

  if (emails.length === 0) {
    return res.status(400).json({ error: 'No se especificaron destinatarios (emails).' });
  }

  const brevoApiKey = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Notificaciones Leandro Velasques <info@leandrovelasques.com.ar>';

  if (!brevoApiKey) {
    return res.status(500).json({ error: 'BREVO_API_KEY no está configurado en las variables de entorno de Vercel.' });
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

    // Helper to ensure absolute URLs in email HTML
    const reqOrigin = req.headers.origin || (req.headers.host ? (req.headers.host.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`) : 'https://leandrovelasques.tech');

    const ensureAbsoluteUrl = (url) => {
      if (!url) return '';
      url = String(url).trim();
      if (!url) return '';
      if (/^https?:\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
      if (url.startsWith('/')) {
        return `${reqOrigin}${url}`;
      }
      return `https://${url}`;
    };

    const finalPresentationLink = ensureAbsoluteUrl(presentationLink);
    const finalPhotoUrl = ensureAbsoluteUrl(photoUrl);
    const finalExtraFiles = Array.isArray(extraFiles)
      ? extraFiles.map(ensureAbsoluteUrl).filter(Boolean)
      : (extraFiles ? [ensureAbsoluteUrl(extraFiles)] : []);
    const finalAttendanceLink = ensureAbsoluteUrl(attendanceLink);
    const finalSurveyLink = ensureAbsoluteUrl(surveyLink);
    const clientName = client?.name ? escapeHtml(client.name) : '';
    const clientLogoUrl = client?.logoUrl ? escapeHtml(ensureAbsoluteUrl(client.logoUrl)) : '';
    const clientHeaderHtml = clientName ? `
      <div style="background-color: #ffffff; padding: 14px 24px; text-align: center; border-bottom: 1px solid #e1ede8; font-family: sans-serif;">
        ${clientLogoUrl ? `<img src="${clientLogoUrl}" alt="Logo de ${clientName}" style="display: block; max-width: 150px; max-height: 52px; width: auto; height: auto; margin: 0 auto 7px; object-fit: contain;" />` : ''}
        <p style="margin: 0; font-size: 11px; font-weight: 700; color: #4F4C4D; text-transform: uppercase; letter-spacing: 0.8px;">Evento realizado para ${clientName}</p>
      </div>
    ` : '';
    const programHtml = program && String(program).trim() ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #285A47; font-size: 16px; border-bottom: 2px solid #f3f7f5; padding-bottom: 8px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">Programa tratado</h3>
        <div style="font-size: 14px; line-height: 1.6; color: #444444; background-color: #f3f7f5; border: 1px solid #e1ede8; border-radius: 8px; padding: 15px; white-space: pre-wrap; font-family: sans-serif;">${escapeHtml(program)}</div>
      </div>
    ` : '';

    // Construct photo HTML section
    let photoHtml = '';
    if (finalPhotoUrl) {
      photoHtml = `
        <div style="margin-bottom: 25px; text-align: center;">
          <img src="${finalPhotoUrl}" alt="Foto del evento" style="max-width: 100%; height: auto; max-height: 320px; object-fit: cover; border-radius: 10px; border: 1px solid #eee; display: block; margin: 0 auto;" />
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

    // Construct attached slide HTML section
    let slideHtml = '';
    if (attachedSlideInfo) {
      const slideMediaUrl = ensureAbsoluteUrl(attachedSlideInfo.mediaUrl);
      slideHtml = `
        <div style="margin-bottom: 30px; border: 1px solid #a7f3d0; background-color: #f0fdf4; border-radius: 10px; padding: 20px; font-family: sans-serif;">
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Diapositiva Destacada / Portada</span>
          </div>
          ${slideMediaUrl ? `
            <div style="text-align: center; margin-bottom: 15px;">
              ${finalPresentationLink ? `<a href="${finalPresentationLink}" target="_blank" title="Haz clic para ver la presentación completa" style="text-decoration: none; display: inline-block;">` : ''}
                <img src="${slideMediaUrl}" alt="${attachedSlideInfo.slideTitle || 'Slide'}" style="max-width: 100%; height: auto; max-height: 320px; object-fit: contain; border-radius: 8px; border: 1px solid #d1fae5;" />
              ${finalPresentationLink ? `</a>` : ''}
            </div>
          ` : ''}
          ${attachedSlideInfo.ficha ? `
            <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin-bottom: 15px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #065f46;">${attachedSlideInfo.ficha.title || attachedSlideInfo.slideTitle}</h4>
              ${attachedSlideInfo.ficha.summary ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #374151; line-height: 1.5;">${attachedSlideInfo.ficha.summary}</p>` : ''}
              ${attachedSlideInfo.ficha.closingIdea ? `<p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 700; font-style: italic; color: #047857; border-top: 1px solid #ecfdf5; padding-top: 8px;">💡 Idea Clave: ${attachedSlideInfo.ficha.closingIdea}</p>` : ''}
            </div>
          ` : ''}
          ${finalPresentationLink ? `
            <div style="margin-top: 15px; text-align: center;">
              <a href="${finalPresentationLink}" target="_blank" style="display: inline-block; padding: 12px 22px; background-color: #285A47; border-radius: 6px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif; box-shadow: 0 2px 6px rgba(40, 90, 71, 0.2);">
                📊 Ver Presentación Completa (Todas las Diapositivas)
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Construct attachments/materials HTML section
    let materialsHtml = '';
    const hasPresentation = !!finalPresentationLink;
    const hasPhoto = !!finalPhotoUrl;
    const hasExtra = finalExtraFiles.length > 0;

    if (hasPresentation || hasPhoto || hasExtra) {
      materialsHtml = `
        <div style="margin-top: 30px; padding-top: 25px; border-top: 1px dashed #e5e7eb; font-family: sans-serif;">
          <h3 style="color: #285A47; font-size: 16px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">Materiales del Evento</h3>
          <div style="margin-top: 15px;">
      `;

      if (hasPresentation) {
        materialsHtml += `
          <div style="margin-bottom: 12px;">
            <a href="${finalPresentationLink}" target="_blank" style="display: inline-block; padding: 10px 18px; background-color: #285A47; border-radius: 6px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif;">
              📄 Ver Presentación Utilizada (PDF / Diapositivas)
            </a>
          </div>
        `;
      }

      if (hasPhoto) {
        materialsHtml += `
          <div style="margin-bottom: 12px;">
            <a href="${finalPhotoUrl}" target="_blank" style="display: inline-block; padding: 10px 18px; background-color: #f3f7f5; border: 1px solid #285A47; border-radius: 6px; font-size: 13px; font-weight: bold; color: #285A47; text-decoration: none; font-family: sans-serif;">
              📸 Ver Álbum / Foto del Evento
            </a>
          </div>
        `;
      }

      if (hasExtra) {
        materialsHtml += `
          <div style="margin-bottom: 12px;">
            <a href="${finalExtraFiles[0]}" target="_blank" style="display: inline-block; padding: 10px 18px; background-color: #1e3a8a; border-radius: 6px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif;">
              🎥 Ver / Descargar Grabación del Evento
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
          <!-- Client letterhead -->
          ${clientHeaderHtml}
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
            </div>

            <!-- Optional Image -->
            ${photoHtml}

            <!-- Summary Section -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #285A47; font-size: 16px; border-bottom: 2px solid #f3f7f5; padding-bottom: 8px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">Resumen del Evento</h3>
              <div style="font-size: 15px; line-height: 1.6; color: #444444; border-left: 3px solid #285A47; padding-left: 15px; white-space: pre-wrap; font-family: sans-serif;">${summary}</div>
            </div>

            <!-- Program Section -->
            ${programHtml}

            <!-- Observations Section -->
            ${observationsHtml}

            <!-- Attached Slide / Ficha de estudio -->
            ${slideHtml}

            <!-- Material Attachments -->
            ${materialsHtml}

            <!-- Attendance Link Callout Section -->
            ${finalAttendanceLink ? `
              <div style="margin-top: 25px; padding: 18px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; text-align: center; font-family: sans-serif;">
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #166534;">📋 ¿Estuviste presente y no pudiste marcar asistencia?</p>
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #15803d; line-height: 1.4;">Podés registrar tu presente directamente desde el siguiente enlace:</p>
                <a href="${finalAttendanceLink}" target="_blank" style="display: inline-block; padding: 9px 18px; background-color: #166534; border-radius: 6px; font-size: 12px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif;">
                  Marcar Mi Asistencia
                </a>
              </div>
            ` : ''}

            <!-- Survey Callout Section -->
            ${finalSurveyLink ? `
              <div style="margin-top: 25px; padding: 22px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; text-align: center; font-family: sans-serif;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #b45309;">⭐ ¡Tu opinión nos importa!</p>
                <p style="margin: 0 0 15px 0; font-size: 12px; color: #78350f; line-height: 1.45;">Te invitamos a responder una breve encuesta de satisfacción de 5 preguntas sobre tu experiencia.</p>
                <a href="${finalSurveyLink}" target="_blank" style="display: inline-block; padding: 11px 22px; background-color: #d97706; border-radius: 6px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: sans-serif; box-shadow: 0 2px 4px rgba(217, 119, 6, 0.15);">
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

    // Brevo email sending: send in batches of max 49 BCC per API call
    // to avoid timeouts and Brevo limits (max 99 recipients per message version)
    const BATCH_SIZE = 49;
    const senderObj = parseSender(emailFrom);
    const subject = req.body.subject || (surveyLink && (!summary || summary.includes('prueba') || summary.includes('encuesta')) ? `Encuesta de Satisfacción - ${eventTitle}` : `Minuta - ${eventTitle}`);

    // Build full recipient list
    let allRecipients = [...emails];
    
    // Auto-include sender email so coordinator always gets a copy
    if (senderObj.email && !allRecipients.some(e => e.toLowerCase() === senderObj.email.toLowerCase())) {
      allRecipients.push(senderObj.email);
    }

    console.log(`Total recipients: ${allRecipients.length}, will send in batches of ${BATCH_SIZE + 1}`);

    // Split into batches: each batch = 1 TO + up to BATCH_SIZE BCC
    const batches = [];
    for (let i = 0; i < allRecipients.length; i += BATCH_SIZE + 1) {
      const batchEmails = allRecipients.slice(i, i + BATCH_SIZE + 1);
      batches.push(batchEmails);
    }

    console.log(`Sending ${batches.length} batch(es) to Brevo...`);

    const results = [];
    const errors = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchEmails = batches[batchIndex];
      const toField = [{ email: batchEmails[0] }];
      const bccField = batchEmails.slice(1).map(email => ({ email }));

      const emailPayload = {
        sender: senderObj,
        to: toField,
        subject: subject,
        htmlContent: emailHtml
      };

      if (bccField.length > 0) {
        emailPayload.bcc = bccField;
      }

      const payloadSize = JSON.stringify(emailPayload).length;
      console.log(`Batch ${batchIndex + 1}/${batches.length}: TO=${batchEmails[0]}, BCC=${bccField.length}, payloadSize=${payloadSize} bytes`);

      try {
        const brevoResponse = await safeFetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json'
          },
          body: emailPayload
        });

        const brevoResult = await brevoResponse.json();

        if (brevoResponse.status >= 200 && brevoResponse.status < 300) {
          console.log(`Batch ${batchIndex + 1} SUCCESS: messageId=${brevoResult.messageId || brevoResult.id}`);
          results.push({ batch: batchIndex + 1, success: true, messageId: brevoResult.messageId || brevoResult.id, count: batchEmails.length });
        } else {
          console.error(`Batch ${batchIndex + 1} FAILED (${brevoResponse.status}):`, brevoResult);
          const detailMsg = brevoResult?.message || brevoResult?.code || JSON.stringify(brevoResult);
          errors.push({ batch: batchIndex + 1, error: `Brevo (${brevoResponse.status}): ${detailMsg}`, count: batchEmails.length });
        }
      } catch (batchErr) {
        console.error(`Batch ${batchIndex + 1} EXCEPTION:`, batchErr.message);
        errors.push({ batch: batchIndex + 1, error: batchErr.message, count: batchEmails.length });
      }
    }

    const totalSent = results.reduce((sum, r) => sum + r.count, 0);
    const totalFailed = errors.reduce((sum, e) => sum + e.count, 0);

    console.log(`Finished: ${totalSent} sent, ${totalFailed} failed across ${batches.length} batches`);

    if (errors.length > 0 && results.length === 0) {
      // All batches failed
      return res.status(200).json({
        error: `Todos los lotes fallaron: ${errors.map(e => e.error).join('; ')}`,
        details: { results, errors, totalSent, totalFailed }
      });
    }

    return res.status(200).json({
      success: true,
      messageId: results[0]?.messageId,
      totalSent,
      totalFailed,
      batches: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Error in send-minuta serverless route:', err);
    return res.status(200).json({ error: 'Error interno en la API al procesar el correo: ' + (err.message || String(err)) });
  }
};
