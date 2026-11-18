import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { isUpcomingEvent, selectCatalogEvents } from '../lib/eventCatalog'

const STATUS = {
  draft: ['Borrador', 'draft'], published: ['Publicado', 'published'],
  in_progress: ['En curso', 'live'], completed: ['Finalizado', 'completed'], cancelled: ['Cancelado', 'cancelled'],
}
const TYPES = { charla: 'Charla', taller: 'Taller' }
const Icon = ({ children }) => <span className="material-symbols-outlined" aria-hidden="true">{children}</span>
const dateOf = event => new Date(`${event.event_date}T12:00:00`)
const dateLabel = event => isValid(dateOf(event)) ? format(dateOf(event), "EEEE d 'de' MMMM", { locale: es }) : 'Fecha por definir'

export default function EventCatalog({ events, isLoading }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [scope, setScope] = useState('all')
  const upcoming = selectCatalogEvents(events, { scope: 'upcoming' })
  const filtered = selectCatalogEvents(events, { search, type, status, scope })
  const next = upcoming[0]
  const hasFilters = Boolean(search || type !== 'all' || status !== 'all' || scope !== 'all')
  const clearFilters = () => { setSearch(''); setType('all'); setStatus('all'); setScope('all') }

  return <>
    {next && <section className="event-next" aria-labelledby="next-event-heading">
      <div className="event-next-date" aria-hidden="true">
        <span>{isValid(dateOf(next)) ? format(dateOf(next), 'MMM', { locale: es }) : '—'}</span>
        <strong>{isValid(dateOf(next)) ? format(dateOf(next), 'dd') : '—'}</strong>
        <span>{isValid(dateOf(next)) ? format(dateOf(next), 'yyyy') : ''}</span>
      </div>
      <div className="event-next-info">
        <p className="event-eyebrow">{next.status === 'in_progress' ? 'En curso' : 'Próximo encuentro'} <span>· {STATUS[next.status]?.[0]}</span></p>
        <h2 id="next-event-heading">{next.title}</h2>
        <p>{next.start_time?.slice(0, 5) || 'Horario por definir'}{next.start_time ? ' h' : ''}{next.organizer && ` · ${next.organizer}`}</p>
      </div>
      <Link to={`/admin/eventos/${next.id}`} className="event-next-action">Gestionar evento <Icon>arrow_forward</Icon></Link>
    </section>}

    <section className="event-catalog" aria-labelledby="event-catalog-heading">
      <div className="event-catalog-heading">
        <h2 id="event-catalog-heading">Tus eventos <span>{events.length}</span></h2>
        <div className="event-scope" aria-label="Período de los eventos">
          {[['all', 'Todos', events.length], ['upcoming', 'Próximos', upcoming.length], ['archive', 'Anteriores', events.length - upcoming.length]].map(([key, label, count]) =>
            <button key={key} type="button" aria-pressed={scope === key} onClick={() => setScope(key)}>{label}<span>{count}</span></button>
          )}
        </div>
      </div>
      <div className="event-catalog-filters">
        <label className="event-search"><Icon>search</Icon><span className="sr-only">Buscar eventos</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por evento u organización" type="search" />
        </label>
        <label><span className="sr-only">Tipo de evento</span><select value={type} onChange={e => setType(e.target.value)}><option value="all">Todos los tipos</option><option value="charla">Charlas</option><option value="taller">Talleres</option></select></label>
        <label><span className="sr-only">Estado del evento</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <p className="event-result-count" aria-live="polite">{isLoading ? 'Cargando eventos…' : `${filtered.length} ${filtered.length === 1 ? 'evento' : 'eventos'}${hasFilters ? ' encontrados' : ' en tu agenda'}`}{hasFilters && <button type="button" onClick={clearFilters}>Limpiar filtros</button>}</p>

      {isLoading ? <div className="event-empty" role="status"><Icon>hourglass_empty</Icon><p>Cargando tus eventos…</p></div>
      : !filtered.length ? <div className="event-empty"><Icon>{events.length ? 'search_off' : 'calendar_add_on'}</Icon><h3>{events.length ? 'No encontramos eventos con esos filtros' : 'Tu próximo encuentro empieza acá'}</h3><p>{events.length ? 'Probá con otro nombre o revisá el tipo y el estado.' : 'Creá un evento para reunir la información, las inscripciones y los materiales.'}</p>{events.length ? <button className="btn-secondary" onClick={clearFilters}>Ver todos los eventos</button> : <Link className="btn-primary" to="/admin/eventos/nuevo">Crear evento</Link>}</div>
      : <div className="event-catalog-list">{filtered.map(event => {
        const [label, tone] = STATUS[event.status] || STATUS.draft
        const date = dateOf(event)
        return <article key={event.id} className={`event-row ${isUpcomingEvent(event) ? 'event-row-upcoming' : ''}`}>
          <div className="event-row-date" aria-label={dateLabel(event)}><strong>{isValid(date) ? format(date, 'dd') : '—'}</strong><span>{isValid(date) ? format(date, 'MMM yyyy', { locale: es }) : 'Sin fecha'}</span></div>
          <div className="event-row-main">
            <div className="event-row-tags"><span className={`event-status event-status-${tone}`}>{label}</span><span>{TYPES[event.type] || event.type}</span>{event.is_public === false && <span className="event-visibility"><Icon>lock</Icon>Privado</span>}{event.show_on_home && <span className="event-visibility"><Icon>star</Icon>En inicio</span>}</div>
            <h3><Link to={`/admin/eventos/${event.id}`}>{event.title}</Link></h3>
            <p><span><Icon>schedule</Icon>{event.start_time ? `${event.start_time.slice(0, 5)} h` : 'Horario por definir'}</span>{event.organizer && <span><Icon>apartment</Icon>{event.organizer}</span>}</p>
          </div>
          <div className="event-row-count"><strong>{event.total_registered || 0}</strong><span>inscriptos</span>{(event.status === 'completed' || event.status === 'in_progress') && <small>{event.present || 0} asistieron</small>}</div>
          <div className="event-row-actions">
            <Link to={`/admin/eventos/${event.id}/participantes`} className="event-icon-link" title="Ver inscriptos" aria-label={`Ver inscriptos de ${event.title}`}><Icon>group</Icon></Link>
            <Link to={`/admin/eventos/${event.id}`} className="event-manage-link" aria-label={`Gestionar ${event.title}`}>Gestionar <Icon>arrow_forward</Icon></Link>
          </div>
        </article>
      })}</div>}
    </section>
  </>
}
