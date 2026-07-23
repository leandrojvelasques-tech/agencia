import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const DEFAULT_QUESTIONS = [
  { key: 'score_experience', label: 'Experiencia General', desc: '¿Cómo calificarías tu experiencia general con el evento?' },
  { key: 'score_registration', label: 'Proceso de Inscripción', desc: '¿Qué te pareció el proceso de registro y la comunicación previa?' },
  { key: 'score_duration', label: 'Duración del Evento', desc: '¿Cómo evalúas la duración total de la jornada?' },
  { key: 'score_delivery', label: 'Dictado del Taller/Charla', desc: '¿Qué te pareció la claridad y el desempeño del facilitador?' },
  { key: 'score_content', label: 'Interés del Contenido', desc: '¿Qué tan útil y aplicable te resultó el contenido visto?' }
]

export default function EventFeedback() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form State
  const [scores, setScores] = useState({
    score_experience: 0,
    score_registration: 0,
    score_duration: 0,
    score_delivery: 0,
    score_content: 0
  })
  const [comments, setComments] = useState('')
  const [hoveredScores, setHoveredScores] = useState({
    score_experience: 0,
    score_registration: 0,
    score_duration: 0,
    score_delivery: 0,
    score_content: 0
  })

  useEffect(() => {
    async function loadEvent() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, subtitle, status, satisfaction_questions')
          .eq('slug', slug)
          .single()
        
        if (error || !data) {
          throw new Error('Evento no encontrado.')
        }
        setEvent(data)
      } catch (err) {
        setErrorMsg(err.message || 'Error al cargar el evento.')
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [slug])

  const handleStarClick = (key, val) => {
    setScores(prev => ({ ...prev, [key]: val }))
  }

  const handleStarHover = (key, val) => {
    setHoveredScores(prev => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate that all questions are answered
    const unanswered = Object.entries(scores).filter(([_, val]) => val === 0)
    if (unanswered.length > 0) {
      alert('Por favor, califica todos los aspectos obligatorios antes de enviar.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        event_id: event.id,
        score_experience: scores.score_experience,
        score_registration: scores.score_registration,
        score_duration: scores.score_duration,
        score_delivery: scores.score_delivery,
        score_content: scores.score_content,
        comments: comments.trim() || null
      }

      const { error } = await supabase
        .from('event_feedback')
        .insert(payload)
      
      if (error) throw error

      setSubmitted(true)
    } catch (err) {
      alert('Error al enviar la encuesta: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-deep-green)] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/60">Cargando encuesta...</p>
        </div>
      </div>
    )
  }

  if (errorMsg || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)] p-4">
        <div className="max-w-md w-full card p-8 text-center shadow-lg">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">error</span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Encuesta no disponible</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg || 'El enlace que seguiste no es válido.'}</p>
          <a href="https://www.leandrovelasques.com.ar" className="btn-primary inline-flex">
            Ir a la web principal
          </a>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#1b3e31] to-[#285A47] p-4">
        <div className="max-w-lg w-full card p-10 text-center shadow-2xl animate-fade-in">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 border border-emerald-100">
            <span className="material-symbols-outlined text-4xl animate-bounce">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-3">¡Muchas gracias por tu feedback!</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            Tus respuestas y comentarios han sido registrados de forma anónima. Nos ayudan muchísimo a seguir perfeccionando nuestras capacitaciones y talleres.
          </p>
          <div className="border-t border-gray-100 pt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/40">Porter AI · Academia de Automatización</p>
          </div>
        </div>
      </div>
    )
  }

  const questions = event?.satisfaction_questions && event.satisfaction_questions.length === 5
    ? event.satisfaction_questions
    : DEFAULT_QUESTIONS

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-refined-gray)] to-gray-100 py-12 px-4">
      <div className="max-w-xl mx-auto">
        
        {/* Event Header Info */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 px-3 py-1 rounded-full inline-block mb-3">
            Encuesta de Satisfacción
          </p>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-tight">{event.title}</h1>
          {event.subtitle && <p className="text-sm text-gray-500 mt-1 font-medium">{event.subtitle}</p>}
        </div>

        {/* Survey Card Form */}
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 shadow-xl space-y-8 bg-white border border-gray-100/50">
          
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const currentScore = scores[q.key]
              const currentHover = hoveredScores[q.key]
              const activeStars = currentHover || currentScore

              return (
                <div key={q.key} className={`pb-6 ${idx < questions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div>
                      <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="text-[var(--color-deep-green)] text-xs font-black">0{idx + 1}.</span>
                        {q.label}
                      </label>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{q.desc}</p>
                    </div>
                    {currentScore > 0 && (
                      <span className="text-xs font-bold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 px-2 py-0.5 rounded-full shrink-0">
                        {currentScore} / 5
                      </span>
                    )}
                  </div>

                  {/* Star Rating Select Area */}
                  <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleStarClick(q.key, val)}
                        onMouseEnter={() => handleStarHover(q.key, val)}
                        onMouseLeave={() => handleStarHover(q.key, 0)}
                        className="p-1 focus:outline-none transition-transform duration-200 hover:scale-125"
                      >
                        <span className={`material-symbols-outlined text-3xl transition-colors duration-200 ${
                          val <= activeStars 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-gray-200'
                        }`}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Comments Free Field */}
          {event?.satisfaction_show_comments_option !== false && (
            <div className="pt-2 border-t border-gray-100">
              <label className="text-sm font-bold text-gray-800 mb-1.5 block">
                {event?.satisfaction_comments_label || 'Comentarios y sugerencias libres'}
              </label>
              <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                {event?.satisfaction_comments_desc || '¿Hay algo que te gustaría destacar o algún punto que consideres que deberíamos ajustar para la próxima?'}
              </p>
              <textarea
                className="form-input w-full min-h-[100px] py-3 text-sm resize-y"
                placeholder="Escribe tus comentarios aquí..."
                value={comments}
                onChange={e => setComments(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center !py-3 font-bold text-sm tracking-wide shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando encuesta...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  Enviar Encuesta de Satisfacción
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
