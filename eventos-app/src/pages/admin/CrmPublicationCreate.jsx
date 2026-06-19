import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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
  const [title, setTitle] = useState('')
  const [copy, setCopy] = useState('')
  const [graphicUrl, setGraphicUrl] = useState('')
  const [statusPiece, setStatusPiece] = useState('draft')
  const [statusPost, setStatusPost] = useState('scheduled')

  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(isEdit)
  const [toast, setToast] = useState(null)

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
      date,
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
          .update(payload)
          .eq('id', id)
        if (error) throw error
        showToast('Publicación actualizada correctamente.')
      } else {
        const { error } = await supabase
          .from('crm_publications')
          .insert([payload])
        if (error) throw error
        showToast('Publicación programada correctamente.')
      }
      setTimeout(() => navigate('/admin/crm'), 1000)
    } catch (err) {
      console.error('Error saving publication:', err)
      showToast('Error al guardar la publicación.', 'error')
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

            {/* Date */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Fecha de Publicación
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="form-input border border-gray-200 bg-white"
              />
            </div>

            {/* Type selector (Post vs Story) */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Canal de Publicación
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`border rounded-premium p-4 flex items-center justify-center gap-3 cursor-pointer transition-all ${
                  type === 'post' 
                    ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 font-bold text-[var(--color-deep-green)]' 
                    : 'border-gray-200 hover:bg-gray-50 text-[var(--color-dark-gray)]/70'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="post"
                    checked={type === 'post'}
                    onChange={() => setType('post')}
                    className="sr-only"
                  />
                  <span className="material-symbols-outlined">grid_on</span>
                  Feed (Post / Reel)
                </label>
                <label className={`border rounded-premium p-4 flex items-center justify-center gap-3 cursor-pointer transition-all ${
                  type === 'story' 
                    ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 font-bold text-[var(--color-deep-green)]' 
                    : 'border-gray-200 hover:bg-gray-50 text-[var(--color-dark-gray)]/70'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="story"
                    checked={type === 'story'}
                    onChange={() => setType('story')}
                    className="sr-only"
                  />
                  <span className="material-symbols-outlined">filter_frames</span>
                  Historia (Story)
                </label>
              </div>
            </div>

            {/* Format selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Formato del Contenido
              </label>
              <select
                value={postFormat}
                onChange={(e) => setPostFormat(e.target.value)}
                className="form-input border border-gray-200 bg-white"
              >
                {type === 'post' ? (
                  <>
                    <option value="placa">Placa Única (Imagen)</option>
                    <option value="carrousel">Carrusel (Imágenes)</option>
                    <option value="reel">Video Reel (Vertical)</option>
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
                <option value="1080x1920">Vertical / Reel (1080 x 1920 px)</option>
              </select>
            </div>

            {/* Territorio */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2">
                Territorio / Eje temático
              </label>
              <input
                type="text"
                value={territorio}
                onChange={(e) => setTerritorio(e.target.value)}
                placeholder="Ej: PROMOCIONES, GASTRONOMIA, SALON"
                className="form-input border border-gray-200 bg-white"
              />
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

            {/* Graphic Piece URL */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/60 block mb-2 flex items-center justify-between">
                <span>URL de la Pieza Gráfica (Imagen / Video)</span>
                <span className="text-[10px] text-[var(--color-dark-gray)]/40 font-semibold normal-case">Link de Drive, Canva o Supabase</span>
              </label>
              <input
                type="url"
                value={graphicUrl}
                onChange={(e) => setGraphicUrl(e.target.value)}
                placeholder="https://ejemplo.com/tu-diseno.png"
                className="form-input border border-gray-200 bg-white"
              />
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
                dimensions === '1080x1920' ? 'aspect-[9/16]' : 'aspect-square'
              }`}>
                {graphicUrl ? (
                  <img
                    src={graphicUrl}
                    alt="Pieza gráfica"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // fallback for invalid url
                      e.target.style.display = 'none';
                      e.target.parentNode.querySelector('.fallback-msg').style.display = 'block';
                    }}
                  />
                ) : null}
                
                {/* Fallback placeholder */}
                <div 
                  className="fallback-msg absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400"
                  style={{ display: graphicUrl ? 'none' : 'flex' }}
                >
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
                <img
                  src={graphicUrl}
                  alt="Story graphic"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.querySelector('.fallback-msg-story').style.display = 'flex';
                  }}
                />
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
