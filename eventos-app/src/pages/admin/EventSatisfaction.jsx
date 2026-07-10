import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const DEFAULT_QUESTIONS = [
  { key: 'score_experience', label: 'Experiencia General' },
  { key: 'score_registration', label: 'Proceso de Inscripción' },
  { key: 'score_duration', label: 'Duración del Evento' },
  { key: 'score_delivery', label: 'Dictado del Taller/Charla' },
  { key: 'score_content', label: 'Interés del Contenido' }
]

export default function EventSatisfaction() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Stats
  const [averages, setAverages] = useState({})
  const [globalAverage, setGlobalAverage] = useState(0)
  const [distributions, setDistributions] = useState({})

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Load event
        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .select('id, title, subtitle, event_date, satisfaction_questions')
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[var(--color-deep-green)]/8">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">
            Resultados de Encuestas
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight truncate">{event.title}</h1>
        </div>
      </div>

      {totalResponses === 0 ? (
        <div className="card p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">thumbs_up_down</span>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Sin respuestas registradas</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            Todavía no se han recibido respuestas a la encuesta de satisfacción para este evento. Una vez que los asistentes completen la encuesta, verás las estadísticas compiladas aquí.
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
          
          {/* Top Summary Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Global Satisfaciton Score */}
            <div className="card p-6 flex flex-col justify-between shadow-sm border border-emerald-50 bg-gradient-to-tr from-white to-[#f3f7f5]/40">
              <div>
                <span className="material-symbols-outlined text-2xl text-[var(--color-deep-green)]/30 mb-2 block">workspace_premium</span>
                <p className="text-4xl font-black text-[var(--color-deep-green)]">{globalAverage} <span className="text-xl text-gray-400 font-medium">/ 5</span></p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mt-1">Satisfacción Global</p>
              </div>
              <p className="text-xs text-[var(--color-dark-gray)]/50 mt-3 pt-3 border-t border-[var(--color-deep-green)]/8 font-medium">
                Promedio general ponderado de los 5 aspectos
              </p>
            </div>

            {/* Total Submissions */}
            <div className="card p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="material-symbols-outlined text-2xl text-[var(--color-deep-green)]/30 mb-2 block">assignment_turned_in</span>
                <p className="text-4xl font-black text-[var(--color-deep-green)]">{totalResponses}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mt-1">Encuestas Recibidas</p>
              </div>
              <p className="text-xs text-[var(--color-dark-gray)]/50 mt-3 pt-3 border-t border-[var(--color-deep-green)]/8 font-medium">
                Respuestas registradas de manera anónima
              </p>
            </div>

            {/* Event Info Reference */}
            <div className="card p-6 flex flex-col justify-between shadow-sm sm:col-span-2 lg:col-span-1">
              <div>
                <span className="material-symbols-outlined text-2xl text-[var(--color-deep-green)]/30 mb-2 block">event</span>
                <p className="text-sm font-bold text-gray-800 truncate mb-1">Fecha del Evento</p>
                <p className="text-sm font-semibold text-gray-600">
                  {format(new Date(event.event_date + 'T12:00:00'), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <p className="text-xs text-[var(--color-dark-gray)]/50 mt-3 pt-3 border-t border-[var(--color-deep-green)]/8 font-medium">
                Listo para evaluar en retrospectiva
              </p>
            </div>
            
          </div>

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
                        const percent = totalResponses > 0 ? (count / totalResponses) * 100 : 0
                        
                        // Select color based on star range
                        let barColor = 'bg-emerald-500' // 5 and 4
                        if (stars === 3) barColor = 'bg-amber-400'
                        if (stars <= 2) barColor = 'bg-red-400'

                        return (
                          <div key={stars} className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
                            <span className="w-12 text-right shrink-0">{stars} estrellas</span>
                            <div className="flex-1 bg-gray-200/60 h-2.5 rounded-full overflow-hidden">
                              <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                            </div>
                            <span className="w-8 text-right shrink-0">{count} ({percent.toFixed(0)}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Written Comments */}
          <div className="card p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 uppercase tracking-wider text-[13px]">
              Comentarios de los Participantes
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {feedbacks.filter(fb => fb.comments && fb.comments.trim()).length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400 italic">
                  No se registraron comentarios escritos en esta encuesta.
                </div>
              ) : (
                feedbacks
                  .filter(fb => fb.comments && fb.comments.trim())
                  .map(fb => {
                    // Calculate individual submission average score
                    const scoresList = questions.map(q => fb[q.key])
                    const subAvg = scoresList.reduce((a, b) => a + b, 0) / questions.length
                    
                    return (
                      <div key={fb.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex justify-between items-center gap-3 mb-2 text-xs">
                          <span className="text-gray-400 font-semibold">
                            {format(new Date(fb.created_at), "d 'de' MMMM, HH:mm 'hs'", { locale: es })}
                          </span>
                          <span className="font-bold text-amber-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] fill-amber-500">star</span>
                            {subAvg.toFixed(1)} prom.
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{fb.comments}</p>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
