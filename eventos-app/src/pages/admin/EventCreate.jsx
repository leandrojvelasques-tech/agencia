import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'

const STEPS = ['Información', 'Fecha y Agenda', 'Inscripción', 'Materiales']

export default function EventCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEventById, createEvent, updateEvent } = useStore()
  const [existingEvent, setExistingEvent] = useState(null)
  const [loading, setLoading] = useState(id ? true : false)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    type: 'charla',
    title: '',
    subtitle: '',
    description_short: '',
    description_extended: '',
    coordinator: 'Leandro Velasques',
    organizer: '',
    event_date: '',
    start_time: '',
    duration_minutes: 120,
    agenda: [{ time: '', topic: '' }],
    registration_mode: 'both',
    max_capacity: '',
    banner_url: '',
  })
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (id) {
      async function loadEvent() {
        setLoading(true)
        const data = await getEventById(id)
        if (data) {
          setExistingEvent(data)
          setForm({
            ...data,
            max_capacity: data.max_capacity || '',
          })
        }
        setLoading(false)
      }
      loadEvent()
    }
  }, [id])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addAgendaItem = () => setForm(prev => ({ ...prev, agenda: [...prev.agenda, { time: '', topic: '' }] }))
  const removeAgendaItem = (i) => setForm(prev => ({ ...prev, agenda: prev.agenda.filter((_, idx) => idx !== i) }))
  const updateAgenda = (i, field, value) => {
    setForm(prev => ({
      ...prev,
      agenda: prev.agenda.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    }))
  }

  const handleSave = async () => {
    setSaveError('')
    const data = { ...form, max_capacity: form.max_capacity ? Number(form.max_capacity) : null }
    setLoading(true)
    if (existingEvent) {
      await updateEvent(existingEvent.id, data)
      navigate(`/admin/eventos/${existingEvent.id}`)
    } else {
      const newEvent = await createEvent(data)
      if (newEvent) {
        navigate(`/admin/eventos/${newEvent.id}`)
      } else {
        setSaveError('Error en base de datos. Si no ejecutaste el archivo supabase-schema.sql, el evento no puede crearse.')
      }
    }
    setLoading(false)
  }


  const isStepValid = () => {
    if (step === 0) return form.title && form.description_short && form.coordinator
    if (step === 1) return form.event_date && form.start_time && form.duration_minutes
    return true
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">
        {existingEvent ? 'Editar Evento' : 'Nuevo Evento'}
      </h1>
      <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mb-8">
        {existingEvent ? 'Modificá los datos del evento' : 'Completá la información para crear un nuevo evento'}
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              i === step
                ? 'bg-[var(--color-deep-green)] text-white shadow-[var(--shadow-premium)]'
                : i < step
                  ? 'bg-[var(--color-light-green)]/30 text-[var(--color-deep-green)]'
                  : 'bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)]/40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="card p-6 lg:p-8 animate-fade-in" key={step}>
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Tipo de evento *</label>
              <div className="flex gap-3">
                {['charla', 'taller'].map(t => (
                  <button key={t} onClick={() => update('type', t)}
                    className={`flex-1 py-3 rounded-[var(--radius-premium)] text-sm font-bold border-2 transition-all ${
                      form.type === t
                        ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)] text-white'
                        : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)] hover:border-[var(--color-deep-green)]/30'
                    }`}>
                    {t === 'charla' ? '🎤 Charla' : '🛠 Taller'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Nombre del evento *</label>
              <input className="form-input" placeholder="Ej: Inteligencia Artificial para Profesionales" value={form.title} onChange={e => update('title', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Subtítulo <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>
              <input className="form-input" placeholder="Ej: Taller práctico con herramientas reales" value={form.subtitle} onChange={e => update('subtitle', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Descripción breve *</label>
              <textarea className="form-input min-h-[100px]" placeholder="Descripción clara del evento (máx. 300 caracteres)" value={form.description_short} onChange={e => update('description_short', e.target.value)} maxLength={300} />
              <p className="text-xs text-[var(--color-dark-gray)]/30 mt-1 text-right">{form.description_short.length}/300</p>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Descripción extendida <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>
              <textarea className="form-input min-h-[120px]" placeholder="Detalle completo del evento" value={form.description_extended} onChange={e => update('description_extended', e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Coordinador *</label>
                <input className="form-input" value={form.coordinator} onChange={e => update('coordinator', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Organizador / Institución</label>
                <input className="form-input" placeholder="Ej: UTN Trelew" value={form.organizer} onChange={e => update('organizer', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Fecha *</label>
                <input type="date" className="form-input" value={form.event_date} onChange={e => update('event_date', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Hora de inicio *</label>
                <input type="time" className="form-input" value={form.start_time} onChange={e => update('start_time', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Duración (min) *</label>
                <input type="number" className="form-input" value={form.duration_minutes} onChange={e => update('duration_minutes', Number(e.target.value))} min={15} step={15} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">Agenda / Programa</label>
                <button onClick={addAgendaItem} className="btn-ghost text-xs !text-[var(--color-deep-green)]">
                  <span className="material-symbols-outlined text-base">add</span> Agregar ítem
                </button>
              </div>
              <div className="space-y-2">
                {form.agenda.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="time" className="form-input !w-28 !py-2.5 text-sm" value={item.time} onChange={e => updateAgenda(i, 'time', e.target.value)} />
                    <input className="form-input !py-2.5 text-sm flex-1" placeholder="Tema o actividad" value={item.topic} onChange={e => updateAgenda(i, 'topic', e.target.value)} />
                    {form.agenda.length > 1 && (
                      <button onClick={() => removeAgendaItem(i)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Modalidad de inscripción *</label>
              <div className="space-y-2">
                {[
                  { value: 'manual', label: 'Solo carga manual', desc: 'Solo el admin carga participantes' },
                  { value: 'self', label: 'Solo autoinscripción', desc: 'Participantes se inscriben por link privado' },
                  { value: 'both', label: 'Ambas modalidades', desc: 'Autoinscripción + carga manual' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-[var(--radius-premium)] border-2 cursor-pointer transition-all ${
                    form.registration_mode === opt.value
                      ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5'
                      : 'border-[var(--color-deep-green)]/8 hover:border-[var(--color-deep-green)]/20'
                  }`}>
                    <input type="radio" name="reg_mode" value={opt.value} checked={form.registration_mode === opt.value} onChange={e => update('registration_mode', e.target.value)} className="mt-1 accent-[var(--color-deep-green)]" />
                    <div>
                      <p className="text-sm font-bold text-[var(--color-dark-gray)]">{opt.label}</p>
                      <p className="text-xs text-[var(--color-dark-gray)]/50 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Capacidad máxima <span className="normal-case text-[var(--color-dark-gray)]/30">(dejar vacío = sin límite)</span></label>
              <input type="number" className="form-input !w-40" placeholder="Ej: 40" value={form.max_capacity} onChange={e => update('max_capacity', e.target.value)} min={1} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">URL del banner <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>
              <input className="form-input" placeholder="https://..." value={form.banner_url} onChange={e => update('banner_url', e.target.value)} />
              <p className="text-xs text-[var(--color-dark-gray)]/30 mt-1">En MVP, pegá la URL de una imagen. Más adelante podrás subir directamente.</p>
            </div>
            <div className="p-6 border-2 border-dashed border-[var(--color-deep-green)]/15 rounded-[var(--radius-card)] text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/20 mb-2 block">upload_file</span>
              <p className="text-sm font-semibold text-[var(--color-dark-gray)]/40">Carga de materiales (PDF, PPT, links)</p>
              <p className="text-xs text-[var(--color-dark-gray)]/30 mt-1">Disponible en v1.1 con Supabase Storage</p>
            </div>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-4 bg-red-50 text-red-600 font-medium rounded-xl text-sm mt-6 border border-red-100">
          {saveError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/admin/eventos')} className="btn-ghost">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary" disabled={!isStepValid()}>
            Siguiente
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        ) : (
          <button onClick={handleSave} className="btn-primary" disabled={!form.title || !form.event_date}>
            <span className="material-symbols-outlined text-lg">save</span>
            {existingEvent ? 'Guardar cambios' : 'Crear evento'}
          </button>
        )}
      </div>
    </div>
  )
}
