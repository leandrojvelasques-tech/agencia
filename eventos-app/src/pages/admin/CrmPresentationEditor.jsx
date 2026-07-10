import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exportPresentationToPdf } from '../../lib/pdfExport'

const LAYOUTS = [
  { id: 'image', name: 'Solo Imagen (16:9)', icon: 'image', desc: 'Diapositiva prediseñada de 16:9' }
]

export default function CrmPresentationEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slides, setSlides] = useState([])
  const [selectedSlideId, setSelectedSlideId] = useState(null)
  const [draggedSlideIdx, setDraggedSlideIdx] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [eventId, setEventId] = useState('')
  const [events, setEvents] = useState([])
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const fileInputRef = useRef(null)
  const slidesImportInputRef = useRef(null)

  useEffect(() => {
    async function loadEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, event_date')
          .order('event_date', { ascending: false })
        if (error) throw error
        setEvents(data || [])
      } catch (err) {
        console.error('Error loading events:', err)
      }
    }
    loadEvents()
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load data
  useEffect(() => {
    async function load() {
      if (!isEdit) {
        const queryParams = new URLSearchParams(window.location.search)
        const qEventId = queryParams.get('event_id')
        if (qEventId) {
          setEventId(qEventId)
        }
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('crm_presentations')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        if (data) {
          setTitle(data.title)
          setDescription(data.description || '')
          setEventId(data.event_id || '')
          const loadedSlides = Array.isArray(data.slides) ? data.slides : []
          setSlides(loadedSlides)
          if (loadedSlides.length > 0) {
            setSelectedSlideId(loadedSlides[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading presentation:', err)
        showToast('Error al cargar la presentación.', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const selectedSlide = slides.find(s => s.id === selectedSlideId)

  const guide = selectedSlide?.guide || []

  const handleAddGuideItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      type: 'diapo',
      title: '',
      details: ''
    }
    handleUpdateSlideField('guide', [...guide, newItem])
  }

  const handleAddSlideToGuide = () => {
    const newItem = {
      id: crypto.randomUUID(),
      type: 'diapo',
      title: selectedSlide?.title || 'Diapositiva',
      details: ''
    }
    handleUpdateSlideField('guide', [...guide, newItem])
  }

  const handleDragStart = (e, index) => {
    setDraggedSlideIdx(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e, targetIdx) => {
    e.preventDefault()
    if (draggedSlideIdx === null || draggedSlideIdx === targetIdx) return

    const newSlides = [...slides]
    const draggedItem = newSlides[draggedSlideIdx]
    
    newSlides.splice(draggedSlideIdx, 1)
    newSlides.splice(targetIdx, 0, draggedItem)
    
    setSlides(newSlides)
    setDraggedSlideIdx(null)
  }

  const handleDragEnd = () => {
    setDraggedSlideIdx(null)
  }

  const handleUpdateGuideItem = (itemId, field, value) => {
    const updated = guide.map(item => item.id === itemId ? { ...item, [field]: value } : item)
    handleUpdateSlideField('guide', updated)
  }

  const handleDeleteGuideItem = (itemId) => {
    const updated = guide.filter(item => item.id !== itemId)
    handleUpdateSlideField('guide', updated)
  }

  const handleUpdateSlideField = (field, value) => {
    setSlides(prev => prev.map(s => {
      if (s.id === selectedSlideId) {
        return { ...s, [field]: value }
      }
      return s
    }))
  }

  const handleAddSlide = () => {
    const newSlide = {
      id: crypto.randomUUID(),
      layout: 'image',
      title: 'Diapositiva ' + (slides.length + 1),
      mediaUrl: '',
      notes: '',
      showFooterLogo: false
    }
    setSlides(prev => [...prev, newSlide])
    setSelectedSlideId(newSlide.id)
  }

  const handleDuplicateSlide = () => {
    if (!selectedSlide) return
    const duplicated = {
      ...selectedSlide,
      id: crypto.randomUUID(),
      title: `${selectedSlide.title} (Copia)`
    }
    const idx = slides.findIndex(s => s.id === selectedSlideId)
    const newSlides = [...slides]
    newSlides.splice(idx + 1, 0, duplicated)
    setSlides(newSlides)
    setSelectedSlideId(duplicated.id)
  }

  const handleDeleteSlide = () => {
    if (slides.length <= 1) {
      showToast('La presentación debe tener al menos una diapositiva.', 'error')
      return
    }
    const idx = slides.findIndex(s => s.id === selectedSlideId)
    const newSlides = slides.filter(s => s.id !== selectedSlideId)
    setSlides(newSlides)
    
    // Select next logical slide
    const nextSelectIdx = idx === 0 ? 0 : idx - 1
    setSelectedSlideId(newSlides[nextSelectIdx].id)
    showToast('Diapositiva eliminada.')
  }

  const handleMoveSlide = (direction) => {
    const idx = slides.findIndex(s => s.id === selectedSlideId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === slides.length - 1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    const newSlides = [...slides]
    const temp = newSlides[idx]
    newSlides[idx] = newSlides[targetIdx]
    newSlides[targetIdx] = temp
    
    setSlides(newSlides)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
      
      const { error: upErr } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true, contentType: file.type })
      
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName)
      
      handleUpdateSlideField('mediaUrl', publicUrl)
      showToast('Imagen subida correctamente.')
    } catch (err) {
      console.error(err)
      showToast('Error al subir la imagen.', 'error')
    } finally {
      setUploading(false)
    }
  }
  
  const handleMultiSlidesImport = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newImportedSlides = []

    try {
      const fileList = Array.from(files)
      // Sort files alphabetically to ensure they are added in order (slide 1, slide 2, etc.)
      fileList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

      for (const file of fileList) {
        const ext = file.name.split('.').pop()
        const fileName = `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
        
        const { error: upErr } = await supabase.storage
          .from('banners')
          .upload(fileName, file, { upsert: true, contentType: file.type })
        
        if (upErr) throw upErr
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName)
        
        newImportedSlides.push({
          id: crypto.randomUUID(),
          layout: 'image',
          pill: '',
          title: file.name.split('.')[0],
          subtitle: '',
          bullets: '',
          mediaUrl: publicUrl,
          quote: '',
          quoteAuthor: '',
          cards: [],
          notes: '',
          showFooterLogo: false // Hide footer by default for full screen images
        })
      }

      setSlides(prev => [...prev, ...newImportedSlides])
      if (newImportedSlides.length > 0) {
        setSelectedSlideId(newImportedSlides[newImportedSlides.length - 1].id)
      }
      showToast(`¡Se importaron ${newImportedSlides.length} diapositivas correctamente!`)
    } catch (err) {
      console.error('Error importing slides:', err)
      showToast('Error al importar algunas diapositivas.', 'error')
    } finally {
      setUploading(false)
      if (slidesImportInputRef.current) slidesImportInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Por favor, ingresá un título para la presentación.', 'error')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('crm_presentations')
          .update({
            title: title.trim(),
            description: description.trim(),
            slides: slides,
            event_id: eventId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
        if (error) throw error
        showToast('Presentación guardada correctamente.')
      } else {
        const { data, error } = await supabase
          .from('crm_presentations')
          .insert({
            title: title.trim(),
            description: description.trim(),
            slides: slides,
            event_id: eventId || null
          })
          .select()
          .single()
        if (error) throw error
        showToast('Presentación creada correctamente.')
        navigate(`/admin/crm/presentaciones/${data.id}/editar`)
      }
    } catch (err) {
      console.error('Error saving:', err)
      showToast('Error al guardar la presentación.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPdf = async () => {
    if (slides.length === 0) {
      showToast('No hay diapositivas para exportar.', 'error')
      return
    }
    setExportingPdf(true)
    setExportProgress('0%')
    try {
      await exportPresentationToPdf(title || 'presentacion', slides, (curr, total) => {
        setExportProgress(`${Math.round((curr / total) * 100)}%`)
      })
      showToast('PDF exportado correctamente.')
    } catch (err) {
      console.error('Error al exportar PDF:', err)
      showToast('Error al exportar PDF: ' + err.message, 'error')
    } finally {
      setExportingPdf(false)
      setExportProgress('')
    }
  }

  // Helper render for live preview
  const renderPreview = () => {
    if (!selectedSlide) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-950 text-gray-500 font-bold rounded-2xl border border-gray-800">
          Selecciona una diapositiva para comenzar.
        </div>
      )
    }

    const { mediaUrl } = selectedSlide

    return (
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center rounded-2xl border border-gray-800 shadow-2xl"
      >
        {mediaUrl ? (
          <img src={mediaUrl} className="w-full h-full object-contain select-none pointer-events-none" alt="Diapositiva" />
        ) : (
          <div className="text-gray-500 text-xs font-semibold flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-gray-600">image</span>
            <span>Sin imagen de diapositiva (Cárgala a la derecha)</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 text-[var(--color-dark-gray)]">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-premium shadow-lg border transition-all duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/crm/presentaciones"
            className="p-2 border border-gray-200 rounded-premium hover:bg-gray-50 text-[var(--color-dark-gray)]"
          >
            <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
          </Link>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Nombre de la presentación</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la presentación..."
              className="text-xl font-extrabold text-[var(--color-deep-green)] bg-transparent border-b border-dashed border-gray-300 focus:border-[var(--color-deep-green)] outline-none max-w-sm"
            />
          </div>
          <div className="flex flex-col gap-1 ml-4 border-l border-gray-200 pl-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Asociar a Evento</span>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-600 border-b border-dashed border-gray-300 focus:border-[var(--color-deep-green)] outline-none py-1.5 cursor-pointer max-w-xs"
            >
              <option value="">-- No asociar --</option>
              {events.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.event_date ? new Date(evt.event_date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {slides.length > 0 && (
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-xs font-bold text-red-700 rounded-premium-btn flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Exportar todas las diapositivas a PDF"
            >
              <span className="material-symbols-outlined text-base leading-none">
                {exportingPdf ? 'sync' : 'picture_as_pdf'}
              </span>
              {exportingPdf ? `Exportando (${exportProgress})` : 'Exportar PDF'}
            </button>
          )}
          {isEdit && (
            <>
              <Link
                to={`/admin/crm/presentaciones/${id}/presentar`}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">play_circle</span>
                Proyectar
              </Link>
              <a
                href={`/admin/crm/presentaciones/${id}/presentar?presenter=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-[#A8D5C1] bg-[#A8D5C1]/10 hover:bg-[#A8D5C1]/20 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Abrir la Vista del Presentador con notas y checklist privado en una pestaña nueva"
              >
                <span className="material-symbols-outlined text-base">co_present</span>
                Modo Presentador
              </a>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary animate-pulse-subtle"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            {saving ? 'Guardando...' : 'Guardar Presentación'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/30 animate-pulse">
            hourglass_empty
          </span>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* LEFT SIDEBAR: Slide List Thumbnails */}
          <div className="w-64 border border-gray-200 bg-white rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-150 flex items-center justify-between shrink-0 bg-gray-50/50">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Diapositivas</h4>
              <span className="text-xs font-extrabold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/10 px-2.5 py-0.5 rounded-full">{slides.length}</span>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-0">
              {slides.map((s, i) => {
                const isSelected = s.id === selectedSlideId
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedSlideId(s.id)}
                    className={`p-3 border rounded-xl cursor-grab active:cursor-grabbing transition-all flex flex-col gap-1.5 relative overflow-hidden select-none ${
                      isSelected 
                        ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 ring-1 ring-[var(--color-deep-green)]/10' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400">Slide {i + 1}</span>
                      <span className="material-symbols-outlined text-base text-[var(--color-deep-green)]/80">
                        image
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[var(--color-deep-green)] truncate">{s.title || 'Sin Título'}</p>
                    <p className="text-[9px] text-[var(--color-dark-gray)]/50 capitalize font-medium">{s.layout}</p>
                  </div>
                )
              })}
            </div>

            <div className="p-3 border-t border-gray-150 flex flex-col gap-2 shrink-0 bg-gray-50/50">
              <button
                onClick={handleAddSlide}
                className="w-full py-2 bg-[var(--color-deep-green)] text-white text-xs font-bold rounded-premium-btn flex items-center justify-center gap-1.5 hover:bg-[var(--color-deep-green)]/95 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Agregar Diapositiva
              </button>
              <button
                type="button"
                onClick={() => slidesImportInputRef.current?.click()}
                className="w-full py-2 border border-gray-250 hover:bg-gray-100 text-[var(--color-dark-gray)] text-xs font-bold rounded-premium-btn flex items-center justify-center gap-1.5 transition-colors"
                disabled={uploading}
              >
                <span className="material-symbols-outlined text-base">file_upload</span>
                {uploading ? 'Subiendo...' : 'Importar Diapositivas (JPG/PNG)'}
              </button>
              <input
                type="file"
                ref={slidesImportInputRef}
                onChange={handleMultiSlidesImport}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* CENTER: Live WYSIWYG Slide Preview */}
          <div className="flex-1 border border-gray-200 bg-white rounded-2xl p-6 flex flex-col justify-between shadow-sm overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 shrink-0">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-base">visibility</span>
                Previsualización 16:9
              </h4>

              {/* Controls for current slide */}
              {selectedSlide && (
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-premium border border-gray-200">
                  <button
                    onClick={() => handleMoveSlide('up')}
                    className="p-1 hover:bg-white rounded transition-colors text-gray-600"
                    title="Mover arriba / ordenar"
                  >
                    <span className="material-symbols-outlined text-base leading-none">arrow_upward</span>
                  </button>
                  <button
                    onClick={() => handleMoveSlide('down')}
                    className="p-1 hover:bg-white rounded transition-colors text-gray-600"
                    title="Mover abajo / ordenar"
                  >
                    <span className="material-symbols-outlined text-base leading-none">arrow_downward</span>
                  </button>
                  <div className="w-px h-4 bg-gray-300 mx-1" />
                  <button
                    onClick={handleDuplicateSlide}
                    className="p-1 hover:bg-white rounded transition-colors text-gray-600"
                    title="Duplicar diapositiva"
                  >
                    <span className="material-symbols-outlined text-base leading-none">filter_none</span>
                  </button>
                  <button
                    onClick={handleDeleteSlide}
                    className="p-1 hover:bg-white text-red-500 rounded transition-colors"
                    title="Eliminar diapositiva"
                  >
                    <span className="material-symbols-outlined text-base leading-none">delete</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center p-4 bg-gray-950 rounded-2xl min-h-0">
              <div 
                className="relative"
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '850px',
                  maxHeight: '100%',
                  aspectRatio: '16 / 9'
                }}
              >
                {renderPreview()}
              </div>
            </div>
            
            {/* Presenter Notes */}
            {selectedSlide && (
              <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-base">sticky_note_2</span>
                  Notas del Orador (Privadas, no se proyectan)
                </label>
                <textarea
                  value={selectedSlide.notes || ''}
                  onChange={(e) => handleUpdateSlideField('notes', e.target.value)}
                  placeholder="Apuntes rápidos, ideas o guía para esta diapositiva..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-premium h-20 outline-none focus:border-[var(--color-deep-green)] resize-none font-medium"
                />
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Content Editor */}
          {selectedSlide && (
            <div className="w-80 border border-gray-200 bg-white rounded-2xl p-5 shrink-0 overflow-y-auto shadow-sm space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">Nombre Diapositiva</label>
                <input
                  type="text"
                  value={selectedSlide.title || ''}
                  onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                  placeholder="Diapositiva 1..."
                  className="form-input border border-gray-200 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">Archivo de Diapositiva (16:9)</label>
                <div className="space-y-3">
                  {selectedSlide.mediaUrl ? (
                    <div className="relative rounded-premium overflow-hidden aspect-video border border-gray-200 bg-black">
                      <img src={selectedSlide.mediaUrl} className="w-full h-full object-contain" alt="Preview Thumbnail" />
                      <button
                        type="button"
                        onClick={() => handleUpdateSlideField('mediaUrl', '')}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-750 text-white rounded-full transition-colors flex items-center justify-center"
                        title="Eliminar imagen"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">delete</span>
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-[var(--color-deep-green)] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50 flex flex-col items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-3xl text-gray-400">cloud_upload</span>
                      <span className="text-xs font-bold text-gray-600">Subir diapositiva (JPG/PNG)</span>
                      <span className="text-[10px] text-gray-450">Relación de aspecto recomendada: 16:9</span>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {uploading && <span className="text-[10px] text-[var(--color-deep-green)] font-bold animate-pulse">Subiendo archivo...</span>}
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-450 uppercase">URL Directa de la Imagen</label>
                    <input
                      type="text"
                      value={selectedSlide.mediaUrl || ''}
                      onChange={(e) => handleUpdateSlideField('mediaUrl', e.target.value)}
                      placeholder="Pegar URL de la imagen..."
                      className="form-input border border-gray-200 text-xs py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Presenter Checklist Guide */}
              <div className="border-t border-gray-150 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">checklist</span>
                    Guía del Expositor
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddSlideToGuide}
                      className="p-1 hover:bg-gray-100 rounded text-[var(--color-deep-green)] text-xs font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                      title="Agregar diapositiva a la guía"
                    >
                      <span className="material-symbols-outlined text-sm leading-none">add_photo_alternate</span>
                      + Diapo
                    </button>
                    <button
                      type="button"
                      onClick={handleAddGuideItem}
                      className="p-1 hover:bg-gray-100 rounded text-[var(--color-deep-green)] text-xs font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm leading-none">add_circle</span>
                      Agregar paso
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {guide.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">No hay pasos creados para esta diapositiva. Agrega uno para usar de guía durante tu presentación.</p>
                  ) : (
                    guide.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl relative space-y-2">
                        {/* Header of guide item: Action selector and delete */}
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={item.type}
                            onChange={(e) => handleUpdateGuideItem(item.id, 'type', e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-700 outline-none focus:border-[var(--color-deep-green)] cursor-pointer"
                          >
                            <option value="diapo">🎬 Diapo</option>
                            <option value="sitio_web">🌐 Sitio Web</option>
                            <option value="chatgpt">🤖 ChatGPT</option>
                            <option value="general">📝 Nota / General</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuideItem(item.id)}
                            className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            title="Eliminar paso"
                          >
                            <span className="material-symbols-outlined text-base leading-none">delete</span>
                          </button>
                        </div>

                        {/* Title input */}
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={(e) => handleUpdateGuideItem(item.id, 'title', e.target.value)}
                          placeholder="Título del paso (ej: ChatGPT gratis vs pago)..."
                          className="w-full text-xs p-1.5 border border-gray-200 rounded-lg focus:border-[var(--color-deep-green)] outline-none font-bold"
                        />

                        {/* URL input for website or chatgpt */}
                        {(item.type === 'sitio_web' || item.type === 'chatgpt') && (
                          <input
                            type="text"
                            value={item.url || ''}
                            onChange={(e) => handleUpdateGuideItem(item.id, 'url', e.target.value)}
                            placeholder={item.type === 'chatgpt' ? "URL/Enlace de ChatGPT (opcional)..." : "Enlace del Sitio Web (ej: google.com)..."}
                            className="w-full text-[10px] p-1.5 border border-gray-200 rounded-lg focus:border-[var(--color-deep-green)] outline-none font-medium"
                          />
                        )}

                        {/* Details textarea */}
                        <textarea
                          value={item.details || ''}
                          onChange={(e) => handleUpdateGuideItem(item.id, 'details', e.target.value)}
                          placeholder="Detalle o instrucción (ej: Mostrar diferencia de costos)..."
                          className="w-full text-[10px] p-1.5 border border-gray-200 rounded-lg h-12 focus:border-[var(--color-deep-green)] outline-none resize-none font-medium leading-normal"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
