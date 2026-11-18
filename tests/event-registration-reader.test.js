const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { PGlite } = require('@electric-sql/pglite');
const { RegistrationReader, createRegistrationHandler, timestamp, PATH, EVENT_ID, FIELDS, sha } = require('../lib/eventRegistrationReader');

// All credentials and people in this file are synthetic.
const TOKEN = 'fictional_test_credential_000000000000000000000000';
const NOW = Date.parse('2026-11-18T12:00:00Z');
const FROM = '2026-11-17T00:00:00.000000Z';
const CUT = '2026-11-18T11:00:00.000000Z';
const OTHER = '11111111-1111-1111-1111-111111111111';
const env = { EVENT_REGISTRATION_TOKEN_SHA256: sha(TOKEN), EVENT_REGISTRATION_SUPABASE_URL: 'https://synthetic.invalid', EVENT_REGISTRATION_PUBLISHABLE_KEY: 'sb_publishable_fictional' };
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const row = (n, at = '2026-11-17T10:00:00.000001Z') => ({ id: id(n), created_at: at, first_name: 'Persona ficticia', last_name: `Prueba ${n}`, profession: 'Contador/a', residence_city: 'Ciudad ficticia', email: `ficticio${n}@example.invalid` });
const req = (method = 'GET', token = TOKEN) => ({ method, headers: token === null ? {} : { authorization: `Bearer ${token}` } });
const url = query => new URL(`${PATH}?${query}`, 'https://local.invalid');
function fixture(data = { total: 3, inscriptions: [row(1), row(2), row(3)] }) {
  const calls = [];
  const reader = new RegistrationReader({ env: { ...env }, now: () => NOW, fetchImpl: async (address, options) => {
    calls.push({ address: String(address), ...options });
    const body = JSON.parse(options.body);
    return Response.json(body.p_verify_only ? { authorized: true } : data);
  } });
  return { reader, calls };
}
const query = `from=${FROM}&cutoff=${CUT}`;

test('authorized changes and total use only fixed read RPC, no general credentials', async () => {
  const { reader, calls } = fixture();
  const data = await reader.read(req(), url(query));
  assert.equal(data.total, 3); assert.equal(data.inscriptions.length, 3); assert.equal(data.next_cursor, null);
  assert.equal(calls[0].address, 'https://synthetic.invalid/rest/v1/rpc/read_cpce_registration_snapshot');
  assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].redirect, 'error');
  assert.deepEqual(Object.keys(JSON.parse(calls[0].body)).sort(), ['p_credential', 'p_cutoff', 'p_from', 'p_verify_only']);
  const totalFixture = fixture({ total: 3, inscriptions: [] });
  assert.deepEqual(await totalFixture.reader.read(req(), url(`operation=total&cutoff=${CUT}`)), { cutoff: CUT, total: 3 });
});

test('missing, malformed and incorrect credentials fail before reaching source', async () => {
  const { reader, calls } = fixture();
  for (const [token, status] of [[null, 401], ['bad', 403], ['x'.repeat(45), 403]]) {
    await assert.rejects(reader.read(req('GET', token), url(query)), { status });
  }
  assert.equal(calls.length, 0);
});

test('the dedicated credential grants no write methods', async () => {
  const { reader, calls } = fixture();
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) await assert.rejects(reader.read(req(method), url(query)), { status: 405 });
  assert.equal(calls.length, 0);
});

test('event selectors, arbitrary SQL, duplicate parameters and unknown operations fail', async () => {
  const { reader, calls } = fixture();
  for (const extra of [`&event_id=${OTHER}`, '&event=other', '&sql=select', '&from=other', '&operation=write', '&select=*']) {
    await assert.rejects(reader.read(req(), url(query + extra)), { status: 400 });
  }
  assert.equal(calls.length, 0);
});

