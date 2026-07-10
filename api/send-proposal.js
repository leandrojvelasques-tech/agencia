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

function buildProposalEmailHtml({ clientName, title, subtitle, totalAmount, shareLink, validUntil }) {
  const formattedAmount = Number(totalAmount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const validUntilText = validUntil
    ? new Date(validUntil + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; margin-top:32px; margin-bottom:32px; border:1px solid #e2e8f0;">

    <!-- Header -->
    <div style="background-color:#0b5e3a; padding:28px 32px; text-align:center;">
      <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" style="height:36px; margin-bottom:8px;" />
      <h1 style="color:#ffffff; font-size:18px; font-weight:800; letter-spacing:1px; margin:0;">LEANDRO VELASQUES</h1>
      <p style="color:rgba(255,255,255,0.7); font-size:11px; font-weight:600; margin:4px 0 0 0;">Consultoría & Diseño Web</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#333; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
        Hola <strong>${clientName || 'estimado/a cliente'}</strong>,
      </p>
      <p style="color:#333; font-size:14px; line-height:1.6; margin:0 0 24px 0;">
        Te hemos preparado una propuesta comercial para tu revisión:
      </p>

      <!-- Proposal Card -->
      <div style="background-color:#f8faf9; border:1px solid #0b5e3a20; border-radius:12px; padding:24px; margin-bottom:24px;">
        <h2 style="color:#0b5e3a; font-size:20px; font-weight:800; margin:0 0 4px 0;">${title}</h2>
        ${subtitle ? `<p style="color:#666; font-size:13px; margin:0 0 16px 0;">${subtitle}</p>` : ''}
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #0b5e3a20; padding-top:16px; margin-top:12px;">
          <div>
            <p style="color:#999; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin:0;">Total Presupuestado</p>
            <p style="color:#0b5e3a; font-size:24px; font-weight:800; margin:4px 0 0 0; font-family:monospace;">$${formattedAmount}</p>
          </div>
          ${validUntilText ? `
          <div style="text-align:right;">
            <p style="color:#999; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin:0;">Válido hasta</p>
            <p style="color:#d97706; font-size:12px; font-weight:700; margin:4px 0 0 0;">${validUntilText}</p>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center; margin:32px 0;">
        <a href="${shareLink}" target="_blank" style="background-color:#0b5e3a; color:#ffffff; padding:16px 40px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:700; display:inline-block; letter-spacing:0.5px;">
          📄 Ver Presupuesto Completo
        </a>
      </div>

      <p style="color:#888; font-size:12px; line-height:1.6; margin:0 0 8px 0; text-align:center;">
        Desde el enlace podrás revisar todos los detalles, aprobar el presupuesto o solicitar cambios.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f8f9fa; padding:20px 32px; text-align:center; border-top:1px solid #eee;">
      <p style="color:#aaa; font-size:10px; margin:0;">
        Leandro Velasques · Consultoría & Diseño Web · leandrovelasques.com.ar
      </p>
    </div>
  </div>
</body>
</html>`
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'Leandro Velasques <onboarding@resend.dev>';

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured in environment variables' });
  }

  try {
    const { to, clientName, title, subtitle, totalAmount, shareToken, validUntil } = req.body;

    if (!to || !title || !shareToken) {
      return res.status(400).json({ error: 'Missing required fields: to, title, shareToken' });
    }

    const shareLink = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/presupuesto/${shareToken}`

    const html = buildProposalEmailHtml({
      clientName,
      title,
      subtitle,
      totalAmount,
      shareLink,
      validUntil,
    })

    const response = await safeFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `Propuesta Comercial: ${title}`,
        html: html,
      })
    });

    const result = await response.json();

    if (response.status >= 400) {
      console.error('Resend API error:', result);
      return res.status(response.status).json({ error: result.message || 'Error sending email' });
    }

    return res.status(200).json({ success: true, messageId: result.id });
  } catch (err) {
    console.error('Error in send-proposal:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
