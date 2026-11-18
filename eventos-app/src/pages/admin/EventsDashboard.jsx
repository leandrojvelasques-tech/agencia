import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import CrmPresentationsDashboard from './CrmPresentationsDashboard'
import AgendaTemplatesDashboard from './AgendaTemplatesDashboard'
import EventCatalog from '../../components/EventCatalog'
import '../../styles/events-workspace.css'

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

  // Global Registrations Panel State
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'registrations'
  const [allRegistrations, setAllRegistrations] = useState([])
  const [loadingRegs, setLoadingRegs] = useState(false)
  const [regSearch, setRegSearch] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [selectedRegForModal, setSelectedRegForModal] = useState(null)
  const [emailQuota, setEmailQuota] = useState(null)
  const [loadingQuota, setLoadingQuota] = useState(false)

  const fetchEmailQuota = async () => {
    setLoadingQuota(true)
    try {
      const response = await fetch('/api/brevo-check')
      if (response.ok) {
        const data = await response.json()
        const freePlan = data.account?.plan?.find(p => p.type === 'free')
        if (freePlan) {
          setEmailQuota({
            credits: freePlan.credits,
            creditsType: freePlan.creditsType,
            totalLimit: 300,
            usedToday: 300 - freePlan.credits
          })
        }
      }
    } catch (err) {
      console.error('Error fetching email quota:', err)
    } finally {
      setLoadingQuota(false)
    }
  }

  useEffect(() => {
    fetchEventsWithStats()
    fetchEmailQuota()
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
  const selectedEvent = events.find(e => e.id === selectedEventId || e.event_id === selectedEventId)
  const eventRegs = allRegistrations.filter(r => r.event_id === selectedEventId && r.status !== 'cancelled')

  return (
    <div className="events-workspace max-w-6xl mx-auto">
      {/* Header */}
      {(activeTab === 'events' || activeTab === 'registrations') && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="event-eyebrow">FORMACIÓN Y ENCUENTROS</p>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Mis eventos</h1>
            <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
              {events.length} eventos · {totalRegistered} inscriptos · {totalPresent} asistieron
            </p>
          </div>
          <Link to="/admin/eventos/nuevo" className="btn-primary">
            <span className="material-symbols-outlined text-lg">add</span>
            Crear evento
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="event-workspace-tabs" role="tablist" aria-label="Herramientas de eventos">
        <button
          type="button"
          role="tab"
          onClick={() => setActiveTab('events')}
          aria-selected={activeTab === 'events'}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'events'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">calendar_today</span>
          Eventos
        </button>
        <button
          type="button"
          role="tab"
          onClick={() => setActiveTab('registrations')}
          aria-selected={activeTab === 'registrations'}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">groups</span>
          Inscriptos activos
        </button>
        <button
          type="button"
          role="tab"
          onClick={() => setActiveTab('presentations')}
          aria-selected={activeTab === 'presentations'}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'presentations'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">slideshow</span>
          Presentaciones
        </button>
        <button
          type="button"
          role="tab"
          onClick={() => setActiveTab('templates')}
          aria-selected={activeTab === 'templates'}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">history_edu</span>
          Plantillas de agenda
        </button>
      </div>

      {activeTab === 'events' && <EventCatalog events={events} isLoading={isLoading} />}
      {emailQuota && (activeTab === 'events' || activeTab === 'registrations') && (
        <aside className="event-email-quota" aria-label="Disponibilidad de correos">
          <span className="material-symbols-outlined" aria-hidden="true">mail</span>
          <p><strong>{emailQuota.credits} correos disponibles hoy</strong><span> de {emailQuota.totalLimit} · Brevo</span></p>
          <button type="button" onClick={fetchEmailQuota} disabled={loadingQuota} aria-label="Actualizar disponibilidad de correos">
            <span className="material-symbols-outlined" aria-hidden="true">sync</span>{loadingQuota ? 'Actualizando…' : 'Actualizar'}
          </button>
        </aside>
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

          {selectedEventId !== 'all' && selectedEvent && (
            <div className="card p-5 mb-6 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">analytics</span>
                Cupos Libres y Distribución por Día
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(selectedEvent.offered_dates && selectedEvent.offered_dates.length > 0 ? selectedEvent.offered_dates : [selectedEvent.event_date]).map(dateStr => {
                  const parts = dateStr.split('-');
                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  const formatted = format(d, "EEEE d 'de' MMMM", { locale: es });
                  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                  
                  const pCount = eventRegs.filter(r => r.attendance_mode === 'presencial' && (r.selected_date === dateStr || (!r.selected_date && dateStr === selectedEvent.event_date))).length;
                  const vCount = eventRegs.filter(r => r.attendance_mode === 'virtual' && (r.selected_date === dateStr || (!r.selected_date && dateStr === selectedEvent.event_date))).length;
                  
                  const pLimit = selectedEvent.max_capacity_presencial;
                  const vLimit = selectedEvent.max_capacity_virtual;
                  
                  const pLeft = pLimit !== null && pLimit !== undefined && pLimit !== '' ? Number(pLimit) - pCount : null;
                  const vLeft = vLimit !== null && vLimit !== undefined && vLimit !== '' ? Number(vLimit) - vCount : null;
                  
                  const hasPresencialEnabled = pLimit !== 0 && pLimit !== '0';
                  const hasVirtualEnabled = vLimit !== 0 && vLimit !== '0';
                  
                  return (
                    <div key={dateStr} className="bg-white p-4 rounded-xl border border-[var(--color-deep-green)]/8 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[var(--color-dark-gray)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-[var(--color-deep-green)]">calendar_today</span>
                        {capitalized}
                      </p>
                      <div className="text-xs space-y-1.5 pt-1">
                        {hasPresencialEnabled && (
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-dark-gray)]/60">🏫 Presencial:</span>
                            <span className="font-semibold text-[var(--color-dark-gray)]">
                              {pCount} inscriptos {pLimit ? `(Quedan ${pLeft} libres)` : '(Sin límite)'}
                            </span>
                          </div>
                        )}
                        {hasVirtualEnabled && (
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-dark-gray)]/60">💻 Virtual:</span>
                            <span className="font-semibold text-[var(--color-dark-gray)]">
                              {vCount} inscriptos {vLimit ? `(Quedan ${vLeft} libres)` : '(Sin límite)'}
                            </span>
                          </div>
                        )}
                        {!hasPresencialEnabled && !hasVirtualEnabled && (
                          <p className="text-[10px] text-red-500 font-medium">Ambas modalidades deshabilitadas</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                                <span className="text-[10px] text-[var(--color-dark-gray)]/40">
                                  {r.selected_date 
                                    ? format(new Date(r.selected_date + 'T12:00:00'), "d 'de' MMMM", { locale: es }) 
                                    : (eventDate ? format(eventDate, "d 'de' MMMM", { locale: es }) : '—')}
                                </span>
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

      {/* Tab: Presentations */}
      {activeTab === 'presentations' && (
        <CrmPresentationsDashboard />
      )}

      {/* Tab: Templates */}
      {activeTab === 'templates' && (
        <AgendaTemplatesDashboard />
      )}
    </div>
  )
}

