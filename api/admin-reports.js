const { getBearerToken, verifyAdminSession } = require('./admin-auth')
const { getAdminReports } = require('../private/reportAccess')

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' })
  if (!(await verifyAdminSession(getBearerToken(req)))) return res.status(401).json({ error: 'No autorizado.' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ reports: getAdminReports() })
}
