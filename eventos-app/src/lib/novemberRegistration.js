export const NOVEMBER_WORKSHOP_SLUG = 'chatgpt-work-de-0-a-100-noviembre-2026'
export const REGISTRATION_DOCUMENT_BUCKET = 'event-registration-documents'
export const ARGENTINA_PROVINCES = [
  'Chubut', 'Buenos Aires', 'Catamarca', 'Chaco', 'Ciudad Autónoma de Buenos Aires',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
  'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego, Antártida e Islas del Atlántico Sur', 'Tucumán',
]
export const AI_TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Microsoft Copilot', 'Grok', 'Perplexity', 'Meta AI', 'Otra', 'No uso ninguna']
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024

export function validateWorkshopPrivateDetails(details) {
  if (!/^\d{7,8}$/.test(details?.dni || '')) return 'Ingresá tu DNI con 7 u 8 números, sin puntos.'
  if (!details.invoice_requested) return ''
  const cuit = details.invoice_cuit || ''
  if (!/^\d{11}$/.test(cuit)) return 'Ingresá un CUIT de 11 números para la factura C.'
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((total, weight, index) => total + Number(cuit[index]) * weight, 0)
  const digit = (11 - (sum % 11)) % 11
  if (digit === 10 || digit !== Number(cuit[10])) return 'Revisá el CUIT ingresado.'
  if ((details.invoice_name || '').trim().length < 2) return 'Completá el nombre o razón social para la factura.'
  return ''
}
