const test = require('node:test');
const assert = require('node:assert/strict');
const { WORKSHOP_SLUG, renderWorkshopCard, renderHomeWorkshop } = require('../lib/homeWorkshop');

const event = {
  slug: WORKSHOP_SLUG, title: 'ChatGPT Work: de 0 a 100 · Noviembre 2026',
  status: 'published', is_public: true, event_date: '2026-11-11',
  offered_dates: ['2026-11-11', '2026-11-12', '2026-11-13'],
  registrations_open: true, registration_mode: 'both',
  agenda: [
    { start_time: '14:00', end_time: '17:00' },
    { start_time: '14:00', end_time: '17:00' },
    { start_time: '14:00', end_time: '15:00' },
  ],
  prices: [{ pricing_mode: 'date', start_date: '2026-10-15', price: '50000' }],
};

test('retira eventos ocultos, borradores, terminados o de otra edición', () => {
  for (const change of [{ is_public: false }, { status: 'draft' }, { status: 'completed' }, { slug: 'chatgpt-work-de-0-a-100' }]) {
    assert.equal(renderWorkshopCard({ ...event, ...change }, new Date('2026-10-13T15:00Z')), '');
  }
  assert.equal(renderWorkshopCard(event, new Date('2026-11-14T15:00Z')), '');
});

test('informa apertura futura y las tres jornadas con siete horas', () => {
  const html = renderWorkshopCard(event, new Date('2026-10-13T15:00Z'));
  assert.match(html, /Inscripción desde el 15 de octubre/);
  assert.doesNotMatch(html, /Inscripciones abiertas/);
  assert.match(html, /11, 12 y 13 de noviembre de 2026/);
  assert.match(html, /3 jornadas · 7 horas/);
  assert.match(html, new RegExp(WORKSHOP_SLUG));
});

test('la apertura respeta medianoche argentina y el cierre administrativo', () => {
  assert.doesNotMatch(renderWorkshopCard(event, new Date('2026-10-15T02:59:00Z')), /Inscripciones abiertas/);
  assert.match(renderWorkshopCard(event, new Date('2026-10-15T03:00:00Z')), /Inscripciones abiertas/);
  assert.match(renderWorkshopCard({ ...event, registrations_open: false }, new Date('2026-10-16T15:00Z')), /Inscripción no disponible/);
});

test('usa el flyer oficial completo y luego el banner horizontal, sin imagen antigua', () => {
  const html = renderWorkshopCard({ ...event, official_banner_url: 'https://example.com/flyer.png', banner_url: 'https://example.com/banner.png' }, new Date('2026-10-13T15:00Z'));
  assert.match(html, /news-image--official/);
  assert.match(html, /src="https:\/\/example.com\/flyer.png"/);
  assert.doesNotMatch(html, /chatgpt-work-cover|src="https:\/\/example.com\/banner.png"/);
  assert.match(renderWorkshopCard({ ...event, banner_url: 'https://example.com/banner.png' }, new Date('2026-10-13T15:00Z')), /src="https:\/\/example.com\/banner.png"/);
});

test('escapa datos del evento y no acepta imágenes con protocolos ejecutables', () => {
  const html = renderWorkshopCard({ ...event, title: '<script>alert(1)</script>', banner_url: 'javascript:alert(1)' }, new Date('2026-10-13T15:00Z'));
  assert.doesNotMatch(html, /<script>|javascript:/);
  assert.match(html, /&lt;script&gt;/);
});

test('consulta sólo eventos públicos publicados con acceso anónimo y omite la tarjeta ante un fallo', async () => {
  const env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-test-key' };
  const html = await renderHomeWorkshop('<main><!-- HOME_WORKSHOP --></main>', {
    env, now: new Date('2026-10-13T15:00Z'),
    fetchImpl: async (url, options) => {
      assert.equal(url.searchParams.get('status'), 'eq.published');
      assert.equal(url.searchParams.get('is_public'), 'eq.true');
      assert.equal(options.headers.apikey, 'public-test-key');
      assert.doesNotMatch(url.searchParams.get('select'), /private_link_token|participants/);
      return { ok: true, json: async () => [event] };
    },
  });
  assert.match(html, /3 jornadas · 7 horas/);
  assert.equal(await renderHomeWorkshop('<main><!-- HOME_WORKSHOP --></main>', { env, fetchImpl: async () => { throw new Error('Offline'); } }), '<main></main>');
});
