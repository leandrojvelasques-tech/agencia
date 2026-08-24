const { getReportLink } = require('../private/reportAccess')
const { getBearerToken, verifyAdminSession } = require('./admin-auth')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' })

  if (!(await verifyAdminSession(getBearerToken(req)))) return res.status(401).json({ error: 'No autorizado.' })

  const reportId = req.body?.reportId
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const link = getReportLink(reportId, `${protocol}://${host}`)
  if (!link) return res.status(404).json({ error: 'Reporte no encontrado.' })

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ link })
}
