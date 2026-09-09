const https = require('https');

function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = options.body ? JSON.stringify(options.body) : null;
    const headers = { 'User-Agent': 'Leandro Velasques website', 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (body) headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
    const request = https.request({ hostname: target.hostname, port: 443, path: target.pathname + target.search, method: options.method || 'GET', headers }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch { parsed = { raw: data }; }
        resolve({ status: response.statusCode, data: parsed });
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', 'https://leandrovelasques.com.ar');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const body = req.body || {};
  if (clean(body.website, 80)) return res.status(200).json({ success: true });
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 150);
  const interest = clean(body.interest, 80);
  const message = clean(body.message, 2500);
  const interests = new Set(['formacion', 'automatizacion', 'marketing', 'consulta']);
  if (name.length < 2 || !isEmail(email) || message.length < 10 || !interests.has(interest)) return res.status(400).json({ error: 'Revisá los datos ingresados e intentá nuevamente.' });

  const brevoApiKey = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
  if (!brevoApiKey) return res.status(503).json({ error: 'El servicio de correo no está disponible.' });
  const interestLabels = { formacion: 'Formación en IA', automatizacion: 'IA y automatización', marketing: 'Marketing digital', consulta: 'Otra consulta' };
  const subject = `Nueva consulta web · ${interestLabels[interest]}`;
  const htmlContent = `<div style="font-family:Arial,sans-serif;color:#4F4C4D;line-height:1.6;max-width:640px"><h2 style="color:#285A47">Nueva consulta desde leandrovelasques.com.ar</h2><p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Organización:</strong> ${escapeHtml(company || 'No indicada')}</p><p><strong>Interés:</strong> ${escapeHtml(interestLabels[interest])}</p><hr style="border:0;border-top:1px solid #EDEDED"><p><strong>Consulta:</strong></p><p>${escapeHtml(message).replaceAll('\n', '<br>')}</p></div>`;

  try {
    const response = await safeFetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey },
      body: { sender: { name: 'Sitio web · Leandro Velasques', email: 'info@leandrovelasques.com.ar' }, to: [{ email: 'info@leandrovelasques.com.ar', name: 'Leandro Velasques' }], replyTo: { email, name }, subject, htmlContent }
    });
    if (response.status < 200 || response.status >= 300) {
      console.error('Brevo contact form error:', response.status, response.data && response.data.message);
      return res.status(502).json({ error: 'No se pudo enviar la consulta. Intentá nuevamente.' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact form email error:', error.message);
    return res.status(502).json({ error: 'No se pudo enviar la consulta. Intentá nuevamente.' });
  }
};
