const https = require('https');

function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Vercel Serverless)',
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // CRITICAL: Set Content-Length for POST requests
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
          json: () => {
            try { return Promise.resolve(JSON.parse(data)); }
            catch (e) { return Promise.resolve({ raw: data }); }
          }
        });
      });
    });
    req.on('error', reject);
    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Leandro Velasques <info@leandrovelasques.com.ar>';
  
  if (!brevoApiKey) {
    return res.status(500).json({ error: 'No BREVO_API_KEY configured' });
  }

  try {
    // Send a simple test email to info@leandrovelasques.com.ar
    const testPayload = {
      sender: { name: 'Leandro Velasques', email: 'info@leandrovelasques.com.ar' },
      to: [{ email: 'info@leandrovelasques.com.ar' }],
      subject: '✅ Test de Diagnóstico Brevo - ' + new Date().toLocaleString('es-AR'),
      htmlContent: '<h1>Test exitoso</h1><p>Si ves este email, la API de Brevo funciona correctamente.</p><p>Fecha: ' + new Date().toISOString() + '</p>'
    };

    console.log('Sending test email payload size:', JSON.stringify(testPayload).length, 'bytes');

    const brevoResponse = await safeFetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json'
      },
      body: testPayload
    });

    const brevoResult = await brevoResponse.json();
    
    return res.status(200).json({ 
      testEmailResult: brevoResult,
      brevoStatus: brevoResponse.status,
      payloadSize: JSON.stringify(testPayload).length,
      message: brevoResponse.status >= 200 && brevoResponse.status < 300 
        ? 'Email de test enviado exitosamente! Revisá tu bandeja en 1-2 minutos.'
        : 'Error al enviar email de test'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
