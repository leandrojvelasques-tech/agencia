const crypto = require('node:crypto');
const { EVENT_ID } = require('./eventAssistantContext');

const EVENT_DAY = '2026-11-21';
function argentinaDay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function signingMessage(raw, timestamp, nonce) {
  return Buffer.from(`POST\n/api/event-chat-relay\n${timestamp}\n${nonce}\n${crypto.createHash('sha256').update(raw).digest('hex')}`);
}
function chatError(message, status = 400) { return Object.assign(new Error(message), { status }); }

class EventChatBroker {
  constructor({ publicKey = null, now = () => Date.now(), pollMs = 20000, jobMs = 110000 } = {}) {
    this.publicKey = publicKey ? crypto.createPublicKey(publicKey) : null;
    this.now = now;
    this.pollMs = pollMs;
    this.jobMs = jobMs;
    this.nonces = new Map();
    this.jobs = new Map();
    this.waiters = [];
    this.sessions = new Map();
    this.activeSessions = new Set();
    this.cookieKey = crypto.randomBytes(32);
    this.workerSeen = 0;
    this.counts = { completed: 0, failed: 0 };
  }
  authenticateWorker(raw, headers) {
    if (!this.publicKey) return false;
    const timestamp = headers['x-event-worker-time'];
    const nonce = headers['x-event-worker-nonce'];
    const signature = headers['x-event-worker-signature'];
    if (!/^\d{10}$/.test(timestamp || '') || !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[A-Za-z0-9+/]{86}==$/.test(signature || '')) return false;
    if (Math.abs(this.now() - Number(timestamp) * 1000) > 60000) return false;
    for (const [key, at] of this.nonces) if (at < this.now() - 120000) this.nonces.delete(key);
    if (this.nonces.has(nonce)) return false;
    if (!crypto.verify(null, signingMessage(raw, timestamp, nonce), this.publicKey, Buffer.from(signature, 'base64'))) return false;
    this.nonces.set(nonce, this.now());
    return true;
  }
  heartbeat(capabilities) {
    if (capabilities?.model !== 'gpt-6-luna' || capabilities?.provider !== 'openai-codex' || capabilities?.subscription_only !== true || capabilities?.event_id !== EVENT_ID) {
      throw chatError('Configuración del asistente no válida.', 403);
    }
    this.workerSeen = this.now();
  }
  status(preview = false) {
    const today = argentinaDay(new Date(this.now()));
    const day = today === EVENT_DAY;
    const healthy = this.workerSeen > 0 && this.workerSeen > this.now() - 65000;
    return { configured: Boolean(this.publicKey), available: Boolean(this.publicKey) && healthy && (day || preview), preview,
      event_day: EVENT_DAY,
      message: day || preview ? (healthy ? 'Podés consultar sobre el encuentro.' : 'El asistente no está disponible en este momento. Podés inscribirte con el formulario.') : today > EVENT_DAY ? 'El encuentro y su chat de consultas ya finalizaron.' : 'El asistente conversacional estará disponible el sábado 21 de noviembre.' };
  }
  session(cookie, reset = false) {
    const match = /(?:^|;\s*)lv_event_chat=([a-f0-9-]{36})\.([a-f0-9]{64})(?:;|$)/.exec(cookie || '');
    if (!reset && match) {
      const expected = crypto.createHmac('sha256', this.cookieKey).update(match[1]).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(match[2]))) return { id: match[1], cookie: null };
    }
    const id = crypto.randomUUID();
    const signature = crypto.createHmac('sha256', this.cookieKey).update(id).digest('hex');
    return { id, cookie: `lv_event_chat=${id}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=86400` };
  }
  enqueue(input, sessionId, preview = false) {
    if (!this.status(preview).available) throw chatError(this.status(preview).message, 503);
    if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 1500) throw chatError('Escribí una consulta de hasta 1500 caracteres.');
    if (!Array.isArray(input.history || []) || (input.history || []).some(item => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 6000)) throw chatError('No pudimos leer esta conversación. Iniciá una nueva consulta.');
    if (this.activeSessions.has(sessionId)) throw chatError('Esperá la respuesta antes de enviar otra consulta.', 409);
    if (this.jobs.size >= 60) throw chatError('Hay muchas consultas en este momento. Probá nuevamente en unos segundos.', 429);
    for (const [key, value] of this.sessions) if (value.since < this.now() - 60000) this.sessions.delete(key);
    const rate = this.sessions.get(sessionId) || { since: this.now(), count: 0 };
    if (rate.count >= 20) throw chatError('Esperá unos segundos antes de enviar más consultas.', 429);
    rate.count += 1;
    this.sessions.set(sessionId, rate);
    const id = crypto.randomUUID();
    let resolve;
    const result = new Promise(done => { resolve = done; });
    const job = { id, session_id: sessionId, event_id: EVENT_ID, preview, state: 'queued',
      messages: [...(input.history || []).slice(-10).map(item => ({ role: item.role, content: item.content })), { role: 'user', content: input.message.trim() }], resolve };
    job.timer = setTimeout(() => this.complete(id, { error: 'La respuesta está demorando. Intentá nuevamente en unos segundos.' }), this.jobMs);
    this.jobs.set(id, job);
    this.activeSessions.add(sessionId);
    this.wake();
    return result;
  }
  take(capacity) {
    const selected = [...this.jobs.values()].filter(job => job.state === 'queued').slice(0, capacity);
    for (const job of selected) job.state = 'claimed';
    return selected.map(({ id, session_id, event_id, preview, messages }) => ({ id, session_id, event_id, preview, messages }));
  }
  poll(capacity) {
    const count = Math.max(1, Math.min(5, Number(capacity) || 1));
    const jobs = this.take(count);
    if (jobs.length) return Promise.resolve(jobs);
    return new Promise(resolve => {
      const waiter = { count, resolve };
      waiter.timer = setTimeout(() => { this.waiters = this.waiters.filter(item => item !== waiter); resolve([]); }, this.pollMs);
      this.waiters.push(waiter);
    });
  }
  wake() {
    while (this.waiters.length && [...this.jobs.values()].some(job => job.state === 'queued')) {
      const waiter = this.waiters.shift();
      clearTimeout(waiter.timer);
      waiter.resolve(this.take(waiter.count));
    }
  }
  complete(id, result) {
    const job = this.jobs.get(id);
    if (!job) return false;
    clearTimeout(job.timer);
    this.jobs.delete(id);
    this.activeSessions.delete(job.session_id);
    const answer = typeof result.answer === 'string' ? result.answer.trim().slice(0, 6000) : '';
    if (answer && !result.error) { this.counts.completed += 1; job.resolve({ answer }); }
    else { this.counts.failed += 1; job.resolve({ error: 'No pude responder en este momento. Probá nuevamente o usá el formulario para inscribirte.' }); }
    return true;
  }
}

module.exports = { EVENT_DAY, argentinaDay, signingMessage, EventChatBroker, chatError };
