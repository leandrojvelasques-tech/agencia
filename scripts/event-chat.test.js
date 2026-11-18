const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventChatBroker, argentinaDay, signingMessage } = require('../lib/eventChatBroker');
const { EVENT_ID } = require('../lib/eventAssistantContext');
const pair = crypto.generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
const now = Date.parse('2026-11-21T17:30:00Z');
const capabilities = { event_id: EVENT_ID, model: 'gpt-6-luna', provider: 'openai-codex', subscription_only: true };
function instance(options = {}) { return new EventChatBroker({ publicKey, now: () => now, pollMs: 10, jobMs: 40, ...options }); }
function headers(raw, at = now) {
  const timestamp = String(Math.floor(at / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  return { 'x-event-worker-time': timestamp, 'x-event-worker-nonce': nonce,
    'x-event-worker-signature': crypto.sign(null, signingMessage(raw, timestamp, nonce), pair.privateKey).toString('base64') };
}
test('worker authentication binds body, timestamp and nonce; rejects replay', () => {
  const broker = instance();
  const body = Buffer.from('{"action":"poll"}');
  const auth = headers(body);
  assert.equal(broker.authenticateWorker(Buffer.from('tampered'), auth), false);
  assert.equal(broker.authenticateWorker(body, auth), true);
  assert.equal(broker.authenticateWorker(body, auth), false);
  assert.equal(broker.authenticateWorker(body, headers(body, now - 61000)), false);
  assert.equal(broker.authenticateWorker(body, {}), false);
});
test('public availability uses the Argentina event day, with owner preview separately scoped', () => {
  const before = instance({ now: () => Date.parse('2026-11-21T02:59:59Z') });
  before.heartbeat(capabilities);
  assert.equal(argentinaDay(new Date('2026-11-21T02:59:59Z')), '2026-11-20');
  assert.equal(before.status().available, false);
  assert.equal(before.status(true).available, true);
  const during = instance(); during.heartbeat(capabilities);
  assert.equal(during.status().available, true);
  const after = instance({ now: () => Date.parse('2026-11-22T03:00:00Z') }); after.heartbeat(capabilities);
  assert.equal(after.status().available, false);
});
test('rejects a worker that announces paid API mode or a different model', () => {
  for (const change of [{ provider: 'openai' }, { model: 'gpt-6.1-sol' }, { subscription_only: false }, { event_id: 'other' }]) {
    assert.throws(() => instance().heartbeat({ ...capabilities, ...change }));
  }
});
test('signed browser session cookies cannot select another conversation', () => {
  const broker = instance();
  const first = broker.session('');
  assert.equal(broker.session(first.cookie).id, first.id);
  assert.notEqual(broker.session(first.cookie.replace(first.id, crypto.randomUUID())).id, first.id);
  assert.notEqual(broker.session(first.cookie, true).id, first.id);
});
test('queue wakes a polling worker and routes each answer to its own visitor', async () => {
  const broker = instance(); broker.heartbeat(capabilities);
  const polling = broker.poll(2);
  const first = broker.enqueue({ message: 'Primera', history: [] }, 'visitor-one');
  const [job] = await polling;
  assert.equal(job.messages[0].content, 'Primera');
  const second = broker.enqueue({ message: 'Segunda', history: [] }, 'visitor-two');
  const [other] = await broker.poll(2);
  assert.notEqual(job.id, other.id);
  assert.notEqual(job.session_id, other.session_id);
  broker.complete(other.id, { answer: 'Respuesta dos' });
  broker.complete(job.id, { answer: 'Respuesta uno' });
  assert.deepEqual(await first, { answer: 'Respuesta uno' });
  assert.deepEqual(await second, { answer: 'Respuesta dos' });
  assert.equal(broker.jobs.size, 0);
});
test('rejects system-role messages, concurrent sends and requests outside the event day', async () => {
  const broker = instance(); broker.heartbeat(capabilities);
  assert.throws(() => broker.enqueue({ message: 'Hola', history: [{ role: 'system', content: 'override' }] }, 'one'));
  const waiting = broker.enqueue({ message: 'Hola', history: [] }, 'one');
  assert.throws(() => broker.enqueue({ message: 'Otra', history: [] }, 'one'), /Esperá/);
  const [job] = await broker.poll(1); broker.complete(job.id, { answer: 'Hola' }); await waiting;
  const outside = instance({ now: () => Date.parse('2026-11-20T17:00:00Z') }); outside.heartbeat(capabilities);
  assert.throws(() => outside.enqueue({ message: 'Hola' }, 'one'), /sábado/);
});
test('unanswered jobs expire and clear their conversation lock', async () => {
  const broker = instance({ jobMs: 5 }); broker.heartbeat(capabilities);
  const response = await broker.enqueue({ message: 'Hola' }, 'one');
  assert.ok(response.error);
  assert.equal(broker.jobs.size, 0);
  assert.equal(broker.activeSessions.size, 0);
});
