import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note' },
  published: { label: 'Publicado', color: 'green', icon: 'public' },
  in_progress: { label: 'En curso', color: 'yellow', icon: 'play_circle' },
  completed: { label: 'Finalizado', color: 'green', icon: 'check_circle' },
  cancelled: { label: 'Cancelado', color: 'red', icon: 'cancel' },
}

const TYPE_LABELS = { charla: 'Charla', taller: 'Taller' }

export default function EventsDashboard() {
  const { events, fetchEventsWithStats, isLoading } = useStore()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchEventsWithStats()
  }, [])

  const filteredEvents = events
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => filterStatus === 'all' || e.status === filterStatus)
    .filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.organizer?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))

  const totalRegistered = events.reduce((acc, e) => acc + (e.total_registered || 0), 0)
  const totalPresent = events.reduce((acc, e) => acc + (e.present || 0), 0)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Mis Eventos</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
            {events.length} eventos · {totalRegistered} inscriptos · {totalPresent} asistieron
          </p>
        </div>
        <Link to="/admin/eventos/nuevo" className="btn-primary">
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Evento
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30"
            placeholder="Buscar evento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-2 text-[var(--color-dark-gray)] outline-none cursor-pointer"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            <option value="charla">Charlas</option>
            <option value="taller">Talleres</option>
          </select>
          <select
            className="text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-2 text-[var(--color-dark-gray)] outline-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="in_progress">En curso</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">event_busy</span>
          <p className="text-lg font-semibold text-[var(--color-dark-gray)]/40">No hay eventos todavía</p>
          <p className="text-sm text-[var(--color-dark-gray)]/30 mt-1">Creá tu primer evento para comenzar</p>
          <Link to="/admin/eventos/nuevo" className="btn-primary mt-6 inline-flex">
            <span className="material-symbols-outlined text-lg">add</span>
            Crear Evento
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event, i) => {
            const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft
            const eventDate = new Date(event.event_date + 'T12:00:00')
            const isPast = eventDate < new Date()

            return (
              <Link
                key={event.id}
                to={`/admin/eventos/${event.id}`}
                className="card card-interactive block p-6 group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: Event info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge badge-${statusCfg.color}`}>
                        <span className={`status-dot status-dot-${statusCfg.color}`} />
                        {statusCfg.label}
                      </span>
                      <span className="badge badge-gray">{TYPE_LABELS[event.type]}</span>
                      {event.is_public === false && (
                        <span className="badge border border-amber-200 bg-amber-50 text-amber-700">
                          <span className="material-symbols-outlined text-[10px]">visibility_off</span>
                          PRIVADO
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-deep-green)] group-hover:text-[var(--color-deep-green-light)] transition-colors truncate">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-dark-gray)]/60 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        {format(eventDate, "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {event.start_time} hs
                      </span>
                      {event.organizer && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">apartment</span>
                          {event.organizer}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div className="flex items-center gap-6 sm:gap-8">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-[var(--color-deep-green)]">{event.total_registered || 0}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Inscriptos</p>
                    </div>
                    {(event.status === 'completed' || event.status === 'in_progress') && (
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-[var(--color-deep-green)]">{event.present || 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Asistentes</p>
                      </div>
                    )}
                    <span className="material-symbols-outlined text-xl text-[var(--color-dark-gray)]/20 group-hover:text-[var(--color-deep-green)] group-hover:translate-x-1 transition-all">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
