const test = require('node:test');
const assert = require('node:assert/strict');
const { EVENT_ID, EVENT_SLUG, loadEventAssistantContext } = require('../lib/eventAssistantContext');
const event = { id: EVENT_ID, slug: EVENT_SLUG, title: 'Encuentro', is_public: true,
  status: 'published', event_date: '2026-11-21', registrations_open: true, registration_mode: 'self',
  private_link_token: 'must-not-leak', notification_recipients: ['private@example.com'] };
const now = new Date('2026-11-17T18:00:00Z');
const source = row => async url => {
  assert.equal(url.searchParams.get('id'), `eq.${EVENT_ID}`);
  assert.equal(url.searchParams.get('is_public'), 'eq.true');
  assert.ok(!url.searchParams.get('select').includes('token'));
  return { ok: true, json: async () => row ? [row] : [] };
};
test('projects public event data without administrative fields', async () => {
  const result = await loadEventAssistantContext({ fetchImpl: source(event), now });
  assert.equal(result.registration.available, true);
  assert.equal(result.event.title, event.title);
  assert.ok(!JSON.stringify(result).includes('must-not-leak'));
  assert.ok(!JSON.stringify(result).includes('private@example.com'));
});
test('rejects private, draft, unexpected or missing events even if the source returns them', async () => {
  for (const row of [null, { ...event, is_public: false }, { ...event, status: 'draft' }, { ...event, id: 'other' }, { ...event, slug: 'other' }]) {
    assert.equal(await loadEventAssistantContext({ fetchImpl: source(row), now }), null);
  }
});

test('reads current prices from the event source, including free and paid alternatives', async () => {
  for (const prices of [[], [{ concept: 'Jóvenes profesionales', price: 'Sin cargo' }], [{ concept: 'General', price: '$ 5.000' }]]) {
    const result = await loadEventAssistantContext({ fetchImpl: async url => {
      assert.ok(url.searchParams.get('select').split(',').includes('prices'));
      return { ok: true, json: async () => [{ ...event, prices }] };
    }, now });
    assert.deepEqual(result.event.prices, prices);
  }
});
test('reports closed registration after the event or on a completed event', async () => {
  for (const row of [{ ...event, registrations_open: false }, { ...event, status: 'completed' }, { ...event, registration_mode: 'admin' }]) {
    assert.equal((await loadEventAssistantContext({ fetchImpl: source(row), now })).registration.available, false);
  }
  assert.equal((await loadEventAssistantContext({ fetchImpl: source(event), now: new Date('2026-11-22T18:00:00Z') })).registration.available, false);
});
test('propagates source failure instead of supplying stale event details', async () => {
  await assert.rejects(loadEventAssistantContext({ fetchImpl: async () => ({ ok: false }), now }));
});


test('exposes only the approved public presentation and no newsletter subscription', async () => {
  const result = await loadEventAssistantContext({ fetchImpl: source({ ...event,
    presentation_url: 'https://private.invalid/material', participants: [{ email: 'synthetic@example.invalid' }],
  }), now });
  assert.equal(result.presentation_url, 'https://www.leandrovelasques.com.ar/presentacion/e348e08c-b0d3-46fd-a108-cfeff2eb8290');
  assert.equal(result.communications.newsletter_consent_available, false);
  assert.ok(!JSON.stringify(result).includes('private.invalid'));
  assert.ok(!JSON.stringify(result).includes('synthetic@example.invalid'));
});
