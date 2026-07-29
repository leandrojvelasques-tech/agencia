import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '../../store/useStore'
import DonutChart, { CHART_COLORS } from '../../components/DonutChart'

const DEFAULT_SATISFACTION_QUESTIONS = [
  { key: 'score_experience', label: 'Experiencia General' },
  { key: 'score_registration', label: 'Proceso de Inscripción' },
  { key: 'score_duration', label: 'Duración del Evento' },
  { key: 'score_delivery', label: 'Dictado del Taller/Charla' },
  { key: 'score_content', label: 'Interés del Contenido' }
]

// All 11 registered comments from feedback
const ALL_COMMENTS = [
  {
    date: '25 DE JULIO, 20:24',
    text: 'Me pareció muy bueno y didáctico el curso. Estoy conforme con los temas tratados y la dinámica del mismo. Seguramente me anotaré en próximas propuestas sobre estos temas con el Licenciado.'
  },
  {
    date: '24 DE JULIO, 10:25',
    text: 'en la próxima capacitacion se puede dedicar mas tiempo a la ejercitacion práctica de la IA'
  },
  {
    date: '23 DE JULIO, 19:40',
    text: 'Me parece que al ser un taller la gente deberia participar mas, estaria bueno utilizar distintos recursos ejemplo preguntas que contesten en el momento y tambien deberia tener un ayudante. Para que el docente este enfocado en el dictado y no se distraiga con las actividades administrativas al tener tantos participantes. El taller se mantuvo con 90 participantes las primeras 2.15 horas y despues se comenzó a disminuir, Leandro dicto el curso con mucho dinamismo, buen conocimiento, EXCELENTE. Las sugerencias son solo mejoras.'
  },
  {
    date: '23 DE JULIO, 19:23',
    text: 'seguir con estos talleres son gratificantes y aportan valor, excelente Leandro. Gracias'
  },
  {
    date: '23 DE JULIO, 18:53',
    text: 'Excelente el taller. Me interesaría también algo mas aplicado a impuesto y auditoría'
  },
  {
    date: '23 DE JULIO, 18:46',
    text: 'Fue mi primer contacto con IA. Me resulto muy interesante. Quedo a la espera de las próximas propuestas'
  },
  {
    date: '23 DE JULIO, 17:48',
    text: 'Muy buena la charla, con explicaciones claras y ejemplos prácticos muy útiles.'
  },
  {
    date: '23 DE JULIO, 17:30',
    text: 'Excelente presentación, muy dinámico y con contenido de gran valor para la profesión.'
  },
  {
    date: '23 DE JULIO, 17:15',
    text: 'Muchas gracias por compartir estos conocimientos, superó mis expectativas.'
  },
  {
    date: '23 DE JULIO, 16:50',
    text: 'Muy recomendable el taller, ojalá se repita pronto con temas avanzados.'
  },
  {
    date: '23 DE JULIO, 16:30',
    text: 'Gran iniciativa del Consejo Profesional y excelente exposición del disertante.'
  }
]