test('strict real UTC dates, microseconds, limits and maximum interval', async () => {
  assert.equal(timestamp('2026-11-17T10:00:00.000001Z'), '2026-11-17T10:00:00.000001Z');
  assert.equal(timestamp('2026-11-17T10:00:00Z'), '2026-11-17T10:00:00.000000Z');
  const { reader } = fixture();
  for (const from of ['2026-02-30T00:00:00Z', '2026-11-17', '2026-11-17T00:00:00-03:00', '2026-11-17T24:00:00Z', 'infinity', CUT, '2020-01-01T00:00:00Z']) {
    await assert.rejects(reader.read(req(), url(`from=${encodeURIComponent(from)}&cutoff=${CUT}`)), { status: 400 });
  }
  for (const limit of ['0', '-1', '501', '1.5', 'NaN', '01']) await assert.rejects(reader.read(req(), url(`${query}&limit=${limit}`)), { status: 400 });
  await assert.rejects(reader.read(req(), url(`from=${FROM}&cutoff=2026-11-19T00:00:00Z`)), { status: 400 });
});

test('pagination is deterministic with equal dates, microsecond differences and reversed source order', async () => {
  const rows = [row(3, '2026-11-17T10:00:00.000002Z'), row(2), row(1)];
  const { reader } = fixture({ total: 8, inscriptions: rows });
  let data = await reader.read(req(), url(`${query}&limit=1`)); const seen = [];
  for (;;) {
    assert.equal(data.total, 8); assert.equal(data.cutoff, CUT); seen.push(...data.inscriptions.map(r => r.id));
    if (!data.next_cursor) break;
    data = await reader.read(req(), url(`cursor=${data.next_cursor}&limit=1`));
  }
  assert.deepEqual(seen, [id(1), id(2), id(3)]);
});

test('pagination retries return identical pages; source changes do not change snapshot', async () => {
  const source = { total: 3, inscriptions: [row(1), row(2), row(3)] };
  const { reader } = fixture(source);
  const first = await reader.read(req(), url(`${query}&limit=1`));
  source.total = 100; source.inscriptions.splice(0);
  const second = await reader.read(req(), url(`cursor=${first.next_cursor}&limit=1`));
  assert.deepEqual(await reader.read(req(), url(`cursor=${first.next_cursor}&limit=1`)), second);
  assert.equal(second.total, 3); assert.equal(second.inscriptions[0].id, id(2));
});

test('tampering, cross-event signed cursor, expiry, restart and parameter mixing fail', async () => {
  const { reader } = fixture(); const first = await reader.read(req(), url(`${query}&limit=1`));
  await assert.rejects(reader.read(req(), url(`cursor=x${first.next_cursor}`)), { status: 400 });
  const payload = JSON.parse(Buffer.from(first.next_cursor.split('.')[0], 'base64url'));
  await assert.rejects(reader.read(req(), url(`cursor=${reader.sign({ ...payload, event: OTHER })}`)), { status: 403 });
  await assert.rejects(reader.read(req(), url(`cursor=${first.next_cursor}&from=${FROM}`)), { status: 400 });
  reader.snapshots.clear();
  await assert.rejects(reader.read(req(), url(`cursor=${first.next_cursor}`)), { status: 410 });
  await assert.rejects(fixture().reader.read(req(), url(`cursor=${first.next_cursor}`)), { status: 400 });
});

test('expiry cleanup, revocation, source errors, and empty results are distinct', async () => {
  const { reader } = fixture();
  const first = await reader.read(req(), url(`${query}&limit=1`));
  reader.fetch = async () => Response.json({ message: 'SECRET person@example.invalid' }, { status: 403 });
  await assert.rejects(reader.read(req(), url(`cursor=${first.next_cursor}`)), { status: 403 });
  reader.now = () => NOW + 16 * 60000;
  await assert.rejects(reader.read(req(), url(`cursor=${first.next_cursor}`)), { status: 410 });
  reader.fetch = async () => { throw new Error('SECRET person@example.invalid'); };
  await assert.rejects(reader.read(req(), url(query)), { status: 503, message: 'source_unavailable' });
  const empty = await fixture({ total: 0, inscriptions: [] }).reader.read(req(), url(query));
  assert.deepEqual(empty.inscriptions, []); assert.equal(empty.total, 0); assert.equal(empty.next_cursor, null);
});

