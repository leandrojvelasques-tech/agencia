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
    agenda: [{ time: '', block: '', topic: '' }],
    registration_mode: 'both',
    max_capacity_presencial: '',
    max_capacity_virtual: '',
    banner_url: '',
    is_public: true,
    show_on_home: false,
    live_link: '',
    event_materials: [],
    has_survey: false,
  })
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadingMaterialIndex, setUploadingMaterialIndex] = useState(null)
  const fileInputRef = useRef(null)

  const { saveMaterials } = useStore()

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
            max_capacity_presencial: data.max_capacity_presencial || '',
            max_capacity_virtual: data.max_capacity_virtual || '',
            is_public: data.status === 'published' || data.status === 'in_progress',
            show_on_home: data.show_on_home || false,
            live_link: data.live_link || '',
            event_materials: data.event_materials || [],
            has_survey: data.has_survey || false,
          })
        }
        setLoading(false)
      }
      loadEvent()
    }
  }, [id])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addAgendaItem = () => setForm(prev => ({ ...prev, agenda: [...prev.agenda, { time: '', block: '', topic: '' }] }))
  const removeAgendaItem = (i) => setForm(prev => ({ ...prev, agenda: prev.agenda.filter((_, idx) => idx !== i) }))
  const updateAgenda = (i, field, value) => {
    setForm(prev => ({
      ...prev,
      agenda: prev.agenda.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    }))
  }

  const addMaterial = () => setForm(prev => ({ ...prev, event_materials: [...prev.event_materials, { title: '', url: '', type: 'document' }] }))
  const removeMaterial = (i) => setForm(prev => ({ ...prev, event_materials: prev.event_materials.filter((_, idx) => idx !== i) }))
  const updateMaterial = (i, field, value) => {
    setForm(prev => ({
      ...prev,
      event_materials: prev.event_materials.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    }))
  }

  const handleMaterialFileUpload = async (i, file) => {
    if (!file) return
    setUploadingMaterialIndex(i)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `material-${Date.now()}-${i}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName)
      updateMaterial(i, 'url', publicUrl)
    } catch (err) {
      alert('Error al subir el archivo: ' + (err.message || err))
    } finally {
      setUploadingMaterialIndex(null)
    }
  }

  const handleSave = async (options = { redirect: true }) => {
    console.log('Iniciando guardado...', { options, form })
    setSaveError('')
    setSaved(false)
    
    // Separamos materiales y limpiamos datos para el update de la tabla 'events'
    // IMPORTANTE: Eliminamos campos que NO existen en la DB o son restringidos
    const { 
      event_materials, 
      id: _, 
      created_at: __, 
      updated_at: ___,
      event_stats: ____, 
      is_public,
      max_capacity, // ignore old property
      ...eventData 
    } = form
    
    const data = { 
      ...eventData, 
      status: is_public ? 'published' : 'draft',
      max_capacity_presencial: eventData.max_capacity_presencial ? Number(eventData.max_capacity_presencial) : null,
      max_capacity_virtual: eventData.max_capacity_virtual ? Number(eventData.max_capacity_virtual) : null
    }
    
    console.log('Datos preparados para enviar a Supabase:', data)
    
    setLoading(true)
    let targetEventId = id
    
    try {
      if (existingEvent) {
        console.log('Actualizando evento existente:', existingEvent.id)
        const updateResult = await updateEvent(existingEvent.id, data)
        
        if (updateResult && updateResult.success === false) {
          console.error('Error retornado por updateEvent:', updateResult.error)
          throw new Error('No se pudo actualizar el evento: ' + (updateResult.error?.message || 'Error desconocido'))
        }
        
        targetEventId = existingEvent.id
      } else {
        console.log('Creando nuevo evento...')
        const newEventResult = await createEvent(data)
        if (newEventResult && newEventResult.success) {
          targetEventId = newEventResult.data.id
          console.log('Nuevo evento creado con ID:', targetEventId)
        } else {
          const errMsg = newEventResult?.error?.message || newEventResult?.error?.details || 'Error desconocido';
          const code = newEventResult?.error?.code;
          if (code === '23505') {
             throw new Error('Ya existe un evento con este título. El título debe ser único para generar una URL única.');
          }
          throw new Error(`Error en base de datos: ${errMsg}`);
        }
      }

      // Guardar materiales
      if (targetEventId) {
        console.log('Guardando materiales para el evento:', targetEventId, event_materials)
        // Limpiamos los materiales de IDs previos para evitar conflictos al re-insertar
        const cleanMaterials = event_materials.map(({ id: mId, created_at: mcAt, ...m }) => m)
        const matResult = await saveMaterials(targetEventId, cleanMaterials)
        
        if (matResult && matResult.error) {
          console.error('Error guardando materiales:', matResult.error)
          throw new Error('El evento se guardó, pero hubo un problema con los materiales: ' + matResult.error.message)
        }
        
        if (options.redirect) {
          navigate(`/admin/eventos/${targetEventId}`)
        } else {
          console.log('Refrescando datos locales...')
          const updated = await getEventById(targetEventId)
          if (updated) {
            setExistingEvent(updated)
            setForm({
              ...updated,
              max_capacity_presencial: updated.max_capacity_presencial || '',
              max_capacity_virtual: updated.max_capacity_virtual || '',
              is_public: updated.status === 'published' || updated.status === 'in_progress',
              show_on_home: updated.show_on_home || false,
              live_link: updated.live_link || '',
              event_materials: updated.event_materials || [],
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
            console.log('Guardado completado y estado sincronizado.')
          }
        }
      }
    } catch (err) {
      console.error('Error en handleSave:', err)
      setSaveError(err.message || 'Error desconocido al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    setSaveError('')
    if (!form.title || !form.event_date) {
      setSaveError('Para ver la vista previa, debés al menos ingresar un título y la fecha en las primeras etapas.')
      return
    }

    setLoading(true)
    
    const { 
      event_materials, 
      id: _, 
      created_at: __, 
      updated_at: ___,
      event_stats: ____, 
      is_public,
      max_capacity,
      ...eventData 
    } = form
    
    const data = { 
      ...eventData, 
      status: is_public ? 'published' : 'draft',
      max_capacity_presencial: eventData.max_capacity_presencial ? Number(eventData.max_capacity_presencial) : null,
      max_capacity_virtual: eventData.max_capacity_virtual ? Number(eventData.max_capacity_virtual) : null
    }

    let targetEventId = id
    try {
      let savedSlug = form.slug
      if (existingEvent) {
        await updateEvent(existingEvent.id, data)
        targetEventId = existingEvent.id
        savedSlug = existingEvent.slug
      } else {
        const newEventResult = await createEvent(data)
        if (newEventResult && newEventResult.success) {
          targetEventId = newEventResult.data.id
          savedSlug = newEventResult.data.slug
        } else {
          throw new Error(newEventResult?.error?.message || 'Error al guardar el evento para la vista previa')
        }
      }

      if (targetEventId) {
        const cleanMaterials = event_materials.map(({ id: mId, created_at: mcAt, ...m }) => m)
        await saveMaterials(targetEventId, cleanMaterials)
        
        const updated = await getEventById(targetEventId)
        if (updated) {
          setExistingEvent(updated)
          setForm({
            ...updated,
            max_capacity_presencial: updated.max_capacity_presencial || '',
            max_capacity_virtual: updated.max_capacity_virtual || '',
            is_public: updated.status === 'published' || updated.status === 'in_progress',
            show_on_home: updated.show_on_home || false,
            live_link: updated.live_link || '',
            event_materials: updated.event_materials || [],
            has_survey: updated.has_survey || false,
          })
          savedSlug = updated.slug
        }
      }

      if (savedSlug) {
        window.open(`/evento/${savedSlug}?preview=true`, '_blank')
      }
    } catch (err) {
      setSaveError('Error al guardar para vista previa: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    if (step === 0) return form.title && form.description_short && form.coordinator
    if (step === 1) return form.event_date && form.start_time && form.duration_minutes
    return true
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            {existingEvent ? 'Editar Evento' : 'Nuevo Evento'}
          </h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">
            {existingEvent ? 'Modificá los datos del evento' : 'Completá la información para crear un nuevo evento'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            className="btn-secondary !py-2.5 !px-5 shadow-lg shadow-[var(--color-dark-gray)]/5"
            disabled={loading || !form.title || !form.event_date}
            title="Guarda los cambios y abre una vista previa"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
            Vista Previa
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-[var(--color-deep-green)] font-bold text-sm animate-fade-in">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Guardado
            </span>
          )}
          {existingEvent && (
            <button 
              onClick={() => handleSave({ redirect: false })}
              className="btn-primary !py-2.5 !px-5 shadow-lg shadow-[var(--color-deep-green)]/20"
              disabled={loading || !form.title || !form.event_date}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Guardar ahora
                </>
              )}
            </button>
          )}
        </div>
      </div>

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
                  <button key={opt.value.toString()} type="button" onClick={() => update('is_public', opt.value)}
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
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Destacar en Home (Para eventos finalizados)</label>
              <div class="flex gap-3">
                {[
                  { value: true, label: '⭐ Destacar', desc: 'Se muestra en el carrusel de Charlas y Talleres' },
                  { value: false, label: 'No destacar', desc: 'No se muestra en el carrusel' },
                ].map(opt => (
                  <button key={opt.value.toString()} type="button" onClick={() => update('show_on_home', opt.value)}
                    className={`flex-1 p-3 rounded-[var(--radius-premium)] text-left border-2 transition-all ${
                      form.show_on_home === opt.value
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

            {/* Banner Upload */}
            <div className="border-t border-[var(--color-deep-green)]/8 pt-5 mt-5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Banner del evento <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>

              {/* Preview */}
              {form.banner_url && (
                <div className="relative mb-4 rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-deep-green)]/10 group">
                  <img src={form.banner_url} alt="Banner preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
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
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Link de Transmisión / Google Meet <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>
              <input 
                className="form-input" 
                placeholder="Ej: https://meet.google.com/abc-defg-hij o link de YouTube Live" 
                value={form.live_link || ''} 
                onChange={e => update('live_link', e.target.value)} 
              />
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
                    <input className="form-input !py-2.5 text-sm !w-48" placeholder="Tema (Corto)" value={item.block || ''} onChange={e => updateAgenda(i, 'block', e.target.value)} />
                    <input className="form-input !py-2.5 text-sm flex-1" placeholder="Detalle (Largo)" value={item.topic} onChange={e => updateAgenda(i, 'topic', e.target.value)} />
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
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Capacidad Presencial <span className="normal-case text-[var(--color-dark-gray)]/30">(dejar vacío = sin límite)</span></label>
                <input type="number" className="form-input w-full" placeholder="Ej: 20" value={form.max_capacity_presencial} onChange={e => update('max_capacity_presencial', e.target.value)} min={1} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Capacidad Virtual <span className="normal-case text-[var(--color-dark-gray)]/30">(dejar vacío = sin límite)</span></label>
                <input type="number" className="form-input w-full" placeholder="Ej: 100" value={form.max_capacity_virtual} onChange={e => update('max_capacity_virtual', e.target.value)} min={1} />
              </div>
            </div>
            {/* Encuesta Opcional */}
            <div className="border-t border-[var(--color-deep-green)]/8 pt-5 mt-5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Encuesta para Participantes</label>
              <label className={`flex items-start gap-3 p-4 rounded-[var(--radius-premium)] border-2 cursor-pointer transition-all ${
                form.has_survey
                  ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5'
                  : 'border-[var(--color-deep-green)]/8 hover:border-[var(--color-deep-green)]/20'
              }`}>
                <input 
                  type="checkbox" 
                  checked={form.has_survey || false} 
                  onChange={e => update('has_survey', e.target.checked)} 
                  className="mt-1 accent-[var(--color-deep-green)] rounded" 
                />
                <div>
                  <p className="text-sm font-bold text-[var(--color-dark-gray)]">Activar Encuesta de Perfil Profesional</p>
                  <p className="text-xs text-[var(--color-dark-gray)]/50 mt-0.5">
                    Solicita a los participantes al registrarse responder sobre su matrícula, profesión y empleo actual (datos opcionales para conocer mejor a tu audiencia).
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* Materials List */}

            {/* Materials List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">Lista de Materiales</label>
                <button onClick={addMaterial} className="btn-ghost text-xs !text-[var(--color-deep-green)]">
                  <span className="material-symbols-outlined text-base">add</span> Agregar material
                </button>
              </div>

              {form.event_materials.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-[var(--color-deep-green)]/10 rounded-[var(--radius-card)]">
                  <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/10 mb-2 block">folder_open</span>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)]/30">No hay materiales cargados aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.event_materials.map((material, i) => (
                    <div key={i} className="p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/50 border border-[var(--color-deep-green)]/5 relative group">
                      <button 
                        onClick={() => removeMaterial(i)} 
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                      
                      <div className="grid sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Título</label>
                          <input 
                            className="form-input !py-2 text-xs" 
                            placeholder="Ej: Diapositivas de la charla" 
                            value={material.title} 
                            onChange={e => updateMaterial(i, 'title', e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Tipo</label>
                          <select 
                            className="form-input !py-2 text-xs" 
                            value={material.type} 
                            onChange={e => updateMaterial(i, 'type', e.target.value)}
                          >
                            <option value="presentation">🎬 Presentación</option>
                            <option value="document">📄 Documento / PDF</option>
                            <option value="link">🔗 Link Externo</option>
                            <option value="video">🎥 Video</option>
                            <option value="image">📸 Foto del evento</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">URL</label>
                          <input 
                            className="form-input !py-2 text-xs" 
                            placeholder="https://..." 
                            value={material.url} 
                            onChange={e => updateMaterial(i, 'url', e.target.value)} 
                          />
                        </div>
                        <div className="flex flex-col justify-end pt-5">
                          <input
                            type="file"
                            id={`material-file-${i}`}
                            className="hidden"
                            accept={material.type === 'image' ? 'image/*' : '*/*'}
                            onChange={(e) => { const f = e.target.files[0]; if (f) handleMaterialFileUpload(i, f) }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`material-file-${i}`)?.click()}
                            className="btn-secondary !py-2 !px-3 !text-xs whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                            disabled={uploadingMaterialIndex === i}
                          >
                            {uploadingMaterialIndex === i ? (
                              <>
                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">upload</span>
                                Subir archivo
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      {material.type === 'image' && material.url && (
                        <div className="mt-3 rounded-[var(--radius-premium)] overflow-hidden border border-[var(--color-deep-green)]/10 max-w-[200px]">
                          <img src={material.url} alt="Vista previa" className="w-full h-auto object-cover max-h-32" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
        <div className="flex gap-2">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/admin/eventos')} className="btn-ghost">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </button>

          {/* Botón rápido para guardar cambios sin ir al final (solo en edición) */}
          {existingEvent && step < STEPS.length - 1 && (
            <button 
              onClick={() => handleSave({ redirect: false })} 
              className="btn-ghost !text-[var(--color-deep-green)] font-bold border border-[var(--color-deep-green)]/20"
              disabled={loading || !isStepValid()}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Actualizar ahora
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handlePreview}
            className="btn-ghost !text-[var(--color-deep-green)] font-bold border border-[var(--color-deep-green)]/20"
            disabled={loading || !form.title || !form.event_date}
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
            Vista Previa
          </button>
        </div>

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
