const { getPublicSupabaseConfig } = require('./supabasePublicConfig');
const { EventChatBroker, chatError } = require('./eventChatBroker');
const { publicKey } = require('../integrations/hermes-eventos/public-worker.json');
const broker = new EventChatBroker({ publicKey });
const PATHS = new Set(['/api/event-chat', '/api/event-chat-status', '/api/event-chat-relay']);
const OWNER_EMAILS = new Set(['info@leandrovelasques.com.ar', 'leandrojvelasques@gmail.com']);

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(data));
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw chatError('La consulta es demasiado extensa.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function isOwner(req) {
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(req.headers.authorization || '')) return false;
  const { supabaseUrl, supabaseKey } = getPublicSupabaseConfig();
  try {
    const response = await fetch(new URL('/auth/v1/user', supabaseUrl), { headers: { apikey: supabaseKey, Authorization: req.headers.authorization }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const user = await response.json();
    return Boolean(user.email_confirmed_at) && OWNER_EMAILS.has(user.email?.toLowerCase());
  } catch { return false; }
}
async function handleEventChat(req, res, url) {
  if (!PATHS.has(url.pathname)) return false;
  try {
    if (url.pathname === '/api/event-chat-status') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Método no permitido.' }); return true; }
      const preview = url.searchParams.get('preview') === 'true' && await isOwner(req);
      json(res, 200, broker.status(preview));
      return true;
    }
    if (req.method !== 'POST') { json(res, 405, { error: 'Método no permitido.' }); return true; }
    const raw = await readBody(req);
    if (url.pathname === '/api/event-chat-relay') {
      if (!broker.authenticateWorker(raw, req.headers)) { json(res, 401, { error: 'No autorizado.' }); return true; }
      const data = JSON.parse(raw.toString('utf8'));
      if (data.action === 'poll') {
        broker.heartbeat(data.capabilities);
        const jobs = await broker.poll(data.capacity);
        if (!res.destroyed) json(res, 200, { jobs });
      } else if (data.action === 'result' && typeof data.job_id === 'string') {
        json(res, broker.complete(data.job_id, data) ? 200 : 409, { received: true });
      } else json(res, 400, { error: 'Acción no válida.' });
      return true;
    }
    if (req.headers.origin && req.headers.origin !== 'https://www.leandrovelasques.com.ar' && req.headers.origin !== 'https://leandrovelasques.com.ar') throw chatError('Origen no permitido.', 403);
    const data = JSON.parse(raw.toString('utf8'));
    const preview = data.preview === true && await isOwner(req);
    const session = broker.session(req.headers.cookie, data.reset === true);
    const response = broker.enqueue(data, session.id, preview);
    if (session.cookie) res.setHeader('Set-Cookie', session.cookie);
    const result = await response;
    if (!res.destroyed) json(res, result.error ? 503 : 200, result);
  } catch (error) {
    if (!res.destroyed) json(res, error.status || 400, { error: error.status ? error.message : 'No pudimos procesar esta consulta.' });
  }
  return true;
}

module.exports = { handleEventChat, isOwner, broker };
