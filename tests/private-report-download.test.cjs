const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const net = require('node:net')
const path = require('node:path')
const fs = require('node:fs')
const { createHash } = require('node:crypto')
const { getReportLink } = require('../private/reportAccess')

const root = path.resolve(__dirname, '..')
const reportId = 'puerto-cangrejo-octubre-2026'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

test('private reports serve the complete PDF only to the matching client', async t => {
  const reservation = net.createServer()
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
  const port = reservation.address().port
  await new Promise(resolve => reservation.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const server = spawn(process.execPath, ['server.js'], {
    cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
  })
  t.after(() => server.kill())
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await fetch(`${base}/`); ready = true; break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, 'report server starts')
  const link = getReportLink(reportId, base)
  assert.ok(link, 'October report is registered')
  const portal = link.slice(0, link.lastIndexOf('/'))

  await t.test('HTML includes all reviews, photos, and relative download links', async () => {
    const response = await fetch(link)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.equal((html.match(/class="report-review"/g) || []).length, 41)
    assert.equal((html.match(/class="team-photo(?: team-feature)?"/g) || []).length, 5)
    assert.equal((html.match(/href="puerto-cangrejo-octubre-2026.pdf"/g) || []).length, 2)
    const listing = await fetch(portal).then(response => response.text())
    assert.ok(listing.includes('Octubre 2026'))
    assert.equal((await fetch(getReportLink('puerto-cangrejo-septiembre-2026', base))).status, 200)
  })

  await t.test('PDF bytes and download headers match the verified artifact', async () => {
    const response = await fetch(`${link}.pdf`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/pdf')
    assert.equal(response.headers.get('content-disposition'), `attachment; filename="${reportId}.pdf"`)
    assert.ok(response.headers.get('cache-control').includes('no-store'))
    assert.ok(response.headers.get('x-robots-tag').includes('noindex'))
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.equal(hash(bytes), hash(fs.readFileSync(path.join(root, 'private-reports', `${reportId}.pdf`))))
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
  })

  await t.test('invalid, cross-client, unregistered, and direct paths stay blocked', async () => {
    const otherPortal = getReportLink('cayo-coco-septiembre-2026', base).replace(/\/[^/]+$/, '')
    for (const url of [
      `${base}/informes/invalid/${reportId}.pdf`,
      `${otherPortal}/${reportId}.pdf`,
      `${portal}/unknown.pdf`,
      `${portal}/puerto-cangrejo-septiembre-2026.pdf`,
      `${base}/private-reports/${reportId}.pdf`,
    ]) assert.equal((await fetch(url)).status, 404, 'unavailable report returns 404')
  })

  await t.test('legacy report handler returns binary PDF content', () => {
    const handler = require('../api/private-report')
    const token = new URL(link).pathname.split('/')[2]
    const headers = {}
    const res = {
      setHeader(name, value) { headers[name] = value },
      status(code) { this.statusCode = code; return this },
      send(body) { this.body = body; return this },
    }
    handler({ query: { token, reportId: `${reportId}.pdf` } }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(headers['Content-Type'], 'application/pdf')
    assert.ok(Buffer.isBuffer(res.body))
    assert.equal(hash(res.body), hash(fs.readFileSync(path.join(root, 'private-reports', `${reportId}.pdf`))))
  })
})
