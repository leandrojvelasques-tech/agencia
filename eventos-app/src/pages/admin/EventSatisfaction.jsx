import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { useStore } from '../../store/useStore'

const DEFAULT_QUESTIONS = [
  { key: 'score_experience', label: 'Experiencia General' },
  { key: 'score_registration', label: 'Proceso de Inscripción' },
  { key: 'score_duration', label: 'Duración del Evento' },
  { key: 'score_delivery', label: 'Dictado del Taller/Charla' },
  { key: 'score_content', label: 'Interés del Contenido' }
]

export default function EventSatisfaction() {
  const { id } = useParams()
  const { registrations, attendance, fetchEventData } = useStore()
  const [event, setEvent] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  
  // Send Survey modal states
  const [targetGroup, setTargetGroup] = useState('present') // 'present' | 'all' | 'custom'
  const [customEmails, setCustomEmails] = useState('')
  const [testEmail, setTestEmail] = useState('info@leandrovelasques.com.ar')
  const [sendingSurvey, setSendingSurvey] = useState(false)
  const [testingSurvey, setTestingSurvey] = useState(false)
  
  // Stats
  const [averages, setAverages] = useState({})
  const [globalAverage, setGlobalAverage] = useState(0)
  const [distributions, setDistributions] = useState({})

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        await fetchEventData(id)

        // Load event
        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .select('id, title, subtitle, slug, event_date, coordinator, satisfaction_questions')
          .eq('id', id)
          .single()
        
        if (eventErr) throw eventErr
        setEvent(eventData)

        // Load feedbacks
        const { data: fbData, error: fbErr } = await supabase
          .from('event_feedback')
          .select('*')
          .eq('event_id', id)
          .order('created_at', { ascending: false })

        if (fbErr) throw fbErr
        setFeedbacks(fbData || [])

        // Calculate statistics
        if (fbData && fbData.length > 0) {
          const activeQuestions = eventData && eventData.satisfaction_questions && eventData.satisfaction_questions.length === 5
            ? eventData.satisfaction_questions
            : DEFAULT_QUESTIONS

          const total = fbData.length
          const sums = {
            score_experience: 0,
            score_registration: 0,
            score_duration: 0,
            score_delivery: 0,
            score_content: 0
          }
          const dists = {
            score_experience: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            score_registration: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            score_duration: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            score_delivery: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            score_content: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          }

          fbData.forEach(item => {
            activeQuestions.forEach(q => {
              const val = item[q.key]
              sums[q.key] += val
              if (dists[q.key][val] !== undefined) {
                dists[q.key][val]++
              }
            })
          })

          const avgs = {}
          let globalSum = 0
          activeQuestions.forEach(q => {
            const avg = sums[q.key] / total
            avgs[q.key] = Number(avg.toFixed(2))
            globalSum += avg
          })

          setAverages(avgs)
          setGlobalAverage(Number((globalSum / activeQuestions.length).toFixed(2)))
          setDistributions(dists)
        }

      } catch (err) {
        console.error('Error loading satisfaction data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // Handlers for sending survey emails
  const getRecipientEmails = () => {
    const getParticipantEmail = (r) => {
      let p = r.participants || r.participant
      if (Array.isArray(p)) return p[0]?.email
      return p?.email
    }

    if (targetGroup === 'custom') {
      return customEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e && e.includes('@'))
    }

    const localRegs = Array.isArray(registrations) ? registrations : []
    const localAtt = Array.isArray(attendance) ? attendance : []

    if (targetGroup === 'present') {
      const presentRegs = localRegs.filter(r => {
        const att = localAtt.find(a => a.registration_id === r.id)
        return att?.status === 'present' || att?.status === 'late'
      })
      return [...new Set(presentRegs.map(getParticipantEmail).filter(Boolean))]
    }

    // 'all' registered participants
    return [...new Set(localRegs.map(getParticipantEmail).filter(Boolean))]
  }

  const handleTestSurveySend = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Ingresá un correo de prueba válido.')
      return
    }

    setTestingSurvey(true)
    try {
      const payload = {
        eventId: id,
        eventTitle: event.title,
        eventDate: event.event_date,
        coordinator: event.coordinator || 'Lic. Leandro Velasques',
        summary: 'Este es un envío de prueba directo de la Encuesta de Satisfacción Pos-Evento.',
        emails: [testEmail.trim()],
        surveyLink: `${window.location.origin}/encuesta/${event.slug}`
      }

      const res = await fetch('/api/send-minuta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al enviar correo de prueba')
      }

      alert(`¡Correo de prueba de encuesta enviado exitosamente a ${testEmail}!`)
    } catch (err) {
      alert('Error en el envío de prueba: ' + err.message)
    } finally {
      setTestingSurvey(false)
    }
  }

  const handleOfficialSurveySend = async () => {
    const emailsToSend = getRecipientEmails()

    if (emailsToSend.length === 0) {
      alert('No hay destinatarios encontrados para el grupo seleccionado.')
      return
    }

    const groupLabel = targetGroup === 'present'
      ? 'ASISTENTES CONFIRMADOS (Presentes)'
      : targetGroup === 'all'
      ? 'TODOS LOS INSCRIPTOS'
      : 'EMAILS PERSONALIZADOS'

    const confirmMsg = `¿Estás seguro de enviar la Encuesta de Satisfacción a ${emailsToSend.length} destinatarios (${groupLabel})?`
    if (!window.confirm(confirmMsg)) return

    setSendingSurvey(true)
    try {
      const payload = {
        eventId: id,
        eventTitle: event.title,
        eventDate: event.event_date,
        coordinator: event.coordinator || 'Lic. Leandro Velasques',
        summary: 'Te invitamos a responder nuestra Encuesta de Satisfacción para evaluar tu experiencia en el taller y ayudarnos a seguir mejorando.',
        emails: emailsToSend,
        surveyLink: `${window.location.origin}/encuesta/${event.slug}`
      }

      const res = await fetch('/api/send-minuta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al enviar encuesta masiva')
      }

      alert(`¡Encuesta enviada exitosamente a ${emailsToSend.length} destinatarios!`)
      setShowSendModal(false)
    } catch (err) {
      alert('Error en el envío masivo: ' + err.message)
    } finally {
      setSendingSurvey(false)
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto p-12 text-center text-[var(--color-dark-gray)]/60">Cargando resultados de satisfacción...</div>
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">error</span>
        <p className="text-lg font-semibold text-[var(--color-dark-gray)]/40">Evento no encontrado</p>
        <Link to="/admin/eventos" className="btn-primary mt-6 inline-flex">Volver al listado</Link>
      </div>
    )
  }

  const questions = event?.satisfaction_questions && event.satisfaction_questions.length === 5
    ? event.satisfaction_questions
    : DEFAULT_QUESTIONS

  const totalResponses = feedbacks.length
  const totalRegistrations = (registrations || []).length
  const totalPresent = (attendance || []).filter(a => a.status === 'present' || a.status === 'late').length
  const responseRatePresent = totalPresent > 0 ? Number(((totalResponses / totalPresent) * 100).toFixed(1)) : 0
  const responseRateTotal = totalRegistrations > 0 ? Number(((totalResponses / totalRegistrations) * 100).toFixed(1)) : 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8 pb-6 border-b border-[var(--color-deep-green)]/8">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">
              Resultados y Métricas de Encuestas
            </p>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight truncate">{event.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSendModal(true)}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>Enviar Encuesta por Email</span>
          </button>
          <button
            onClick={() => setShowPreviewModal(true)}
            className="btn-secondary flex items-center gap-2 text-xs font-bold"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span>Vista Previa</span>
          </button>
        </div>
      </div>

      {/* Top Conversion Funnel Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5 border border-gray-100 shadow-sm bg-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">01. Inscriptos</span>
            <span className="material-symbols-outlined text-gray-400 text-lg">how_to_reg</span>
          </div>
          <p className="text-3xl font-black text-gray-800">{totalRegistrations}</p>
          <p className="text-[11px] text-gray-400 mt-1">Personas registradas al evento</p>
        </div>

        <div className="card p-5 border border-emerald-100 shadow-sm bg-emerald-50/30">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">02. Asistentes Reales</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg">fact_check</span>
          </div>
          <p className="text-3xl font-black text-emerald-900">{totalPresent}</p>
          <p className="text-[11px] text-emerald-700/80 mt-1">
            {totalRegistrations > 0 ? `${((totalPresent / totalRegistrations) * 100).toFixed(0)}% de presentismo` : 'Sin asistencias tomadas'}
          </p>
        </div>

        <div className="card p-5 border border-amber-100 shadow-sm bg-amber-50/30">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">03. Encuestas Recibidas</span>
            <span className="material-symbols-outlined text-amber-600 text-lg">assignment_turned_in</span>
          </div>
          <p className="text-3xl font-black text-amber-900">{totalResponses}</p>
          <p className="text-[11px] text-amber-700/80 mt-1">
            {totalPresent > 0 ? `${responseRatePresent}% respuesta s/asistentes` : `${responseRateTotal}% s/total inscriptos`}
          </p>
        </div>

        <div className="card p-5 border border-[var(--color-deep-green)]/20 shadow-sm bg-gradient-to-br from-white to-[var(--color-refined-gray)]">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-deep-green)]">04. Nota Promedio</span>
            <span className="material-symbols-outlined text-amber-500 text-lg">star</span>
          </div>
          <p className="text-3xl font-black text-[var(--color-deep-green)]">{globalAverage} <span className="text-sm font-bold text-gray-400">/ 5</span></p>
          <p className="text-[11px] text-[var(--color-dark-gray)]/60 mt-1">Satisfacción general ponderada</p>
        </div>
      </div>

      {totalResponses === 0 ? (
        <div className="card p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">thumbs_up_down</span>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Sin respuestas registradas</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            Todavía no se han recibido respuestas a la encuesta de satisfacción para este evento. Hacé clic en "Enviar Encuesta por Email" arriba para notificar a los asistentes.
          </p>
          <div className="mt-8 pt-6 border-t border-gray-100 max-w-md mx-auto">
            <p className="text-xs font-bold text-[var(--color-dark-gray)]/60 mb-2">Enlace de la encuesta pública:</p>
            <div className="flex items-center gap-2 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-2">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/encuesta/${event.slug || ''}`}
                className="bg-transparent border-none text-[11px] font-mono text-[var(--color-dark-gray)] flex-1 min-w-0 outline-none"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/encuesta/${event.slug}`);
                  alert('Enlace copiado al portapapeles.');
                }}
                className="btn-ghost !p-1.5 !py-1 text-xs shrink-0"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Details by Criterion */}
          <div className="card p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 uppercase tracking-wider text-[13px]">
              Detalle por Categoría de Evaluación
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {questions.map(q => {
                const avg = averages[q.key] || 0
                const dist = distributions[q.key] || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                
                return (
                  <div key={q.key} className="space-y-4 bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{q.label}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[var(--color-deep-green)]/8 px-2.5 py-1 rounded-full shrink-0">
                        <span className="material-symbols-outlined text-xs text-[var(--color-deep-green)] fill-[var(--color-deep-green)]">star</span>
                        <span className="text-xs font-bold text-[var(--color-deep-green)]">{avg.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Chart list */}
                    <div className="space-y-2 mt-2">
                      {[5, 4, 3, 2, 1].map(stars => {
                        const count = dist[stars] || 0
                        const percentage = totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(0) : 0
                        
                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs">
                            <span className="w-12 font-medium text-gray-500 shrink-0">{stars} ★</span>
                            <div className="flex-1 bg-gray-200/60 rounded-full h-2.5 overflow-hidden">
                              <div 
                                className="bg-[var(--color-deep-green)] h-full rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-14 text-right font-bold text-gray-700 shrink-0">{count} ({percentage}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* User Comments Table */}
          <div className="card p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 uppercase tracking-wider text-[13px]">
              Comentarios y Sugerencias de los Asistentes
            </h2>

            {feedbacks.filter(f => f.comments && f.comments.trim()).length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">No se registraron comentarios escritos en las encuestas completadas.</p>
            ) : (
              <div className="space-y-4">
                {feedbacks.filter(f => f.comments && f.comments.trim()).map((fb, i) => (
                  <div key={fb.id || i} className="p-4 rounded-xl bg-white border border-gray-100 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-gray-400">
                      <span className="font-bold text-[var(--color-deep-green)]">Respuesta #{feedbacks.length - i}</span>
                      <span>{fb.created_at ? format(new Date(fb.created_at), "d 'de' MMMM, HH:mm 'hs'", { locale: es }) : 'Fecha reciente'}</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{fb.comments}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL DE ENVÍO DE ENCUESTA DE SATISFACCIÓN */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl my-8 relative flex flex-col">
            <div className="bg-[var(--color-deep-green)] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">send</span>
                <span className="font-bold text-sm">Enviar Encuesta de Satisfacción</span>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-2">
                  Seleccionar Destinatarios:
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="targetGroup"
                      value="present"
                      checked={targetGroup === 'present'}
                      onChange={() => setTargetGroup('present')}
                      className="mt-1 accent-[var(--color-deep-green)]"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-800">Solo Asistentes Confirmados ({totalPresent})</p>
                      <p className="text-[11px] text-gray-500">Envía únicamente a los participantes marcados como 'Presente' o 'Tarde' en asistencia.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="targetGroup"
                      value="all"
                      checked={targetGroup === 'all'}
                      onChange={() => setTargetGroup('all')}
                      className="mt-1 accent-[var(--color-deep-green)]"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-800">Todos los Inscriptos al Evento ({totalRegistrations})</p>
                      <p className="text-[11px] text-gray-500">Envía a la totalidad de la lista de inscriptos (útil si no se tomó asistencia puntual en puerta).</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="targetGroup"
                      value="custom"
                      checked={targetGroup === 'custom'}
                      onChange={() => setTargetGroup('custom')}
                      className="mt-1 accent-[var(--color-deep-green)]"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-800">Correos Personalizados / Específicos</p>
                      <p className="text-[11px] text-gray-500">Escribí manualmente los emails separados por coma.</p>
                      {targetGroup === 'custom' && (
                        <input
                          className="form-input text-xs mt-2 w-full"
                          placeholder="email1@ejemplo.com, email2@ejemplo.com"
                          value={customEmails}
                          onChange={e => setCustomEmails(e.target.value)}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Envío de Prueba */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">mark_email_unread</span>
                  Envío de Prueba Individual
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    className="form-input text-xs flex-1 bg-white"
                    placeholder="info@leandrovelasques.com.ar"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleTestSurveySend}
                    disabled={testingSurvey}
                    className="btn-secondary !py-2 text-xs font-bold shrink-0"
                  >
                    {testingSurvey ? 'Enviando prueba...' : 'Enviar Prueba'}
                  </button>
                </div>
              </div>

              {/* Acciones principales */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="btn-ghost text-xs font-bold flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleOfficialSurveySend}
                  disabled={sendingSurvey}
                  className="btn-primary text-xs font-bold flex-1 justify-center py-2.5 shadow-md"
                >
                  {sendingSurvey ? 'Enviando...' : `Enviar Encuesta (${getRecipientEmails().length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa de Encuesta (Participante) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[var(--color-refined-gray)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
            <div className="bg-[var(--color-deep-green)] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">preview</span>
                <span className="font-bold text-sm">Vista Previa: Encuesta de Satisfacción</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div className="text-center max-w-lg mx-auto border-b border-[var(--color-deep-green)]/10 pb-6">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-dark-gray)]/50 block mb-1">
                  Encuesta de Satisfacción (Vista Previa)
                </span>
                <h2 className="text-2xl font-black text-[var(--color-deep-green)]">{event.title}</h2>
                {event.subtitle && <p className="text-xs text-[var(--color-dark-gray)]/70 mt-1">{event.subtitle}</p>}
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.key || idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <label className="text-sm font-bold text-gray-800">
                        {idx + 1}. {q.desc || q.label} <span className="text-red-500">*</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="p-1 text-gray-300 hover:text-amber-400 transition-colors focus:outline-none"
                        >
                          <span className="material-symbols-outlined text-3xl">star</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-2">
                  <label className="text-sm font-bold text-gray-800 block">
                    Comentarios o sugerencias <span className="text-xs font-normal text-gray-400">(Opcional)</span>
                  </label>
                  <textarea
                    readOnly
                    placeholder="Escribe aquí tus comentarios..."
                    className="form-input min-h-[90px] text-xs bg-gray-50/50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
