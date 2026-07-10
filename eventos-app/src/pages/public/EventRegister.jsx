import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function EventRegister() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { getEventBySlug, selfRegister } = useStore()
  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [regs, setRegs] = useState([])

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', telegram: '', attendance_mode: 'presencial', selected_date: '' })
  const [survey, setSurvey] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmailWarning, setShowEmailWarning] = useState(false)
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const getPricingCategory = (selectedProfession, surveyData) => {
    if (!selectedProfession) return null;
    const lower = selectedProfession.toLowerCase();
    
    // Custom prices mode
    if (event && event.prices && event.prices.length > 0) {
      const isMatriculado = lower.includes('matriculado') && !lower.includes('no matriculado');
      
      if (isMatriculado && (lower.includes('chubut') || lower.includes('cpcech') || lower.includes('cpcech.'))) {
        return 'matriculado_chubut';
      }

      if (isMatriculado && (lower.includes('otro') || lower.includes('otros') || (!lower.includes('chubut') && !lower.includes('cpcech')))) {
        return 'matriculado_otro';
      }
      
      const matchedPrice = event.prices.find(p => p.concept === selectedProfession);
      const isFreePrice = matchedPrice && (
        matchedPrice.price.toLowerCase().includes('sin cargo') || 
        matchedPrice.price.toLowerCase().includes('gratis') || 
        matchedPrice.price.toLowerCase() === '0' ||
        matchedPrice.price.toLowerCase() === '$0'
      );
      
      if (lower.includes('estudiante') || lower.includes('cs ec') || lower.includes('ciencias econ') || isFreePrice) {
        return 'free_student';
      }
      
      return 'paid_external';
    }
    
    // Fallback mode (old default options)
    if (selectedProfession === 'Profesional de Ciencias Económicas') {
      if (surveyData?.esta_matriculado === 'Sí' && (surveyData?.consejo || 'Chubut') === 'Chubut') {
        return 'matriculado_chubut';
      }
      if (surveyData?.esta_matriculado === 'Sí' && surveyData?.consejo && surveyData?.consejo !== 'Chubut') {
        return 'matriculado_otro';
      }
      return 'free_student';
    }
    if (selectedProfession === 'Estudiante Universitario') {
      return 'free_student';
    }
    return 'paid_external'; // "Otro"
  }

  const requiresPayment = (selectedProfession) => {
    if (!selectedProfession) return false;
    
    if (event && event.prices && event.prices.length > 0) {
      const matchedPrice = event.prices.find(p => p.concept === selectedProfession);
      if (matchedPrice) {
        const pLower = matchedPrice.price.toLowerCase();
        const isFree = pLower.includes('sin cargo') || pLower.includes('gratis') || pLower === '0' || pLower === '$0';
        return !isFree;
      }
    }
    
    const cat = getPricingCategory(selectedProfession, survey);
    return cat === 'paid_external';
  };

  useEffect(() => {
    async function loadEvent() {
      setLoadingEvent(true)
      const data = await getEventBySlug(slug)
      setEvent(data)
      if (data) {
        // Fetch current registration counts
        const { data: regsData } = await supabase
          .from('registrations')
          .select('attendance_mode, selected_date')
          .eq('event_id', data.id)
          .neq('status', 'cancelled')
        
        setRegs(regsData || [])
        
        const dates = data.offered_dates && data.offered_dates.length > 0 ? data.offered_dates : [data.event_date]
        setForm(p => ({ ...p, selected_date: dates[0] }))
      }
      setLoadingEvent(false)
    }
    loadEvent()
  }, [slug])

  const hasPresencial = event && event.max_capacity_presencial !== 0 && event.max_capacity_presencial !== '0' && event.max_capacity_presencial !== 0.0
  const hasVirtual = event && event.max_capacity_virtual !== 0 && event.max_capacity_virtual !== '0' && event.max_capacity_virtual !== 0.0

  const isDatePresencialFull = (date) => {
    if (!hasPresencial) return true;
    if (!event || event.max_capacity_presencial === null || event.max_capacity_presencial === undefined || event.max_capacity_presencial === '') return false;
    const count = regs.filter(r => r.attendance_mode === 'presencial' && (r.selected_date === date || (!r.selected_date && date === event.event_date))).length;
    return count >= Number(event.max_capacity_presencial);
  }

  const isDateVirtualFull = (date) => {
    if (!hasVirtual) return true;
    if (!event || event.max_capacity_virtual === null || event.max_capacity_virtual === undefined || event.max_capacity_virtual === '') return false;
    const count = regs.filter(r => r.attendance_mode === 'virtual' && (r.selected_date === date || (!r.selected_date && date === event.event_date))).length;
    return count >= Number(event.max_capacity_virtual);
  }

  const isPresencialFull = isDatePresencialFull(form.selected_date)
  const isVirtualFull = isDateVirtualFull(form.selected_date)

  const availableDates = event && event.offered_dates && event.offered_dates.length > 0 ? event.offered_dates : (event ? [event.event_date] : [])

  // Set default attendance mode based on availability and configured modalities
  useEffect(() => {
    if (event && form.selected_date) {
      const pFull = isDatePresencialFull(form.selected_date)
      const vFull = isDateVirtualFull(form.selected_date)
      
      if (hasPresencial && hasVirtual) {
        if (pFull && !vFull) {
          setForm(p => ({ ...p, attendance_mode: 'virtual' }))
        } else if (!pFull && vFull) {
          setForm(p => ({ ...p, attendance_mode: 'presencial' }))
        } else {
          if (form.attendance_mode !== 'presencial' && form.attendance_mode !== 'virtual') {
            setForm(p => ({ ...p, attendance_mode: 'presencial' }))
          }
        }
      } else if (hasPresencial) {
        setForm(p => ({ ...p, attendance_mode: 'presencial' }))
      } else if (hasVirtual) {
        setForm(p => ({ ...p, attendance_mode: 'virtual' }))
      }
    }
  }, [event, form.selected_date, regs, hasPresencial, hasVirtual])

  if (loadingEvent) {
    return <div className="min-h-screen flex items-center justify-center p-4">Cargando...</div>
  }

  const cat = getPricingCategory(survey.profesion, survey)

  const searchParams = new URLSearchParams(window.location.search)
  const isPreview = searchParams.get('preview') === 'true'

  const latestDateStr = event ? availableDates.reduce((latest, current) => current > latest ? current : latest, event.event_date || '') : ''
  const eventDate = latestDateStr ? new Date(latestDateStr + 'T23:59:59') : new Date()
  const isPastEvent = event && eventDate < new Date()
  
  // Allow registration in preview mode even if status is not 'published'
  const canRegister = event && (event.status === 'published' || isPreview) && !isPastEvent && (event.registration_mode === 'self' || event.registration_mode === 'both')

  if (!event || !canRegister) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-[var(--color-dark-gray)]/20 mb-4 block">event_busy</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Inscripción no disponible</h1>
          <p className="text-[var(--color-dark-gray)]/60 text-sm leading-relaxed mb-6">
            Este evento no acepta inscripciones públicas en este momento.
          </p>
          <Link to={event ? `/evento/${slug}` : '/'} className="btn-primary inline-flex justify-center w-full">
            Volver al evento
          </Link>
        </div>
      </div>
    )
  }

  const allDatesFull = availableDates.length > 0 && availableDates.every(d => isDatePresencialFull(d) && isDateVirtualFull(d))

  // Check if all offered quotas are full across all dates
  if (allDatesFull) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">event_busy</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Cupos agotados</h1>
          <p className="text-[var(--color-dark-gray)]/60 text-sm leading-relaxed">
            Disculpas, los cupos para este evento están totalmente completos para todas las fechas.
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

    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.attendance_mode) {
      setError('Todos los campos marcados con (*) son obligatorios')
      return
    }

    if (!survey.profesion) {
      setError('El campo Profesión / Ocupación Actual es obligatorio')
      return
    }

    const cat = getPricingCategory(survey.profesion, survey);

    if (cat === 'matriculado_chubut') {
      if (!survey.delegacion) {
        setError('Debes seleccionar tu delegación de Chubut')
        return
      }
      if (!survey.matricula) {
        setError('Debes ingresar tu número de matrícula')
        return
      }
    } else if (cat === 'matriculado_otro') {
      if (!survey.consejo) {
        setError('Debes seleccionar tu Consejo Profesional')
        return
      }
      if (!survey.matricula) {
        setError('Debes ingresar tu número de matrícula')
        return
      }
    } else if (survey.profesion === 'Profesional de Ciencias Económicas') {
      if (!survey.profesion_carrera) {
        setError('Debes seleccionar tu carrera')
        return
      }
      if (!survey.esta_matriculado) {
        setError('Debes indicar si estás matriculado o no')
        return
      }
      if (survey.esta_matriculado === 'Sí') {
        const consejoSelected = survey.consejo || 'Chubut'
        if (consejoSelected === 'Chubut' && !survey.delegacion) {
          setError('Debes seleccionar tu delegación de Chubut')
          return
        }
        if (!survey.matricula) {
          setError('Debes ingresar tu número de matrícula')
          return
        }
      }
    } else if (survey.profesion === 'Estudiante Universitario') {
      if (!survey.profesion_estudiante_carrera) {
        setError('Debes ingresar tu carrera')
        return
      }
      if (!survey.profesion_estudiante_univ) {
        setError('Debes ingresar tu universidad')
        return
      }
    } else if (survey.profesion === 'Otro') {
      if (!survey.profesion_otro) {
        setError('Debes especificar tu profesión')
        return
      }
    }

    if (requiresPayment(survey.profesion)) {
      if (!paymentReceiptUrl) {
        setError('Debes adjuntar el comprobante de transferencia bancaria')
        return
      }
    }

    if (event.has_survey && event.survey_questions) {
      for (const q of event.survey_questions) {
        if (q.required && !survey[q.label]) {
          setError(`La pregunta "${q.label}" es obligatoria`)
          return
        }
      }
    }

    setLoading(true)
    
    const isChubutMat = cat === 'matriculado_chubut';
    const isOtroMat = cat === 'matriculado_otro';
    const surveyResponses = {
      profesion: survey.profesion,
      profesion_carrera: survey.profesion_carrera || null,
      esta_matriculado: (isChubutMat || isOtroMat) ? 'Sí' : (survey.esta_matriculado || null),
      matriculado: (isChubutMat || isOtroMat) ? 'Sí' : (survey.esta_matriculado || null),
      consejo: isChubutMat ? 'Chubut' : (isOtroMat ? (survey.consejo || null) : (survey.esta_matriculado === 'Sí' ? (survey.consejo || 'Chubut') : null)),
      delegacion: isChubutMat ? (survey.delegacion || 'Delegación Comodoro Rivadavia') : ((survey.esta_matriculado === 'Sí' && (survey.consejo || 'Chubut') === 'Chubut') ? (survey.delegacion || 'Delegación Comodoro Rivadavia') : null),
      matricula: (isChubutMat || isOtroMat) ? (survey.matricula || null) : (survey.esta_matriculado === 'Sí' ? (survey.matricula || null) : null),
      profesion_estudiante_carrera: survey.profesion_estudiante_carrera || null,
      profesion_estudiante_univ: survey.profesion_estudiante_univ || null,
      profesion_otro: survey.profesion_otro || null,
      ...survey // Merges any custom fields from dynamic survey
    }

    const result = await selfRegister(slug, {
      ...form,
      survey_responses: surveyResponses,
      payment_receipt_url: paymentReceiptUrl || null
    })
    if (result.success) {
      // Trigger the welcome email in the background
      try {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationId: result.registration.id,
            type: 'welcome'
          })
        }).catch(err => console.error('Error triggering welcome email:', err));
      } catch (err) {
        console.error('Error triggering welcome email:', err);
      }
      navigate(`/evento/${slug}/confirmacion`, { state: { selectedDate: form.selected_date } })
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
              Email *
            </label>
            <input type="email" className="form-input" placeholder="tu@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
              Teléfono *
            </label>
            <input type="tel" className="form-input" placeholder="+54 9 ..." value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
              Ciudad de residencia <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span>
            </label>
            <input className="form-input" placeholder="Ej: Comodoro Rivadavia" value={form.telegram || ''} onChange={e => setForm(p => ({ ...p, telegram: e.target.value }))} />
          </div>

          {/* Date Selector */}
          {availableDates.length > 1 && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Día de asistencia *</label>
              <div className="grid grid-cols-1 gap-2.5">
                {availableDates.map(dateStr => {
                  const parts = dateStr.split('-');
                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  const formatted = format(d, "EEEE d 'de' MMMM", { locale: es });
                  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                  
                  const pFull = isDatePresencialFull(dateStr);
                  const vFull = isDateVirtualFull(dateStr);
                  const isFullyBooked = pFull && vFull; // Both modalities full
                  const isCurrentModeFull = form.attendance_mode === 'presencial' ? pFull : vFull;
                  
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isFullyBooked}
                      onClick={() => setForm(p => ({ ...p, selected_date: dateStr }))}
                      className={`p-3.5 rounded-[var(--radius-premium)] text-left border-2 transition-all flex justify-between items-center ${
                        form.selected_date === dateStr
                          ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)] font-bold'
                          : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)]'
                      } ${isFullyBooked ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200' : 'cursor-pointer hover:border-[var(--color-deep-green)]/30'}`}
                    >
                      <span className="text-sm font-semibold">{capitalized}</span>
                      <span className="text-xs opacity-75 font-medium">
                        {isFullyBooked ? '🚫 Cupos agotados' : (isCurrentModeFull ? `🚫 Cupo agotado (${form.attendance_mode === 'presencial' ? '🏫' : '💻'})` : '✅ Disponible')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attendance Mode Selector */}
          {(hasPresencial || hasVirtual) && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Modalidad de Asistencia *</label>
              
              {isPresencialFull && !isVirtualFull && (
                <div className="mb-3 p-3 rounded-[var(--radius-premium)] bg-amber-50 border border-amber-250/20 text-xs font-bold text-[#92400e] flex items-center gap-1.5 animate-fade-in">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span>Actualmente solo disponible en modalidad virtual.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPresencialFull || !hasPresencial}
                  onClick={() => setForm(p => ({ ...p, attendance_mode: 'presencial' }))}
                  className={`p-3 rounded-[var(--radius-premium)] text-center border-2 transition-all flex flex-col items-center justify-center ${
                    form.attendance_mode === 'presencial'
                      ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)] font-bold'
                      : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)]'
                  } ${(isPresencialFull || !hasPresencial) ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200' : 'cursor-pointer hover:border-[var(--color-deep-green)]/30'}`}
                >
                  <span className="text-sm font-bold">🏫 Presencial</span>
                  {hasPresencial ? (
                    event.max_capacity_presencial && (
                      <span className="text-[10px] opacity-60 font-medium mt-1">
                        {isPresencialFull ? 'Agotado' : `${regs.filter(r => r.attendance_mode === 'presencial' && (r.selected_date === form.selected_date || (!r.selected_date && form.selected_date === event.event_date))).length} / ${event.max_capacity_presencial} lugares`}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] opacity-50 font-medium mt-1">No habilitado</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isVirtualFull || !hasVirtual}
                  onClick={() => setForm(p => ({ ...p, attendance_mode: 'virtual' }))}
                  className={`p-3 rounded-[var(--radius-premium)] text-center border-2 transition-all flex flex-col items-center justify-center ${
                    form.attendance_mode === 'virtual'
                      ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)] font-bold'
                      : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)]'
                  } ${(isVirtualFull || !hasVirtual) ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200' : 'cursor-pointer hover:border-[var(--color-deep-green)]/30'}`}
                >
                  <span className="text-sm font-bold">💻 Virtual</span>
                  {hasVirtual ? (
                    event.max_capacity_virtual && (
                      <span className="text-[10px] opacity-60 font-medium mt-1">
                        {isVirtualFull ? 'Agotado' : `${regs.filter(r => r.attendance_mode === 'virtual' && (r.selected_date === form.selected_date || (!r.selected_date && form.selected_date === event.event_date))).length} / ${event.max_capacity_virtual} lugares`}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] opacity-50 font-medium mt-1">No habilitado</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Sección de Profesión Obligatoria */}
          <div className="border-t border-[var(--color-deep-green)]/8 pt-5 mt-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                PROFESION / OCUPACION ACTUAL *
              </label>
              <select
                className="form-input text-sm"
                value={survey.profesion || ''}
                onChange={e => {
                  const val = e.target.value;
                  const tempCat = getPricingCategory(val, {});
                  setSurvey(s => ({
                    ...s,
                    profesion: val,
                    profesion_carrera: '',
                    esta_matriculado: (tempCat === 'matriculado_chubut' || val === 'Profesional de Ciencias Económicas') ? 'Sí' : 'No',
                    matriculado: (tempCat === 'matriculado_chubut' || val === 'Profesional de Ciencias Económicas') ? 'Sí' : 'No',
                    consejo: tempCat === 'matriculado_chubut' ? 'Chubut' : (val === 'Profesional de Ciencias Económicas' ? 'Chubut' : ''),
                    delegacion: tempCat === 'matriculado_chubut' ? 'Delegación Comodoro Rivadavia' : (val === 'Profesional de Ciencias Económicas' ? 'Delegación Comodoro Rivadavia' : ''),
                    matricula: '',
                    profesion_estudiante_carrera: '',
                    profesion_estudiante_univ: '',
                    profesion_otro: ''
                  }));
                }}
                required
              >
                <option value="">Selecciona tu profesión / ocupación</option>
                {event.prices && event.prices.length > 0 ? (
                  event.prices.map((p, idx) => (
                    <option key={idx} value={p.concept}>
                      {p.concept} {p.price ? `(${p.price})` : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Profesional de Ciencias Económicas">Profesional de Ciencias Económicas</option>
                    <option value="Estudiante Universitario">Estudiante Universitario</option>
                    <option value="Otro">Otra profesión / ocupación</option>
                  </>
                )}
              </select>
            </div>

            {(survey.profesion === 'Profesional de Ciencias Económicas' || cat === 'matriculado_chubut' || cat === 'matriculado_otro') && (
              <div className="space-y-4 p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5 animate-fade-in">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                        {cat === 'matriculado_chubut' || (survey.profesion && survey.profesion.toLowerCase().includes('matriculado')) ? 'Título *' : 'Carrera *'}
                      </label>
                      <select
                        className="form-input text-sm"
                        value={survey.profesion_carrera || ''}
                        onChange={e => setSurvey(s => ({ ...s, profesion_carrera: e.target.value }))}
                        required
                      >
                        <option value="">Selecciona carrera</option>
                        <option value="Contador Público">Contador Público</option>
                        <option value="Licenciado en Administración">Licenciado en Administración</option>
                        <option value="Licenciado en Economía">Licenciado en Economía</option>
                      </select>
                    </div>

                    {survey.profesion === 'Profesional de Ciencias Económicas' && (
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                          ¿Está matriculado? *
                        </label>
                        <select
                          className="form-input text-sm"
                          value={survey.esta_matriculado || ''}
                          onChange={e => setSurvey(s => ({ ...s, esta_matriculado: e.target.value, matriculado: '', consejo: '' }))}
                          required
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    )}

                    {/* Si no es chubut, mostramos consejo */}
                    {cat !== 'matriculado_chubut' && survey.esta_matriculado === 'Sí' && (
                      <div className="animate-fade-in mb-4">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                          Consejo Profesional *
                        </label>
                        <select
                          className="form-input text-sm"
                          value={survey.consejo || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSurvey(s => ({
                              ...s,
                              consejo: val,
                              // reset delegacion if not Chubut
                              delegacion: val === 'Chubut' ? (s.delegacion || 'Delegación Comodoro Rivadavia') : ''
                            }));
                          }}
                          required
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="Chubut">Chubut</option>
                          <option value="CABA">CABA</option>
                          <option value="Buenos Aires">Buenos Aires</option>
                          <option value="Catamarca">Catamarca</option>
                          <option value="Chaco">Chaco</option>
                          <option value="Córdoba">Córdoba</option>
                          <option value="Corrientes">Corrientes</option>
                          <option value="Entre Ríos">Entre Ríos</option>
                          <option value="Formosa">Formosa</option>
                          <option value="Jujuy">Jujuy</option>
                          <option value="La Pampa">La Pampa</option>
                          <option value="La Rioja">La Rioja</option>
                          <option value="Mendoza">Mendoza</option>
                          <option value="Misiones">Misiones</option>
                          <option value="Neuquén">Neuquén</option>
                          <option value="Río Negro">Río Negro</option>
                          <option value="Salta">Salta</option>
                          <option value="San Juan">San Juan</option>
                          <option value="San Luis">San Luis</option>
                          <option value="Santa Cruz">Santa Cruz</option>
                          <option value="Santa Fe">Santa Fe</option>
                          <option value="Santiago del Estero">Santiago del Estero</option>
                          <option value="Tierra del Fuego">Tierra del Fuego</option>
                          <option value="Tucumán">Tucumán</option>
                        </select>
                      </div>
                    )}

                    {/* Delegacion and Matricula logic */}
                    {(survey.esta_matriculado === 'Sí' || cat === 'matriculado_chubut') && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Sub-dropdown only if Chubut is selected */}
                        {(survey.consejo === 'Chubut' || cat === 'matriculado_chubut') && (
                          <div className="animate-fade-in">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                              Delegación de Chubut *
                            </label>
                            <select
                              className="form-input text-sm"
                              value={survey.delegacion || 'Delegación Comodoro Rivadavia'}
                              onChange={e => setSurvey(s => ({ ...s, delegacion: e.target.value }))}
                              required
                            >
                              <option value="Delegación Comodoro Rivadavia">Delegación Comodoro Rivadavia</option>
                              <option value="Delegación Esquel">Delegación Esquel</option>
                              <option value="Delegación Trelew">Delegación Trelew</option>
                              <option value="Delegación Rawson">Delegación Rawson</option>
                              <option value="Delegación Puerto Madryn">Delegación Puerto Madryn</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                            Número de Matrícula *
                          </label>
                          <input
                            type="text"
                            className="form-input text-sm"
                            placeholder="Ingresa tu número de matrícula..."
                            value={survey.matricula || ''}
                            onChange={e => setSurvey(s => ({ ...s, matricula: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                    )}
              </div>
            )}

            {(survey.profesion === 'Estudiante Universitario' || (cat === 'free_student' && survey.profesion && survey.profesion.toLowerCase().includes('estudiante'))) && (
              <div className="space-y-4 p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5 animate-fade-in">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                    Carrera *
                  </label>
                  <input
                    className="form-input text-sm"
                    placeholder="Escribe tu carrera..."
                    value={survey.profesion_estudiante_carrera || ''}
                    onChange={e => setSurvey(s => ({ ...s, profesion_estudiante_carrera: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                    Universidad *
                  </label>
                  <input
                    className="form-input text-sm"
                    placeholder="Escribe tu universidad..."
                    value={survey.profesion_estudiante_univ || ''}
                    onChange={e => setSurvey(s => ({ ...s, profesion_estudiante_univ: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            {survey.profesion === 'Otro' && (
              <div className="p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5 animate-fade-in">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                  Especifique su profesión *
                </label>
                <input
                  className="form-input text-sm"
                  placeholder="Escribe tu profesión..."
                  value={survey.profesion_otro || ''}
                  onChange={e => setSurvey(s => ({ ...s, profesion_otro: e.target.value }))}
                  required
                />
              </div>
            )}



            {/* Comprobante de Transferencia para Inscripciones Pagas */}
            {requiresPayment(survey.profesion) && (
              <div className="space-y-4">
                {event.payment_methods && (
                  <div className="p-4 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/10 animate-fade-in space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-deep-green)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">account_balance</span>
                      Medios de Pago / Datos de Transferencia
                    </h3>
                    <div className="bg-white/50 p-3 rounded-lg border border-[var(--color-deep-green)]/5 font-mono text-xs text-[var(--color-dark-gray)]/80 whitespace-pre-wrap leading-relaxed">
                      {event.payment_methods}
                    </div>
                  </div>
                )}
                
                <div className="p-4 rounded-[var(--radius-premium)] bg-amber-50/50 border border-amber-300/30 animate-fade-in space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                      Comprobante de Transferencia *
                    </label>
                    <p className="text-[10px] text-[var(--color-dark-gray)]/50 mb-2">
                      Adjuntá una foto o PDF del comprobante de transferencia para validar tu inscripción.
                    </p>
                  </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="payment-receipt-file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      setUploadingReceipt(true);
                      setError('');
                      try {
                        const ext = file.name.split('.').pop();
                        const fileName = `receipts/receipt-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                        
                        const { error: upErr } = await supabase.storage
                          .from('banners')
                          .upload(fileName, file, { upsert: true, contentType: file.type });
                          
                        if (upErr) throw upErr;
                        
                        const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
                        setPaymentReceiptUrl(publicUrl);
                      } catch (err) {
                        setError('Error al subir el comprobante: ' + (err.message || err));
                      } finally {
                        setUploadingReceipt(false);
                      }
                    }}
                  />
                  
                  <button
                    type="button"
                    onClick={() => document.getElementById('payment-receipt-file')?.click()}
                    className="btn-secondary !py-2 !px-3.5 !text-xs flex items-center gap-1.5 cursor-pointer"
                    disabled={uploadingReceipt}
                  >
                    <span className="material-symbols-outlined text-base">cloud_upload</span>
                    {uploadingReceipt ? 'Subiendo...' : 'Subir Comprobante'}
                  </button>
                  
                  {paymentReceiptUrl && (
                    <span className="text-[11px] text-[var(--color-deep-green)] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Archivo cargado con éxito
                    </span>
                  )}
                </div>
                
                {paymentReceiptUrl && (
                  <p className="text-[10px] text-[var(--color-dark-gray)]/40 break-all">
                    URL: <a href={paymentReceiptUrl} target="_blank" rel="noreferrer" className="underline">{paymentReceiptUrl}</a>
                  </p>
                )}
              </div>
              </div>
            )}
          </div>

          {/* Encuesta de Preguntas Personalizadas Adicionales */}
          {event.has_survey && event.survey_questions && event.survey_questions.length > 0 && (
            <div className="border-t border-[var(--color-deep-green)]/8 pt-5 mt-5 space-y-4">
              <h3 className="text-sm font-bold text-[var(--color-deep-green)] flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-lg">fact_check</span>
                Información Adicional (Opcional)
              </h3>

              {event.survey_questions.map((q, idx) => {
                const questionKey = q.label
                if (!questionKey) return null
                return (
                  <div key={q.id || idx} className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                      {q.label} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {q.type === 'select' ? (
                      <select
                        className="form-input text-sm"
                        value={survey[questionKey] || ''}
                        onChange={e => setSurvey(s => ({ ...s, [questionKey]: e.target.value }))}
                        required={q.required}
                      >
                        <option value="">Seleccione una opción</option>
                        {(q.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : q.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 cursor-pointer p-3 rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/10 bg-[var(--color-refined-gray)]/30 hover:bg-[var(--color-refined-gray)]/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!survey[questionKey]}
                          onChange={e => setSurvey(s => ({ ...s, [questionKey]: e.target.checked }))}
                          className="accent-[var(--color-deep-green)] rounded"
                          required={q.required}
                        />
                        <span className="text-xs font-bold text-[var(--color-dark-gray)]/85">Confirmar respuesta afirmativa</span>
                      </label>
                    ) : q.type === 'textarea' ? (
                      <textarea
                        className="form-input text-sm min-h-[90px]"
                        placeholder="Escribe tu respuesta..."
                        value={survey[questionKey] || ''}
                        onChange={e => setSurvey(s => ({ ...s, [questionKey]: e.target.value }))}
                        required={q.required}
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-input text-sm"
                        placeholder="Escribe tu respuesta..."
                        value={survey[questionKey] || ''}
                        onChange={e => setSurvey(s => ({ ...s, [questionKey]: e.target.value }))}
                        required={q.required}
                      />
                    )}
                  </div>
                )
              })}
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

        {event.contact_info && (
          <div className="mt-8 text-center bg-white border border-[var(--color-deep-green)]/10 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-deep-green)] mb-1">
              Consultas por Inscripciones
            </p>
            <p className="text-sm font-semibold text-[var(--color-dark-gray)]/85">
              {event.contact_info}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
