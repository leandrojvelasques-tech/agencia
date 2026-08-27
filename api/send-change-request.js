const https = require('https');

function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    }, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, json: () => {
        try { return Promise.resolve(JSON.parse(data)); } catch { return Promise.resolve({}); }
      } }));
    });
    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

function parseSender(value) {
  const match = value.match(/^(.*)\s<([^>]+)>$/);
  return match ? { name: match[1].trim(), email: match[2].trim() } : { email: value.trim() };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'El servicio de correo no está configurado.' });

  try {
    const { to, cc = [], recipientName, subject, message, attachments = [] } = req.body || {};
    if (!to || !subject || !message) return res.status(400).json({ error: 'Faltan destinatario, asunto o mensaje.' });
    const validCc = Array.isArray(cc) ? cc.filter(email => email && email !== to) : [];
    if (!Array.isArray(attachments) || attachments.some(attachment => !attachment?.name || !attachment?.content)) return res.status(400).json({ error: 'Hay un archivo adjunto inválido.' });
    if (attachments.reduce((sum, attachment) => sum + Buffer.byteLength(attachment.content, 'base64'), 0) > 8 * 1024 * 1024) return res.status(400).json({ error: 'Los archivos adjuntos no pueden superar 8 MB en total.' });

    const response = await safeFetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey },
      body: {
        sender: parseSender(process.env.EMAIL_FROM || 'Leandro Velasques <info@leandrovelasques.com.ar>'),
        to: [{ email: to, name: recipientName || 'Cliente' }],
        ...(validCc.length ? { cc: validCc.map(email => ({ email })) } : {}),
        subject,
        htmlContent: `<div style="font-family:Arial,sans-serif;color:#4F4C4D;line-height:1.6;white-space:normal">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`,
        ...(attachments.length ? { attachment: attachments.map(attachment => ({ name: attachment.name, content: attachment.content })) } : {}),
      },
    });
    const result = await response.json();
    if (response.status >= 400) return res.status(response.status).json({ error: result.message || 'Brevo rechazó el envío.' });
    return res.status(200).json({ success: true, messageId: result.messageId || result.id });
  } catch (error) {
    console.error('Error in send-change-request:', error);
    return res.status(500).json({ error: 'No se pudo conectar con el servicio de correo.' });
  }
};
