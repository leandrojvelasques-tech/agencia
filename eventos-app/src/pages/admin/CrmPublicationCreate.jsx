import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { TERRITORIOS, getTerritorioConfig } from '../../lib/crmConfig'

export default function CrmPublicationCreate() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = !!id

  // Form states
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('post') // 'post' | 'story'
  const [postFormat, setPostFormat] = useState('placa') // 'carrousel' | 'reel' | 'placa' | 'video' | 'otro'
  const [dimensions, setDimensions] = useState('1080x1080') // '1080x1080' | '1080x1920'
  const [territorio, setTerritorio] = useState('')
  const [isTerritorioOpen, setIsTerritorioOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [copy, setCopy] = useState('')
  const [graphicUrl, setGraphicUrl] = useState('')
  const [statusPiece, setStatusPiece] = useState('draft')
  const [statusPost, setStatusPost] = useState('scheduled')

  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(isEdit)
  const [toast, setToast] = useState(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    setActiveSlide(0)
  }, [graphicUrl, postFormat])

  const getGraphicUrls = (urlStr) => {
    if (!urlStr) return []
    const trimmed = urlStr.trim()
    if (trimmed.startsWith('[')) {
      try {
        const urls = JSON.parse(trimmed)
        if (Array.isArray(urls)) return urls
      } catch (e) {
        // fallback
      }
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(u => u.trim()).filter(Boolean)
    }
    return [trimmed]
  }

  const isVideoFile = (url, format) => {
    if (!url) return false
    const cleanUrl = url.split('?')[0].toLowerCase()
    if (
      cleanUrl.endsWith('.mp4') ||
      cleanUrl.endsWith('.mov') ||
      cleanUrl.endsWith('.webm') ||
      cleanUrl.endsWith('.ogg') ||
      cleanUrl.endsWith('.quicktime')
    ) {
      return true
    }
    if (format === 'reel' || format === 'video') {
      return true
    }
    return false
  }

  const handleFileUpload = async (files) => {
    if (!files) return
    const fileList = files instanceof FileList ? Array.from(files) : (Array.isArray(files) ? files : [files])
    if (fileList.length === 0) return

    // Filter and validate files
    const validFiles = []
    for (const file of fileList) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      
      if (!isImage && !isVideo) {
        showToast(`Solo se permiten imágenes o videos. Archivo omitido: ${file.name}`, 'error')
        continue
      }
      
      // Limits: 10 MB for images, 100 MB for videos
      const limit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > limit) {
        showToast(`El archivo "${file.name}" supera el límite permitido (${isVideo ? '100 MB' : '10 MB'}).`, 'error')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setUploading(true)
    setUploadError('')
    
    try {
      const uploadedUrls = []
      for (const file of validFiles) {
        const ext = file.name.split('.').pop()
        const fileName = `crm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
        
        const { error: upErr } = await supabase.storage
          .from('banners')
          .upload(fileName, file, { upsert: true, contentType: file.type })
        
        if (upErr) throw upErr
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName)
        
        uploadedUrls.push(publicUrl)
      }

      if (postFormat === 'carrousel') {
        const currentUrls = getGraphicUrls(graphicUrl)
        const newUrls = [...currentUrls, ...uploadedUrls]
        setGraphicUrl(JSON.stringify(newUrls))
        setActiveSlide(currentUrls.length)
      } else {
        setGraphicUrl(uploadedUrls[0])
      }
      showToast(validFiles.length > 1 ? 'Archivos subidos correctamente.' : 'Archivo subido correctamente.')
    } catch (err) {
      console.error('Error uploading file:', err)
      setUploadError(err.message || 'Error al subir el archivo.')
      showToast('Error al subir el archivo.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const [recurrenceMode, setRecurrenceMode] = useState('single') // 'single' | 'weekly'
  const [endDate, setEndDate] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState([]) // array of getDay() numbers

  const getRecurringDates = (startDateStr, endDateStr, weekDaysArr) => {
    const dates = []
    const start = new Date(startDateStr + 'T00:00:00')
    const end = new Date(endDateStr + 'T00:00:00')
    
    let current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay() // 0 = Sunday, 1 = Monday, etc.
      if (weekDaysArr.includes(dayOfWeek)) {
        const y = current.getFullYear()
        const m = String(current.getMonth() + 1).padStart(2, '0')
        const d = String(current.getDate()).padStart(2, '0')
        dates.push(`${y}-${m}-${d}`)
      }
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  // Automatically compute end date to +1 month when switching to weekly mode
  useEffect(() => {
    if (recurrenceMode === 'weekly' && date && !endDate) {
      const d = new Date(date + 'T00:00:00')
      d.setMonth(d.getMonth() + 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      setEndDate(`${y}-${m}-${day}`)
    }
  }, [recurrenceMode, date, endDate])

  // Load clients and publication if editing
  useEffect(() => {
    async function init() {
      try {
        // Load clients
        const { data: clientsData, error: cErr } = await supabase
          .from('crm_clients')
          .select('*')
          .order('name')
        if (cErr) throw cErr
        setClients(clientsData || [])

        // Set default client ID from query param or first client
        const queryClientId = searchParams.get('client_id')
        if (queryClientId) {
          setClientId(queryClientId)
        } else if (clientsData && clientsData.length > 0) {
          setClientId(clientsData[0].id)
        }

        // Set default date from query param or today
        const queryDate = searchParams.get('date')
        if (queryDate) {
          setDate(queryDate)
        } else {
          setDate(new Date().toISOString().split('T')[0])
        }

        // Fetch publication if editing
        if (isEdit) {
          const { data: pubData, error: pErr } = await supabase
            .from('crm_publications')
            .select('*')
            .eq('id', id)
            .single()
          if (pErr) throw pErr

          if (pubData) {
            setClientId(pubData.client_id)
            setDate(pubData.date)
            setType(pubData.type)
            setPostFormat(pubData.post_format)
            setDimensions(pubData.dimensions || '1080x1080')
            setTerritorio(pubData.territorio || '')
            setTitle(pubData.title)
            setCopy(pubData.copy || '')
            setGraphicUrl(pubData.graphic_url || '')
            setStatusPiece(pubData.status_piece)
            setStatusPost(pubData.status_post)
          }
        }
      } catch (err) {
        console.error('Initialization error:', err)
        showToast('Error al inicializar la página.', 'error')
      } finally {
        setFetchingData(false)
      }
    }

    init()
  }, [id, isEdit, searchParams])

  // Automatically adjust format/dimensions when Type changes
  useEffect(() => {
    if (type === 'story') {
      setDimensions('1080x1920')
      if (postFormat === 'carrousel') {
        setPostFormat('placa')
      }
    } else {
      if (postFormat === 'reel') {
        setDimensions('1080x1920')
      } else {
        setDimensions('1080x1080')
      }
    }
  }, [type])

  // Automatically adjust dimensions when Format changes
  useEffect(() => {
    if (postFormat === 'reel' || postFormat === 'video' && type === 'post') {
      setDimensions('1080x1920')
    } else if (type === 'post') {
      setDimensions('1080x1080')
    }
  }, [postFormat, type])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const selectedClient = clients.find(c => c.id === clientId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      client_id: clientId,
      type,
      post_format: postFormat,
      dimensions,
      territorio: territorio || null,
      title,
      copy: copy || null,
      graphic_url: graphicUrl || null,
      status_piece: statusPiece,
      status_post: statusPost,
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('crm_publications')
          .update({ ...payload, date })
          .eq('id', id)
        if (error) throw error
        showToast('Publicación actualizada correctamente.')
      } else {
        if (recurrenceMode === 'weekly') {
          if (selectedWeekdays.length === 0) {
            showToast('Selecciona al menos un día de la semana para la repetición.', 'error')
            setLoading(false)
            return
          }
          if (!endDate) {
            showToast('Selecciona una fecha de fin para la repetición.', 'error')
            setLoading(false)
            return
          }
          if (endDate < date) {
            showToast('La fecha de fin no puede ser anterior a la fecha de inicio.', 'error')
            setLoading(false)
            return
          }

          // Generate all matching dates
          const datesToInsert = getRecurringDates(date, endDate, selectedWeekdays)
          if (datesToInsert.length === 0) {
            showToast('No se encontraron fechas válidas en el rango para los días seleccionados.', 'error')
            setLoading(false)
            return
          }

          const payloads = datesToInsert.map(d => ({
            ...payload,
            date: d
          }))

          const { error } = await supabase
            .from('crm_publications')
            .insert(payloads)
          if (error) throw error
          showToast(`¡Se programaron ${datesToInsert.length} publicaciones correctamente!`)
        } else {
          const { error } = await supabase
            .from('crm_publications')
            .insert([{ ...payload, date }])
          if (error) throw error
          showToast('Publicación programada correctamente.')
        }
      }
      setTimeout(() => navigate('/admin/crm'), 1000)
    } catch (err) {
      console.error('Error saving publication:', err)
      showToast('Error al guardar la publicación.', 'error')
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('crm_publications')
        .delete()
        .eq('id', id)
      if (error) throw error
      showToast('Publicación eliminada correctamente.')
      setTimeout(() => {
        navigate('/admin/crm')
      }, 1000)
    } catch (err) {
      console.error('Error deleting publication:', err)
      showToast('Error al eliminar la publicación.', 'error')
      setLoading(false)
    }
  }
  
  if (fetchingData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/30 animate-pulse">
          hourglass_empty
        </span>
        <p className="text-sm font-semibold text-[var(--color-dark-gray)]/50 mt-3">
          Cargando datos de la publicación...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
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

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/crm"
          className="p-2 border border-gray-200 rounded-premium hover:bg-gray-50 text-[var(--color-dark-gray)] transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--color-deep-green)]">
            {isEdit ? 'Editar Publicación' : 'Programar Publicación'}
          </h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-1">
            {isEdit ? 'Modificá los detalles de la publicación programada.' : 'Completá los campos para planificar un nuevo post.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Container (Left) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 card p-8 bg-white space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="form-input border border-gray-200 bg-white focus:bg-white"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Scheduling Type and Dates */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-premium border border-gray-150">
              {/* Mode Select */}
              <div className={isEdit ? "md:col-span-2" : ""}>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                  Tipo de Programación
                </label>
                <select
                  value={recurrenceMode}
                  onChange={(e) => setRecurrenceMode(e.target.value)}
                  disabled={isEdit}
                  className="form-input border border-gray-200 bg-white"
                >
                  <option value="single">Fecha Única</option>
                  {!isEdit && <option value="weekly">Repetición Semanal (Múltiples días)</option>}
                </select>
                {isEdit && (
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    La edición de publicaciones es de fecha única.
                  </span>
                )}
              </div>

              {/* Start Date / Single Date */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                  {recurrenceMode === 'weekly' ? 'Fecha de Inicio' : 'Fecha de Publicación'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="form-input border border-gray-200 bg-white"
                />
              </div>

              {/* End Date (Weekly only) */}
              {recurrenceMode === 'weekly' && (
                <div className="animate-fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="form-input border border-gray-200 bg-white"
                  />
                </div>
              )}

              {/* Weekday Selector (Weekly only) */}
              {recurrenceMode === 'weekly' && (
                <div className="md:col-span-2 animate-fade-in space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block">
                    Días de la semana para publicar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Lunes', value: 1 },
                      { label: 'Martes', value: 2 },
                      { label: 'Miércoles', value: 3 },
                      { label: 'Jueves', value: 4 },
                      { label: 'Viernes', value: 5 },
                      { label: 'Sábado', value: 6 },
                      { label: 'Domingo', value: 0 },
                    ].map((day) => {
                      const isSelected = selectedWeekdays.includes(day.value)
                      return (
                        <button
                          type="button"
                          key={day.value}
                          onClick={() => {
                            setSelectedWeekdays((prev) =>
                              isSelected
                                ? prev.filter((d) => d !== day.value)
                                : [...prev, day.value]
                            )
                          }}
                          className={`px-3 py-2 rounded-premium-btn text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)] shadow-sm'
                              : 'bg-white text-[var(--color-dark-gray)] border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Se creará una publicación en el calendario para cada uno de los días de la semana seleccionados que se encuentren dentro del rango.
                  </span>
                </div>
              )}
            </div>

            {/* Classification Selector */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-3">
                Clasificación de Publicación
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'post_placa', label: 'Post (Feed)', icon: 'image', desc: 'Placa o video en feed' },
                  { id: 'post_reel', label: 'Reel', icon: 'movie', desc: 'Video vertical vertical' },
                  { id: 'post_carrousel', label: 'Carrusel', icon: 'photo_library', desc: 'Múltiples imágenes' },
                  { id: 'story', label: 'Historia', icon: 'filter_frames', desc: 'Story vertical (24h)' },
                ].map((opt) => {
                  let isSelected = false
                  if (opt.id === 'post_placa') {
                    isSelected = type === 'post' && (postFormat === 'placa' || postFormat === 'video' || postFormat === 'otro')
                  } else if (opt.id === 'post_reel') {
                    isSelected = type === 'post' && postFormat === 'reel'
                  } else if (opt.id === 'post_carrousel') {
                    isSelected = type === 'post' && postFormat === 'carrousel'
                  } else if (opt.id === 'story') {
                    isSelected = type === 'story'
                  }

                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => {
                        if (opt.id === 'post_placa') {
                          setType('post')
                          setPostFormat('placa')
                          setDimensions('1080x1080')
                        } else if (opt.id === 'post_reel') {
                          setType('post')
                          setPostFormat('reel')
                          setDimensions('1080x1920')
                        } else if (opt.id === 'post_carrousel') {
                          setType('post')
                          setPostFormat('carrousel')
                          setDimensions('1080x1080')
                        } else if (opt.id === 'story') {
                          setType('story')
                          setPostFormat('placa')
                          setDimensions('1080x1920')
                        }
                      }}
                      className={`border rounded-premium p-4 flex flex-col items-center text-center justify-between cursor-pointer transition-all h-28 ${
                        isSelected 
                          ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 font-bold text-[var(--color-deep-green)] ring-1 ring-[var(--color-deep-green)]/15 shadow-sm' 
                          : 'border-gray-200 hover:bg-gray-50 text-[var(--color-dark-gray)]/70'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl mb-1.5">{opt.icon}</span>
                      <div>
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[9px] text-[var(--color-dark-gray)]/40 font-medium mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Format Refinement selector (only if Post or Story is selected, and not reel/carrousel) */}
            {((type === 'post' && postFormat !== 'reel' && postFormat !== 'carrousel') || type === 'story') && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                  Formato de {type === 'post' ? 'Post' : 'Historia'}
                </label>
                <select
                  value={postFormat}
                  onChange={(e) => setPostFormat(e.target.value)}
                  className="form-input border border-gray-200 bg-white"
                >
                  {type === 'post' ? (
                    <>
                      <option value="placa">Placa Única (Imagen)</option>
                      <option value="video">Video Feed</option>
                      <option value="otro">Otro</option>
                    </>
                  ) : (
                    <>
                      <option value="placa">Placa (Imagen)</option>
                      <option value="video">Video Corto</option>
                      <option value="otro">Otro</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Dimensions */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Dimensiones sugeridas
              </label>
              <select
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className="form-input border border-gray-200 bg-white"
              >
                <option value="1080x1080">Cuadrado (1080 x 1080 px)</option>
                <option value="1080x1350">Vertical / Retrato (1080 x 1350 px)</option>
                <option value="1080x1920">Vertical / Reel (1080 x 1920 px)</option>
              </select>
            </div>

            {/* Territorio */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Territorio / Eje temático
              </label>
              <div className="relative">
                {(() => {
                  const activeConfig = getTerritorioConfig(territorio)
                  return (
                    <button
                      type="button"
                      onClick={() => setIsTerritorioOpen(!isTerritorioOpen)}
                      className={`form-input border text-left flex items-center justify-between w-full cursor-pointer h-10 px-3 py-2 rounded-premium text-sm font-bold transition-all ${
                        territorio 
                          ? `${activeConfig.color.bg} ${activeConfig.color.border} ${activeConfig.color.text}` 
                          : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      <span>
                        {territorio || 'Seleccionar territorio...'}
                      </span>
                      <span className="material-symbols-outlined select-none opacity-80">
                        {isTerritorioOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                      </span>
                    </button>
                  )
                })()}

                {isTerritorioOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsTerritorioOpen(false)} 
                    />
                    
                    {/* Dropdown Menu */}
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-premium shadow-xl z-40 py-1 max-h-60 overflow-y-auto animate-fade-in flex flex-col gap-0.5">
                      {TERRITORIOS.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setTerritorio(opt.id)
                            setIsTerritorioOpen(false)
                          }}
                          className={`relative group/opt px-4 py-2.5 text-xs font-bold cursor-pointer flex items-center justify-between transition-colors border-b last:border-b-0 border-black/5 ${opt.color.bg} ${opt.color.text} ${opt.color.hoverBg}`}
                        >
                          <span>{opt.label}</span>
                          
                          {/* Info Indicator */}
                          <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-base cursor-help">info</span>
                            
                            {/* Custom Tooltip */}
                            <div className="hidden group-hover/opt:block absolute bottom-full right-0 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 mb-2 md:mb-0 md:ml-3 w-72 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-premium p-3.5 shadow-2xl z-50 pointer-events-none transition-all duration-200 border border-gray-850 animate-fade-in text-left">
                              <p className="font-bold text-[var(--color-deep-green)] mb-1 text-[11px] uppercase tracking-wider">{opt.label}</p>
                              <p className="font-medium text-gray-200 leading-relaxed text-[11px] normal-case">{opt.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Título del Post
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre descriptivo interno"
                required
                className="form-input border border-gray-200 bg-white"
              />
            </div>

            {/* Graphic Piece URL & File Upload */}
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-1 flex items-center justify-between">
                <span>Pieza Gráfica (Imagen / Video)</span>
                <span className="text-[10px] text-[var(--color-dark-gray)]/40 font-semibold normal-case">Subí un archivo o pegá un link</span>
              </label>

              {/* Drag and Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-premium p-6 text-center transition-all cursor-pointer hover:border-[var(--color-deep-green)]/40 hover:bg-[var(--color-deep-green)]/2 ${
                  uploading ? 'border-[var(--color-deep-green)]/35 opacity-70' : 'border-gray-200'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (uploading) return
                  const files = e.dataTransfer.files
                  if (files && files.length > 0) handleFileUpload(files)
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={postFormat === 'carrousel' ? "image/*" : "image/*,video/*"}
                  multiple={postFormat === 'carrousel'}
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) handleFileUpload(files)
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)] animate-spin">sync</span>
                    <p className="text-xs font-bold text-[var(--color-deep-green)] mt-2">Subiendo archivo a Supabase...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <span className="material-symbols-outlined text-3xl text-gray-400 mb-1.5">upload_file</span>
                    <p className="text-xs font-semibold text-gray-600">
                      Arrastrá {postFormat === 'carrousel' ? 'imágenes' : 'un archivo'} o hacé clic para seleccionar
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {postFormat === 'carrousel' ? 'Imágenes (máx. 10MB c/u)' : 'Imágenes (máx. 10MB) o Videos (máx. 100MB)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Carousel Thumbnail Gallery */}
              {postFormat === 'carrousel' && (() => {
                const carouselUrls = getGraphicUrls(graphicUrl)
                if (carouselUrls.length === 0) return null
                return (
                  <div className="mt-4 p-3 bg-gray-50/50 rounded-premium border border-gray-150 space-y-2">
                    <p className="text-xs font-bold text-gray-500">Imágenes en el carrusel ({carouselUrls.length})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {carouselUrls.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                          <img src={url} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newUrls = [...carouselUrls]
                                  const temp = newUrls[idx - 1]
                                  newUrls[idx - 1] = newUrls[idx]
                                  newUrls[idx] = temp
                                  setGraphicUrl(JSON.stringify(newUrls))
                                  setActiveSlide(idx - 1)
                                }}
                                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                                title="Mover izquierda"
                              >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const newUrls = carouselUrls.filter((_, i) => i !== idx)
                                setGraphicUrl(newUrls.length > 0 ? JSON.stringify(newUrls) : '')
                                setActiveSlide(0)
                              }}
                              className="w-7 h-7 rounded-full bg-red-650/80 hover:bg-red-650 text-white flex items-center justify-center transition-colors"
                              title="Eliminar imagen"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>

                            {idx < carouselUrls.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newUrls = [...carouselUrls]
                                  const temp = newUrls[idx + 1]
                                  newUrls[idx + 1] = newUrls[idx]
                                  newUrls[idx] = temp
                                  setGraphicUrl(JSON.stringify(newUrls))
                                  setActiveSlide(idx + 1)
                                }}
                                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                                title="Mover derecha"
                              >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {uploadError && (
                <p className="text-[11px] text-red-650 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span> {uploadError}
                </p>
              )}

              {/* URL Input */}
              <div>
                <input
                  type="text"
                  value={graphicUrl}
                  onChange={(e) => setGraphicUrl(e.target.value)}
                  placeholder="https://ejemplo.com/tu-diseno.png"
                  className="form-input border border-gray-200 bg-white"
                />
                <span className="text-[9px] text-gray-400 font-medium mt-1 block pl-1">
                  URL del recurso gráfico cargado.
                </span>
              </div>
            </div>

            {/* Copy / Caption */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Copy / Texto de la publicación
              </label>
              <textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Escribí el texto de la publicación y los hashtags correspondientes..."
                rows={5}
                className="form-input border border-gray-200 bg-white resize-y font-mono text-xs"
              />
              <div className="text-right text-[10px] font-bold text-[var(--color-dark-gray)]/40 mt-1">
                {copy.length} caracteres
              </div>
            </div>

            {/* Status of the piece */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Estado de la Pieza
              </label>
              <select
                value={statusPiece}
                onChange={(e) => setStatusPiece(e.target.value)}
                className="form-input border border-gray-200 bg-white"
              >
                <option value="draft">Borrador / Ideas sin armar</option>
                <option value="pending_assets">Pendiente recibir fotos y info</option>
                <option value="pending_design">Pendiente diseñar placa / editar</option>
                <option value="ready">Lista (Aprobada por cliente)</option>
                <option value="published">Publicada en Redes</option>
              </select>
            </div>

            {/* Status of the post scheduling */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Estado de la publicación
              </label>
              <select
                value={statusPost}
                onChange={(e) => setStatusPost(e.target.value)}
                className="form-input border border-gray-200 bg-white"
              >
                <option value="draft">Borrador</option>
                <option value="scheduled">Programado en Calendario</option>
                <option value="published">Publicado / Subido</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Eliminar Publicación
              </button>
            )}
            <Link
              to="/admin/crm"
              className="btn-secondary"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  {isEdit ? 'Actualizar' : 'Programar'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Real-time Mockup Container (Right) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 block pl-2">
            Vista Previa de la Maqueta (Instagram)
          </h3>
          
          {type === 'post' ? (
            /* Instagram Post Mockup */
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden max-w-sm mx-auto animate-slide-in">
              {/* Post Header */}
              <div className="p-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-deep-green)] text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                    {selectedClient?.name ? selectedClient.name.charAt(0) : 'C'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">
                      {selectedClient?.name || 'Cliente'}
                    </p>
                    {territorio && (
                      <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase">
                        {territorio}
                      </p>
                    )}
                  </div>
                </div>
                <button type="button" className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined text-lg leading-none font-bold">more_horiz</span>
                </button>
              </div>

              {/* Graphic container (1:1 or 9:16 aspect ratio box) */}
              <div className={`w-full relative bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100 ${
                dimensions === '1080x1920' ? 'aspect-[9/16]' : dimensions === '1080x1350' ? 'aspect-[4/5]' : 'aspect-square'
              }`}>
                {postFormat === 'carrousel' ? (
                  (() => {
                    const carouselUrls = getGraphicUrls(graphicUrl)
                    if (carouselUrls.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                          <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">photo_library</span>
                          <p className="text-xs font-bold uppercase tracking-wider">Carrusel de imágenes</p>
                          <p className="text-[10px] mt-1 text-gray-400/80 font-medium">{dimensions} px</p>
                        </div>
                      )
                    }
                    const activeUrl = carouselUrls[activeSlide] || carouselUrls[0]
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={activeUrl}
                          alt={`Carrusel diapositiva ${activeSlide + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {carouselUrls.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveSlide(prev => (prev === 0 ? carouselUrls.length - 1 : prev - 1))
                              }}
                              className="absolute left-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 select-none"
                            >
                              <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveSlide(prev => (prev === carouselUrls.length - 1 ? 0 : prev + 1))
                              }}
                              className="absolute right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 select-none"
                            >
                              <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                            
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                              {carouselUrls.map((_, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveSlide(idx)
                                  }}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    idx === activeSlide ? 'bg-white scale-125' : 'bg-white/55 hover:bg-white/80'
                                  }`}
                                />
                              ))}
                            </div>
                            
                            {/* Slide Counter Indicator */}
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-bold tracking-wider">
                              {activeSlide + 1} / {carouselUrls.length}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  graphicUrl ? (
                    isVideoFile(graphicUrl, postFormat) ? (
                      <video
                        key={graphicUrl}
                        src={graphicUrl}
                        controls
                        loop
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fb = e.target.parentNode.querySelector('.fallback-msg');
                          if (fb) fb.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <img
                        src={graphicUrl}
                        alt="Pieza gráfica"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fb = e.target.parentNode.querySelector('.fallback-msg');
                          if (fb) fb.style.display = 'flex';
                        }}
                      />
                    )
                  ) : (
                    /* Fallback placeholder */
                    <div className="fallback-msg absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">
                        {postFormat === 'reel' ? 'movie' : 'image'}
                      </span>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        {postFormat === 'reel' ? 'Video Reel' : 'Pieza Gráfica'}
                      </p>
                      <p className="text-[10px] mt-1 text-gray-400/80 font-medium">
                        {dimensions} px
                      </p>
                    </div>
                  )
                )}

                {/* Sizing indicator badge */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  {dimensions}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 flex items-center justify-between text-gray-700">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-2xl hover:text-red-500 cursor-pointer">favorite</span>
                  <span className="material-symbols-outlined text-2xl hover:text-blue-500 cursor-pointer">chat_bubble</span>
                  <span className="material-symbols-outlined text-2xl hover:text-emerald-500 cursor-pointer">send</span>
                </div>
                <span className="material-symbols-outlined text-2xl cursor-pointer">bookmark</span>
              </div>

              {/* Copy section */}
              <div className="p-3.5 pt-0 text-left border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-900">
                  {selectedClient?.name || 'Cliente'} 
                  <span className="font-normal text-gray-800 ml-1.5 whitespace-pre-wrap leading-relaxed">
                    {copy || 'Escribe un copy en el formulario para verlo reflejado en esta maqueta de Instagram...'}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            /* Instagram Story Mockup */
            <div className="bg-gray-900 border-[8px] border-black rounded-[2.5rem] shadow-2xl overflow-hidden max-w-sm mx-auto aspect-[9/16] relative text-white animate-slide-in">
              {/* Background graphic */}
              {graphicUrl ? (
                isVideoFile(graphicUrl, postFormat) ? (
                  <video
                    key={graphicUrl}
                    src={graphicUrl}
                    controls
                    loop
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fb = e.target.parentNode.querySelector('.fallback-msg-story');
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                ) : (
                  <img
                    src={graphicUrl}
                    alt="Story graphic"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fb = e.target.parentNode.querySelector('.fallback-msg-story');
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                )
              ) : null}

              {/* Fallback for story */}
              <div 
                className="fallback-msg-story absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-500"
                style={{ display: graphicUrl ? 'none' : 'flex' }}
              >
                <span className="material-symbols-outlined text-5xl mb-3 text-gray-700">
                  {postFormat === 'video' ? 'video_file' : 'photo_album'}
                </span>
                <p className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  Historia Vertical
                </p>
                <p className="text-xs mt-1 text-gray-500 font-semibold">
                  1080 x 1920 px (9:16)
                </p>
              </div>

              {/* Story Top Indicators */}
              <div className="absolute top-4 inset-x-4 z-10 space-y-3">
                {/* Progress bars */}
                <div className="flex gap-1">
                  <div className="h-0.5 bg-white flex-1 rounded-full"></div>
                  <div className="h-0.5 bg-white/40 flex-1 rounded-full"></div>
                  <div className="h-0.5 bg-white/40 flex-1 rounded-full"></div>
                </div>

                {/* Profile Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-deep-green)] text-white font-extrabold flex items-center justify-center text-xs shadow-md border border-white/20">
                      {selectedClient?.name ? selectedClient.name.charAt(0) : 'C'}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight shadow-text">
                        {selectedClient?.name || 'Cliente'}
                      </p>
                      {territorio && (
                        <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wider">
                          {territorio}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-lg leading-none cursor-pointer">close</span>
                </div>
              </div>

              {/* Story copy overlay at the bottom */}
              <div className="absolute bottom-6 inset-x-4 z-10 space-y-4">
                {copy && (
                  <div className="bg-black/60 backdrop-blur-md p-3.5 rounded-2xl text-left border border-white/10 shadow-lg">
                    <p className="text-xs font-medium text-white leading-relaxed whitespace-pre-wrap">
                      {copy}
                    </p>
                  </div>
                )}
                {/* Simulated interaction bar */}
                <div className="flex items-center justify-between gap-3 text-white">
                  <div className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-xs text-white/60 font-semibold backdrop-blur-sm text-left">
                    Enviar mensaje...
                  </div>
                  <span className="material-symbols-outlined text-2xl cursor-pointer hover:scale-105 transition-transform">favorite</span>
                  <span className="material-symbols-outlined text-2xl cursor-pointer hover:scale-105 transition-transform">send</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
