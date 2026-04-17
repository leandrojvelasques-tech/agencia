import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

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
    is_public: true,
  })
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const handleBannerUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo no puede superar los 5 MB')
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `banner-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName)
      update('banner_url', publicUrl)
    } catch (err) {
      setUploadError('Error al subir la imagen: ' + (err.message || err))
    } finally {
      setUploading(false)
    }
  }

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
            is_public: data.is_public !== false, // default true if undefined
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
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Visibilidad en la web *</label>
              <div className="flex gap-3">
                {[
                  { value: true, label: '🌍 Público', desc: 'Se muestra en el Home' },
                  { value: false, label: '🔒 Privado', desc: 'Solo acceso por link' },
                ].map(opt => (
                  <button key={opt.value.toString()} onClick={() => update('is_public', opt.value)}
                    className={`flex-1 p-3 rounded-[var(--radius-premium)] text-left border-2 transition-all ${
                      form.is_public === opt.value
                        ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5'
                        : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)]'
                    }`}>
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="text-[10px] opacity-60 font-medium">{opt.desc}</p>
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
          <div className="space-y-6">
            {/* Banner Upload */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Banner del evento <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>

              {/* Preview */}
              {form.banner_url && (
                <div className="relative mb-4 rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-deep-green)]/10 group">
                  <img src={form.banner_url} alt="Banner preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => update('banner_url', '')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Quitar banner"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-[var(--radius-card)] p-8 text-center transition-all cursor-pointer hover:border-[var(--color-deep-green)]/40 hover:bg-[var(--color-deep-green)]/2 ${
                  uploading ? 'border-[var(--color-deep-green)]/30 opacity-70' : 'border-[var(--color-deep-green)]/15'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBannerUpload(f) }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files[0]; if (f) handleBannerUpload(f) }}
                />
                {uploading ? (
                  <>
                    <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/40 mb-2 block animate-spin">progress_activity</span>
                    <p className="text-sm font-semibold text-[var(--color-dark-gray)]/50">Subiendo imagen...</p>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/20 mb-2 block">add_photo_alternate</span>
                    <p className="text-sm font-semibold text-[var(--color-dark-gray)]/50">Arrastrá una imagen o hacé click para seleccionar</p>
                    <p className="text-xs text-[var(--color-dark-gray)]/30 mt-1">JPG, PNG, WEBP · Máx. 5 MB · Recomendado: 1200×628 px</p>
                  </>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-red-500 font-semibold mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span> {uploadError}
                </p>
              )}

              {/* Fallback URL */}
              <div className="mt-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">O pegá una URL de imagen</label>
                <input
                  className="form-input text-sm"
                  placeholder="https://..."
                  value={form.banner_url}
                  onChange={(e) => update('banner_url', e.target.value)}
                />
              </div>
            </div>

            {/* Materials placeholder */}
            <div className="p-5 border border-[var(--color-deep-green)]/8 rounded-[var(--radius-card)] bg-[var(--color-refined-gray)]/40">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-[var(--color-dark-gray)]/20">folder_open</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-dark-gray)]/40">Materiales del evento (PDF, PPT, links)</p>
                  <p className="text-xs text-[var(--color-dark-gray)]/25 mt-0.5">Disponible en v1.1</p>
                </div>
              </div>
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
