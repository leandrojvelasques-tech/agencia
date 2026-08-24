import cayoCocoReportHtml from '../../public/reportes/cayo-coco-julio-2026.html?raw'
import puertoCangrejoReportHtml from '../../public/reportes/puerto-cangrejo-julio-2026.html?raw'

export const CRM_REPORTS = [
  {
    id: 'puerto-cangrejo-julio-2026',
    client: 'Puerto Cangrejo',
    clientSlug: 'puerto-cangrejo',
    period: 'Julio 2026',
    month: 7,
    year: 2026,
    score: 4.91,
    historicalScore: 4.43,
    reviews: 22,
    answered: null,
    positiveRate: 100,
    fiveStars: 20,
    fourStars: 2,
    publicPath: '/reportes/puerto-cangrejo-julio-2026.html',
    html: puertoCangrejoReportHtml,
    accent: '#a80d13',
    summary: 'Julio registra un volumen alto de opiniones y mantiene una calificación muy por encima del promedio histórico.',
  },
  {
    id: 'cayo-coco-julio-2026',
    client: 'Cayo Coco',
    clientSlug: 'cayo-coco',
    period: 'Julio 2026',
    month: 7,
    year: 2026,
    score: 4.29,
    historicalScore: 4.14,
    reviews: 14,
    answered: null,
    positiveRate: 85.7,
    fiveStars: 9,
    fourStars: 3,
    publicPath: '/reportes/cayo-coco-julio-2026.html',
    html: cayoCocoReportHtml,
    accent: '#285a47',
    summary: 'Julio se mantiene por encima del promedio histórico y concentra respuestas positivas.',
  },
]

export const REPORT_CLIENTS = [...new Set(CRM_REPORTS.map(report => report.client))]

export const REPORT_PERIODS = [...new Set(CRM_REPORTS.map(report => report.period))]

export function getCrmReport(id) {
  return CRM_REPORTS.find(report => report.id === id) || null
}
