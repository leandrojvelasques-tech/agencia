const https = require('https');

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
          json: () => {
            try { return Promise.resolve(JSON.parse(data)); }
            catch (e) { return Promise.resolve({ raw: data }); }
          }
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
  
  if (!brevoApiKey) {
    return res.status(500).json({ error: 'No BREVO_API_KEY configured' });
  }

  try {
    const results = {};

    // 1. Check account info
    const accountRes = await safeFetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': brevoApiKey }
    });
    results.account = await accountRes.json();
    results.accountStatus = accountRes.status;

    // 2. Check today's email events (last 50)
    const today = new Date().toISOString().split('T')[0];
    const eventsRes = await safeFetch(
      `https://api.brevo.com/v3/smtp/statistics/events?startDate=${today}&endDate=${today}&limit=50&sort=desc`,
      { headers: { 'api-key': brevoApiKey } }
    );
    results.events = await eventsRes.json();
    results.eventsStatus = eventsRes.status;

    // 3. Aggregated report for today
    const reportRes = await safeFetch(
      `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${today}&endDate=${today}`,
      { headers: { 'api-key': brevoApiKey } }
    );
    results.aggregatedReport = await reportRes.json();
    results.reportStatus = reportRes.status;

    // 4. Check recent transactional emails
    const emailsRes = await safeFetch(
      `https://api.brevo.com/v3/smtp/emails?startDate=${today}&endDate=${today}&limit=50&sort=desc`,
      { headers: { 'api-key': brevoApiKey } }
    );
    results.recentEmails = await emailsRes.json();
    results.recentEmailsStatus = emailsRes.status;

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