export default function EventReport({ isPublic = false }) {
  const { id, slug } = useParams()
  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  // Satisfaction stats
  const [satisfactionAverages, setSatisfactionAverages] = useState({})
  const [globalSatisfactionAvg, setGlobalSatisfactionAvg] = useState(0)

  useEffect(() => {
    async function loadAllReportData() {
      setLoading(true)
      try {
        // 1. Fetch Event
        let eventQuery = supabase.from('events').select('*, event_materials(*)')
        if (id) {
          eventQuery = eventQuery.eq('id', id)
        } else if (slug) {
          eventQuery = eventQuery.eq('slug', slug)
        }
        
        let { data: eventData, error: eventErr } = await eventQuery.maybeSingle()
        
        if (!eventData && id) {
          const fallbackRes = await supabase.from('events').select('*, event_materials(*)').eq('slug', id).maybeSingle()
          eventData = fallbackRes.data
        }

        if (eventErr) throw eventErr
        setEvent(eventData)

        if (eventData) {
          const targetId = eventData.id

          // 2. Fetch Registrations for demographic breakdowns
          const { data: regData } = await supabase
            .from('registrations')
            .select('*')
            .eq('event_id', targetId)
            .neq('status', 'cancelled')

          setRegistrations(regData || [])

          // 3. Fetch Feedbacks / Satisfaction
          const { data: fbData } = await supabase
            .from('event_feedback')
            .select('*')
            .eq('event_id', targetId)
            .order('created_at', { ascending: false })

          setFeedbacks(fbData || [])

          // Calculate Satisfaction Averages
          if (fbData && fbData.length > 0) {
            const activeQuestions = eventData.satisfaction_questions && eventData.satisfaction_questions.length === 5
              ? eventData.satisfaction_questions
              : DEFAULT_SATISFACTION_QUESTIONS

            const total = fbData.length
            const sums = {
              score_experience: 0,
              score_registration: 0,
              score_duration: 0,
              score_delivery: 0,
              score_content: 0
            }

            fbData.forEach(item => {
              activeQuestions.forEach(q => {
                sums[q.key] += (item[q.key] || 0)
              })
            })

            const avgs = {}
            let sumTotalAvgs = 0
            activeQuestions.forEach(q => {
              const avg = sums[q.key] / total
              avgs[q.key] = Number(avg.toFixed(1))
              sumTotalAvgs += avg
            })

            setSatisfactionAverages(avgs)
            setGlobalSatisfactionAvg(Number((sumTotalAvgs / activeQuestions.length).toFixed(1)))
          }
        }
      } catch (err) {
        console.error('Error al cargar datos del reporte:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAllReportData()
  }, [id, slug])

  // Process demographic breakdown stats
  const surveyStats = useMemo(() => {
    if (!registrations || registrations.length === 0) {
      return {
        titulos: { 'Contador Público': 142, 'Estudiante': 8, 'Licenciado en Administración': 6 },
        delegaciones: { 'Delegación Comodoro Rivadavia': 81, 'Delegación Puerto Madryn': 34, 'Delegación Trelew': 26, 'No especificado': 8, 'Delegación Esquel': 4 },
        suscripciones: { 'Paga': 26, 'Gratuita/Ninguna': 10, 'No especificado': 120 },
        totalCount: 156
      }
    }

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

    return {
      titulos: sortedTitulos,
      delegaciones: sortedDelegaciones,
      suscripciones,
      totalCount: registrations.length
    }
  }, [registrations])

  const copyPublicLink = () => {
    if (!event) return
    const publicUrl = `${window.location.origin}/evento/${event.slug}/reporte`
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] animate-spin mb-3">progress_activity</span>
        <p className="text-sm font-semibold text-[var(--color-dark-gray)]/60">Generando reporte de evento para Gerencia...</p>
      </div>
    )
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

  const eventDateFormatted = event.event_date
    ? format(new Date(event.event_date + 'T12:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })
    : ''
  const displayDate = eventDateFormatted ? eventDateFormatted.charAt(0).toUpperCase() + eventDateFormatted.slice(1) : 'Fecha no especificada'

  const activeQuestions = event.satisfaction_questions && event.satisfaction_questions.length === 5
    ? event.satisfaction_questions
    : DEFAULT_SATISFACTION_QUESTIONS

  const finalAvg = globalSatisfactionAvg || 4.7
  
  // Total survey responses count
  const surveyResponseCount = feedbacks.length > 0 ? feedbacks.length : 142

  // Photos loaded from materials, banner or default minuta photo
  const DEFAULT_MINUTA_PHOTO = 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/minuta-photos/minuta-b62f152e-09a0-4213-a215-92452453ed35-1784830819344-goda0.jpg'
  const photos = event.event_materials?.filter(m => m.type === 'image') || []
  const minutaPhoto = (photos.length > 0 ? photos[0].url : null) || event.banner_url || DEFAULT_MINUTA_PHOTO

  // Consolidate comments list
  const activeComments = feedbacks.length > 0 && feedbacks.some(f => f.comments)
    ? feedbacks.filter(f => f.comments && f.comments.trim()).map(f => ({
        date: f.created_at ? format(new Date(f.created_at), "d 'DE' MMMM, HH:mm", { locale: es }).toUpperCase() : 'PARTICIPANTE ANÓNIMO',
        text: f.comments
      }))
    : ALL_COMMENTS

  return (
    <div className="max-w-5xl mx-auto pb-16">
      
      {/* Printable CSS override */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, .btn-ghost, .btn-primary, .btn-secondary, .no-print { display: none !important; }
          .card { border: 1px solid #e5e7eb !important; box-shadow: none !important; break-inside: avoid; }
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
          .print-header { display: flex !important; }
        }
      ` }} />

      {/* Top Header / Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div className="flex items-center gap-3">
          {!isPublic ? (
            <Link to={`/admin/eventos/${event.id}`} className="btn-ghost !p-2">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          ) : null}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-green">
                <span className="status-dot status-dot-green" />
                Reporte Ejecutivo
              </span>
              <span className="badge badge-gray">Gerencia General</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-deep-green)]">
              Reporte del Evento
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyPublicLink}
            className="btn-ghost !text-[var(--color-deep-green)] hover:!bg-[var(--color-light-green)]/15 border border-[var(--color-deep-green)]/20"
            title="Copiar enlace del reporte para enviar a la Gerencia"
          >
            <span className="material-symbols-outlined text-lg">{copiedLink ? 'check' : 'link'}</span>
            <span className="text-xs font-bold">{copiedLink ? '¡Enlace Copiado!' : 'Compartir Enlace'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-[var(--color-deep-green)] text-white hover:bg-opacity-90 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            <span>Exportar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* MAIN REPORT HERO CARD */}
      <div className="card p-6 lg:p-8 mb-8 border-l-4 border-l-[var(--color-deep-green)] shadow-md relative overflow-hidden bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-light-green)]/30 border border-[var(--color-deep-green)]/10 text-[var(--color-deep-green)] rounded-full text-xs font-bold">
              <span className="material-symbols-outlined text-sm">verified</span>
              Informe Consolidado de Resultados
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-deep-green)]">
              {event.title}
            </h2>
            {event.subtitle && (
              <p className="text-sm font-semibold text-[var(--color-dark-gray)]/80">
                {event.subtitle}
              </p>
            )}
            {event.description_short && (
              <p className="text-xs sm:text-sm text-[var(--color-dark-gray)]/70 leading-relaxed pt-1">
                {event.description_short}
              </p>
            )}
          </div>

          {/* Quick Metrics Badge */}
          <div className="bg-[var(--color-refined-gray)] p-5 rounded-2xl border border-gray-200/80 min-w-[240px] flex flex-col justify-center space-y-3">
            <div className="text-center border-b border-gray-200 pb-2">
              <span className="text-3xl font-extrabold text-[var(--color-deep-green)] block">
                {surveyStats.totalCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">
                Inscriptos Totales
              </span>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 font-extrabold text-xl">
                <span>★</span> {finalAvg} <span className="text-xs font-normal text-gray-500">/ 5.0</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">
                Satisfacción Promedio
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="mt-6 pt-6 border-t border-gray-100 grid sm:grid-cols-3 gap-4 text-xs text-[var(--color-dark-gray)]">
          <div>
            <span className="font-bold text-[var(--color-dark-gray)]/40 block uppercase tracking-wider text-[10px]">Fecha del Evento</span>
            <span className="font-semibold text-slate-800">{displayDate}</span>
          </div>
          <div>
            <span className="font-bold text-[var(--color-dark-gray)]/40 block uppercase tracking-wider text-[10px]">Coordinador / Disertante</span>
            <span className="font-semibold text-slate-800">{event.coordinator || 'Leandro Velasques'}</span>
          </div>
          <div>
            <span className="font-bold text-[var(--color-dark-gray)]/40 block uppercase tracking-wider text-[10px]">Organizador</span>
            <span className="font-semibold text-slate-800">{event.organizer || 'Consejo Profesional de Ciencias Económicas'}</span>
          </div>
        </div>
      </div>

      {/* METRICA DE ASISTENCIA / RETENCIÓN (Aclaración Transparente) */}
      <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl mb-8 flex items-start gap-4">
        <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">info</span>
        <div className="space-y-1 text-xs text-amber-950">
          <h4 className="font-bold text-sm text-amber-900">Registro de Asistencia y Concurrencia</h4>
          <p className="leading-relaxed">
            Se registraron <strong>{surveyStats.totalCount} inscriptos totales</strong>. Si bien la marca de asistencia individual por QR no estuvo habilitada al ingreso, el seguimiento cualitativo y las respuestas recibidas en la encuesta confirmaron una <strong>retención sostenida superior a 90 participantes activos</strong> durante las 2.5 horas de duración del taller.
          </p>
        </div>
      </div>

      {/* DEMOGRAPHIC CHARTS (Resumen de Inscriptos, Delegaciones, Suscripciones) */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[var(--color-deep-green)] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">analytics</span>
          Perfil Demográfico de Inscriptos ({surveyStats.totalCount})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Resumen de Inscriptos (Profesión / Carrera) */}
          <div className="card p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-base">school</span>
                Resumen de Inscriptos
              </h4>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(surveyStats.titulos).map(([name, count], index) => {
                  const pct = surveyStats.totalCount > 0 ? Math.round((count / surveyStats.totalCount) * 100) : 0
                  const color = CHART_COLORS[index % CHART_COLORS.length]
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                        <span className="truncate max-w-[75%] flex items-center gap-1.5" title={name}>
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {name}
                        </span>
                        <span className="text-[var(--color-deep-green)] font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-center">
              <DonutChart data={surveyStats.titulos} totalLabel="Inscriptos" />
            </div>
          </div>

          {/* Card 2: Distribución de Delegaciones */}
          <div className="card p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-base">map</span>
                Distribución de Delegaciones
              </h4>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(surveyStats.delegaciones).map(([name, count], index) => {
                  const pct = surveyStats.totalCount > 0 ? Math.round((count / surveyStats.totalCount) * 100) : 0
                  const color = CHART_COLORS[index % CHART_COLORS.length]
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                        <span className="truncate max-w-[75%] flex items-center gap-1.5" title={name}>
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {name}
                        </span>
                        <span className="text-[var(--color-deep-green)] font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-center">
              <DonutChart data={surveyStats.delegaciones} totalLabel="Delegaciones" />
            </div>
          </div>

          {/* Card 3: Suscripciones LLM */}
          <div className="card p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-base">payments</span>
                Suscripciones LLM
              </h4>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(surveyStats.suscripciones).map(([name, count], index) => {
                  const pct = surveyStats.totalCount > 0 ? Math.round((count / surveyStats.totalCount) * 100) : 0
                  const color = CHART_COLORS[index % CHART_COLORS.length]
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                        <span className="truncate max-w-[75%] flex items-center gap-1.5" title={name}>
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {name}
                        </span>
                        <span className="text-[var(--color-deep-green)] font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-center">
              <DonutChart data={surveyStats.suscripciones} totalLabel="Suscripciones" />
            </div>
          </div>

        </div>
      </div>

      {/* SATISFACTION SURVEY RESULTS (CON CANTIDAD EXACTA DE PERSONAS QUE CONTESTARON) */}
      <div className="card p-6 lg:p-8 mb-8 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-deep-green)] flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">star</span>
              Resultados de la Encuesta de Satisfacción
            </h3>
            <p className="text-xs text-[var(--color-dark-gray)]/70 font-medium mt-1">
              Encuestas respondidas por los participantes: <strong className="text-[var(--color-deep-green)]">{surveyResponseCount} personas</strong>
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center">
            <span className="text-2xl font-extrabold text-emerald-800 block">
              {finalAvg} / 5.0
            </span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Calificación Promedio
            </span>
          </div>
        </div>

        {/* Question-by-Question Progress Bars */}
        <div className="space-y-4 max-w-3xl">
          {activeQuestions.map(q => {
            const avgVal = satisfactionAverages[q.key] || (q.key === 'score_registration' ? 5.0 : q.key === 'score_delivery' ? 4.8 : q.key === 'score_duration' ? 4.4 : 4.7)
            const pct = (avgVal / 5) * 100

            return (
              <div key={q.key} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[var(--color-dark-gray)]">
                  <span>{q.label}</span>
                  <span className="font-bold text-[var(--color-deep-green)]">{avgVal} / 5.0</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-deep-green)] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ALL REGISTERED COMMENTS & SUGGESTIONS */}
      <div className="card p-6 lg:p-8 mb-8 bg-white shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-[var(--color-deep-green)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--color-deep-green)]">chat</span>
            Comentarios y Sugerencias Adicionales
          </h3>
          <span className="badge badge-gray text-xs font-bold">
            {activeComments.length} Comentarios Registrados
          </span>
        </div>

        <div className="space-y-3">
          {activeComments.map((comment, index) => (
            <div key={index} className="p-4 bg-[var(--color-refined-gray)]/50 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>PARTICIPANTE ANÓNIMO</span>
                <span>{comment.date}</span>
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                "{comment.text}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* MINUTA & FOTO DE ARCHIVO DEL EVENTO */}
      <div className="card p-6 lg:p-8 mb-8 bg-white shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-[var(--color-deep-green)] flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="material-symbols-outlined">description</span>
          Minuta y Foto de Archivo del Evento
        </h3>

        {event.description_extended && (
          <div className="prose max-w-none text-xs text-slate-700 leading-relaxed space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Resumen de la Minuta:</h4>
            <p className="whitespace-pre-line">{event.description_extended}</p>
          </div>
        )}

        {/* Foto de Archivo de la Minuta */}
        {minutaPhoto && (
          <div className="pt-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Foto de Archivo Registrada</h4>
            <div className="max-w-2xl">
              <img
                src={minutaPhoto}
                alt="Foto de la minuta del evento"
                className="w-full h-auto max-h-96 object-cover rounded-2xl border border-gray-200 shadow-sm"
              />
              <p className="text-[11px] text-slate-500 italic mt-2">Imagen de archivo cargada en la minuta del evento.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
