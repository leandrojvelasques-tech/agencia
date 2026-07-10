import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const getCarrera = (responses) => {
  if (!responses) return '—';
  if (responses.profesion === 'Profesional de Ciencias Económicas') {
    return responses.profesion_carrera || '—';
  }
  if (responses.profesion === 'Estudiante Universitario') {
    return responses.profesion_estudiante_carrera || '—';
  }
  return '—';
};

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

  const hasDetails = responses.profesion || otherResponses.length > 0;
  if (!hasDetails) return null;

  return (
    <details className="mt-2 group select-none">
      <summary className="text-[11px] font-bold text-[var(--color-deep-green)] cursor-pointer hover:underline list-none flex items-center gap-1 outline-none [&::-webkit-details-marker]:hidden">
        <span className="material-symbols-outlined text-[14px] transition-transform group-open:rotate-90">chevron_right</span>
        Ver encuesta
      </summary>
      <div className="mt-2 text-[11px] text-[var(--color-dark-gray)]/60 font-normal leading-relaxed bg-[var(--color-refined-gray)]/40 p-2.5 rounded-lg border border-[var(--color-deep-green)]/10 max-w-xs space-y-1 shadow-sm">
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
    </details>
  );
};

export default function EventParticipants() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, addParticipantManual, updateParticipantManual, deleteRegistration, isLoading } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '', attendance_mode: 'presencial' })
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'registered_at', direction: 'desc' })

  // Tab State
  const searchParams = new URLSearchParams(window.location.search)
  const initialTab = searchParams.get('tab') === 'survey' ? 'survey' : 'list'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      setEvent(eventData)
      await fetchEventData(id)
      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) return <div className="text-center py-20"><p className="text-lg text-[var(--color-dark-gray)]/40 font-medium animate-pulse">Cargando...</p></div>
  if (!event) return <div className="text-center py-20"><p className="text-lg text-[var(--color-dark-gray)]/40">Evento no encontrado</p></div>

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getTitulo = (responses) => {
    if (!responses) return '';
    const profesion = responses['Profesión/Ocupación'] || responses['Profesión'] || responses.profesion || '';
    const carrera = responses['Carrera'] || responses.profesion_carrera || responses.profesion_estudiante_carrera || '';
    
    if (carrera && carrera !== '—') {
      return profesion ? `${profesion} (${carrera})` : carrera;
    }
    return profesion;
  }

  const getDelegacion = (responses) => {
    if (!responses) return '—';
    return responses['delegacion'] || responses['Delegación'] || responses.delegacion || '—';
  }

  const sortedAndFiltered = [...registrations]
    .filter(r => {
      if (!search) return true
      const q = search.toLowerCase()
      const p = r.participants || {}
      return p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let valA = '', valB = '';
      
      if (sortConfig.key === 'nombre') {
        valA = `${a.participants?.first_name || ''} ${a.participants?.last_name || ''}`.toLowerCase();
        valB = `${b.participants?.first_name || ''} ${b.participants?.last_name || ''}`.toLowerCase();
      } else if (sortConfig.key === 'titulo') {
        valA = getTitulo(a.survey_responses).toLowerCase();
        valB = getTitulo(b.survey_responses).toLowerCase();
      } else if (sortConfig.key === 'registered_at') {
        valA = new Date(a.registered_at || 0).getTime();
        valB = new Date(b.registered_at || 0).getTime();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleOpenAdd = () => {
    setEditingParticipant(null)
    const dates = event.offered_dates && event.offered_dates.length > 0 ? event.offered_dates : [event.event_date]
    setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '', attendance_mode: 'presencial', selected_date: dates[0] || '', status: 'registered' })
    setShowModal(true)
  }

  const handleOpenEdit = (reg) => {
    const p = reg.participants
    setEditingParticipant({ registrationId: reg.id, participantId: p.id })
    setForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.email || '',
      phone: p.phone || '',
      notes: p.notes || '',
      attendance_mode: reg.attendance_mode || 'presencial',
      selected_date: reg.selected_date || '',
      status: reg.status || 'registered'
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) return
    
    const payload = { ...form }

    if (editingParticipant) {
      const oldReg = registrations.find(r => r.id === editingParticipant.registrationId)
      const isStatusChanged = oldReg && oldReg.status !== form.status

      await updateParticipantManual(editingParticipant.participantId, {
        ...payload,
        registrationId: editingParticipant.registrationId
      })

      // If status changed to cancelled, trigger cancellation email
      if (isStatusChanged && form.status === 'cancelled') {
        try {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registrationId: editingParticipant.registrationId,
              type: 'cancellation'
            })
          }).catch(err => console.error('Error triggering cancellation email:', err))
        } catch (err) {
          console.error('Error triggering cancellation email:', err)
        }
      }
    } else {
      const newReg = await addParticipantManual(id, payload)
      // If newly added manually, and has email, trigger welcome email
      if (newReg && payload.email) {
        try {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registrationId: newReg.id,
              type: 'welcome'
            })
          }).catch(err => console.error('Error triggering welcome email:', err))
        } catch (err) {
          console.error('Error triggering welcome email:', err)
        }
      }
    }
    
    setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '', attendance_mode: 'presencial' })
    setEditingParticipant(null)
    setShowModal(false)
  }

  const handleDelete = async (reg) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${reg.participants.first_name} ${reg.participants.last_name} de este evento?`)) {
      await deleteRegistration(reg.id)
    }
  }

  // Calculate survey statistics
  const surveyQuestions = event.has_survey ? event.survey_questions || [] : []
  const surveyStats = {}
  
  if (event.has_survey && surveyQuestions.length > 0) {
    surveyQuestions.forEach(q => {
      const counts = {}
      registrations.forEach(r => {
        const ans = r.survey_responses?.[q.label]
        const displayAns = typeof ans === 'boolean' ? (ans ? 'Sí' : 'No') : (ans || 'Sin responder')
        counts[displayAns] = (counts[displayAns] || 0) + 1
      })
      surveyStats[q.label] = counts
    })
  }

  // Export survey/registration data to CSV
  const exportToCSV = () => {
    if (registrations.length === 0) return

    const headers = ['Nombre', 'Apellido', 'Email', 'Telefono', 'Fecha Elegida', 'Modalidad', 'Fecha Registro']
    surveyQuestions.forEach(q => headers.push(q.label))

    const rows = registrations.map(r => {
      const row = [
        r.participants?.first_name || '',
        r.participants?.last_name || '',
        r.participants?.email || '',
        r.participants?.phone || '',
        r.selected_date || event.event_date || '',
        r.attendance_mode || '',
        r.registered_at ? format(new Date(r.registered_at), "yyyy-MM-dd HH:mm", { locale: es }) : ''
      ]

      surveyQuestions.forEach(q => {
        const ans = r.survey_responses?.[q.label]
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Participantes</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title} · {registrations.length} inscriptos</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'survey' && surveyQuestions.length > 0 && (
            <button onClick={exportToCSV} className="btn-secondary">
              <span className="material-symbols-outlined text-lg">download</span>
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="btn-primary">
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

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

      {/* Tab 1: List of Participants */}
      {activeTab === 'list' && (
        <>
          <div className="card p-4 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30" 
              placeholder="Buscar participante..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('nombre')}>
                      <div className="flex items-center gap-1">
                        Nombre {sortConfig.key === 'nombre' && <span className="material-symbols-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    <th className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('titulo')}>
                      <div className="flex items-center gap-1">
                        Título {sortConfig.key === 'titulo' && <span className="material-symbols-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    <th>Delegación</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('registered_at')}>
                      <div className="flex items-center gap-1">
                        Día de Inscripción {sortConfig.key === 'registered_at' && <span className="material-symbols-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFiltered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">No hay participantes registrados</td></tr>
                  ) : sortedAndFiltered.map(r => (
                    <tr key={r.id}>
                      <td className="font-semibold text-[var(--color-dark-gray)]">
                        <div className="flex flex-col">
                          <span>{r.participants?.first_name} {r.participants?.last_name}</span>
                          <span className={`text-[10px] uppercase tracking-wider font-bold ${r.status === 'confirmed' ? 'text-green-600' : r.status === 'cancelled' ? 'text-red-500' : 'text-amber-500'}`}>
                            {r.status === 'confirmed' ? 'Confirmado' : r.status === 'cancelled' ? 'Cancelado' : 'Registrado'}
                          </span>
                          {renderRegistrationInfo(r.survey_responses)}
                        </div>
                      </td>
                      <td className="text-sm font-medium text-[var(--color-dark-gray)]/80">{getTitulo(r.survey_responses) || '—'}</td>
                      <td className="text-sm font-medium text-[var(--color-dark-gray)]/80">{getDelegacion(r.survey_responses)}</td>
                      <td>
                        {r.participants?.email ? (
                          <span className="text-sm">{r.participants.email}</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Sin email
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-[var(--color-dark-gray)]/70">{r.participants?.phone || '—'}</td>
                      <td className="text-sm font-semibold text-[var(--color-dark-gray)]/85">
                        {r.registered_at ? format(new Date(r.registered_at), "dd/MM/yyyy HH:mm") : '—'}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEdit(r)} className="btn-ghost !p-1.5 text-blue-600 hover:bg-blue-50" title="Editar">
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button onClick={() => handleDelete(r)} className="btn-ghost !p-1.5 text-red-600 hover:bg-red-50" title="Eliminar">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Survey Answers */}
      {activeTab === 'survey' && (
        <div className="space-y-6">
          {!event.has_survey || surveyQuestions.length === 0 ? (
            <div className="card p-8 text-center bg-gray-50/50 border-dashed border border-gray-200">
              <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/20 mb-2 block">assignment_late</span>
              <p className="text-sm font-semibold text-[var(--color-dark-gray)]/60">Este evento no cuenta con una encuesta de inscripción.</p>
              <p className="text-xs text-[var(--color-dark-gray)]/40 mt-1">Habilita la encuesta al editar el evento y agrega preguntas personalizadas.</p>
            </div>
          ) : (
            <>
              {/* Stats Aggregates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {surveyQuestions.map(q => {
                  const counts = surveyStats[q.label] || {}
                  const total = Object.values(counts).reduce((a, b) => a + b, 0)
                  return (
                    <div key={q.label} className="card p-5">
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
              <div className="card overflow-hidden">
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
                      {registrations.length === 0 ? (
                        <tr>
                          <td colSpan={2 + surveyQuestions.length} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">
                            No hay respuestas registradas
                          </td>
                        </tr>
                      ) : (
                        registrations.map(r => (
                          <tr key={r.id}>
                            <td className="font-semibold text-[var(--color-dark-gray)]">
                              {r.participants?.first_name} {r.participants?.last_name}
                            </td>
                            <td className="text-xs text-[var(--color-dark-gray)]/60">{r.participants?.email || '—'}</td>
                            {surveyQuestions.map(q => {
                              const ans = r.survey_responses?.[q.label]
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

      {/* Add/Edit Participant Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card p-6 lg:p-8 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">{editingParticipant ? 'Editar Participante' : 'Agregar Participante'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Nombre *</label>
                  <input className="form-input !py-2.5" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Apellido *</label>
                  <input className="form-input !py-2.5" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Email</label>
                <input type="email" className="form-input !py-2.5" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Teléfono</label>
                <input className="form-input !py-2.5" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Modalidad *</label>
                <select className="form-input !py-2.5" value={form.attendance_mode} onChange={e => setForm(p => ({ ...p, attendance_mode: e.target.value }))}>
                  <option value="presencial">🏫 Presencial</option>
                  <option value="virtual">💻 Virtual</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Estado *</label>
                <select className="form-input !py-2.5" value={form.status || 'registered'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="registered">Registrado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">❌ Cancelado</option>
                </select>
              </div>
              {event.offered_dates && event.offered_dates.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Fecha Seleccionada *</label>
                  <select className="form-input !py-2.5" value={form.selected_date} onChange={e => setForm(p => ({ ...p, selected_date: e.target.value }))}>
                    {event.offered_dates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Observaciones</label>
                <textarea className="form-input !py-2.5 min-h-[60px]" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} className="btn-primary flex-1" disabled={!form.first_name || !form.last_name}>
                {editingParticipant ? 'Guardar Cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
