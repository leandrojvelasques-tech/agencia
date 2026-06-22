import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function EventRegister() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { getEventBySlug, selfRegister } = useStore()
  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [counts, setCounts] = useState({ presencial: 0, virtual: 0 })

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', attendance_mode: 'presencial' })
  const [survey, setSurvey] = useState({
    matriculado: '',
    consejo: '',
    profesion: '',
    profesion_estudiante_carrera: '',
    profesion_estudiante_univ: '',
    profesion_otro: '',
    empleo: '',
    empleo_empresa: '',
    empleo_actividad: '',
    empleo_otro: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmailWarning, setShowEmailWarning] = useState(false)

  useEffect(() => {
    async function loadEvent() {
      setLoadingEvent(true)
      const data = await getEventBySlug(slug)
      setEvent(data)
      if (data) {
        // Fetch current registration counts for both modalities
        const { data: regs } = await supabase
          .from('registrations')
          .select('attendance_mode')
          .eq('event_id', data.id)
          .neq('status', 'cancelled')
        
        const pCount = regs?.filter(r => r.attendance_mode === 'presencial').length || 0
        const vCount = regs?.filter(r => r.attendance_mode === 'virtual').length || 0
        setCounts({ presencial: pCount, virtual: vCount })
      }
      setLoadingEvent(false)
    }
    loadEvent()
  }, [slug])

  const isPresencialFull = event && event.max_capacity_presencial !== null && event.max_capacity_presencial !== undefined && event.max_capacity_presencial !== '' && counts.presencial >= Number(event.max_capacity_presencial)
  const isVirtualFull = event && event.max_capacity_virtual !== null && event.max_capacity_virtual !== undefined && event.max_capacity_virtual !== '' && counts.virtual >= Number(event.max_capacity_virtual)

  // Set default attendance mode based on availability
  useEffect(() => {
    if (event) {
      if (isPresencialFull && !isVirtualFull) {
        setForm(p => ({ ...p, attendance_mode: 'virtual' }))
      } else {
        setForm(p => ({ ...p, attendance_mode: 'presencial' }))
      }
    }
  }, [event, isPresencialFull, isVirtualFull])

  if (loadingEvent) {
    return <div className="min-h-screen flex items-center justify-center p-4">Cargando...</div>
  }

  if (!event || event.status !== 'published') {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-[var(--color-dark-gray)]/20 mb-4 block">event_busy</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Inscripción no disponible</h1>
          <p className="text-[var(--color-dark-gray)]/60">Este evento no acepta inscripciones en este momento.</p>
        </div>
      </div>
    )
  }

  // Check if both quotas are full
  if (isPresencialFull && isVirtualFull) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">event_busy</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Cupos agotados</h1>
          <p className="text-[var(--color-dark-gray)]/60 text-sm leading-relaxed">
            Disculpas, los cupos para este evento (tanto presencial como virtual) están totalmente completos.
          </p>
          <Link to={`/evento/${slug}`} className="btn-primary mt-6 inline-flex w-full justify-center">
            Volver al evento
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.first_name || !form.last_name) {
      setError('Nombre y apellido son obligatorios')
      return
    }

    // Show email warning if no email
    if (!form.email && !showEmailWarning) {
      setShowEmailWarning(true)
      return
    }

    setLoading(true)
    
    const result = await selfRegister(slug, {
      ...form,
      survey_responses: event.has_survey ? survey : null
    })
    if (result.success) {
      navigate(`/evento/${slug}/confirmacion`)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)]">
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 flex items-center h-16">
          <Link to={`/evento/${slug}`} className="flex items-center gap-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span className="text-sm font-semibold">Volver al evento</span>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 lg:py-12 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">Inscripción</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 lg:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Nombre *</label>
              <input className="form-input" placeholder="Tu nombre" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} required autoFocus />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Apellido *</label>
              <input className="form-input" placeholder="Tu apellido" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} required />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
              Email <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional pero recomendado)</span>
            </label>
            <input type="email" className="form-input" placeholder="tu@email.com" value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setShowEmailWarning(false) }} />
          </div>

          {/* Email Warning */}
          {showEmailWarning && !form.email && (
            <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-premium)] p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-xl text-amber-600 mt-0.5">warning</span>
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-1">¿Continuar sin email?</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Sin email <strong>no recibirás</strong>: confirmación de inscripción, materiales del evento, ni minuta posterior.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button type="submit" className="btn-primary !py-2 !px-4 !text-xs !bg-amber-600">
                      Continuar sin email
                    </button>
                    <button type="button" onClick={() => setShowEmailWarning(false)} className="btn-ghost !py-2 !px-4 !text-xs">
                      Agregar email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
              Teléfono <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span>
            </label>
            <input type="tel" className="form-input" placeholder="+54 9 ..." value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>

          {/* Attendance Mode Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Modalidad de Asistencia *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isPresencialFull}
                onClick={() => setForm(p => ({ ...p, attendance_mode: 'presencial' }))}
                className={`p-3 rounded-[var(--radius-premium)] text-center border-2 transition-all flex flex-col items-center justify-center ${
                  form.attendance_mode === 'presencial'
                    ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)] font-bold'
                    : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)]'
                } ${isPresencialFull ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200' : 'cursor-pointer hover:border-[var(--color-deep-green)]/30'}`}
              >
                <span className="text-sm font-bold">🏫 Presencial</span>
                {event.max_capacity_presencial && (
                  <span className="text-[10px] opacity-60 font-medium mt-1">
                    {isPresencialFull ? 'Agotado' : `${counts.presencial} / ${event.max_capacity_presencial} lugares`}
                  </span>
                )}
              </button>
              <button
                type="button"
                disabled={isVirtualFull}
                onClick={() => setForm(p => ({ ...p, attendance_mode: 'virtual' }))}
                className={`p-3 rounded-[var(--radius-premium)] text-center border-2 transition-all flex flex-col items-center justify-center ${
                  form.attendance_mode === 'virtual'
                    ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)] font-bold'
                    : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)]'
                } ${isVirtualFull ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200' : 'cursor-pointer hover:border-[var(--color-deep-green)]/30'}`}
              >
                <span className="text-sm font-bold">💻 Virtual</span>
                {event.max_capacity_virtual && (
                  <span className="text-[10px] opacity-60 font-medium mt-1">
                    {isVirtualFull ? 'Agotado' : `${counts.virtual} / ${event.max_capacity_virtual} lugares`}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Encuesta Perfil Profesional (Opcional) */}
          {event.has_survey && (
            <div className="border-t border-[var(--color-deep-green)]/8 pt-5 mt-5 space-y-4">
              <h3 className="text-sm font-bold text-[var(--color-deep-green)] flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-lg">fact_check</span>
                Información Adicional (Opcional)
              </h3>

              {/* Matriculado */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Matriculado</label>
                <select 
                  className="form-input text-sm" 
                  value={survey.matriculado} 
                  onChange={e => setSurvey(s => ({ ...s, matriculado: e.target.value, consejo: e.target.value === 'Matriculado' ? s.consejo : '' }))}
                >
                  <option value="">Seleccione una opción</option>
                  <option value="Matriculado">Matriculado / a</option>
                  <option value="No matriculado">No matriculado / a</option>
                </select>
              </div>

              {survey.matriculado === 'Matriculado' && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Indique el consejo donde está matriculado</label>
                  <input 
                    type="text" 
                    className="form-input text-sm" 
                    placeholder="Ej: CPCECABA" 
                    value={survey.consejo} 
                    onChange={e => setSurvey(s => ({ ...s, consejo: e.target.value }))} 
                  />
                </div>
              )}

              {/* Profesión */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Profesión</label>
                <select 
                  className="form-input text-sm" 
                  value={survey.profesion} 
                  onChange={e => setSurvey(s => ({ 
                    ...s, 
                    profesion: e.target.value,
                    profesion_estudiante_carrera: e.target.value === 'Estudiante Universitario' ? s.profesion_estudiante_carrera : '',
                    profesion_estudiante_univ: e.target.value === 'Estudiante Universitario' ? s.profesion_estudiante_univ : '',
                    profesion_otro: e.target.value === 'Otro' ? s.profesion_otro : ''
                  }))}
                >
                  <option value="">Seleccione su profesión</option>
                  <option value="Contador Publico">Contador Público</option>
                  <option value="Licenciado en Administración">Licenciado en Administración</option>
                  <option value="Licenciado en Economia">Licenciado en Economía</option>
                  <option value="Estudiante Universitario">Estudiante Universitario</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {survey.profesion === 'Estudiante Universitario' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Carrera</label>
                    <input 
                      type="text" 
                      className="form-input text-sm" 
                      placeholder="Ej: Lic. en Administración" 
                      value={survey.profesion_estudiante_carrera} 
                      onChange={e => setSurvey(s => ({ ...s, profesion_estudiante_carrera: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Universidad</label>
                    <input 
                      type="text" 
                      className="form-input text-sm" 
                      placeholder="Ej: UBA" 
                      value={survey.profesion_estudiante_univ} 
                      onChange={e => setSurvey(s => ({ ...s, profesion_estudiante_univ: e.target.value }))} 
                    />
                  </div>
                </div>
              )}

              {survey.profesion === 'Otro' && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Especifique su profesión</label>
                  <input 
                    type="text" 
                    className="form-input text-sm" 
                    placeholder="Indique profesión o actividad" 
                    value={survey.profesion_otro} 
                    onChange={e => setSurvey(s => ({ ...s, profesion_otro: e.target.value }))} 
                  />
                </div>
              )}

              {/* Empleo Actual */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Empleo Actual</label>
                <select 
                  className="form-input text-sm" 
                  value={survey.empleo} 
                  onChange={e => setSurvey(s => ({ 
                    ...s, 
                    empleo: e.target.value,
                    empleo_empresa: e.target.value === 'Dependiente' ? s.empleo_empresa : '',
                    empleo_actividad: e.target.value === 'Independiente' ? s.empleo_actividad : '',
                    empleo_otro: e.target.value === 'Otro' ? s.empleo_otro : ''
                  }))}
                >
                  <option value="">Seleccione su situación laboral</option>
                  <option value="Dependiente">Dependiente</option>
                  <option value="Independiente">Independiente</option>
                  <option value="Desempleado">Desempleado</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {survey.empleo === 'Dependiente' && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Indique empresa</label>
                  <input 
                    type="text" 
                    className="form-input text-sm" 
                    placeholder="Nombre de la empresa" 
                    value={survey.empleo_empresa} 
                    onChange={e => setSurvey(s => ({ ...s, empleo_empresa: e.target.value }))} 
                  />
                </div>
              )}

              {survey.empleo === 'Independiente' && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Describa su actividad</label>
                  <input 
                    type="text" 
                    className="form-input text-sm" 
                    placeholder="Ej: Asesor, Consultor, etc." 
                    value={survey.empleo_actividad} 
                    onChange={e => setSurvey(s => ({ ...s, empleo_actividad: e.target.value }))} 
                  />
                </div>
              )}

              {survey.empleo === 'Otro' && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Describa su situación</label>
                  <input 
                    type="text" 
                    className="form-input text-sm" 
                    placeholder="Especifique su situación laboral" 
                    value={survey.empleo_otro} 
                    onChange={e => setSurvey(s => ({ ...s, empleo_otro: e.target.value }))} 
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-[var(--radius-premium)] animate-fade-in">
              {error}
            </div>
          )}

          {!showEmailWarning && (
            <button type="submit" className="btn-primary w-full !py-4 !text-base cursor-pointer" disabled={loading}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Procesando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                  Confirmar inscripción
                </>
              )}
            </button>
          )}
        </form>
      </main>
    </div>
  )
}
