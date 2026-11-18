const { getPublicSupabaseConfig } = require('./supabasePublicConfig');

// Deliberately limited to the public event: no participants, tokens, notes or
// administrative material URLs are queried or returned by this endpoint.
const EVENT_ID = 'd9962e70-4b7a-44be-b6f3-20151c810bdb';
const EVENT_SLUG = 'agentes-de-inteligencia-artificial-en-ciencias-economicas-2026';
const PUBLIC_FIELDS = ['id', 'slug', 'title', 'subtitle', 'status', 'is_public',
  'event_date', 'start_time', 'duration_minutes', 'location', 'organizer',
  'coordinator', 'description_short', 'description_extended',
  'registrations_open', 'registration_mode'];

async function loadEventAssistantContext({ fetchImpl = fetch, env = process.env, now = new Date() } = {}) {
  const { supabaseUrl, supabaseKey } = getPublicSupabaseConfig(env);
  const url = new URL('/rest/v1/events', supabaseUrl);
  url.searchParams.set('id', `eq.${EVENT_ID}`);
  url.searchParams.set('slug', `eq.${EVENT_SLUG}`);
  url.searchParams.set('is_public', 'eq.true');
  url.searchParams.set('status', 'in.(published,in_progress,completed)');
  url.searchParams.set('select', PUBLIC_FIELDS.join(','));
  url.searchParams.set('limit', '1');
  const response = await fetchImpl(url, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Event source unavailable');
  const rows = await response.json();
  const event = Array.isArray(rows) ? rows[0] : null;
  if (!event || event.id !== EVENT_ID || event.slug !== EVENT_SLUG || event.is_public !== true
    || !['published', 'in_progress', 'completed'].includes(event.status)) return null;
  const publicEvent = Object.fromEntries(PUBLIC_FIELDS.filter(key => key !== 'is_public').map(key => [key, event[key] ?? null]));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const registrationAvailable = event.registrations_open === true
    && ['published', 'in_progress'].includes(event.status)
    && ['self', 'both'].includes(event.registration_mode)
    && typeof event.event_date === 'string' && event.event_date >= today;
  return {
    source: 'Backoffice de eventos · Lic. Leandro Velasques',
    fetched_at: now.toISOString(),
    event: publicEvent,
    landing_url: `https://www.leandrovelasques.com.ar/evento/${EVENT_SLUG}`,
    registration: {
      available: registrationAvailable,
      url: `https://www.leandrovelasques.com.ar/evento/${EVENT_SLUG}/inscripcion`,
      fields: ['Nombre', 'Apellido', 'Profesión', 'Ciudad de residencia', 'Correo electrónico'],
      optional: ['Solicitar diapositivas cuando estén disponibles'],
      confirmation: 'La inscripción se guarda al pulsar Confirmar inscripción. La página debe mostrar Inscripción confirmada.',
    },
    limitations: ['No incluye datos de asistentes ni permite registrar personas por chat.',
      'Las diapositivas y fichas privadas están en la base de conocimiento del asistente.'],
  };
}

module.exports = { EVENT_ID, EVENT_SLUG, PUBLIC_FIELDS, loadEventAssistantContext };
