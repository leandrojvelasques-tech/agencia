import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTerritorioConfig } from '../../lib/crmConfig'

export default function CrmClientPortal() {
  const { token } = useParams()
  
  // State
  const [client, setClient] = useState(null)
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState(null)

  // Track active slide index for each individual publication: { [pubId]: slideIndex }
  const [activeSlides, setActiveSlides] = useState({})

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

  const getDisplayThumbnail = (pub) => {
    if (!pub) return ''
    if (pub.graphic_url) {
      const urls = getGraphicUrls(pub.graphic_url)
      if (urls.length > 0) return urls[0]
    }
    if (pub.raw_assets) {
      const rawUrls = getGraphicUrls(pub.raw_assets)
      if (rawUrls.length > 0) return rawUrls[0]
    }
    return ''
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

  // Fetch client and publications
  useEffect(() => {
    async function loadPortalData() {
      setLoading(true)
      try {
        // Fetch client by share_token
        const { data: clientData, error: cErr } = await supabase
          .from('crm_clients')
          .select('*')
          .eq('share_token', token)
          .maybeSingle()

        if (cErr) throw cErr
        if (!clientData) {
          setErrorState('El enlace que estás utilizando es inválido o ha expirado. Por favor, solicitá un nuevo acceso.')
          setLoading(false)
          return
        }

        setClient(clientData)

        // Fetch client publications (show all publications sorted by date)
        const { data: pubs, error: pErr } = await supabase
          .from('crm_publications')
          .select('*')
          .eq('client_id', clientData.id)
          .order('date', { ascending: true })

        if (pErr) throw pErr
        setPublications(pubs || [])
      } catch (err) {
        console.error('Error loading client portal:', err)
        setErrorState('Hubo un inconveniente al cargar el calendario. Por favor, intentá nuevamente.')
      } finally {
        setLoading(false)
      }
    }

    loadPortalData()
  }, [token])

  const getPublicationState = (pub) => {
    if (!pub) return { label: 'Pendiente', colorClass: 'bg-gray-400', badgeClass: 'bg-gray-100 text-gray-800 border-gray-200' }
    const hasPendingTasks = pub.status_piece && pub.status_piece.trim() !== ''
    if (hasPendingTasks) {
      return {
        id: 'design_in_progress',
        label: 'En proceso de diseño',
        colorClass: 'bg-gray-400',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    } else {
      const isProgrammed = pub.status_post === 'scheduled' || pub.status_post === 'published'
      if (isProgrammed) {
        return {
          id: 'done_programmed',
          label: 'Diseño terminado y programado en Meta',
          colorClass: 'bg-emerald-500',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        }
      } else {
        return {
          id: 'done_not_programmed',
          label: 'Diseño terminado sin programar en Meta',
          colorClass: 'bg-amber-500',
          badgeClass: 'bg-amber-100 text-amber-850 border-amber-250'
        }
      }
    }
  }

  // Prefilled WhatsApp feedback generator
  const getWhatsAppLink = (pub) => {
    if (!pub || !client) return '#'
    const formattedDate = pub.date.split('-').reverse().join('/')
    const text = `Hola Leandro! Estuve viendo la publicación "${pub.title}" programada para el día ${formattedDate} en el calendario de ${client.name}. Quería comentarte que: `
    return `https://wa.me/5492974059568?text=${encodeURIComponent(text)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)] p-6">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] animate-spin">
            sync
          </span>
          <p className="font-heading text-sm font-bold text-[var(--color-deep-green)] tracking-widest mt-4">
            CARGANDO PORTAL DE CLIENTE...
          </p>
        </div>
      </div>
    )
  }

  if (errorState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)] p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center animate-fade-in">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-4">gpp_maybe</span>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Acceso No Autorizado</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {errorState}
          </p>
          <a
            href="https://wa.me/5492974059568"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-deep-green)] text-white font-bold rounded-premium-btn shadow-md hover:bg-opacity-95 transition-all text-sm w-full justify-center"
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    )
  }

  // Filter to show only feed posts from the current month onwards for revision
  const now = new Date()
  const firstDayOfCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const feedPubs = publications
    .filter(pub => pub.type === 'post' && pub.date >= firstDayOfCurrentMonth)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)] pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://www.leandrovelasques.com.ar/logo_triskel.png"
              alt="Logo Triskel"
              className="h-8 w-auto"
              style={{ mixBlendMode: 'multiply' }}
            />
            <div className="flex flex-col border-l border-gray-200 pl-3">
              <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-xs tracking-wider uppercase leading-none">
                LEANDRO VELASQUES
              </span>
              <span className="text-[9px] font-bold text-gray-400 mt-0.5 tracking-widest uppercase">
                Agencia de IA & Automatización
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[var(--color-refined-gray)]/60 px-4 py-2 rounded-full border border-gray-200">
            <div className="w-6 h-6 rounded-full bg-[var(--color-deep-green)] text-white font-bold flex items-center justify-center text-xs">
              {client.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-gray-900">{client.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
        {/* Banner Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-150 shadow-sm">
          <div>
            <h2 className="text-3xl font-extrabold text-[var(--color-deep-green)]">Revisión de Contenidos</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xl">
              Revisá las publicaciones planificadas para tu marca. Deslizá hacia abajo para ver las maquetas y envianos tu feedback directo por WhatsApp.
            </p>
          </div>
          <div className="bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15 px-4.5 py-2.5 rounded-2xl flex items-center gap-2 self-start md:self-center">
            <span className="material-symbols-outlined text-[var(--color-deep-green)] font-bold text-sm">auto_awesome</span>
            <span className="text-xs font-bold text-[var(--color-deep-green)]">{feedPubs.length} Publicaciones</span>
          </div>
        </div>

        {/* Vertical Feed List */}
        {feedPubs.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-gray-150 shadow-sm text-gray-400">
            <span className="material-symbols-outlined text-5xl block mb-3">grid_off</span>
            <p className="text-sm font-bold uppercase tracking-wider">No hay publicaciones planificadas para revisión.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {feedPubs.map((pub) => {
              const activeSlide = activeSlides[pub.id] || 0
              const terrConfig = getTerritorioConfig(pub.territorio)
              const firstUrl = getDisplayThumbnail(pub)
              const isVideo = firstUrl ? isVideoFile(firstUrl, pub.post_format) : false
              const carouselUrls = getGraphicUrls(pub.graphic_url || pub.raw_assets)

              return (
                <div
                  key={pub.id}
                  className="bg-white rounded-3xl border border-gray-150 shadow-md p-6 md:p-8 flex flex-col lg:flex-row gap-8 relative text-left hover:shadow-lg transition-all duration-300"
                >
                  {/* Left Side: Mockup Preview Area */}
                  <div className="lg:w-1/2 flex items-center justify-center">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden w-full max-w-sm">
                      {/* Mockup Header */}
                      <div className="p-3 flex items-center justify-between border-b border-gray-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-deep-green)] text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{client.name}</p>
                            {pub.territorio && (
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                {pub.territorio}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Graphic image container */}
                      <div className={`w-full relative bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100 ${
                        pub.dimensions === '1080x1920' ? 'aspect-[9/16]' : pub.dimensions === '1080x1350' ? 'aspect-[4/5]' : pub.dimensions === '1080x1440' ? 'aspect-[3/4]' : 'aspect-square'
                      }`}>
                        {pub.post_format === 'carrousel' ? (
                          (() => {
                            if (carouselUrls.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
                                  <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">photo_library</span>
                                  <p className="text-xs font-bold uppercase tracking-wider">Carrusel de imágenes</p>
                                  <p className="text-[10px] mt-1 text-gray-400/80 font-medium">{pub.dimensions || '1080x1080'} px</p>
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
                                        const nextSlide = activeSlide === 0 ? carouselUrls.length - 1 : activeSlide - 1
                                        handleSlideChange(pub.id, nextSlide)
                                      }}
                                      className="absolute left-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10 select-none"
                                    >
                                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const nextSlide = activeSlide === carouselUrls.length - 1 ? 0 : activeSlide + 1
                                        handleSlideChange(pub.id, nextSlide)
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
                                            handleSlideChange(pub.id, idx)
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
                          firstUrl ? (
                            isVideo ? (
                              <video
                                key={firstUrl}
                                src={firstUrl}
                                controls
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover animate-fade-in"
                              />
                            ) : (
                              <img
                                src={firstUrl}
                                alt={pub.title}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
                              <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">
                                {pub.post_format === 'reel' ? 'movie' : 'image'}
                              </span>
                              <p className="text-xs font-bold uppercase tracking-wider">
                                {pub.post_format === 'reel' ? 'Video Reel' : 'Pieza Gráfica'}
                              </p>
                              <p className="text-[10px] mt-1 text-gray-400/80">
                                {pub.dimensions || '1080x1080'} px
                              </p>
                            </div>
                          )
                        )}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                          {pub.dimensions || '1080x1080'}
                        </div>
                      </div>

                      {/* Actions Mockup */}
                      <div className="p-3.5 flex items-center gap-4 text-gray-700">
                        <span className="material-symbols-outlined text-xl animate-pulse text-red-500">favorite</span>
                        <span className="material-symbols-outlined text-xl">chat_bubble</span>
                        <span className="material-symbols-outlined text-xl">send</span>
                      </div>

                      {/* Copy Mockup */}
                      <div className="p-3.5 pt-0 text-left border-t border-gray-150 max-h-[140px] overflow-y-auto bg-gray-50/20">
                        <p className="text-xs font-semibold text-gray-900">
                          {client.name} 
                          <span className="font-normal text-gray-800 ml-1.5 whitespace-pre-wrap leading-relaxed">
                            {pub.copy || 'Sin copy redactado.'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Description & Feedback details */}
                  <div className="lg:w-1/2 flex flex-col justify-between py-2">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-black text-[var(--color-deep-green)] mt-0 leading-snug">
                          {pub.title}
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                          Fecha programada: {pub.date.split('-').reverse().join('/')}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--color-refined-gray)]/40 border border-gray-150 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo / Canal</p>
                            <p className="text-xs font-bold text-gray-850 mt-0.5 capitalize">
                              Feed Post
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Formato de Pieza</p>
                            <p className="text-xs font-bold text-gray-850 mt-0.5 capitalize">
                              {pub.post_format}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dimensiones</p>
                            <p className="text-xs font-bold text-gray-850 mt-0.5">
                              {pub.dimensions || '1080 x 1080 px'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Temática / Territorio</p>
                            {pub.territorio ? (
                              (() => {
                                const tConf = getTerritorioConfig(pub.territorio)
                                return (
                                  <div className="relative group/terr inline-block mt-0.5">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-help ${tConf.color.badge}`}>
                                      {pub.territorio}
                                    </span>
                                    <div className="hidden group-hover/terr:block absolute z-50 bottom-full left-0 mb-2 w-64 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-premium p-2.5 shadow-2xl border border-gray-800 pointer-events-none normal-case leading-relaxed font-normal text-left">
                                      <p className="font-bold text-[var(--color-deep-green)] mb-1 text-[10px] uppercase tracking-wider">{pub.territorio}</p>
                                      {tConf.desc}
                                    </div>
                                  </div>
                                )
                              })()
                            ) : (
                              <p className="text-xs font-bold text-gray-850 mt-0.5">-</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {pub.copy && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Texto de Publicación (Copy)</p>
                          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">
                            {pub.copy}
                          </div>
                        </div>
                      )}

                      {pub.status_piece &&
                       !['draft', 'ready', 'published', 'pending_design', 'pending_assets'].includes(pub.status_piece) &&
                       pub.status_piece.trim() !== '' && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-amber-600">assignment_late</span>
                            Tareas Pendientes
                          </p>
                          <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-xl text-xs text-amber-955 space-y-1.5 max-h-[150px] overflow-y-auto">
                            {pub.status_piece.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-[14px] leading-none mt-0.5 text-amber-600 select-none">radio_button_unchecked</span>
                                <span className="leading-tight font-medium">{line}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pub.notes && pub.notes.trim() !== '' && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-gray-550">info</span>
                            Observaciones
                          </p>
                          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs text-gray-800 leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                            {pub.notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feedback via WhatsApp Button */}
                    <div className="pt-6 border-t border-gray-100 mt-6 space-y-3">
                      <p className="text-xs text-gray-500 font-semibold">
                        ¿Querés hacer algún cambio en esta publicación? Mandanos tus observaciones directo a WhatsApp:
                      </p>
                      <a
                        href={getWhatsAppLink(pub)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-4 px-6 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-premium font-bold text-center flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5 text-sm"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 448 512">
                          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.1-3.2-5.5-.3-8.5 2.4-11.2 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.8-5.7 5.7-9.4 1.9-3.7 1-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.7 9.1 31.7 11.7 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path>
                        </svg>
                        Enviar Feedback a Leandro
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
