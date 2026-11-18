const ACTIVE_STATUSES = new Set(['draft', 'published', 'in_progress'])

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isUpcomingEvent(event, today = localDateKey()) {
  const dates = [event.event_date, ...(Array.isArray(event.offered_dates) ? event.offered_dates : [])].filter(Boolean)
  return ACTIVE_STATUSES.has(event.status) && (event.status === 'in_progress' || dates.some(date => date >= today))
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()

export function selectCatalogEvents(events, { search = '', type = 'all', status = 'all', scope = 'all', today = localDateKey() } = {}) {
  const query = normalize(search)
  return events.filter(event =>
    (type === 'all' || event.type === type) &&
    (status === 'all' || event.status === status) &&
    (scope === 'all' || (scope === 'upcoming' ? isUpcomingEvent(event, today) : !isUpcomingEvent(event, today))) &&
    (!query || normalize(`${event.title} ${event.organizer || ''} ${event.location || ''}`).includes(query))
  ).sort((a, b) => {
    const aNext = isUpcomingEvent(a, today)
    const bNext = isUpcomingEvent(b, today)
    if (aNext !== bNext) return aNext ? -1 : 1
    return aNext
      ? String(a.event_date || '').localeCompare(String(b.event_date || ''))
      : String(b.event_date || '').localeCompare(String(a.event_date || ''))
  })
}