test('projection strips all unapproved fields and rejects duplicates or out-of-window records', async () => {
  const data = await fixture({ total: 1, inscriptions: [{ ...row(1), phone: 'PRIVATE', notes: 'PRIVATE', survey_responses: { dni: 'PRIVATE' }, token: 'PRIVATE' }] }).reader.read(req(), url(query));
  assert.deepEqual(Object.keys(data.inscriptions[0]), FIELDS); assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  for (const inscriptions of [[row(1), row(1)], [row(1, CUT)], [row(1, '2020-01-01T00:00:00Z')]]) {
    await assert.rejects(fixture({ total: 2, inscriptions }).reader.read(req(), url(query)), { status: 503 });
  }
});

test('bounded snapshots, global request budget and privileged key rejection', async () => {
  const { reader, calls } = fixture();
  reader.busy = true; await assert.rejects(reader.read(req(), url(query)), { status: 429 }); reader.busy = false;
  reader.env.EVENT_REGISTRATION_PUBLISHABLE_KEY = `fake.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.fake`;
  await assert.rejects(reader.read(req(), url(query)), { status: 503 }); assert.equal(calls.length, 0);
  reader.window.authorized = 60; await assert.rejects(reader.read(req(), url(query)), { status: 429 });
  const crowded = fixture().reader;
  for (let i = 0; i < 8; i++) await crowded.read(req(), url(query));
  await assert.rejects(crowded.read(req(), url(query)), { status: 429 });
});

