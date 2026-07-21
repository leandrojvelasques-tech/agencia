import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import DonutChart, { CHART_COLORS } from '../../components/DonutChart'
import { supabase } from '../../lib/supabase'

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
  const initialTab = searchParams.get('tab') === 'satisfaction' 
    ? 'satisfaction' 
    : searchParams.get('tab') === 'survey' 
      ? 'survey' 
      : 'list'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [feedbacks, setFeedbacks] = useState([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      setEvent(eventData)
      await fetchEventData(id)
      
      const { data: fbData } = await supabase
        .from('event_feedback')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false })
      setFeedbacks(fbData || [])
      
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

  const getParentName = (parentRegId) => {
    if (!parentRegId) return null
    const parent = registrations.find(reg => reg.id === parentRegId)
    if (!parent) return null
    return `${parent.participants?.first_name} ${parent.participants?.last_name}`
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

  const stats = (() => {
    const titulos = {}
    const delegaciones = {}
    const suscripciones = {
      'Paga': 0,
      'Gratuita/Ninguna': 0,
      'No especificado': 0
    }
    
    registrations.forEach(r => {
      const resp = r.survey_responses || {}
      
      // Carrera / Titulo
      let cleanCarrera = ''
      const profesionVal = (resp['Profesión/Ocupación'] || resp['Profesión'] || resp.profesion || '').trim()
      const lowerProf = profesionVal.toLowerCase()
      
      if (lowerProf.includes('estudiante')) {
        cleanCarrera = 'Estudiante'
      } else if (lowerProf.includes('otro') || lowerProf.includes('externo')) {
        cleanCarrera = 'Externo'
      } else {
        const carreraVal = resp['Carrera'] || resp.profesion_carrera || resp.profesion_estudiante_carrera || ''
        cleanCarrera = carreraVal.trim()
        
        if (!cleanCarrera || cleanCarrera === '—') {
          cleanCarrera = profesionVal
        }
      }
      
      if (!cleanCarrera || cleanCarrera === '—') {
        cleanCarrera = 'No especificado'
      }

      titulos[cleanCarrera] = (titulos[cleanCarrera] || 0) + 1

      // Delegacion
      const delVal = resp['delegacion'] || resp['Delegación'] || resp.delegacion || ''
      let cleanDel = delVal.trim()
      if (!cleanDel || cleanDel === '—') {
        cleanDel = 'No especificado'
      }
      delegaciones[cleanDel] = (delegaciones[cleanDel] || 0) + 1

      // Suscripciones LLM (Heurística)
      let subVal = null
      Object.keys(resp).forEach(k => {
        const lowerKey = k.toLowerCase()
        if (lowerKey.includes('suscrip') || lowerKey.includes('pagando') || lowerKey.includes('paga o') || lowerKey.includes('paga/')) {
          subVal = resp[k]
        }
      })
      
      if (subVal !== null && subVal !== undefined) {
        const valStr = String(subVal).trim()
        const lowerVal = valStr.toLowerCase()
        
        const isTrue = subVal === true || lowerVal === 'true' || lowerVal === 'sí' || lowerVal === 'si'
        const isPaidTerm = lowerVal.includes('paga') || lowerVal.includes('pagando') || lowerVal.includes('suscripción') || lowerVal.includes('suscripcion')
        const commonServices = ['claude', 'chatgpt', 'gemini', 'julius', 'copilot', 'midjourney', 'pro']
        const hasService = commonServices.some(service => lowerVal.includes(service))
        const isNegative = lowerVal.includes('no ') || lowerVal.includes('ningun') || lowerVal.includes('gratis') || lowerVal === 'no'
        
        if (isTrue || (isPaidTerm && !isNegative) || (hasService && !isNegative)) {
          suscripciones['Paga'] = (suscripciones['Paga'] || 0) + 1
        } else if (subVal === false || lowerVal === 'false' || isNegative || lowerVal === '—' || lowerVal === '') {
          suscripciones['Gratuita/Ninguna'] = (suscripciones['Gratuita/Ninguna'] || 0) + 1
        } else {
          suscripciones['No especificado'] = (suscripciones['No especificado'] || 0) + 1
        }
      } else {
        suscripciones['No especificado'] = (suscripciones['No especificado'] || 0) + 1
      }
    })

    const sortedTitulos = Object.entries(titulos)
      .sort((a, b) => b[1] - a[1])
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {})

    const sortedDelegaciones = Object.entries(delegaciones)
      .sort((a, b) => b[1] - a[1])
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {})

    return { titulos: sortedTitulos, delegaciones: sortedDelegaciones, suscripciones }
  })()

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
      // Email cancellation is now handled by Supabase Database Webhook (Edge Function)
      // No manual fetch needed here.
    } else {
      const newReg = await addParticipantManual(id, payload)
      // If newly added manually, and has email, trigger welcome email
      // Email welcome is now handled by Supabase Database Webhook (Edge Function)
      // No manual fetch needed here.
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2 shrink-0">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Participantes</h1>
            <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title} · {registrations.length} inscriptos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'survey' && surveyQuestions.length > 0 && (
            <button onClick={exportToCSV} className="btn-secondary">
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Exportar CSV</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="btn-primary">
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[var(--color-deep-green)]/8 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 shrink-0 ${
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
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 shrink-0 ${
            activeTab === 'survey'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">assignment</span>
          Respuestas de Inscripción
        </button>
        {event.has_satisfaction_survey && (
          <button
            onClick={() => setActiveTab('satisfaction')}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 shrink-0 ${
              activeTab === 'satisfaction'
                ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
                : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
            }`}
          >
            <span className="material-symbols-outlined text-lg">thumb_up</span>
            Respuestas de Satisfacción
          </button>
        )}
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



          {/* Desktop Table View */}
          <div className="card overflow-hidden hidden md:block bg-white shadow-sm">
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
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span>{r.participants?.first_name} {r.participants?.last_name}</span>
                            {r.parent_registration_id && (
                              <span className="text-[9px] text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 px-1.5 py-0.5 rounded-full font-bold border border-[var(--color-deep-green)]/10" title={`Inscripto por ${getParentName(r.parent_registration_id) || 'otro participante'}`}>
                                Acompañante de {getParentName(r.parent_registration_id) || 'otro'}
                              </span>
                            )}
                          </span>
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

          {/* Mobile Cards View */}
          <div className="space-y-3 block md:hidden">
            {sortedAndFiltered.length === 0 ? (
              <div className="card p-8 text-center text-[var(--color-dark-gray)]/30 font-medium bg-white shadow-sm">
                No hay participantes registrados
              </div>
            ) : sortedAndFiltered.map(r => (
              <div key={r.id} className="card p-4 bg-white shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--color-dark-gray)] text-base flex flex-wrap items-center gap-1.5">
                      <span>{r.participants?.first_name} {r.participants?.last_name}</span>
                      {r.parent_registration_id && (
                        <span className="text-[9px] text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 px-1.5 py-0.5 rounded-full font-bold border border-[var(--color-deep-green)]/10">
                          Acompañante de {getParentName(r.parent_registration_id) || 'otro'}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--color-dark-gray)]/50">
                      Inscrito: {r.registered_at ? format(new Date(r.registered_at), "dd/MM/yyyy HH:mm") : '—'}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${r.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' : r.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {r.status === 'confirmed' ? 'Confirmado' : r.status === 'cancelled' ? 'Cancelado' : 'Registrado'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-[var(--color-deep-green)]/5 pt-2">
                  <div>
                    <span className="text-[var(--color-dark-gray)]/50 block font-medium">Título</span>
                    <span className="font-semibold text-[var(--color-dark-gray)]/85 truncate block" title={getTitulo(r.survey_responses)}>{getTitulo(r.survey_responses) || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-dark-gray)]/50 block font-medium">Delegación</span>
                    <span className="font-semibold text-[var(--color-dark-gray)]/85 truncate block" title={getDelegacion(r.survey_responses)}>{getDelegacion(r.survey_responses) || '—'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs border-t border-[var(--color-deep-green)]/5 pt-2">
                  {r.participants?.email ? (
                    <a href={`mailto:${r.participants.email}`} className="flex items-center gap-1.5 text-[var(--color-deep-green)] hover:underline">
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span className="truncate">{r.participants.email}</span>
                    </a>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Sin email
                    </span>
                  )}
                  {r.participants?.phone && (
                    <a href={`tel:${r.participants.phone}`} className="flex items-center gap-1.5 text-[var(--color-deep-green)] hover:underline">
                      <span className="material-symbols-outlined text-sm">phone</span>
                      <span>{r.participants.phone}</span>
                    </a>
                  )}
                </div>

                {renderRegistrationInfo(r.survey_responses)}

                <div className="flex items-center justify-end gap-2 border-t border-[var(--color-deep-green)]/5 pt-2">
                  <button onClick={() => handleOpenEdit(r)} className="btn-secondary !py-1.5 px-3 text-xs flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <span className="material-symbols-outlined text-base">edit</span>
                    Editar
                  </button>
                  <button onClick={() => handleDelete(r)} className="btn-secondary !py-1.5 px-3 text-xs flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50">
                    <span className="material-symbols-outlined text-base">delete</span>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
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

              {/* Desktop Matrix Table View */}
              <div className="card overflow-hidden hidden md:block bg-white shadow-sm">
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

              {/* Mobile Matrix Cards View */}
              <div className="space-y-3 block md:hidden">
                {registrations.length === 0 ? (
                  <div className="card p-8 text-center text-[var(--color-dark-gray)]/30 font-medium bg-white shadow-sm">
                    No hay respuestas registradas
                  </div>
                ) : (
                  registrations.map(r => (
                    <div key={r.id} className="card p-4 bg-white shadow-sm flex flex-col gap-2">
                      <div className="flex flex-col border-b border-[var(--color-deep-green)]/5 pb-2">
                        <span className="font-bold text-[var(--color-dark-gray)] text-base">
                          {r.participants?.first_name} {r.participants?.last_name}
                        </span>
                        <span className="text-xs text-[var(--color-dark-gray)]/50">
                          {r.participants?.email || 'Sin email'}
                        </span>
                      </div>
                      <div className="space-y-2.5 mt-1">
                        {surveyQuestions.map(q => {
                          const ans = r.survey_responses?.[q.label]
                          const displayAns = typeof ans === 'boolean' ? (ans ? 'Sí' : 'No') : (ans || '—')
                          return (
                            <div key={q.label} className="text-xs">
                              <span className="text-[var(--color-dark-gray)]/50 block font-medium">{q.label}</span>
                              <span className="font-semibold text-[var(--color-dark-gray)]/85 block">{displayAns}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Satisfaction Answers */}
      {activeTab === 'satisfaction' && (
        <div className="space-y-6 animate-fade-in">
          {feedbacks.length === 0 ? (
            <div className="card p-8 text-center bg-gray-50/50 border-dashed border border-gray-200">
              <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/20 mb-2 block">assignment_late</span>
              <p className="text-sm font-semibold text-[var(--color-dark-gray)]/60">Aún no se han recibido respuestas para la encuesta de satisfacción.</p>
              <p className="text-xs text-[var(--color-dark-gray)]/40 mt-1">Los inscriptos recibirán el link al finalizar el evento o cuando lo envíes manualmente.</p>
            </div>
          ) : (() => {
            const activeSatisfactionQuestions = event.satisfaction_questions && event.satisfaction_questions.length === 5
              ? event.satisfaction_questions
              : [
                  { key: 'score_experience', label: 'Experiencia General' },
                  { key: 'score_registration', label: 'Proceso de Inscripción' },
                  { key: 'score_duration', label: 'Duración del Evento' },
                  { key: 'score_delivery', label: 'Dictado del Taller/Charla' },
                  { key: 'score_content', label: 'Interés del Contenido' }
                ];

            const sums = {
              score_experience: 0,
              score_registration: 0,
              score_duration: 0,
              score_delivery: 0,
              score_content: 0
            };
            feedbacks.forEach(item => {
              activeSatisfactionQuestions.forEach(q => {
                sums[q.key] += item[q.key] || 0;
              });
            });
            const avgs = {};
            let globalSum = 0;
            activeSatisfactionQuestions.forEach(q => {
              const avg = sums[q.key] / feedbacks.length;
              avgs[q.key] = Number(avg.toFixed(1));
              globalSum += avg;
            });
            const globalAverage = Number((globalSum / activeSatisfactionQuestions.length).toFixed(1));

            return (
              <>
                {/* Global and Detail Averages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Global Score Card */}
                  <div className="card p-6 bg-gradient-to-br from-[var(--color-deep-green)] to-[#1E4334] text-white flex flex-col justify-between shadow-md">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-70">Calificación Global Promedio</p>
                      <h3 className="text-5xl font-black mt-4 mb-2 flex items-baseline gap-1">
                        {globalAverage} <span className="text-lg font-bold opacity-60">/ 5</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 mt-4">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1;
                        const isFilled = starValue <= Math.round(globalAverage);
                        return (
                          <span key={i} className="material-symbols-outlined text-amber-300" style={{ fontVariationSettings: `"${isFilled ? 'FILL' : 'GRAD'} 1"` }}>
                            star
                          </span>
                        );
                      })}
                      <span className="text-xs font-semibold ml-2 opacity-80">{feedbacks.length} respuestas</span>
                    </div>
                  </div>

                  {/* Individual Scores */}
                  <div className="md:col-span-2 card p-6 bg-white shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 border-b border-[var(--color-deep-green)]/5 pb-2">
                      Detalle por Pregunta
                    </h3>
                    <div className="space-y-3.5">
                      {activeSatisfactionQuestions.map(q => {
                        const avg = avgs[q.key] || 0;
                        const pct = (avg / 5) * 100;
                        return (
                          <div key={q.key} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                              <span>{q.label}</span>
                              <span className="font-bold text-[var(--color-deep-green)]">{avg} / 5</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-[var(--color-deep-green)] h-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Feedbacks Comment Matrix Table */}
                <div className="card overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Asistente</th>
                          {activeSatisfactionQuestions.map(q => (
                            <th key={q.key} className="text-center whitespace-nowrap">{q.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {feedbacks.map(fb => (
                          <tr key={fb.id}>
                            <td className="font-semibold text-[var(--color-dark-gray)]">
                              {fb.participant_name || 'Participante'}
                            </td>
                            {activeSatisfactionQuestions.map(q => {
                              const score = fb[q.key] || 0;
                              return (
                                <td key={q.key} className="text-center font-bold text-[var(--color-deep-green)]">
                                  {score} ⭐
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comments List */}
                <div className="card p-6 bg-white shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/5 pb-2">
                    Comentarios y Sugerencias Adicionales ({feedbacks.filter(fb => fb.comments && fb.comments.trim()).length})
                  </h3>
                  {feedbacks.filter(fb => fb.comments && fb.comments.trim()).length === 0 ? (
                    <p className="text-xs text-[var(--color-dark-gray)]/40 text-center py-6">No se registraron comentarios adicionales.</p>
                  ) : (
                    <div className="space-y-3">
                      {feedbacks.filter(fb => fb.comments && fb.comments.trim()).map(fb => (
                        <div key={fb.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 animate-fade-in">
                          <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <span>{fb.participant_name || 'Participante Anónimo'}</span>
                            <span>{fb.created_at ? format(new Date(fb.created_at), "dd 'de' MMMM, HH:mm", { locale: es }) : ''}</span>
                          </div>
                          <p className="text-xs text-gray-700 font-semibold italic leading-relaxed">
                            "{fb.comments}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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
