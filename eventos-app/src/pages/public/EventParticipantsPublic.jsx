import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

export default function EventParticipantsPublic() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { getEventBySlug } = useStore()

  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'survey'

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setError('Acceso denegado: Token de seguridad faltante.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const eventData = await getEventBySlug(slug)
        if (!eventData || eventData.private_link_token !== token) {
          setError('Acceso denegado: Token inválido o evento no encontrado.')
          setLoading(false)
          return
        }
        setEvent(eventData)

        const { data, error: rpcErr } = await supabase.rpc('get_participants_by_token', { event_token: token })
        if (rpcErr) throw rpcErr
        setParticipants(data || [])
      } catch (err) {
        console.error(err)
        setError('Error al cargar el listado de participantes.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [slug, token])

  const filtered = participants.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  })

  const presencialCount = participants.filter(p => p.attendance_mode === 'presencial').length
  const virtualCount = participants.filter(p => p.attendance_mode === 'virtual').length

  // Survey questions & stats
  const surveyQuestions = event && event.has_survey ? event.survey_questions || [] : []
  const surveyStats = {}
  
  if (event && event.has_survey && surveyQuestions.length > 0) {
    surveyQuestions.forEach(q => {
      const counts = {}
      participants.forEach(p => {
        const ans = p.survey_responses?.[q.label]
        const displayAns = typeof ans === 'boolean' ? (ans ? 'Sí' : 'No') : (ans || 'Sin responder')
        counts[displayAns] = (counts[displayAns] || 0) + 1
      })
      surveyStats[q.label] = counts
    })
  }

  // Export to CSV
  const exportToCSV = () => {
    if (participants.length === 0) return

    const headers = ['Nombre', 'Apellido', 'Email', 'Telefono', 'Modalidad', 'Fecha Elegida', 'Fecha Registro']
    surveyQuestions.forEach(q => headers.push(q.label))

    const rows = participants.map(p => {
      const row = [
        p.first_name || '',
        p.last_name || '',
        p.email || '',
        p.phone || '',
        p.attendance_mode || '',
        p.selected_date || '',
        p.registered_at ? format(new Date(p.registered_at), "yyyy-MM-dd HH:mm", { locale: es }) : ''
      ]

      surveyQuestions.forEach(q => {
        const ans = p.survey_responses?.[q.label]
        const displayAns = typeof ans === 'boolean' ? (ans ? 'Sí' : 'No') : (ans || '')
        row.push(displayAns)
      })

      return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inscriptos_${event.slug || 'evento'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] mb-2 block animate-spin">progress_activity</span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/40">Cargando listado de inscriptos...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">lock</span>
          <h1 className="text-xl font-extrabold text-[var(--color-deep-green)] mb-2">Acceso restringido</h1>
          <p className="text-[var(--color-dark-gray)]/60 text-sm leading-relaxed mb-6">{error || 'No tienes permisos para ver esta página.'}</p>
          <a href="https://www.leandrovelasques.com.ar" className="btn-primary inline-flex justify-center w-full">Volver al sitio principal</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] pb-12">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight hidden sm:inline">LEANDRO VELASQUES</span>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--color-deep-green)]/8 text-[var(--color-deep-green)] border border-[var(--color-deep-green)]/10 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">shield</span> Vista de Seguimiento Externa
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
        {/* Title */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-1">{event.title}</h1>
            <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">Listado oficial de inscripciones para el Consejo de Ciencias Económicas</p>
          </div>
          {activeTab === 'survey' && surveyQuestions.length > 0 && (
            <button onClick={exportToCSV} className="btn-secondary">
              <span className="material-symbols-outlined text-lg">download</span>
              Exportar CSV
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-5 text-center bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1">Total Inscritos</p>
            <p className="text-3xl font-extrabold text-[var(--color-deep-green)]">{participants.length}</p>
          </div>
          <div className="card p-5 text-center bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1">Presenciales</p>
            <p className="text-3xl font-extrabold text-emerald-600">{presencialCount}</p>
          </div>
          <div className="card p-5 text-center bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1">Virtuales</p>
            <p className="text-3xl font-extrabold text-indigo-600">{virtualCount}</p>
          </div>
        </div>

        {event && (
          <div className="card p-5 mb-6 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">analytics</span>
              Cupos Libres y Distribución por Día
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(event.offered_dates && event.offered_dates.length > 0 ? event.offered_dates : [event.event_date]).map(dateStr => {
                const parts = dateStr.split('-');
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                const formatted = format(d, "EEEE d 'de' MMMM", { locale: es });
                const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                
                const pCount = participants.filter(p => p.attendance_mode === 'presencial' && (p.selected_date === dateStr || (!p.selected_date && dateStr === event.event_date))).length;
                const vCount = participants.filter(p => p.attendance_mode === 'virtual' && (p.selected_date === dateStr || (!p.selected_date && dateStr === event.event_date))).length;
                
                const pLimit = event.max_capacity_presencial;
                const vLimit = event.max_capacity_virtual;
                
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

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--color-deep-green)]/8 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
              activeTab === 'list'
                ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
                : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
            }`}
          >
            <span className="material-symbols-outlined text-lg">groups</span>
            Lista de Inscriptos
          </button>
          <button
            onClick={() => setActiveTab('survey')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
              activeTab === 'survey'
                ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
                : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
            }`}
          >
            <span className="material-symbols-outlined text-lg">assignment</span>
            Respuestas de Encuesta
          </button>
        </div>

        {/* Tab 1: List */}
        {activeTab === 'list' && (
          <>
            {/* Search */}
            <div className="card p-4 mb-4 flex items-center gap-2 bg-white shadow-sm">
              <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
              <input 
                type="text" 
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30" 
                placeholder="Buscar por nombre, apellido o email..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>

            {/* Table */}
            <div className="card overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre y Perfil</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Modalidad</th>
                      <th>Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">No se encontraron inscritos</td></tr>
                    ) : filtered.map(p => (
                      <tr key={p.registration_id}>
                        <td className="font-semibold text-[var(--color-dark-gray)]">
                          <div className="flex flex-col">
                            <span>{p.first_name} {p.last_name}</span>
                            {renderRegistrationInfo(p.survey_responses)}
                          </div>
                        </td>
                        <td>
                          {p.email ? (
                            <span className="text-sm">{p.email}</span>
                          ) : (
                            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              Sin email
                            </span>
                          )}
                        </td>
                        <td className="text-sm text-[var(--color-dark-gray)]/70">{p.phone || '—'}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className={`badge ${p.attendance_mode === 'virtual' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} w-fit`}>
                              {p.attendance_mode === 'virtual' ? '💻 Virtual' : '🏫 Presencial'}
                            </span>
                            {p.selected_date && (
                              <span className="text-[10px] font-semibold text-[var(--color-dark-gray)]/50">
                                📅 {format(new Date(p.selected_date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-xs text-[var(--color-dark-gray)]/50">
                          {p.registered_at ? format(new Date(p.registered_at), "d/M/yyyy HH:mm 'hs'", { locale: es }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Survey */}
        {activeTab === 'survey' && (
          <div className="space-y-6">
            {surveyQuestions.length === 0 ? (
              <div className="card p-8 text-center bg-white border-dashed border border-gray-200 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/20 mb-2 block">assignment_late</span>
                <p className="text-sm font-semibold text-[var(--color-dark-gray)]/60">Este evento no cuenta con preguntas de encuesta adicionales.</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {surveyQuestions.map(q => {
                    const counts = surveyStats[q.label] || {}
                    const total = Object.values(counts).reduce((a, b) => a + b, 0)
                    return (
                      <div key={q.label} className="card p-5 bg-white shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 border-b border-[var(--color-deep-green)]/5 pb-2">
                          {q.label}
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(counts).map(([ans, count]) => {
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0
                            return (
                              <div key={ans} className="flex items-center justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                                <span className="truncate max-w-[70%]" title={ans}>{ans}</span>
                                <div className="flex items-center gap-2 flex-1 justify-end ml-4">
                                  <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                    <div className="bg-[var(--color-deep-green)] h-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="bg-[var(--color-deep-green)]/8 text-[var(--color-deep-green)] px-2 py-0.5 rounded font-bold whitespace-nowrap">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Matrix Table */}
                <div className="card overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Participante</th>
                          <th>Email</th>
                          {surveyQuestions.map(q => (
                            <th key={q.label} className="whitespace-nowrap min-w-[150px]">{q.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {participants.length === 0 ? (
                          <tr>
                            <td colSpan={2 + surveyQuestions.length} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">
                              No hay respuestas registradas
                            </td>
                          </tr>
                        ) : (
                          participants.map(p => (
                            <tr key={p.registration_id}>
                              <td className="font-semibold text-[var(--color-dark-gray)]">
                                {p.first_name} {p.last_name}
                              </td>
                              <td className="text-xs text-[var(--color-dark-gray)]/60">{p.email || '—'}</td>
                              {surveyQuestions.map(q => {
                                const ans = p.survey_responses?.[q.label]
                                const displayAns = typeof ans === 'boolean' ? (ans ? 'Sí' : 'No') : (ans || '—')
                                return (
                                  <td key={q.label} className="text-sm font-medium text-[var(--color-dark-gray)]/80">
                                    {displayAns}
                                  </td>
                                )
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
