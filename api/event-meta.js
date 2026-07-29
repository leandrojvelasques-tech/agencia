const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to make native HTTPS GET requests in Node without external dependencies
function safeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Vercel Serverless)',
      ...options.headers
    };

    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          json: () => {
            try {
              return Promise.resolve(JSON.parse(data));
            } catch (e) {
              console.error('JSON Parse Error inside safeFetch:', e, 'Raw data:', data);
              return Promise.reject(e);
            }
          }
        });
      });
    });

    req.on('error', (err) => {
      console.error('Connection/Socket Error in safeFetch:', err);
      reject(err);
    });

    req.end();
  });
}

module.exports = async (req, res) => {
  const { slug, token } = req.query;

  const supabaseUrl = 'https://oaapnglvbkvxyydjnmun.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0';

  try {
    // Leer el index.html UNA SOLA VEZ al inicio
    const indexPath = path.join(__dirname, '..', '_app', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // ─── Case A: CRM Client portal meta ───
    if (token) {
      const apiUrl = `${supabaseUrl}/rest/v1/crm_clients?share_token=eq.${token}&select=*`;
      const response = await safeFetch(apiUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await response.json();
      const client = data && data.length > 0 ? data[0] : null;

      if (client) {
        const title = `Calendario de Contenidos - ${client.name}`;
        const desc = `Portal exclusivo para revisar y gestionar publicaciones coordinadas con Leandro Velasques.`;

        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

        const metaTags = `
  <!-- SEO & Social Meta Tags -->
  <meta name="description" content="${desc.replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
  <meta property="og:url" content="https://www.leandrovelasques.com.ar/crm/cliente/${token}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
        `;
        html = html.replace('<head>', `<head>\n${metaTags}`);
      }

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      return res.status(200).send(html);
    }

    // ─── Case B: Event registration/landing/report meta ───
    if (slug) {
      const apiUrl = `${supabaseUrl}/rest/v1/events?or=(slug.eq.${slug},private_link_token.eq.${slug})&select=*`;
      const response = await safeFetch(apiUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await response.json();
      const event = data && data.length > 0 ? data[0] : null;

      if (event) {
        const isReportMode = req.query.isReport === 'true' || (req.url && req.url.includes('/reporte'));
        const title = isReportMode 
          ? `Reporte de Evento: ${event.title}`
          : `${event.title} | Leandro Velasques`;
        const desc = isReportMode 
          ? `Informe de resultados, encuestas y métricas del evento ${event.title}.`
          : (event.description_short || 'Sumate a este evento de capacitación y networking.');
        const img = event.banner_url || 'https://www.leandrovelasques.com.ar/logo_triskel.png';
        const url = isReportMode
          ? `https://www.leandrovelasques.com.ar/evento/${slug}/reporte`
          : `https://www.leandrovelasques.com.ar/evento/${slug}`;

        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

        const metaTags = `
  <!-- SEO & Social Meta Tags -->
  <meta name="description" content="${desc.replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
  ${img ? `<meta property="og:image" content="${encodeURI(img)}">` : ''}
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
  ${img ? `<meta name="twitter:image" content="${encodeURI(img)}">` : ''}
        `;

        html = html.replace('<head>', `<head>\n${metaTags}`);
      }
    }

    // Devolver el HTML (con o sin meta tags inyectadas)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error in event-meta proxy:', error);
    // En caso de error, devolvemos el index.html original sin cambios
    try {
      const fallbackPath = path.join(__dirname, '..', '_app', 'index.html');
      const fallbackHtml = fs.readFileSync(fallbackPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(fallbackHtml);
    } catch (e) {
      return res.status(500).send('Internal Server Error');
    }
  }
};
