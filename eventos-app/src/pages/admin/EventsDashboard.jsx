import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note' },
  published: { label: 'Publicado', color: 'green', icon: 'public' },
  in_progress: { label: 'En curso', color: 'yellow', icon: 'play_circle' },
  completed: { label: 'Finalizado', color: 'green', icon: 'check_circle' },
  cancelled: { label: 'Cancelado', color: 'red', icon: 'cancel' },
}

const TYPE_LABELS = { charla: 'Charla', taller: 'Taller' }

const renderRegistrationInfo = (responses) => {
  if (!responses) return null;
  const isEc = responses.profesion === 'Profesional de Ciencias Económicas';
  const isEst = responses.profesion === 'Estudiante Universitario';
  const isOtro = responses.profesion === 'Otro';

  const knownKeys = [
    'profesion', 'profesion_carrera', 'esta_matriculado', 'matriculado', 'consejo',
    'profesion_estudiante_carrera', 'profesion_estudiante_univ', 'profesion_otro'
  ];
  const otherResponses = Object.entries(responses).filter(([k]) => !knownKeys.includes(k));

  return (
    <div className="mt-2 text-[11px] text-[var(--color-dark-gray)]/60 font-normal leading-relaxed bg-[var(--color-refined-gray)]/45 p-2.5 rounded-lg border border-[var(--color-deep-green)]/10 max-w-xs space-y-1 shadow-sm">
      <div>
        <strong className="text-[var(--color-deep-green)]">Profesión/Ocupación:</strong> {responses.profesion || '—'}
      </div>
      {isEc && (
        <>
          {responses.profesion_carrera && (
            <div>
              <strong className="text-[var(--color-deep-green)]">Carrera:</strong> {responses.profesion_carrera}
            </div>
          )}
          {responses.esta_matriculado && (
            <div>
              <strong className="text-[var(--color-deep-green)]">Matriculado:</strong> {responses.esta_matriculado}
              {responses.esta_matriculado === 'Sí' && responses.consejo && ` en ${responses.consejo}`}
            </div>
          )}
          {responses.matriculado && (
            <div>
              <strong className="text-[var(--color-deep-green)]">Matrícula:</strong> {responses.matriculado}
            </div>
          )}
        </>
      )}
      {isEst && (
        <>
          {responses.profesion_estudiante_carrera && (
            <div>
              <strong className="text-[var(--color-deep-green)]">Carrera:</strong> {responses.profesion_estudiante_carrera}
            </div>
          )}
          {responses.profesion_estudiante_univ && (
            <div>
              <strong className="text-[var(--color-deep-green)]">Universidad:</strong> {responses.profesion_estudiante_univ}
            </div>
          )}
        </>
      )}
      {isOtro && responses.profesion_otro && (
        <div>
          <strong className="text-[var(--color-deep-green)]">Detalle:</strong> {responses.profesion_otro}
        </div>
      )}
      {otherResponses.length > 0 && (
        <div className="mt-1 pt-1 border-t border-[var(--color-deep-green)]/10 space-y-0.5">
          {otherResponses.map(([label, val]) => {
            if (val === undefined || val === null || val === '') return null;
            const dispVal = typeof val === 'boolean' ? (val ? 'Sí' : 'No') : val;
            return (
              <div key={label}>
                <strong className="text-[var(--color-deep-green)]">{label}:</strong> {dispVal}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function EventsDashboard() {
  const { events, fetchEventsWithStats, isLoading } = useStore()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  // Global Registrations Panel State
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'registrations'
  const [allRegistrations, setAllRegistrations] = useState([])
  const [loadingRegs, setLoadingRegs] = useState(false)
  const [regSearch, setRegSearch] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [selectedRegForModal, setSelectedRegForModal] = useState(null)

  useEffect(() => {
    fetchEventsWithStats()
  }, [])

  const loadAllActiveRegistrations = async () => {
    setLoadingRegs(true)
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, participants(*), events!inner(id, title, status, event_date)')
        .in('events.status', ['published', 'in_progress'])
        .order('registered_at', { ascending: false })
      if (!error && data) {
        setAllRegistrations(data)
      } else {
        console.error(error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRegs(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'registrations') {
      loadAllActiveRegistrations()
    }
  }, [activeTab])

  const filteredEvents = events
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => filterStatus === 'all' || e.status === filterStatus)
    .filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.organizer?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))

  const totalRegistered = events.reduce((acc, e) => acc + (e.total_registered || 0), 0)
  const totalPresent = events.reduce((acc, e) => acc + (e.present || 0), 0)

  // Filter registrations
  const filteredRegs = allRegistrations.filter(r => {
    const matchEvent = selectedEventId === 'all' || r.event_id === selectedEventId
    const p = r.participants || {}
    const q = regSearch.toLowerCase()
    const matchSearch = !regSearch || 
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      r.events?.title?.toLowerCase().includes(q)
    return matchEvent && matchSearch
  })

  // Get active events from the list of all registrations to build select options
  const activeEventsMap = {}
  allRegistrations.forEach(r => {
    if (r.events) {
      activeEventsMap[r.event_id] = r.events.title
    }
  })
  const activeEventsOptions = Object.entries(activeEventsMap).map(([id, title]) => ({ id, title }))

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

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[var(--color-deep-green)]/8 mb-6">
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'events'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">calendar_today</span>
          Lista de Eventos
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">groups</span>
          Panel de Inscriptos (Activos)
        </button>
      </div>

      {/* Tab: Events */}
      {activeTab === 'events' && (
        <>
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
                          {event.show_on_home && (
                            <span className="badge border border-yellow-200 bg-yellow-50 text-yellow-700">
                              <span className="material-symbols-outlined text-[10px]">star</span>
                              EN HOME
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
        </>
      )}

      {/* Tab: Global Registrations */}
      {activeTab === 'registrations' && (
        <>
          {/* Filters */}
          <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30"
                placeholder="Buscar inscripto por nombre, email o evento..."
                value={regSearch}
                onChange={e => setRegSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-dark-gray)]/50 uppercase tracking-wider">Evento:</span>
              <select
                className="text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-2 text-[var(--color-dark-gray)] outline-none cursor-pointer max-w-xs"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="all">Todos los eventos activos</option>
                {activeEventsOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.title}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingRegs ? (
            <div className="text-center py-12">
              <p className="text-lg text-[var(--color-dark-gray)]/40 font-medium animate-pulse">Cargando inscriptos...</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Evento</th>
                      <th>Modalidad</th>
                      <th>Fecha Registro</th>
                      <th className="text-center">Encuesta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">
                          No se encontraron inscriptos
                        </td>
                      </tr>
                    ) : (
                      filteredRegs.map(r => {
                        const hasSurvey = r.survey_responses && Object.keys(r.survey_responses).length > 0
                        const eventDate = r.events ? new Date(r.events.event_date + 'T12:00:00') : null
                        return (
                          <tr key={r.id}>
                            <td className="font-semibold text-[var(--color-dark-gray)]">
                              <div className="flex flex-col">
                                <span>{r.participants?.first_name} {r.participants?.last_name}</span>
                                {renderRegistrationInfo(r.survey_responses)}
                              </div>
                            </td>
                            <td>{r.participants?.email || <span className="text-amber-600 font-semibold">Sin email</span>}</td>
                            <td className="text-sm text-[var(--color-dark-gray)]/70">{r.participants?.phone || '—'}</td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-semibold text-[var(--color-deep-green)]">{r.events?.title}</span>
                                {eventDate && <span className="text-[10px] text-[var(--color-dark-gray)]/40">{format(eventDate, "d 'de' MMMM", { locale: es })}</span>}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${r.attendance_mode === 'virtual' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                {r.attendance_mode === 'virtual' ? '💻 Virtual' : '🏫 Presencial'}
                              </span>
                            </td>
                            <td className="text-xs text-[var(--color-dark-gray)]/60">
                              {r.registered_at ? format(new Date(r.registered_at), "d/M/yyyy HH:mm 'hs'", { locale: es }) : '—'}
                            </td>
                            <td className="text-center">
                              {hasSurvey ? (
                                <button
                                  onClick={() => setSelectedRegForModal(r)}
                                  className="btn-ghost !p-2 text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5"
                                  title="Ver respuestas de la encuesta"
                                >
                                  <span className="material-symbols-outlined text-lg">assignment</span>
                                </button>
                              ) : (
                                <span className="text-xs text-[var(--color-dark-gray)]/25">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: View Survey Responses */}
      {selectedRegForModal && (
        <div className="modal-overlay" onClick={() => setSelectedRegForModal(null)}>
          <div className="card p-6 lg:p-8 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-deep-green)]">Encuesta de Inscripción</h2>
                <p className="text-xs text-[var(--color-dark-gray)]/60 mt-1">
                  Participante: <strong>{selectedRegForModal.participants?.first_name} {selectedRegForModal.participants?.last_name}</strong>
                </p>
                <p className="text-xs text-[var(--color-dark-gray)]/60">
                  Evento: <strong>{selectedRegForModal.events?.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedRegForModal(null)}
                className="btn-ghost !p-1 text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {selectedRegForModal.survey_responses && (() => {
                const knownKeys = [
                  'profesion', 'profesion_carrera', 'esta_matriculado', 'matriculado', 'consejo',
                  'profesion_estudiante_carrera', 'profesion_estudiante_univ', 'profesion_otro'
                ];
                const surveyQuestionsOnly = Object.entries(selectedRegForModal.survey_responses).filter(([k]) => !knownKeys.includes(k));
                
                if (surveyQuestionsOnly.length === 0) {
                  return <p className="text-sm text-[var(--color-dark-gray)]/40 text-center py-4">No hay respuestas de encuesta adicionales.</p>;
                }
                
                return surveyQuestionsOnly.map(([question, answer]) => {
                  if (answer === undefined || answer === null || answer === '') return null
                  const displayAnswer = typeof answer === 'boolean' ? (answer ? 'Sí' : 'No') : answer
                  return (
                    <div key={question} className="p-3.5 rounded-xl bg-[var(--color-refined-gray)]/45 border border-[var(--color-deep-green)]/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-1">{question}</p>
                      <p className="text-sm font-semibold text-[var(--color-dark-gray)] whitespace-pre-wrap">{displayAnswer}</p>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedRegForModal(null)} className="btn-primary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

