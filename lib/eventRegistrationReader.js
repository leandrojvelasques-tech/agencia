const crypto = require('node:crypto');

const EVENT_ID = 'd9962e70-4b7a-44be-b6f3-20151c810bdb';
const PATH = '/api/event-registration-reader';
const FIELDS = ['id', 'created_at', 'first_name', 'last_name', 'profession', 'residence_city', 'email'];
const TTL = 15 * 60 * 1000;
const MAX_ROWS = 10000;
const MAX_INTERVAL = 366 * 86400000;
function failure(status, code) { return Object.assign(new Error(code), { status, code }); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

// UTC only. Preserve all six PostgreSQL fractional digits; JS Date alone loses them.
function timestamp(value) {
  if (typeof value !== 'string') throw failure(400, 'invalid_date');
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z$/.exec(value);
  if (!match || match[1] < '2000' || !Number.isFinite(Date.parse(`${match[1]}Z`))
    || new Date(`${match[1]}Z`).toISOString().slice(0, 19) !== match[1]) throw failure(400, 'invalid_date');
  return `${match[1]}.${(match[2] || '').padEnd(6, '0')}Z`;
}
function compare(a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }

class RegistrationReader {
  constructor({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
    this.env = env; this.fetch = fetchImpl; this.now = now;
    this.snapshots = new Map(); this.signingKey = crypto.randomBytes(32);
    this.window = { at: 0, all: 0, authorized: 0 }; this.busy = false;
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    this.cleanupTimer.unref();
  }
  cleanup() {
    for (const [id, snapshot] of this.snapshots) if (snapshot.expires <= this.now()) this.snapshots.delete(id);
  }
  budget(authorized = false) {
    if (this.now() - this.window.at >= 60000) this.window = { at: this.now(), all: 0, authorized: 0 };
    const key = authorized ? 'authorized' : 'all';
    if (++this.window[key] > (authorized ? 60 : 300)) throw failure(429, 'rate_limited');
  }
  authenticate(req) {
    const expected = this.env.EVENT_REGISTRATION_TOKEN_SHA256;
    if (!/^[a-f0-9]{64}$/.test(expected || '')) throw failure(503, 'reader_not_configured');
    const header = req.headers.authorization;
    if (!header) throw failure(401, 'credential_required');
    const match = /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(header);
    if (!match || !crypto.timingSafeEqual(Buffer.from(sha(match[1])), Buffer.from(expected))) throw failure(403, 'forbidden');
    return match[1];
  }
  async source(token, from, cutoff, verifyOnly = false) {
    const base = this.env.EVENT_REGISTRATION_SUPABASE_URL;
    const key = this.env.EVENT_REGISTRATION_PUBLISHABLE_KEY;
    // No fallback to service_role, admin session, or the public chat credentials.
    if (!base || !key) throw failure(503, 'reader_not_configured');
    if (!key.startsWith('sb_publishable_')) {
      try {
        const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
        if (claims.role !== 'anon') throw new Error();
      } catch { throw failure(503, 'reader_not_configured'); }
    }
    try {
      const url = new URL('/rest/v1/rpc/read_cpce_registration_snapshot', base);
      if (url.protocol !== 'https:') throw new Error();
      const response = await this.fetch(url, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_credential: token, p_from: from, p_cutoff: cutoff, p_verify_only: verifyOnly }),
      });
      if (response.status === 401 || response.status === 403) throw failure(403, 'forbidden');
      if (!response.ok) throw new Error();
      // Bound memory even if a misconfigured upstream returns an unexpected body.
      const reader = response.body.getReader(); const chunks = []; let bytes = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          bytes += value.length; if (bytes > 12 * 1024 * 1024) throw new Error();
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel(); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (verifyOnly) { if (data?.authorized !== true) throw new Error(); return; }
      if (!Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.inscriptions)
        || data.inscriptions.length > MAX_ROWS || data.total < data.inscriptions.length) throw new Error();
      const rows = data.inscriptions.map(row => {
        if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(row.id || '')) throw new Error();
        const projected = Object.fromEntries(FIELDS.map(field => [field, row[field] ?? null]));
        projected.created_at = timestamp(row.created_at);
        if (!from || projected.created_at < from || projected.created_at >= cutoff) throw new Error();
        for (const field of FIELDS.slice(2)) if (projected[field] !== null && (typeof projected[field] !== 'string' || projected[field].length > 1000)) throw new Error();
        return projected;
      }).sort(compare);
      if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error();
      if (from === null && rows.length) throw new Error();
      return { total: data.total, inscriptions: rows };
    } catch (error) {
      if (error.code === 'forbidden') throw error;
      throw failure(503, 'source_unavailable');
    }
  }
  sign(payload) {
    const value = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${value}.${crypto.createHmac('sha256', this.signingKey).update(value).digest('base64url')}`;
  }
  cursor(value) {
    if (typeof value !== 'string' || value.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)) throw failure(400, 'invalid_cursor');
    const [body, signature] = value.split('.');
    const expected = crypto.createHmac('sha256', this.signingKey).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw failure(400, 'invalid_cursor');
    let payload; try { payload = JSON.parse(Buffer.from(body, 'base64url')); } catch { throw failure(400, 'invalid_cursor'); }
    if (payload.event !== EVENT_ID) throw failure(403, 'forbidden');
    const snapshot = this.snapshots.get(payload.snapshot);
    if (!snapshot) throw failure(410, 'snapshot_expired');
    const index = snapshot.inscriptions.findIndex(row => row.id === payload.after?.id && row.created_at === payload.after?.created_at);
    if (index < 0) throw failure(400, 'invalid_cursor');
    return { snapshot, id: payload.snapshot, start: index + 1 };
  }
  async read(req, url) {
    this.budget();
    const token = this.authenticate(req); this.budget(true); this.cleanup();
    if (req.method !== 'GET') throw failure(405, 'method_not_allowed');
    if (url.search.length > 2048) throw failure(400, 'invalid_parameters');
    const params = url.searchParams;
    const allowed = new Set(['operation', 'from', 'cutoff', 'limit', 'cursor']);
    for (const name of params.keys()) if (!allowed.has(name) || params.getAll(name).length !== 1) throw failure(400, 'invalid_parameters');
    const operation = params.get('operation') || 'changes';
    if (!['changes', 'total'].includes(operation)) throw failure(400, 'invalid_parameters');
    const limitText = params.get('limit') ?? '100';
    if (!/^[1-9]\d{0,2}$/.test(limitText) || Number(limitText) > 500) throw failure(400, 'invalid_limit');
    const limit = Number(limitText);
    if (params.has('cursor')) {
      if (operation !== 'changes' || params.has('from') || params.has('cutoff')) throw failure(400, 'invalid_parameters');
      const { snapshot, id, start } = this.cursor(params.get('cursor'));
      // DB revocation/expiry applies to cached pages too.
      await this.source(token, null, null, true);
      return this.page(id, snapshot, start, limit);
    }
    if (operation === 'total' && (params.has('from') || params.has('limit'))) throw failure(400, 'invalid_parameters');
    const cutoff = timestamp(params.get('cutoff') ?? new Date(this.now()).toISOString());
    if (cutoff > timestamp(new Date(this.now()).toISOString())) throw failure(400, 'invalid_date');
    const from = operation === 'changes' ? timestamp(params.get('from')) : null;
    if (from && (from >= cutoff || Date.parse(cutoff) - Date.parse(from) > MAX_INTERVAL)) throw failure(400, 'invalid_interval');
    if (this.busy || (operation === 'changes' && this.snapshots.size >= 8)) throw failure(429, 'reader_busy');
    this.busy = true;
    let data; try { data = await this.source(token, from, cutoff); } finally { this.busy = false; }
    if (operation === 'total') return { cutoff, total: data.total };
    const id = crypto.randomUUID();
    const snapshot = { ...data, from, cutoff, expires: this.now() + TTL };
    this.snapshots.set(id, snapshot);
    return this.page(id, snapshot, 0, limit);
  }
  page(id, snapshot, start, limit) {
    const inscriptions = snapshot.inscriptions.slice(start, start + limit);
    const last = inscriptions.at(-1);
    const next = start + inscriptions.length < snapshot.inscriptions.length;
    return { from: snapshot.from, cutoff: snapshot.cutoff, total: snapshot.total, inscriptions,
      next_cursor: next ? this.sign({ snapshot: id, event: EVENT_ID, after: { created_at: last.created_at, id: last.id } }) : null };
  }
}

function createRegistrationHandler(options) {
  const reader = new RegistrationReader(options);
  return async function handle(req, res, url) {
    if (url.pathname !== PATH && !url.pathname.startsWith(`${PATH}/`)) return false;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      if (url.pathname !== PATH) throw failure(404, 'not_found');
      const payload = await reader.read(req, url);
      res.statusCode = 200; res.end(JSON.stringify(payload));
    } catch (error) {
      const status = error.status || 503;
      res.statusCode = status;
      if (status === 405) res.setHeader('Allow', 'GET');
      if (status === 429) res.setHeader('Retry-After', '60');
      res.end(JSON.stringify({ error: error.code || 'source_unavailable' }));
      // Deliberately no request, credential, source error or participant logging.
    }
    return true;
  };
}
module.exports = { createRegistrationHandler, RegistrationReader, timestamp, EVENT_ID, PATH, FIELDS, sha };
