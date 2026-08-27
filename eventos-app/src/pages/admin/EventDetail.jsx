import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import html2canvas from 'html2canvas'
import DonutChart, { CHART_COLORS } from '../../components/DonutChart'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note', next: 'Publicar', nextStatus: 'published' },
  published: { label: 'Publicado', color: 'green', icon: 'public', next: 'Iniciar evento', nextStatus: 'in_progress' },
  in_progress: { label: 'En curso', color: 'yellow', icon: 'play_circle', next: 'Finalizar', nextStatus: 'completed' },
  completed: { label: 'Finalizado', color: 'green', icon: 'check_circle' },
  cancelled: { label: 'Cancelado', color: 'red', icon: 'cancel' },
}

const ensureAbsoluteUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:')) return url
  return `https://${url}`
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEventById, getEventStats, updateEvent, publishEvent, deleteEvent, isLoading, registrations, fetchEventData } = useStore()
  const [event, setEvent] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalityCounts, setModalityCounts] = useState({ presencial: 0, virtual: 0 })
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastExtra, setBroadcastExtra] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [modalTab, setModalTab] = useState('edit')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [testingBroadcast, setTestingBroadcast] = useState(false)
  const [sendingSatisfaction, setSendingSatisfaction] = useState(false)

  const handleSendSatisfactionSurvey = async () => {
    const confirmSend = window.confirm(
      '¿Estás seguro de que querés enviar el correo de encuesta de satisfacción a todos los participantes confirmados/asistentes que no lo hayan recibido aún?'
    )
    if (!confirmSend) return

    setSendingSatisfaction(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-reminders', {
        body: {
          eventId: event.id,
          type: 'reminder_next_day'
        }
      })

      if (error) throw error

      if (data && data.success) {
        alert(`¡Encuesta de satisfacción enviada con éxito! Se procesaron ${data.processed || 0} correos.`)
      } else {
        alert('Se ejecutó el envío pero no se procesó ningún correo nuevo (tal vez ya fueron enviados).')
      }
    } catch (err) {
      console.error('Error al enviar la encuesta:', err)
      alert('Error al enviar la encuesta: ' + (err.message || String(err)))
    } finally {
      setSendingSatisfaction(false)
    }
  }

  const surveyStatsSummary = useMemo(() => {
    if (!registrations || registrations.length === 0) return null

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

      // Suscripciones LLM
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
  }, [registrations])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      const statsData = await getEventStats(id)
      setEvent(eventData)
      setStats(statsData)

      if (eventData) {
        await fetchEventData(eventData.id)
        // Query registrations to count by modality
        const { data: regs } = await supabase
          .from('registrations')
          .select('attendance_mode')
          .eq('event_id', eventData.id)
          .neq('status', 'cancelled')
          
        const pCount = regs?.filter(r => r.attendance_mode === 'presencial').length || 0
        const vCount = regs?.filter(r => r.attendance_mode === 'virtual').length || 0
        setModalityCounts({ presencial: pCount, virtual: vCount })

        // Query feedback count
        const { count: fbCount } = await supabase
          .from('event_feedback')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventData.id)
        setFeedbackCount(fbCount || 0)
      }

      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) {
    return <div className="max-w-4xl mx-auto p-12 text-center">Cargando evento...</div>
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

  const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft
  const eventDate = new Date(event.event_date + 'T12:00:00')
  const eventAccessKey = event.is_public === false ? event.private_link_token : event.slug
  const eventUrl = `${window.location.origin}/evento/${eventAccessKey}`
  const attendanceUrl = `${window.location.origin}/evento/${event.slug}/asistencia`

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'published') {
      await publishEvent(event.id)
    } else {
      await updateEvent(event.id, { status: newStatus })
    }
    // Refresh data
    const updatedStatusEventData = await getEventById(id)
    setEvent(updatedStatusEventData)
  }

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que querés eliminar este evento? Esta acción no se puede deshacer.')) {
      deleteEvent(event.id)
      navigate('/admin/eventos')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleResetToken = async () => {
    if (window.confirm('¿Estás seguro de que querés restablecer el enlace de seguimiento? El enlace anterior dejará de funcionar inmediatamente.')) {
      setLoading(true)
      try {
        const newToken = Array.from({length: 32}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
        const { error } = await supabase
          .from('events')
          .update({ private_link_token: newToken })
          .eq('id', event.id)
        
        if (error) throw error
        
        const updated = await getEventById(id)
        setEvent(updated)
        alert('Enlace de seguimiento restablecido correctamente.')
      } catch (err) {
        alert('Error al restablecer el enlace: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSendBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      alert('Por favor, completá el asunto y el mensaje.')
      return
    }

    setSendingBroadcast(true)
    try {
      const extraRecipients = broadcastExtra
        ? broadcastExtra.split(',').map(email => email.trim()).filter(Boolean)
        : []

      const { data, error } = await supabase.functions.invoke('send-broadcast', {
        body: {
          eventId: event.id,
          subject: broadcastSubject,
          message: broadcastMessage,
          extraRecipients
        }
      })

      if (error) throw error

      alert(`¡Mensaje enviado exitosamente a ${data.sentCount} destinatarios!`)
      setBroadcastSubject('')
      setBroadcastMessage('')
      setBroadcastExtra('')
      setShowBroadcastModal(false)
      setModalTab('edit')
    } catch (err) {
      alert('Error al enviar el comunicado: ' + (err.message || String(err)))
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handlePreviewBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      alert('Por favor, escribí un asunto y mensaje primero para poder previsualizar.')
      setModalTab('edit')
      return
    }

    setLoadingPreview(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast', {
        body: {
          eventId: event.id,
          subject: broadcastSubject,
          message: broadcastMessage,
          preview: true
        }
      })

      if (error) throw error
      setPreviewHtml(data.html)
    } catch (err) {
      alert('Error al generar la previsualización: ' + (err.message || String(err)))
      setModalTab('edit')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleTestBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      alert('Por favor, completá el asunto y el mensaje antes de enviar la prueba.')
      return
    }

    setTestingBroadcast(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast', {
        body: {
          eventId: event.id,
          subject: broadcastSubject,
          message: broadcastMessage,
          testMode: true
        }
      })

      if (error) throw error
      alert('¡Correo de prueba enviado con éxito a tu casilla info@leandrovelasques.com.ar!')
    } catch (err) {
      alert('Error al enviar el correo de prueba: ' + (err.message || String(err)))
    } finally {
      setTestingBroadcast(false)
    }
  }


  const ACTIONS = [
    { to: `/admin/eventos/${id}/participantes`, icon: 'group', label: 'Participantes', count: stats.totalRegistered },
    { to: `/admin/eventos/${id}/participantes?tab=survey`, icon: 'assignment', label: 'Encuestas de Inscripción', count: null },
    { to: `/admin/eventos/${id}/asistencia`, icon: 'fact_check', label: 'Asistencia', count: stats.present },
    { to: `/admin/eventos/${id}/minuta`, icon: 'description', label: 'Minuta', count: null },
    { to: `/admin/eventos/${id}/participantes?tab=satisfaction`, icon: 'thumb_up', label: 'Encuesta de Satisfacción', count: feedbackCount },
    { to: `/admin/eventos/${id}/reporte`, icon: 'assessment', label: 'Reporte del Evento', count: null },
  ]
  const materials = event.event_materials?.filter(m => m.type !== 'image') || []
  const photos = event.event_materials?.filter(m => m.type === 'image') || []

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/eventos" className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge badge-${statusCfg.color}`}>
              <span className={`status-dot status-dot-${statusCfg.color}`} />
              {statusCfg.label}
            </span>
            <span className="badge badge-gray">{event.type === 'charla' ? 'Charla' : 'Taller'}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight truncate">{event.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {event.has_satisfaction_survey && (
            <button 
              onClick={handleSendSatisfactionSurvey} 
              disabled={sendingSatisfaction}
              className="btn-ghost !text-[var(--color-deep-green)] hover:!bg-[var(--color-light-green)]/15 cursor-pointer disabled:opacity-50 flex items-center gap-1"
              title="Enviar encuesta de satisfacción a los participantes ahora"
            >
              <span className="material-symbols-outlined text-lg">thumb_up</span>
              <span className="hidden sm:inline">
                {sendingSatisfaction ? 'Enviando...' : 'Enviar Encuesta'}
              </span>
            </button>
          )}
          <button 
            onClick={() => setShowBroadcastModal(true)} 
            className="btn-ghost !text-[var(--color-deep-green)] hover:!bg-[var(--color-light-green)]/15"
          >
            <span className="material-symbols-outlined text-lg">campaign</span>
            <span className="hidden sm:inline">Enviar Novedad</span>
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <Link to={`/admin/eventos/${id}/editar`} className="btn-ghost">
            <span className="material-symbols-outlined text-lg">edit</span>
            <span className="hidden sm:inline">Editar</span>
          </Link>
          <button onClick={handleDelete} className="btn-ghost text-red-500 hover:!bg-red-50">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, .btn-ghost, .btn-primary, .btn-secondary, .badge, .status-dot, button { display: none !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; break-inside: avoid; }
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
          h1 { font-size: 24pt !important; }
          .material-symbols-outlined { color: black !important; }
          .print-only { display: block !important; }
        }
      ` }} />

      {/* Event Info Card */}
      <div className="card p-6 lg:p-8 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">calendar_today</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Fecha(s)</p>
              {event.offered_dates && event.offered_dates.length > 0 ? (
                <div className="space-y-1">
                  {event.offered_dates.map(dateStr => {
                    const d = new Date(dateStr + 'T12:00:00')
                    const formatted = format(d, "EEEE d 'de' MMMM, yyyy", { locale: es })
                    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1)
                    return (
                      <p key={dateStr} className="text-sm font-semibold">{capitalized}</p>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm font-semibold">{format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">schedule</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Horario</p>
              <p className="text-sm font-semibold">{event.start_time} hs · {event.duration_minutes} min</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">person</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Coordinador</p>
              <p className="text-sm font-semibold">{event.coordinator}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">apartment</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Organizador</p>
              <p className="text-sm font-semibold">{event.organizer || '—'}</p>
            </div>
          </div>
        </div>
        {event.location && (
          <div className="mt-4 pt-4 border-t border-[var(--color-deep-green)]/8 flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]/50">location_on</span>
            <p className="text-sm font-medium text-[var(--color-dark-gray)]/60">Lugar / Dirección: <span className="font-semibold text-[var(--color-dark-gray)]">{event.location}</span></p>
          </div>
        )}
        {event.description_short && (
          <p className="mt-6 pt-6 border-t border-[var(--color-deep-green)]/8 text-sm text-[var(--color-dark-gray)]/70 leading-relaxed">
            {event.description_short}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Inscriptos', value: stats.totalRegistered, icon: 'group', color: 'deep-green' },
          { label: 'Presentes', value: stats.present, icon: 'check_circle', color: 'deep-green' },
          { label: 'Ausentes', value: stats.absent, icon: 'cancel', color: 'dark-gray' },
        ].map(stat => (
          <div key={stat.label} className="card p-5 text-center flex flex-col justify-between min-h-[140px]">
            <div>
              <span className={`material-symbols-outlined text-2xl text-[var(--color-${stat.color})]/30 mb-2 block`}>{stat.icon}</span>
              <p className="text-3xl font-extrabold text-[var(--color-deep-green)]">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mt-1">{stat.label}</p>
            </div>
            {stat.label === 'Inscriptos' && (
              <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-[var(--color-deep-green)]/8 text-xs font-semibold">
                <span className="text-[var(--color-dark-gray)]/60" title="Inscriptos presenciales / Capacidad">
                  🏫 {modalityCounts.presencial} {event.max_capacity_presencial ? `/ ${event.max_capacity_presencial}` : ''}
                </span>
                <span className="text-[var(--color-dark-gray)]/60" title="Inscriptos virtuales / Capacidad">
                  💻 {modalityCounts.virtual} {event.max_capacity_virtual ? `/ ${event.max_capacity_virtual}` : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cuadro Resumen de Títulos, Delegaciones y Suscripciones */}
      {registrations && registrations.length > 0 && surveyStatsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 flex items-center gap-1.5 border-b border-[var(--color-deep-green)]/5 pb-2">
                <span className="material-symbols-outlined text-base">school</span>
                Resumen de Inscriptos
              </h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(surveyStatsSummary.titulos).map(([name, count], index) => {
                  const pct = registrations.length > 0 ? Math.round((count / registrations.length) * 100) : 0
                  const color = CHART_COLORS[index % CHART_COLORS.length]
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                        <span className="truncate max-w-[75%] flex items-center gap-1.5" title={name}>
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {name}
                        </span>
                        <span className="text-[var(--color-deep-green)] font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100/70 rounded-full h-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-center">
              <DonutChart data={surveyStatsSummary.titulos} totalLabel="Inscriptos" />
            </div>
          </div>

          <div className="card p-4 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 flex items-center gap-1.5 border-b border-[var(--color-deep-green)]/5 pb-2">
                <span className="material-symbols-outlined text-base">map</span>
                Distribución de Delegaciones
              </h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(surveyStatsSummary.delegaciones).map(([name, count], index) => {
                  const pct = registrations.length > 0 ? Math.round((count / registrations.length) * 100) : 0
                  const color = CHART_COLORS[index % CHART_COLORS.length]
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                        <span className="truncate max-w-[75%] flex items-center gap-1.5" title={name}>
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {name}
                        </span>
                        <span className="text-[var(--color-deep-green)] font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100/70 rounded-full h-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-center">
              <DonutChart data={surveyStatsSummary.delegaciones} totalLabel="Delegaciones" />
            </div>
          </div>

          <div className="card p-4 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 flex items-center gap-1.5 border-b border-[var(--color-deep-green)]/5 pb-2">
                <span className="material-symbols-outlined text-base">payments</span>
                Suscripciones LLM
              </h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(surveyStatsSummary.suscripciones).map(([name, count], index) => {
                  const pct = registrations.length > 0 ? Math.round((count / registrations.length) * 100) : 0
                  const color = CHART_COLORS[index % CHART_COLORS.length]
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                        <span className="truncate max-w-[75%] flex items-center gap-1.5" title={name}>
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {name}
                        </span>
                        <span className="text-[var(--color-deep-green)] font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100/70 rounded-full h-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-center">
              <DonutChart data={surveyStatsSummary.suscripciones} totalLabel="Suscripciones" />
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {ACTIONS.map(action => (
          <Link key={action.to} to={action.to} className="card card-interactive p-5 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center group-hover:bg-[var(--color-deep-green)] transition-colors">
              <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)] group-hover:text-white transition-colors">{action.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--color-dark-gray)]">{action.label}</p>
              {action.count !== null && (
                <p className="text-xs text-[var(--color-dark-gray)]/50 font-medium">{action.count} registros</p>
              )}
            </div>
            <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/20 group-hover:text-[var(--color-deep-green)] group-hover:translate-x-1 transition-all">
              arrow_forward
            </span>
          </Link>
        ))}
      </div>

      {/* Links & Actions */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest">Links del Evento</h3>

        {event.status !== 'draft' && (
          <>
            <div className="flex items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3">
              <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]">link</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de inscripción</p>
                <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{eventUrl}</p>
              </div>
              <button onClick={() => { copyToClipboard(eventUrl); alert('Copiado al portapapeles'); }} className="btn-ghost !px-3 !py-1.5 text-xs">
                <span className="material-symbols-outlined text-base">content_copy</span>
                Copiar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3 border border-[var(--color-deep-green)]/10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="material-symbols-outlined text-lg text-emerald-600">visibility</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de seguimiento (Consejo / Externo)</p>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{`${window.location.origin}/evento/${event.slug}/inscritos?token=${event.private_link_token}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button onClick={() => { copyToClipboard(`${window.location.origin}/evento/${event.slug}/inscritos?token=${event.private_link_token}`); alert('Copiado al portapapeles'); }} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Copiar
                </button>
                <button onClick={handleResetToken} className="btn-ghost !px-3 !py-1.5 text-xs text-red-500 hover:bg-red-50" title="Restablecer enlace de seguridad">
                  <span className="material-symbols-outlined text-base">lock_reset</span>
                  Restablecer
                </button>
              </div>
            </div>

            {event.attendance_link_token && (
              <div className="flex items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3">
                <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]">fact_check</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de asistencia</p>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{attendanceUrl}</p>
                </div>
                <button onClick={() => copyToClipboard(attendanceUrl)} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Copiar
                </button>
              </div>
            )}

            {event.live_link && (
              <div className="flex items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3">
                <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]">video_camera_back</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de transmisión (Meet / Zoom)</p>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{event.live_link}</p>
                </div>
                <a href={ensureAbsoluteUrl(event.live_link)} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Abrir
                </a>
                <button onClick={() => copyToClipboard(event.live_link)} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Copiar
                </button>
              </div>
            )}

            {event.zoom_details && (
              <div className="bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Datos de Acceso / Zoom</p>
                <pre className="text-xs text-[var(--color-dark-gray)] bg-white/70 p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap max-h-[150px]">
                  {event.zoom_details}
                </pre>
                <div className="flex justify-end">
                  <button onClick={() => copyToClipboard(event.zoom_details)} className="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">content_copy</span>
                    Copiar datos de Zoom
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Materiales del Evento */}
        {materials.length > 0 && (
          <div className="border-t border-[var(--color-deep-green)]/10 pt-6">
            <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest mb-4">Materiales Disponibles</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {materials.map((material, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)] border border-[var(--color-deep-green)]/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">
                      {material.type === 'presentation' ? 'present_to_all' : 'description'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">
                        {material.type === 'presentation' ? 'Presentación Interactiva' : 'Documento'}
                      </p>
                      <p className="text-sm font-bold text-[var(--color-dark-gray)] truncate">{material.title}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={ensureAbsoluteUrl(material.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !py-2 !text-xs flex-1"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Abrir
                    </a>
                    
                    {material.type === 'presentation' && (
                      <a
                        href={ensureAbsoluteUrl(material.url).replace('index.html', 'presentacion.pdf')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !py-2 !text-xs !bg-white hover:!bg-red-50 !text-red-600 !border-red-100"
                        title="Descargar PDF (si está disponible)"
                      >
                        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        PDF
                      </a>
                    )}
                    
                    <button 
                      onClick={() => copyToClipboard(material.url)} 
                      className="btn-ghost !p-2 !min-w-0"
                      title="Copiar link"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos del Evento */}
        {photos.length > 0 && (
          <div className="border-t border-[var(--color-deep-green)]/10 pt-6">
            <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest mb-4">Fotos del Evento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)] border border-[var(--color-deep-green)]/5">
                  <div className="aspect-video overflow-hidden rounded-[var(--radius-premium)]">
                    <img src={photo.url} alt={photo.title || 'Foto'} className="w-full h-full object-cover" />
                  </div>
                  {photo.title && (
                    <p className="text-xs font-semibold text-[var(--color-dark-gray)]/70 text-center truncate">{photo.title}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <a href={photo.url} target="_blank" rel="noreferrer" className="btn-primary !py-1.5 !text-[10px] flex-1 text-center">
                      Ver grande
                    </a>
                    <button onClick={() => copyToClipboard(photo.url)} className="btn-ghost !p-1.5 !min-w-0" title="Copiar URL">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback para Manual de Supervivencia si no está en la DB todavía */}
        {!event.event_materials?.length && event.title?.toLowerCase().includes('manual de supervivencia') && (
          <div className="border-t border-[var(--color-deep-green)]/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-3">Presentación Interactiva</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`${window.location.origin}/manual-de-supervivencia.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <span className="material-symbols-outlined text-lg">present_to_all</span>
                Abrir Presentación
              </a>
            </div>
          </div>
        )}

        {/* Status action button */}
        <div className="flex gap-3 pt-2">
          {statusCfg.next && (
            <button onClick={() => handleStatusChange(statusCfg.nextStatus)} className="btn-primary">
              <span className="material-symbols-outlined text-lg">{STATUS_CONFIG[statusCfg.nextStatus]?.icon}</span>
              {statusCfg.next}
            </button>
          )}
          {(event.status === 'completed' || event.status === 'cancelled') && (
            <button onClick={() => handleStatusChange('published')} className="btn-primary">
              <span className="material-symbols-outlined text-lg">public</span>
              Restaurar a Publicado
            </button>
          )}
          {event.status !== 'draft' && (
            <button onClick={() => handleStatusChange('draft')} className="btn-ghost !text-[var(--color-dark-gray)]/60">
              <span className="material-symbols-outlined text-lg">edit_note</span>
              Volver a Borrador
            </button>
          )}
          {event.status !== 'cancelled' && event.status !== 'completed' && (
            <button onClick={() => handleStatusChange('cancelled')} className="btn-secondary !border-red-300 !text-red-600 hover:!bg-red-600 hover:!text-white">
              <span className="material-symbols-outlined text-lg">cancel</span>
              Cancelar Evento
            </button>
          )}
        </div>
      </div>

      {/* Broadcast/Comunicado Modal */}
      {showBroadcastModal && (
        <div className="modal-overlay p-4 z-50 animate-fade-in">
          <div className="card p-6 max-w-2xl w-full relative animate-scale-in flex flex-col max-h-[90vh]">
            <button 
              onClick={() => {
                setShowBroadcastModal(false)
                setModalTab('edit')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-light-green)]/30 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl text-[var(--color-deep-green)]">campaign</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-dark-gray)]">Enviar Comunicado / Novedad</h3>
                <p className="text-xs text-[var(--color-dark-gray)]/50">Se enviará a los {stats?.totalRegistered || 0} participantes registrados activos.</p>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200/80 mb-5">
              <button 
                type="button"
                onClick={() => setModalTab('edit')}
                className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${modalTab === 'edit' ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Redacción
              </button>
              <button 
                type="button"
                onClick={() => {
                  setModalTab('preview')
                  handlePreviewBroadcast()
                }}
                className={`py-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${modalTab === 'preview' ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Previsualizar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {modalTab === 'edit' ? (
                <form onSubmit={handleSendBroadcast} id="broadcast-form" className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-1.5">
                      Asunto del Correo
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej: Cambio de horario o aula / Nueva información de acceso"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-1.5">
                      Mensaje personalizado
                    </label>
                    <textarea 
                      required
                      rows="6"
                      placeholder="Escribí el cuerpo del mensaje. Podés usar texto normal o HTML básico. Los saltos de línea se respetarán en el mail final."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="form-input"
                      style={{ resize: 'vertical', minHeight: '160px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-1.5">
                      Correos adicionales (Opcional)
                    </label>
                    <input 
                      type="text"
                      placeholder="Ej: mail1@test.com, mail2@test.com (separados por coma)"
                      value={broadcastExtra}
                      onChange={(e) => setBroadcastExtra(e.target.value)}
                      className="form-input"
                    />
                    <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-1">
                      Envia copias de este correo a personas que no estén inscritas en el evento.
                    </p>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--color-dark-gray)]/60">
                    Así es como el email llegará a los participantes (con sus respectivos datos dinámicos):
                  </p>
                  {loadingPreview ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <span className="material-symbols-outlined text-3xl animate-spin text-[var(--color-deep-green)]">sync</span>
                      <p className="text-sm font-semibold text-[var(--color-dark-gray)]/50">Generando previsualización...</p>
                    </div>
                  ) : (
                    <iframe 
                      srcDoc={previewHtml} 
                      className="w-full border border-gray-200 rounded-xl bg-gray-50" 
                      style={{ height: '360px' }} 
                      title="Previsualización de Email"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
              {/* Botón de prueba a la izquierda */}
              <button 
                type="button"
                onClick={handleTestBroadcast}
                className="btn-secondary !py-2 !px-4 text-xs !bg-amber-50/50 !text-amber-700 !border-amber-200 hover:!bg-amber-600 hover:!text-white"
                disabled={sendingBroadcast || testingBroadcast || loadingPreview}
              >
                {testingBroadcast ? (
                  <>
                    <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                    Enviando prueba...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xs">mark_email_read</span>
                    Enviar prueba a mi casilla
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowBroadcastModal(false)
                    setModalTab('edit')
                  }}
                  className="btn-secondary !py-2 !px-5 text-xs"
                  disabled={sendingBroadcast || testingBroadcast}
                >
                  Cancelar
                </button>
                {modalTab === 'edit' ? (
                  <button 
                    type="submit"
                    form="broadcast-form"
                    className="btn-primary !py-2 !px-5 text-xs"
                    disabled={sendingBroadcast || testingBroadcast}
                  >
                    {sendingBroadcast ? (
                      <>
                        <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xs">send</span>
                        Enviar a Todos
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setModalTab('edit')}
                    className="btn-primary !py-2 !px-5 text-xs"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    Volver a Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
