const ARGENTINA_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const getArgentinaDateKey = (date = new Date()) => {
  const parts = Object.fromEntries(ARGENTINA_DATE_FORMATTER.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const isDateBasedPriceSchedule = (prices) => (
  Array.isArray(prices) && prices.length > 0 && prices.every(price => price?.pricing_mode === 'date')
)

export const getApplicablePriceTier = (prices, dateKey = getArgentinaDateKey()) => {
  if (!isDateBasedPriceSchedule(prices)) return null

  return prices.find(price => (
    price.start_date &&
    dateKey >= price.start_date &&
    (!price.end_date || dateKey <= price.end_date)
  )) || null
}

export const getPriceAmount = (price) => {
  const value = typeof price === 'number' ? price : Number(String(price ?? '').replace(/[^\d,-]/g, '').replace(',', '.'))
  return Number.isFinite(value) ? value : 0
}

export const formatArsPrice = (price) => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
}).format(getPriceAmount(price))

export const validateDatePriceSchedule = (prices) => {
  if (Array.isArray(prices) && prices.some(price => price?.pricing_mode === 'date') && !isDateBasedPriceSchedule(prices)) {
    return 'Usá tramos por fecha o tarifas por categoría en un mismo evento, no ambos formatos mezclados.'
  }
  if (!isDateBasedPriceSchedule(prices)) return ''
  const sorted = [...prices].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))

  if (sorted.some(price => !price.concept?.trim() || !price.start_date || getPriceAmount(price.price) <= 0)) {
    return 'Completá el nombre, la fecha de inicio y un importe mayor a cero en cada tramo.'
  }
  if (sorted.some(price => price.end_date && price.end_date < price.start_date)) {
    return 'La fecha de cierre de cada tramo debe ser igual o posterior a su inicio.'
  }
  if (sorted.slice(1).some((price, index) => {
    const previous = sorted[index]
    return !previous.end_date || previous.end_date >= price.start_date
  })) {
    return 'Los tramos no pueden superponerse. Revisá las fechas de inicio y cierre.'
  }

  return ''
}
