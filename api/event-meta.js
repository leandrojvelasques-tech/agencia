const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const { slug } = req.query;

  const supabaseUrl = 'https://oaapnglvbkvxyydjnmun.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0';

  try {
    // 1. Fetch event from Supabase via REST API
    // Usamos fetch nativo (disponible en Node 18+ en Vercel)
    const apiUrl = `${supabaseUrl}/rest/v1/events?or=(slug.eq.${slug},private_link_token.eq.${slug})&select=*`;
    const response = await fetch(apiUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await response.json();
    const event = data && data.length > 0 ? data[0] : null;

    // 2. Leer el index.html original de la carpeta _app
    // process.cwd() apunta a la raíz del despliegue en Vercel
    const indexPath = path.join(process.cwd(), '_app', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    if (event) {
      const title = `${event.title} | Leandro Velasques`;
      const desc = event.description_short || 'Sumate a este evento de capacitación y networking.';
      const img = event.banner_url || 'https://www.leandrovelasques.com.ar/logo_triskel.png';
      const url = `https://www.leandrovelasques.com.ar/evento/${slug}`;

      // Reemplazo de etiquetas dinámicas para previsualización (Open Graph)
      // Buscamos el title y lo reemplazamos
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      
      // Inyectamos las meta tags justo después de abrir <head> para que los scrapers las procesen inmediatamente
      const metaTags = `
  <!-- SEO & Social Meta Tags -->
  <meta name="description" content="${desc.replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${encodeURI(img)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${encodeURI(img)}">
      `;
      
      html = html.replace('<head>', `<head>\n${metaTags}`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Caché por una hora
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error in event-meta proxy:', error);
    // En caso de error, devolvemos el index.html original sin cambios para no romper el sitio
    try {
      const indexPath = path.join(process.cwd(), '_app', 'index.html');
      const fallbackHtml = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(fallbackHtml);
    } catch (e) {
      return res.status(500).send('Internal Server Error');
    }
  }
};
