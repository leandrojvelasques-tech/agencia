import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const STEPS = ['Información', 'Fecha y Agenda', 'Inscripción', 'Materiales', 'Encuesta']

const normalizeAgenda = (agenda) => {
  if (!agenda || !Array.isArray(agenda) || agenda.length === 0) {
    return [{ title: 'Clase 1', start_time: '', end_time: '', break_duration: 0, blocks: [{ title: 'Bloque 1', description: '' }] }]
  }
  // Check if it's already in the new format (each item has a title and a blocks array)
  if ('blocks' in agenda[0]) {
    return agenda.map(c => ({
      title: c.title || '',
      start_time: c.start_time || '',
      end_time: c.end_time || '',
      break_duration: c.break_duration || 0,
      blocks: Array.isArray(c.blocks) ? c.blocks.map(b => ({
        title: b.title || '',
        description: b.description || ''
      })) : [{ title: 'Bloque 1', description: '' }]
    }))
  }
  // If it's the old format [{ time, block, topic }]
  const blocks = agenda.map((item, idx) => ({
    title: item.block || `Bloque ${idx + 1}`,
    description: item.topic || ''
  }))
  return [{ title: 'Clase 1', start_time: '', end_time: '', break_duration: 0, blocks }]
}

export default function EventCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEventById, createEvent, updateEvent, agendaTemplates, fetchAgendaTemplates, createAgendaTemplate } = useStore()
  const [existingEvent, setExistingEvent] = useState(null)
  const [showSaveTemplateForm, setShowSaveTemplateForm] = useState(false)
  const [loading, setLoading] = useState(id ? true : false)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    type: 'charla',
    title: '',
    subtitle: '',
    description_short: '',
    description_extended: '',
    requirements: '',
    coordinator: 'Leandro Velasques',
    organizer: '',
    event_date: '',
    offered_dates: [],
    start_time: '',
    duration_minutes: 120,
    agenda: [{ title: 'Clase 1', start_time: '', end_time: '', break_duration: 0, blocks: [{ title: 'Bloque 1', description: '' }] }],
    registration_mode: 'both',
    max_capacity_presencial: '',
    max_capacity_virtual: '',
    banner_url: '',
    video_url: '',
    is_public: true,
    show_on_home: false,
    live_link: '',
    event_materials: [],
    has_survey: false,
    survey_questions: [],
    prices: [],
    payment_methods: '',
    contact_info: '',
    notification_recipients: [],
  })
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadingMaterialIndex, setUploadingMaterialIndex] = useState(null)
  const fileInputRef = useRef(null)

  const [associatedPresentations, setAssociatedPresentations] = useState([])
  const [availablePresentations, setAvailablePresentations] = useState([])

  useEffect(() => {
    fetchAgendaTemplates()
  }, [])

  useEffect(() => {
    if (id) {
      async function loadPresentations() {
        try {
          // Fetch associated presentations
          const { data: assoc } = await supabase
            .from('crm_presentations')
            .select('id, title')
            .eq('event_id', id)
          setAssociatedPresentations(assoc || [])

          // Fetch available (unlinked) presentations
          const { data: avail } = await supabase
            .from('crm_presentations')
            .select('id, title')
            .is('event_id', null)
          setAvailablePresentations(avail || [])
        } catch (err) {
          console.error('Error loading presentations:', err)
        }
      }
      loadPresentations()
    }
  }, [id])

  const handleLinkPresentation = async (presId) => {
    if (!presId) return
    try {
      const { error } = await supabase
        .from('crm_presentations')
        .update({ event_id: id })
        .eq('id', presId)
      if (error) throw error
      
      const linked = availablePresentations.find(p => p.id === presId)
      if (linked) {
        setAssociatedPresentations(prev => [...prev, linked])
        setAvailablePresentations(prev => prev.filter(p => p.id !== presId))
      }
    } catch (err) {
      console.error('Error linking presentation:', err)
      alert('Error al asociar la presentación.')
    }
  }

  const handleUnlinkPresentation = async (presId) => {
    try {
      const { error } = await supabase
        .from('crm_presentations')
        .update({ event_id: null })
        .eq('id', presId)
      if (error) throw error
      
      const unlinked = associatedPresentations.find(p => p.id === presId)
      if (unlinked) {
        setAvailablePresentations(prev => [...prev, unlinked])
        setAssociatedPresentations(prev => prev.filter(p => p.id !== presId))
      }
    } catch (err) {
      console.error('Error unlinking presentation:', err)
      alert('Error al desasociar la presentación.')
    }
  }

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
            agenda: normalizeAgenda(data.agenda),
            registration_mode: data.registration_mode || 'both',
            max_capacity_presencial: (data.max_capacity_presencial !== null && data.max_capacity_presencial !== undefined) ? data.max_capacity_presencial : '',
            max_capacity_virtual: (data.max_capacity_virtual !== null && data.max_capacity_virtual !== undefined) ? data.max_capacity_virtual : '',
            is_public: data.status === 'published' || data.status === 'in_progress',
            show_on_home: data.show_on_home || false,
            live_link: data.live_link || '',
            event_materials: data.event_materials || [],
            has_survey: data.has_survey || false,
            survey_questions: data.survey_questions || [],
            offered_dates: data.offered_dates && data.offered_dates.length > 0 ? data.offered_dates : (data.event_date ? [data.event_date] : []),
            video_url: data.video_url || '',
            prices: data.prices || [],
            payment_methods: data.payment_methods || '',
            contact_info: data.contact_info || '',
            notification_recipients: data.notification_recipients || [],
          })
        }
        setLoading(false)
      }
      loadEvent()
    }
  }, [id])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addClass = () => setForm(prev => {
    const nextAgenda = Array.isArray(prev.agenda) ? [...prev.agenda] : []
    const newClassNum = nextAgenda.length + 1
    return {
      ...prev,
      agenda: [...nextAgenda, { title: `Clase ${newClassNum}`, start_time: '', end_time: '', break_duration: 0, blocks: [{ title: 'Bloque 1', description: '' }] }]
    }
  })

  const removeClass = (classIdx) => setForm(prev => ({
    ...prev,
    agenda: prev.agenda.filter((_, idx) => idx !== classIdx)
  }))

  const updateClassTitle = (classIdx, value) => setForm(prev => ({
    ...prev,
    agenda: prev.agenda.map((c, idx) => idx === classIdx ? { ...c, title: value } : c)
  }))

  const updateClassField = (classIdx, field, value) => setForm(prev => ({
    ...prev,
    agenda: prev.agenda.map((c, idx) => idx === classIdx ? { ...c, [field]: value } : c)
  }))

  const addBlock = (classIdx) => setForm(prev => ({
    ...prev,
    agenda: prev.agenda.map((c, idx) => {
      if (idx !== classIdx) return c
      const nextBlocks = Array.isArray(c.blocks) ? c.blocks : []
      const newBlockNum = nextBlocks.length + 1
      return {
        ...c,
        blocks: [...nextBlocks, { title: `Bloque ${newBlockNum}`, description: '' }]
      }
    })
  }))

  const removeBlock = (classIdx, blockIdx) => setForm(prev => ({
    ...prev,
    agenda: prev.agenda.map((c, idx) => {
      if (idx !== classIdx) return c
      return {
        ...c,
        blocks: c.blocks.filter((_, bIdx) => bIdx !== blockIdx)
      }
    })
  }))

  const updateBlock = (classIdx, blockIdx, field, value) => setForm(prev => ({
    ...prev,
    agenda: prev.agenda.map((c, idx) => {
      if (idx !== classIdx) return c
      return {
        ...c,
        blocks: c.blocks.map((b, bIdx) => bIdx === blockIdx ? { ...b, [field]: value } : b)
      }
    })
  }))

  const addMaterial = () => setForm(prev => ({ ...prev, event_materials: [...prev.event_materials, { title: '', url: '', type: 'document' }] }))
  const removeMaterial = (i) => setForm(prev => ({ ...prev, event_materials: prev.event_materials.filter((_, idx) => idx !== i) }))
  const updateMaterial = (i, field, value) => {
    setForm(prev => ({
      ...prev,
      event_materials: prev.event_materials.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    }))
  }

  const addPriceAlternative = () => setForm(prev => ({
    ...prev,
    prices: [...(prev.prices || []), { concept: '', price: '' }]
  }))

  const removePriceAlternative = (idx) => setForm(prev => ({
    ...prev,
    prices: (prev.prices || []).filter((_, i) => i !== idx)
  }))

  const updatePriceAlternative = (idx, field, value) => setForm(prev => ({
    ...prev,
    prices: (prev.prices || []).map((item, i) => i === idx ? { ...item, [field]: value } : item)
  }))

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
      max_capacity,
      ...eventData 
    } = form
    
    const firstDate = form.offered_dates && form.offered_dates.length > 0 ? form.offered_dates[0] : form.event_date;
    
    const data = { 
      ...eventData, 
      event_date: firstDate,
      status: is_public ? 'published' : 'draft',
      max_capacity_presencial: (eventData.max_capacity_presencial || eventData.max_capacity_presencial === 0 || eventData.max_capacity_presencial === '0') ? Number(eventData.max_capacity_presencial) : null,
      max_capacity_virtual: (eventData.max_capacity_virtual || eventData.max_capacity_virtual === 0 || eventData.max_capacity_virtual === '0') ? Number(eventData.max_capacity_virtual) : null
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
              max_capacity_presencial: (updated.max_capacity_presencial !== null && updated.max_capacity_presencial !== undefined) ? updated.max_capacity_presencial : '',
              max_capacity_virtual: (updated.max_capacity_virtual !== null && updated.max_capacity_virtual !== undefined) ? updated.max_capacity_virtual : '',
              is_public: updated.status === 'published' || updated.status === 'in_progress',
              show_on_home: updated.show_on_home || false,
              live_link: updated.live_link || '',
              event_materials: updated.event_materials || [],
              offered_dates: updated.offered_dates && updated.offered_dates.length > 0 ? updated.offered_dates : (updated.event_date ? [updated.event_date] : []),
              notification_recipients: updated.notification_recipients || [],
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
    
    const firstDate = form.offered_dates && form.offered_dates.length > 0 ? form.offered_dates[0] : form.event_date;
    
    const data = { 
      ...eventData, 
      event_date: firstDate,
      status: is_public ? 'published' : 'draft',
      max_capacity_presencial: (eventData.max_capacity_presencial || eventData.max_capacity_presencial === 0 || eventData.max_capacity_presencial === '0') ? Number(eventData.max_capacity_presencial) : null,
      max_capacity_virtual: (eventData.max_capacity_virtual || eventData.max_capacity_virtual === 0 || eventData.max_capacity_virtual === '0') ? Number(eventData.max_capacity_virtual) : null
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
            max_capacity_presencial: (updated.max_capacity_presencial !== null && updated.max_capacity_presencial !== undefined) ? updated.max_capacity_presencial : '',
            max_capacity_virtual: (updated.max_capacity_virtual !== null && updated.max_capacity_virtual !== undefined) ? updated.max_capacity_virtual : '',
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
        
        <div className="flex flex-wrap items-center gap-3">
          {existingEvent && (
            <a
              href={`/evento/${existingEvent.slug}/inscripcion?preview=true`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary !py-2.5 !px-5 shadow-lg shadow-[var(--color-dark-gray)]/5 flex items-center gap-1.5"
              title="Abre la página pública de inscripción en modo vista previa (incluso en borrador)"
            >
              <span className="material-symbols-outlined text-lg">how_to_reg</span>
              Ver Inscripción
            </a>
          )}
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
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Visibilidad en la web *</label>
              <div className="flex gap-3">
                {[
                  { value: true, label: '🌍 Público', desc: 'Se muestra en el Home (puedes cerrar inscripciones en el Paso 3)' },
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
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Requisitos <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>
              <textarea className="form-input min-h-[100px]" placeholder="Ej: Traer notebook · Exclusivo para matriculados · Conocimientos básicos de Excel" value={form.requirements || ''} onChange={e => update('requirements', e.target.value)} />
              <p className="text-xs text-[var(--color-dark-gray)]/30 mt-1">Se muestra debajo de la agenda en la landing del evento</p>
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

            {/* Video URL Upload/Paste Field */}
            <div className="border-t border-[var(--color-deep-green)]/8 pt-5 mt-5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Video explicativo del curso <span className="normal-case text-[var(--color-dark-gray)]/30">(opcional)</span></label>
              <p className="text-xs text-[var(--color-dark-gray)]/50 mb-3">Soporta enlaces de YouTube, Vimeo, Google Drive o enlaces directos a archivos de video MP4.</p>
              
              <input
                className="form-input text-sm"
                placeholder="Ej: https://www.youtube.com/watch?v=... o URL de video directa"
                value={form.video_url || ''}
                onChange={(e) => update('video_url', e.target.value)}
              />

              {form.video_url && (
                <div className="mt-4 p-4 bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5 rounded-xl text-xs font-semibold text-[var(--color-dark-gray)]">
                  🎥 Video configurado. Se mostrará de forma destacada en la landing page del evento.
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-5">
              <div className="sm:col-span-3 border-b border-[var(--color-deep-green)]/8 pb-4 mb-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Días / Fechas del Evento *</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input type="date" id="new_event_date" className="form-input !w-auto" />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new_event_date');
                      const val = input?.value;
                      if (val) {
                        const currentDates = form.offered_dates || [];
                        if (!currentDates.includes(val)) {
                          const newDates = [...currentDates, val].sort();
                          update('offered_dates', newDates);
                          update('event_date', newDates[0]);
                        }
                        if (input) input.value = '';
                      }
                    }}
                    className="btn-secondary !py-2 !px-4"
                  >
                    Agregar Fecha
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(form.offered_dates || []).map(d => (
                    <span key={d} className="flex items-center gap-1.5 bg-[var(--color-deep-green)]/10 text-[var(--color-deep-green)] font-bold text-xs px-3 py-1.5 rounded-full">
                      <span className="material-symbols-outlined text-xs">calendar_today</span>
                      {d}
                      <button
                        type="button"
                        onClick={() => {
                          const newDates = (form.offered_dates || []).filter(date => date !== d);
                          update('offered_dates', newDates);
                          update('event_date', newDates.length > 0 ? newDates[0] : '');
                        }}
                        className="hover:text-red-600 transition-colors ml-1 font-bold text-base"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(!form.offered_dates || form.offered_dates.length === 0) && (
                    <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs animate-pulse">warning</span>
                      Debes agregar al menos una fecha para el evento.
                    </span>
                  )}
                </div>
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
              <div className="flex items-center justify-between mb-3 border-b border-[var(--color-deep-green)]/10 pb-2">
                <label className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-deep-green)]">Agenda / Programa por Clases y Bloques</label>
                <button type="button" onClick={addClass} className="btn-secondary !py-1.5 !px-3 !text-xs">
                  <span className="material-symbols-outlined text-base">add</span> Nueva Clase
                </button>
              </div>

              {/* Controles de Plantillas de Agenda */}
              <div className="bg-[var(--color-refined-gray)]/45 p-4 rounded-xl border border-[var(--color-deep-green)]/10 mb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">history_edu</span> Cargar Plantilla Predefinida
                    </p>
                    <div className="flex gap-2">
                      <select
                        id="select-agenda-template"
                        className="form-input !py-1.5 text-xs flex-1 bg-white"
                        defaultValue=""
                      >
                        <option value="" disabled>Seleccione una plantilla...</option>
                        {agendaTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const select = document.getElementById('select-agenda-template');
                          const tId = select?.value;
                          if (tId) {
                            const template = agendaTemplates.find(t => t.id === tId);
                            if (template && window.confirm(`¿Reemplazar la agenda actual con la plantilla "${template.name}"?`)) {
                              update('agenda', JSON.parse(JSON.stringify(template.agenda || [])));
                            }
                          } else {
                            alert('Por favor seleccione una plantilla primero.');
                          }
                        }}
                        className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">download</span> Aplicar
                      </button>
                    </div>
                  </div>

                  <div className="sm:border-l border-[var(--color-deep-green)]/10 sm:pl-4 flex flex-col justify-end">
                    <p className="text-xs font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-1.5">Guardar Agenda Actual</p>
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateForm(prev => !prev)}
                      className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1 self-start cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">save</span> Guardar como Plantilla
                    </button>
                  </div>
                </div>

                {showSaveTemplateForm && (
                  <div className="bg-white p-4 rounded-lg border border-[var(--color-deep-green)]/10 flex flex-col sm:flex-row gap-3 items-end animate-fade-in mt-3">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 mb-1">Nombre de la Plantilla *</label>
                      <input
                        type="text"
                        id="new-template-name"
                        placeholder="Ej. Taller de IA introductorio"
                        className="form-input !py-1.5 text-xs w-full bg-gray-50/50"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 mb-1">Descripción corta (opcional)</label>
                      <input
                        type="text"
                        id="new-template-desc"
                        placeholder="Ej. Programa básico del taller"
                        className="form-input !py-1.5 text-xs w-full bg-gray-50/50"
                      />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={async () => {
                          const nameInput = document.getElementById('new-template-name');
                          const descInput = document.getElementById('new-template-desc');
                          const name = nameInput?.value?.trim();
                          const desc = descInput?.value?.trim() || '';
                          
                          if (!name) {
                            alert('Por favor ingrese un nombre para la plantilla.');
                            return;
                          }
                          
                          const result = await createAgendaTemplate({
                            name,
                            description: desc,
                            agenda: form.agenda
                          });
                          
                          if (result.success) {
                            alert(`Plantilla "${name}" guardada con éxito.`);
                            setShowSaveTemplateForm(false);
                            if (nameInput) nameInput.value = '';
                            if (descInput) descInput.value = '';
                          } else {
                            alert('Error al guardar la plantilla: ' + (result.error?.message || 'Error desconocido'));
                          }
                        }}
                        className="btn-primary !py-1.5 !px-3 !text-xs flex-1 sm:flex-none cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSaveTemplateForm(false)}
                        className="btn-secondary !py-1.5 !px-3 !text-xs flex-1 sm:flex-none cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {form.agenda.map((c, classIdx) => (
                  <div key={classIdx} className="p-4 rounded-[var(--radius-card)] bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/10 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/10 px-2 py-1 rounded">Clase</span>
                        <input
                          className="form-input !py-2 text-sm font-bold flex-1"
                          placeholder="Ej: Clase 1: Introducción a la IA"
                          value={c.title || ''}
                          onChange={e => updateClassTitle(classIdx, e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addBlock(classIdx)}
                          className="btn-ghost text-xs !text-[var(--color-deep-green)] !py-1.5"
                          title="Agregar Bloque a esta Clase"
                        >
                          <span className="material-symbols-outlined text-base">add_box</span> + Bloque
                        </button>
                        {form.agenda.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeClass(classIdx)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Eliminar Clase"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/50 p-3 rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Hora de Inicio</label>
                        <input
                          type="time"
                          className="form-input !py-1.5 !px-3 text-xs"
                          value={c.start_time || ''}
                          onChange={e => updateClassField(classIdx, 'start_time', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Hora de Fin</label>
                        <input
                          type="time"
                          className="form-input !py-1.5 !px-3 text-xs"
                          value={c.end_time || ''}
                          onChange={e => updateClassField(classIdx, 'end_time', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Duración del Break (min)</label>
                        <input
                          type="number"
                          placeholder="Sin break"
                          className="form-input !py-1.5 !px-3 text-xs"
                          value={c.break_duration || ''}
                          onChange={e => updateClassField(classIdx, 'break_duration', e.target.value ? Number(e.target.value) : 0)}
                          min={0}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pl-4 border-l-2 border-[var(--color-deep-green)]/10">
                      {(c.blocks || []).map((b, blockIdx) => (
                        <div key={blockIdx} className="p-3 rounded-[var(--radius-premium)] bg-white border border-[var(--color-deep-green)]/5 relative group space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              className="form-input !py-2.5 !px-3 text-sm font-semibold w-full bg-[var(--color-refined-gray)]/50"
                              placeholder="Nombre (ej: Bloque 1)"
                              value={b.title || ''}
                              onChange={e => updateBlock(classIdx, blockIdx, 'title', e.target.value)}
                            />
                            {c.blocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBlock(classIdx, blockIdx)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1"
                                title="Eliminar Bloque"
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Descripción General (Visible al cliente)</label>
                            <textarea
                              className="form-input !py-3 !px-4 text-sm min-h-[200px]"
                              placeholder="Qué aprenderá el cliente en este bloque..."
                              value={b.description || ''}
                              onChange={e => updateBlock(classIdx, blockIdx, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {/* Modalities Enable/Disable and Capacity */}
            <div className="space-y-4 pt-2 border-t border-[var(--color-deep-green)]/8">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">Modalidades del Evento</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Presencial Modality toggle and capacity */}
                <div className="p-4 rounded-xl border border-[var(--color-deep-green)]/10 bg-white space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-dark-gray)]">Modalidad Presencial</p>
                      <p className="text-[10px] text-[var(--color-dark-gray)]/50">Habilita inscripciones físicas en el lugar</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const isCurrentlyEnabled = form.max_capacity_presencial !== 0 && form.max_capacity_presencial !== '0';
                        if (isCurrentlyEnabled) {
                          update('max_capacity_presencial', 0); // Deshabilitar
                        } else {
                          update('max_capacity_presencial', ''); // Habilitar sin limite
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        form.max_capacity_presencial !== 0 && form.max_capacity_presencial !== '0'
                          ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)]'
                          : 'bg-gray-100 text-gray-500 border-gray-300'
                      }`}
                    >
                      {form.max_capacity_presencial !== 0 && form.max_capacity_presencial !== '0' ? 'Habilitado' : 'Deshabilitado'}
                    </button>
                  </div>

                  {form.max_capacity_presencial !== 0 && form.max_capacity_presencial !== '0' && (
                    <div className="animate-fade-in pt-2 border-t border-[var(--color-refined-gray)]">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2.5 block">
                        Cupo Máximo Presencial
                      </label>
                      <input
                        type="number"
                        className="form-input w-full !py-2.5 !px-3.5 text-sm"
                        placeholder="Sin límite de cupo (vacío)"
                        value={form.max_capacity_presencial === 0 ? '' : form.max_capacity_presencial}
                        onChange={e => update('max_capacity_presencial', e.target.value === '' ? '' : Number(e.target.value))}
                        min={1}
                      />
                    </div>
                  )}
                </div>

                {/* Virtual Modality toggle and capacity */}
                <div className="p-4 rounded-xl border border-[var(--color-deep-green)]/10 bg-white space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-dark-gray)]">Modalidad Virtual</p>
                      <p className="text-[10px] text-[var(--color-dark-gray)]/50">Habilita inscripciones virtuales online</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const isCurrentlyEnabled = form.max_capacity_virtual !== 0 && form.max_capacity_virtual !== '0';
                        if (isCurrentlyEnabled) {
                          update('max_capacity_virtual', 0); // Deshabilitar
                        } else {
                          update('max_capacity_virtual', ''); // Habilitar sin limite
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        form.max_capacity_virtual !== 0 && form.max_capacity_virtual !== '0'
                          ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)]'
                          : 'bg-gray-100 text-gray-500 border-gray-300'
                      }`}
                    >
                      {form.max_capacity_virtual !== 0 && form.max_capacity_virtual !== '0' ? 'Habilitado' : 'Deshabilitado'}
                    </button>
                  </div>

                  {form.max_capacity_virtual !== 0 && form.max_capacity_virtual !== '0' && (
                    <div className="animate-fade-in pt-2 border-t border-[var(--color-refined-gray)]">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2.5 block">
                        Cupo Máximo Virtual
                      </label>
                      <input
                        type="number"
                        className="form-input w-full !py-2.5 !px-3.5 text-sm"
                        placeholder="Sin límite de cupo (vacío)"
                        value={form.max_capacity_virtual === 0 ? '' : form.max_capacity_virtual}
                        onChange={e => update('max_capacity_virtual', e.target.value === '' ? '' : Number(e.target.value))}
                        min={1}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Configuración de Precios */}
            <div className="space-y-4 pt-5 border-t border-[var(--color-deep-green)]/8">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                    Precios y Alternativas de Inscripción
                  </label>
                  <p className="text-[10px] text-[var(--color-dark-gray)]/50">
                    Configurá las diferentes opciones de aranceles para el evento (ej: Matriculados, Estudiantes, Externos, etc.)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPriceAlternative}
                  className="btn-secondary !py-1.5 !px-3.5 !text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">add</span> Agregar Tarifa
                </button>
              </div>

              {(!form.prices || form.prices.length === 0) ? (
                <div className="p-6 text-center border border-dashed border-[var(--color-deep-green)]/10 rounded-xl bg-white/40">
                  <span className="material-symbols-outlined text-3xl text-[var(--color-dark-gray)]/20 mb-1 block">payments</span>
                  <p className="text-xs font-semibold text-[var(--color-dark-gray)]/45">Sin tarifas configuradas (se asumirá Sin Cargo o libre)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(form.prices || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[var(--color-deep-green)]/8 shadow-sm">
                      <div className="flex-1">
                        <input
                          type="text"
                          className="form-input !py-2 text-xs"
                          placeholder="Concepto (ej: Matriculados, Externos...)"
                          value={item.concept}
                          onChange={e => updatePriceAlternative(idx, 'concept', e.target.value)}
                        />
                      </div>
                      <div className="w-1/3">
                        <input
                          type="text"
                          className="form-input !py-2 text-xs"
                          placeholder="Precio (ej: Sin Cargo, $ 5.000...)"
                          value={item.price}
                          onChange={e => updatePriceAlternative(idx, 'price', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePriceAlternative(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Eliminar tarifa"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medios de Pago */}
            <div className="space-y-4 pt-5 border-t border-[var(--color-deep-green)]/8">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                  Medios de Pago del Evento
                </label>
                <p className="text-[10px] text-[var(--color-dark-gray)]/50">
                  Especificá las cuentas bancarias, alias, CBU u otras formas de pago para que el participante pueda transferir (se mostrará en la landing de inscripción)
                </p>
              </div>
              <textarea
                className="form-input text-sm min-h-[140px] font-mono whitespace-pre-wrap leading-relaxed"
                placeholder="Ej:&#10;BANCO CHUBUT&#10;Número de cuenta: 00600020007500401&#10;CBU: 0830006501002000750047&#10;Alias: CPCECH.CR"
                value={form.payment_methods || ''}
                onChange={e => update('payment_methods', e.target.value)}
              />
            </div>

            {/* Consultas por Inscripciones */}
            <div className="space-y-4 pt-5 border-t border-[var(--color-deep-green)]/8">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                  Contacto para Consultas por Inscripciones
                </label>
                <p className="text-[10px] text-[var(--color-dark-gray)]/50">
                  Ingresá información de contacto, email o teléfono para que los asistentes puedan enviar sus dudas.
                </p>
              </div>
              <input
                type="text"
                className="form-input text-sm"
                placeholder="Ej: Celular: +54 9 297 123-4567 | Email: eventos@ejemplo.com"
                value={form.contact_info || ''}
                onChange={e => update('contact_info', e.target.value)}
              />
            </div>

            {/* Notificaciones de Inscripción (Coordinadores) */}
            <div className="space-y-4 pt-5 border-t border-[var(--color-deep-green)]/8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                    Notificaciones de Inscripción (Coordinadores)
                  </label>
                  <p className="text-[10px] text-[var(--color-dark-gray)]/50">
                    Configurá los nombres e emails de las personas que recibirán un correo automático cada vez que alguien se inscriba o cancele.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = form.notification_recipients || [];
                    update('notification_recipients', [...current, { name: '', email: '' }]);
                  }}
                  className="btn-secondary !py-1.5 !px-3.5 !text-xs flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-xs">add</span> Agregar Persona
                </button>
              </div>

              {(!form.notification_recipients || form.notification_recipients.length === 0) ? (
                <div className="p-6 text-center border border-dashed border-[var(--color-deep-green)]/10 rounded-xl bg-white/40">
                  <span className="material-symbols-outlined text-3xl text-[var(--color-dark-gray)]/20 mb-1 block">notifications_off</span>
                  <p className="text-xs font-semibold text-[var(--color-dark-gray)]/45">Sin destinatarios configurados (solo el inscripto recibirá confirmación)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.notification_recipients.map((recipient, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[var(--color-deep-green)]/8 shadow-sm">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          className="form-input !py-2 text-xs"
                          placeholder="Nombre del Coordinador"
                          value={recipient.name || ''}
                          onChange={e => {
                            const updated = form.notification_recipients.map((r, i) => i === idx ? { ...r, name: e.target.value } : r);
                            update('notification_recipients', updated);
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="email"
                          required
                          className="form-input !py-2 text-xs"
                          placeholder="email@ejemplo.com"
                          value={recipient.email || ''}
                          onChange={e => {
                            const updated = form.notification_recipients.map((r, i) => i === idx ? { ...r, email: e.target.value } : r);
                            update('notification_recipients', updated);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.notification_recipients.filter((_, i) => i !== idx);
                          update('notification_recipients', updated);
                        }}
                        className="text-red-400 hover:text-red-650 transition-colors p-1 cursor-pointer"
                        title="Eliminar destinatario"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Associated Slide Decks / Classes */}
            <div className="border-t border-[var(--color-deep-green)]/15 pt-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">Clases / Diapositivas Asociadas</label>
                  <p className="text-[10px] text-[var(--color-dark-gray)]/45">Asociá diapositivas 16:9 creadas en el Presentador a este evento.</p>
                </div>
                {id ? (
                  <Link
                    to={`/admin/crm/presentaciones/nueva?event_id=${id}`}
                    target="_blank"
                    className="btn-ghost text-xs !text-[var(--color-deep-green)] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">add</span> Nueva Diapositiva
                  </Link>
                ) : null}
              </div>

              {!id ? (
                <div className="p-6 text-center border border-dashed border-[var(--color-deep-green)]/10 rounded-[var(--radius-card)] bg-gray-50/50">
                  <p className="text-xs text-[var(--color-dark-gray)]/45 italic">Primero debés crear y guardar el evento para poder asociarle diapositivas.</p>
                </div>
              ) : associatedPresentations.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[var(--color-deep-green)]/10 rounded-[var(--radius-card)] bg-gray-50/50">
                  <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/10 mb-2 block">present_to_all</span>
                  <p className="text-xs font-semibold text-[var(--color-dark-gray)]/40">No hay diapositivas de clase asociadas a este evento</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {associatedPresentations.map((pres) => (
                    <div key={pres.id} className="p-3.5 rounded-[var(--radius-premium)] bg-white border border-gray-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--color-deep-green)]">slideshow</span>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-dark-gray)]">{pres.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/crm/presentaciones/${pres.id}/editar`}
                          target="_blank"
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-250 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs leading-none">edit</span>
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleUnlinkPresentation(pres.id)}
                          className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-500 text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs leading-none">link_off</span>
                          Desvincular
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {id && availablePresentations.length > 0 && (
                <div className="mt-4 p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/50 border border-[var(--color-deep-green)]/10 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--color-deep-green)] text-lg">link</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[var(--color-dark-gray)]">Vincular presentación existente</p>
                  </div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLinkPresentation(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="bg-white border border-gray-300 rounded-lg text-xs font-semibold px-3 py-1.5 text-gray-600 outline-none focus:border-[var(--color-deep-green)] cursor-pointer"
                  >
                    <option value="">-- Seleccionar para vincular --</option>
                    {availablePresentations.map(pres => (
                      <option key={pres.id} value={pres.id}>
                        {pres.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Encuesta de Preguntas Personalizadas</label>
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
                  <p className="text-sm font-bold text-[var(--color-dark-gray)]">Activar Encuesta para este Evento</p>
                  <p className="text-xs text-[var(--color-dark-gray)]/50 mt-0.5">
                    Permite definir preguntas personalizadas que los participantes responderán al inscribirse.
                  </p>
                </div>
              </label>
            </div>

            {form.has_survey && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between border-b border-[var(--color-deep-green)]/10 pb-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">Preguntas de la Encuesta</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const newQ = { id: `q_${Date.now()}`, label: '', type: 'text', required: false, options: '' }
                      update('survey_questions', [...(form.survey_questions || []), newQ])
                    }} 
                    className="btn-ghost text-xs !text-[var(--color-deep-green)] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">add</span> Agregar pregunta
                  </button>
                </div>

                {(!form.survey_questions || form.survey_questions.length === 0) ? (
                  <div className="p-10 text-center border-2 border-dashed border-[var(--color-deep-green)]/10 rounded-[var(--radius-card)]">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-dark-gray)]/10 mb-2 block">quiz</span>
                    <p className="text-sm font-medium text-[var(--color-dark-gray)]/30">No has agregado ninguna pregunta aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.survey_questions.map((q, i) => (
                      <div key={q.id || i} className="p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/50 border border-[var(--color-deep-green)]/5 relative group space-y-3">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur rounded p-1 shadow-sm">
                          {/* Reorder Buttons */}
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...form.survey_questions]
                                const temp = list[i]
                                list[i] = list[i - 1]
                                list[i - 1] = temp
                                update('survey_questions', list)
                              }}
                              className="text-[var(--color-dark-gray)]/40 hover:text-[var(--color-deep-green)] p-1 flex items-center justify-center"
                              title="Subir"
                            >
                              <span className="material-symbols-outlined text-base">arrow_upward</span>
                            </button>
                          )}
                          {i < form.survey_questions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...form.survey_questions]
                                const temp = list[i]
                                list[i] = list[i + 1]
                                list[i + 1] = temp
                                update('survey_questions', list)
                              }}
                              className="text-[var(--color-dark-gray)]/40 hover:text-[var(--color-deep-green)] p-1 flex items-center justify-center"
                              title="Bajar"
                            >
                              <span className="material-symbols-outlined text-base">arrow_downward</span>
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => {
                              const list = form.survey_questions.filter((_, idx) => idx !== i)
                              update('survey_questions', list)
                            }} 
                            className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Pregunta (Etiqueta) *</label>
                            <input 
                              className="form-input !py-2 text-xs" 
                              placeholder="Ej: ¿Cuál es tu número de matrícula?" 
                              value={q.label} 
                              onChange={e => {
                                const list = [...form.survey_questions]
                                list[i] = { ...list[i], label: e.target.value }
                                update('survey_questions', list)
                              }} 
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Tipo de respuesta</label>
                            <select 
                              className="form-input !py-2 text-xs" 
                              value={q.type} 
                              onChange={e => {
                                const list = [...form.survey_questions]
                                list[i] = { ...list[i], type: e.target.value }
                                update('survey_questions', list)
                              }}
                            >
                              <option value="text">✍️ Texto corto</option>
                              <option value="textarea">📝 Texto largo (párrafo)</option>
                              <option value="select">🔽 Desplegable (Opciones)</option>
                              <option value="checkbox">☑️ Casilla de verificación (Sí/No)</option>
                            </select>
                          </div>
                        </div>

                        {q.type === 'select' && (
                          <div className="animate-fade-in">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Opciones (separadas por comas) *</label>
                            <input 
                              className="form-input !py-2 text-xs" 
                              placeholder="Ej: Contador, Licenciado, Estudiante" 
                              value={q.options || ''} 
                              onChange={e => {
                                const list = [...form.survey_questions]
                                list[i] = { ...list[i], options: e.target.value }
                                update('survey_questions', list)
                              }} 
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`req-${q.id || i}`}
                            checked={q.required || false} 
                            onChange={e => {
                              const list = [...form.survey_questions]
                              list[i] = { ...list[i], required: e.target.checked }
                              update('survey_questions', list)
                            }}
                            className="accent-[var(--color-deep-green)] rounded"
                          />
                          <label htmlFor={`req-${q.id || i}`} className="text-xs font-bold text-[var(--color-dark-gray)]/60 cursor-pointer">Esta pregunta es obligatoria</label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
