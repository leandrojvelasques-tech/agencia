const { getPublicSupabaseConfig } = require('./supabasePublicConfig');
const WORKSHOP_SLUG = 'chatgpt-work-de-0-a-100-noviembre-2026';
const HOME_WORKSHOP_SLOT = '<!-- HOME_WORKSHOP -->';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function argentinaDateKey(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function safeImageUrl(value) {
  if (!value) return '';
  try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; }
}

function renderWorkshopCard(event, now = new Date()) {
  if (!event || event.slug !== WORKSHOP_SLUG || event.is_public !== true || event.status !== 'published') return '';
  const dates = (event.offered_dates?.length ? event.offered_dates : [event.event_date])
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const today = argentinaDateKey(now);
  if (!dates.length || dates.at(-1) < today) return '';
  const dateFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const labelDate = date => dateFormat.format(new Date(`${date}T12:00:00Z`));
  const prices = Array.isArray(event.prices) ? event.prices : [];
  const datePrices = prices.length > 0 && prices.every(tier => tier.pricing_mode === 'date');
  const currentTier = prices.find(tier => tier.start_date && tier.start_date <= today && (!tier.end_date || today <= tier.end_date));
  const nextTier = [...prices].filter(tier => tier.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const canRegister = event.registrations_open !== false && ['self', 'both'].includes(event.registration_mode);
  const status = !canRegister ? 'Inscripción no disponible'
    : datePrices && !currentTier ? (nextTier ? `Inscripción desde el ${labelDate(nextTier.start_date)}` : 'Inscripción no disponible')
    : 'Inscripciones abiertas';
  const official = safeImageUrl(event.official_banner_url);
  const banner = safeImageUrl(event.banner_url);
  const image = official || banner;
  const statusMarkup = `<span class="news-status status-open"><i aria-hidden="true"></i> ${escapeHtml(status)}</span>`;
  const picture = image
    ? `<div class="news-image${official ? ' news-image--official' : ''}">${official ? '' : statusMarkup}<img src="${escapeHtml(image)}" alt="${escapeHtml(event.title)}" loading="lazy"></div>`
    : `<div class="news-image news-image--workshop">${statusMarkup}<img src="/assets/workshop-news-network.svg" alt="" loading="lazy" width="720" height="440"><span class="news-workshop-cover">Tu nuevo<br><em>entorno de trabajo</em></span></div>`;
  const dateLabel = dates.length > 1 && dates.every(date => date.slice(0, 7) === dates[0].slice(0, 7))
    ? `${dates.map(date => Number(date.slice(8))).join(', ').replace(/, (\d+)$/, ' y $1')} de ${new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dates[0]}T12:00:00Z`))}`
    : dates.map(labelDate).join(' · ');
  const agenda = Array.isArray(event.agenda) ? event.agenda : [];
  const minutes = agenda.reduce((total, day) => {
    const start = day.start_time?.split(':').map(Number);
    const end = day.end_time?.split(':').map(Number);
    return start?.length >= 2 && end?.length >= 2 ? total + Math.max(0, (end[0] - start[0]) * 60 + end[1] - start[1]) : total;
  }, 0);
  const duration = minutes ? ` · ${new Intl.NumberFormat('es-AR').format(minutes / 60)} horas` : '';
  return `<a class="news-card is-open" href="/evento/${WORKSHOP_SLUG}" aria-label="${escapeHtml(event.title)}">${picture}<div class="news-body">${official ? `<div class="news-workshop-status">${statusMarkup}</div>` : ''}<p class="news-kicker">TALLER ONLINE · ABIERTO A TODO PÚBLICO</p><h3>${escapeHtml(event.title)}</h3><p class="news-workshop-date">${escapeHtml(dateLabel)}<br>${dates.length} jornadas${duration} · Online</p><div class="news-meta"><span>Edición de noviembre</span><strong>Ver programa ↗</strong></div></div></a>`;
}

async function loadWorkshop({ env = process.env, fetchImpl = fetch } = {}) {
  const { supabaseUrl: base, supabaseKey: key } = getPublicSupabaseConfig(env);
  if (!base || !key) return null;
  const url = new URL('/rest/v1/events', base);
  url.searchParams.set('slug', `eq.${WORKSHOP_SLUG}`);
  url.searchParams.set('is_public', 'eq.true');
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('select', 'title,slug,status,is_public,event_date,offered_dates,registrations_open,registration_mode,banner_url,official_banner_url,prices,agenda');
  url.searchParams.set('limit', '1');
  const response = await fetchImpl(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error('Public workshop lookup failed');
  const events = await response.json();
  return Array.isArray(events) ? events[0] || null : null;
}

async function renderHomeWorkshop(html, options = {}) {
  try {
    const event = await loadWorkshop(options);
    return html.replace(HOME_WORKSHOP_SLOT, renderWorkshopCard(event, options.now));
  } catch {
    // Never fall back to a stale event or an unverified registration claim.
    return html.replace(HOME_WORKSHOP_SLOT, '');
  }
}

module.exports = { WORKSHOP_SLUG, HOME_WORKSHOP_SLOT, renderWorkshopCard, loadWorkshop, renderHomeWorkshop };
