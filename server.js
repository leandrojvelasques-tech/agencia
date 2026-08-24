const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const appDir = path.join(rootDir, '_app');

const apiHandlers = {
  'brevo-check': require('./api/brevo-check'),
  'brevo-test': require('./api/brevo-test'),
  'event-meta': require('./api/event-meta'),
  'send-email': require('./api/send-email'),
  'send-minuta': require('./api/send-minuta'),
  'send-proposal': require('./api/send-proposal'),
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xml': 'application/xml; charset=utf-8',
};

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.statusCode = error.code === 'ENOENT' ? 404 : 500;
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal Server Error');
      return;
    }
    res.setHeader('Content-Type', contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.end(content);
  });
}

function sendAppIndex(res) {
  const filePath = path.join(appDir, 'index.html');
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) {
      res.statusCode = error.code === 'ENOENT' ? 404 : 500;
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal Server Error');
      return;
    }

    const config = JSON.stringify({
      supabaseUrl: process.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    }).replace(/</g, '\\u003c');
    const runtimeScript = `<script>globalThis.__APP_CONFIG__=${config}</script>`;
    const renderedHtml = html.replace('</head>', `${runtimeScript}</head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderedHtml);
  });
}

function addResponseHelpers(res) {
  res.status = (statusCode) => { res.statusCode = statusCode; return res; };
  res.json = (payload) => {
    if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };
  res.send = (payload) => { res.end(payload); return res; };
  return res;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { resolve(body); }
    });
    req.on('error', reject);
  });
}

async function runApiHandler(req, res, handler, query) {
  req.query = query;
  req.body = await readRequestBody(req);
  addResponseHelpers(res);
  await handler(req, res);
}

function isSpaRoute(pathname) {
  return ['/admin', '/asistencia', '/clase', '/crm', '/encuesta', '/evento', '/presupuesto', '/presentacion', '/relevamiento-proceso']
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const query = Object.fromEntries(requestUrl.searchParams.entries());
    const apiMatch = pathname.match(/^\/api\/([a-z-]+)\/?$/);

    if (apiMatch && apiHandlers[apiMatch[1]]) return runApiHandler(req, res, apiHandlers[apiMatch[1]], query);

    const eventMatch = pathname.match(/^\/evento\/([^/]+)(?:\/(inscripcion|reporte))?\/?$/);
    if (eventMatch && (!eventMatch[2] || eventMatch[2] === 'inscripcion' || eventMatch[2] === 'reporte')) {
      return runApiHandler(req, res, apiHandlers['event-meta'], {
        ...query, slug: eventMatch[1], ...(eventMatch[2] === 'reporte' ? { isReport: 'true' } : {}),
      });
    }

    const crmMatch = pathname.match(/^\/crm\/cliente\/([^/]+)(?:\/.*)?$/);
    if (crmMatch) return runApiHandler(req, res, apiHandlers['event-meta'], { ...query, token: crmMatch[1] });

    if (isSpaRoute(pathname)) return sendAppIndex(res);

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const rootStaticPath = path.resolve(rootDir, `.${requestedPath}`);
    const appStaticPath = path.resolve(appDir, `.${requestedPath}`);
    const staticPath = requestedPath.startsWith('/_app/') || requestedPath === '/_app'
      ? rootStaticPath
      : appStaticPath;
    if (!isInside(rootDir, rootStaticPath) || !isInside(appDir, appStaticPath)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }
    return fs.stat(staticPath, (error, stats) => {
      if (!error && stats.isDirectory()) return sendFile(res, path.join(staticPath, 'index.html'));
      if (!error && stats.isFile()) return sendFile(res, staticPath);
      if (staticPath !== rootStaticPath) {
        return fs.stat(rootStaticPath, (rootError, rootStats) => {
          if (!rootError && rootStats.isDirectory()) return sendFile(res, path.join(rootStaticPath, 'index.html'));
          if (!rootError && rootStats.isFile()) return sendFile(res, rootStaticPath);
          res.statusCode = 404;
          return res.end('Not found');
        });
      }
      res.statusCode = 404;
      return res.end('Not found');
    });
  } catch (error) {
    console.error('Unexpected server error:', error);
    if (!res.headersSent) res.statusCode = 500;
    return res.end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Web server listening on port ${port}`));
