const crypto = require('crypto')

const ACCESS = [
  {
    client: 'Puerto Cangrejo',
    token: 'w7Vsl43hdw4UGsq8bMcJIsJto08-ER_CgifP5bISUk0',
    reports: [
      { id: 'puerto-cangrejo-julio-2026', label: 'Julio 2026', period: 'Julio 2026', file: 'puerto-cangrejo-julio-2026.html', score: 4.91, historicalScore: 4.43, reviews: 22, answered: null, positiveRate: 100, accent: '#a80d13', summary: 'Julio registra un volumen alto de opiniones y mantiene una calificación muy por encima del promedio histórico.' },
    ],
  },
  {
    client: 'Cayo Coco',
    token: 'l-BLoZq2fo2Gn1JXy5pebtrGNj8H-cVrfDXJ9Nw0Hls',
    reports: [
      { id: 'cayo-coco-julio-2026', label: 'Julio 2026', period: 'Julio 2026', file: 'cayo-coco-julio-2026.html', score: 4.29, historicalScore: 4.14, reviews: 14, answered: null, positiveRate: 85.7, accent: '#285a47', summary: 'Julio se mantiene por encima del promedio histórico y concentra respuestas positivas.' },
    ],
  },
]

function sameToken(received, expected) {
  const receivedHash = crypto.createHash('sha256').update(received || '').digest()
  const expectedHash = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(receivedHash, expectedHash)
}

function findAccess(token) {
  return ACCESS.find(access => sameToken(token, access.token)) || null
}

function getReportLink(reportId, baseUrl) {
  const access = ACCESS.find(item => item.reports.some(report => report.id === reportId))
  const report = access?.reports.find(item => item.id === reportId)
  if (!access || !report) return null
  return `${baseUrl}/informes/${access.token}/${report.id}`
}

function getAdminReports() {
  return ACCESS.flatMap(access => access.reports.map(({ file, label, ...report }) => ({ ...report, client: access.client })))
}

module.exports = { findAccess, getReportLink, getAdminReports }
