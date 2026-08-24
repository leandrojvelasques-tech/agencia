const fs = require('fs')
const path = require('path')
const { findAccess } = require('../private/reportAccess')

function setPrivateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

module.exports = (req, res) => {
  const { token, reportId } = req.query
  const access = findAccess(token)
  setPrivateHeaders(res)
  if (!access) return res.status(404).send('Enlace no válido.')

  if (!reportId) {
    const links = access.reports.map(report => `<li><a href="/informes/${encodeURIComponent(token)}/${report.id}">${report.label}</a></li>`).join('')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reportes · ${access.client}</title><style>body{margin:0;background:#f5f3ef;color:#222;font-family:Arial,sans-serif}.box{max-width:620px;margin:12vh auto;padding:34px;background:#fff;border-radius:18px;box-shadow:0 8px 30px #00000012}p{color:#666;line-height:1.5}a{display:block;padding:16px 18px;margin-top:12px;border-radius:10px;background:#285a47;color:#fff;text-decoration:none;font-weight:700}ul{margin:0;padding:0;list-style:none}</style></head><body><main class="box"><p>LEANDRO VELASQUES · INFORMES</p><h1>${access.client}</h1><p>Seleccioná el período que querés consultar.</p><ul>${links}</ul></main></body></html>`)
  }

  const report = access.reports.find(item => item.id === reportId)
  if (!report) return res.status(404).send('Reporte no encontrado.')
  try {
    const reportHtml = fs.readFileSync(path.join(process.cwd(), 'private-reports', report.file), 'utf8')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(reportHtml)
  } catch {
    return res.status(500).send('No se pudo cargar el reporte.')
  }
}