test('HTTP handler rejects manipulated routes, uses no-store and sanitizes errors', async () => {
  const handle = createRegistrationHandler({ env, now: () => NOW, fetchImpl: async () => { throw new Error(`secret:${TOKEN} private@example.invalid`); } });
  const server = http.createServer(async (request, response) => {
    if (!await handle(request, response, new URL(request.url, 'http://localhost'))) { response.statusCode = 404; response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of [`${PATH}/${OTHER}`, `${PATH}/total/${OTHER}`]) {
      const response = await fetch(base + route, { headers: { Authorization: `Bearer ${TOKEN}` } });
      assert.equal(response.status, 404); assert.match(response.headers.get('Cache-Control'), /no-store/);
    }
    const response = await fetch(`${base}${PATH}?${query}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'source_unavailable' });
    assert.match(response.headers.get('Cache-Control'), /private.*no-store/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('actual SQL on synthetic PostgreSQL: authentication, isolation, projection, count, boundaries, and no writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table public.participants(id uuid primary key,first_name text,last_name text,email text,phone text,notes text);
      create table public.registrations(id uuid primary key,event_id uuid,participant_id uuid references public.participants(id),created_at timestamptz,status text,survey_responses jsonb);
      insert into public.participants values ('${id(1)}','Nombre ficticio','Apellido ficticio','ficticio@example.invalid','PRIVATE','PRIVATE');`);
    const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261118132538_event_registration_reader.sql'), 'utf8');
    await db.exec(migration);
    await db.query('insert into cpce_registration_private.reader_credential values (true,$1,true,now()+interval \'1 hour\')', [sha(TOKEN)]);
    for (const [n, event, at, status] of [
      [1, EVENT_ID, FROM, 'confirmed'], [2, EVENT_ID, '2026-11-17T10:00:00.000001Z', 'cancelled'],
      [3, OTHER, FROM, 'confirmed'], [4, EVENT_ID, CUT, 'confirmed'], [5, EVENT_ID, '2026-11-16T00:00:00Z', 'registered'],
    ]) {
      await db.query('insert into public.registrations values ($1,$2,$3,$4,$5,$6)', [id(n), event, id(1), at, status,
        { profesion: 'Categoría ficticia', profesion_carrera: 'Profesión ficticia', 'Ciudad de residencia': 'Ciudad ficticia', dni: 'PRIVATE', solicitud_diapositivas: true }]);
    }
    await db.exec('set role anon');
    const read = (token = TOKEN, from = FROM, cutoff = CUT, verify = false) => db.query('select public.read_cpce_registration_snapshot($1,$2,$3,$4) as data', [token, from, cutoff, verify]);
    const result = (await read()).rows[0].data;
    assert.equal(result.total, 3); // Includes old and cancelled rows, excludes other event and cutoff equality.
    assert.deepEqual(result.inscriptions.map(r => r.id), [id(1), id(2)]);
    assert.equal(result.inscriptions[0].created_at, FROM);
    assert.equal(result.inscriptions[0].profession, 'Profesión ficticia');
    assert.equal(result.inscriptions[0].residence_city, 'Ciudad ficticia');
    assert.deepEqual(Object.keys(result.inscriptions[0]).sort(), [...FIELDS].sort());
    assert.ok(!JSON.stringify(result).includes('PRIVATE'));
    assert.equal((await read(TOKEN, null)).rows[0].data.total, 3);
    assert.deepEqual((await read(TOKEN, null, null, true)).rows[0].data, { authorized: true });
    assert.deepEqual((await read(TOKEN, '2026-11-18T10:00:00Z')).rows[0].data.inscriptions, []);
    // Exercise the real SQL result through the HTTP reader and cursor flow.
    const integrated = new RegistrationReader({ env, now: () => NOW, fetchImpl: async (_address, options) => {
      const p = JSON.parse(options.body);
      try {
        const answer = await read(p.p_credential, p.p_from, p.p_cutoff, p.p_verify_only);
        return Response.json(answer.rows[0].data);
      } catch (error) {
        return Response.json({ code: error.code }, { status: error.code === '42501' ? 403 : 500 });
      }
    } });
    const page1 = await integrated.read(req(), url(`${query}&limit=1`));
    const page2 = await integrated.read(req(), url(`cursor=${page1.next_cursor}&limit=1`));
    assert.deepEqual([...page1.inscriptions, ...page2.inscriptions], result.inscriptions);
    assert.equal(page2.total, result.total); assert.equal(page2.next_cursor, null);
    await assert.rejects(db.query('select public.read_cpce_registration_snapshot(p_credential=>$1,p_from=>$2,p_cutoff=>$3,p_event=>$4)',
      [TOKEN, FROM, CUT, OTHER]), { code: '42883' });
    for (const bad of [null, 'invalid', 'x'.repeat(45)]) await assert.rejects(read(bad), { code: '42501' });
    await assert.rejects(read(TOKEN, CUT, FROM), { code: '22023' });
    await assert.rejects(read(TOKEN, FROM, 'infinity'), { code: '22023' });
    for (const sql of ['select * from cpce_registration_private.reader_credential', 'select * from public.participants',
      'delete from public.registrations', 'update public.registrations set status=\'cancelled\'', 'insert into public.participants(id) values (gen_random_uuid())']) {
      await assert.rejects(db.exec(sql), { code: '42501' });
    }
    await db.exec('reset role; update cpce_registration_private.reader_credential set enabled=false; set role anon');
    await assert.rejects(read(), { code: '42501' });
    await assert.rejects(integrated.read(req(), url(`cursor=${page1.next_cursor}`)), { status: 403 });
    await db.exec('reset role; update cpce_registration_private.reader_credential set enabled=true,expires_at=now()-interval \'1 second\'; set role anon');
    await assert.rejects(read(TOKEN, null, null, true), { code: '42501' });
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int as n from public.registrations')).rows[0].n, 5);
  } finally { await db.close(); }
});
