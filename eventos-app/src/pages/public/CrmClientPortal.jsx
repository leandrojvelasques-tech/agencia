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
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPub, setSelectedPub] = useState(null) // for modal details
  const [viewMode, setViewMode] = useState('calendar')

  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    setActiveSlide(0)
  }, [selectedPub])

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

  const getFirstGraphicUrl = (urlStr) => {
    const urls = getGraphicUrls(urlStr)
    return urls.length > 0 ? urls[0] : ''
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

        // Fetch client publications (filter out draft publications to keep clients seeing only planned/published items)
        const { data: pubs, error: pErr } = await supabase
          .from('crm_publications')
          .select('*')
          .eq('client_id', clientData.id)
          .neq('status_post', 'draft') // don't show internal drafts
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

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Generate Calendar Days
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  // Days in month
  const totalDays = new Date(year, month + 1, 0).getDate()
  // Start day index of the month (1st of the month, adjusted to Monday as 0)
  let startDayIndex = new Date(year, month, 1).getDay()
  startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1 // Shift so Monday is 0, Sunday is 6

  const daysArray = []
  // Fill leading empty days
  for (let i = 0; i < startDayIndex; i++) {
    daysArray.push(null)
  }
  // Fill month days
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(new Date(year, month, i))
  }

  // Format date to ISO string local YYYY-MM-DD
  const getLocalDateString = (dateObj) => {
    if (!dateObj) return ''
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const getPieceStatusBadgeClass = (status) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'ready': return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'pending_design': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'pending_assets': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'draft': default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPieceStatusLabel = (status) => {
    switch (status) {
      case 'published': return 'Publicada'
      case 'ready': return 'Lista'
      case 'pending_design': return 'Pend. Diseño'
      case 'pending_assets': return 'Pend. Material'
      case 'draft': default: return 'Borrador'
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
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] animate-pulse">
            hourglass_empty
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

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)]">
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
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-8 animate-fade-in">
        {/* Banner Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-3xl font-extrabold text-[var(--color-deep-green)]">Calendario de Contenidos</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xl">
              Revisá las publicaciones planificadas para tu marca en redes sociales. Hacé clic en cualquier celda para ver la maqueta y dejarnos tu feedback.
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 self-start md:self-center">
            {/* View Selector */}
            <div className="p-1 bg-[var(--color-refined-gray)]/80 rounded-premium border border-gray-200 flex items-center">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                    : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">calendar_view_month</span>
                Calendario
              </button>
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                  viewMode === 'feed'
                    ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                    : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">grid_on</span>
                Feed
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                  viewMode === 'weekly'
                    ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                    : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">view_week</span>
                Semanal
              </button>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 border border-gray-200 rounded-premium bg-white hover:bg-gray-50 text-[var(--color-dark-gray)]"
              >
              <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
            </button>
            <h3 className="text-base font-bold text-[var(--color-deep-green)] min-w-[140px] text-center bg-[var(--color-refined-gray)]/40 py-2 px-4 rounded-premium">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 border border-gray-200 rounded-premium bg-white hover:bg-gray-50 text-[var(--color-dark-gray)]"
            >
              <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

        {viewMode === 'feed' ? (
          /* FEED VIEW */
          <div className="p-6 max-w-4xl mx-auto">
            {publications.filter(p => p.type === 'post').length === 0 ? (
              <div className="py-20 text-center text-dark-gray/40">
                <span className="material-symbols-outlined text-4xl block mb-2">grid_off</span>
                <p className="text-sm font-bold">No hay publicaciones de Feed para este mes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {publications
                  .filter(pub => pub.type === 'post')
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(pub => {
                    const firstUrl = pub.graphic_url ? getFirstGraphicUrl(pub.graphic_url) : null;
                    const isVideo = firstUrl ? isVideoFile(firstUrl, pub.post_format) : false;
                    
                    return (
                      <div
                        key={pub.id}
                        onClick={() => setSelectedPub(pub)}
                        className="relative aspect-square bg-white border border-gray-100 rounded-sm cursor-pointer group overflow-hidden"
                      >
                        {firstUrl ? (
                          isVideo ? (
                            <video
                              src={firstUrl}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              playsInline
                              onMouseEnter={(e) => e.target.play()}
                              onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                            />
                          ) : (
                            <img
                              src={firstUrl}
                              alt={pub.title}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gray-50">
                            <span className="material-symbols-outlined text-gray-300 text-3xl mb-2">image_not_supported</span>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter line-clamp-3">{pub.title}</p>
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center">
                          <p className="text-xs font-bold mb-2 line-clamp-3 leading-snug">{pub.title}</p>
                          <p className="text-[10px] text-white/80 font-medium bg-black/40 px-2 py-1 rounded">
                            {pub.date.split('-').reverse().join('/')}
                          </p>
                          {pub.post_format === 'carrousel' && (
                             <span className="material-symbols-outlined absolute top-2 right-2 text-white shadow-sm text-sm">filter_none</span>
                          )}
                          {isVideo && (
                            <span className="material-symbols-outlined absolute top-2 right-2 text-white shadow-sm text-sm">play_circle</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        ) : viewMode === 'weekly' ? (
          /* WEEKLY FEED VIEW */
          <div className="space-y-10 max-w-5xl mx-auto">
            {(() => {
              // Group days into weeks of 7 days
              const weeks = []
              for (let i = 0; i < daysArray.length; i += 7) {
                weeks.push(daysArray.slice(i, i + 7))
              }

              // Filter weeks that actually have some publications
              const weeksWithPubs = weeks.map((weekDaysArray, index) => {
                const firstDay = weekDaysArray.find(d => d !== null)
                const lastDay = [...weekDaysArray].reverse().find(d => d !== null)
                
                if (!firstDay || !lastDay) return null
                
                const weekPubs = publications.filter(pub => {
                  return weekDaysArray.some(day => day && getLocalDateString(day) === pub.date)
                })

                return {
                  index,
                  firstDay,
                  lastDay,
                  pubs: weekPubs
                }
              }).filter(w => w !== null && w.pubs.length > 0)

              if (weeksWithPubs.length === 0) {
                return (
                  <div className="py-20 text-center text-dark-gray/40">
                    <span className="material-symbols-outlined text-4xl block mb-2">grid_off</span>
                    <p className="text-sm font-bold">No hay publicaciones planificadas para este mes.</p>
                  </div>
                )
              }

              return weeksWithPubs.map((week) => {
                const startStr = `${week.firstDay.getDate()} de ${monthNames[week.firstDay.getMonth()]}`
                const endStr = `${week.lastDay.getDate()} de ${monthNames[week.lastDay.getMonth()]}`
                
                return (
                  <div key={week.index} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 px-4 py-2 rounded-full border border-[var(--color-deep-green)]/10">
                        Semana del {startStr} al {endStr}
                      </h4>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {week.pubs.map(pub => {
                        const firstUrl = pub.graphic_url ? getFirstGraphicUrl(pub.graphic_url) : null
                        const isVideo = firstUrl ? isVideoFile(firstUrl, pub.post_format) : false
                        const terrConfig = getTerritorioConfig(pub.territorio)
                        
                        return (
                          <div
                            key={pub.id}
                            onClick={() => setSelectedPub(pub)}
                            className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                          >
                            {/* Card Media Preview */}
                            <div className={`relative bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100 ${
                              pub.dimensions === '1080x1920' ? 'aspect-[9/16]' : pub.dimensions === '1080x1350' ? 'aspect-[4/5]' : 'aspect-square'
                            }`}>
                              {firstUrl ? (
                                isVideo ? (
                                  <video
                                    src={firstUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                    onMouseEnter={(e) => e.target.play()}
                                    onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                  />
                                ) : (
                                  <img
                                    src={firstUrl}
                                    alt={pub.title}
                                    className="w-full h-full object-cover"
                                  />
                                )
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-50">
                                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">image_not_supported</span>
                                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sin Vista Previa</p>
                                </div>
                              )}
                              
                              {/* Overlay Indicators */}
                              <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider text-white bg-black/60 backdrop-blur-sm`}>
                                  {pub.type === 'post' ? 'Feed' : 'Story'}
                                </span>
                                {pub.post_format && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-gray-700 border border-gray-150 uppercase tracking-wider backdrop-blur-sm">
                                    {pub.post_format === 'carrousel' ? 'Carrusel' :
                                     pub.post_format === 'reel' ? 'Reel' :
                                     pub.post_format === 'placa' ? 'Placa' :
                                     pub.post_format === 'video' ? 'Video' : pub.post_format}
                                  </span>
                                )}
                              </div>

                              <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                  pub.status_piece === 'published' ? 'bg-emerald-500' :
                                  pub.status_piece === 'ready' ? 'bg-teal-500' :
                                  pub.status_piece === 'pending_design' ? 'bg-amber-500' :
                                  pub.status_piece === 'pending_assets' ? 'bg-orange-500' : 'bg-gray-400'
                                }`} title={`Pieza: ${getPieceStatusLabel(pub.status_piece)}`} />
                              </div>

                              {pub.post_format === 'carrousel' && (
                                <span className="material-symbols-outlined absolute bottom-3 right-3 text-white bg-black/50 p-1 rounded backdrop-blur-sm text-sm">filter_none</span>
                              )}
                              {isVideo && (
                                <span className="material-symbols-outlined absolute bottom-3 right-3 text-white bg-black/50 p-1 rounded backdrop-blur-sm text-sm">play_circle</span>
                              )}
                            </div>

                            {/* Card Content */}
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3 text-left">
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                  {pub.date.split('-').reverse().join('/')}
                                </p>
                                <h5 className="font-bold text-sm text-gray-900 group-hover:text-[var(--color-deep-green)] transition-colors mt-1 line-clamp-2">
                                  {pub.title}
                                </h5>
                                {pub.territorio && (
                                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border mt-2 ${terrConfig.color.badge}`}>
                                    {pub.territorio}
                                  </span>
                                )}
                              </div>
                              {pub.copy && (
                                <p className="text-xs text-gray-500 line-clamp-3 bg-gray-50 p-2.5 rounded border border-gray-150/60 font-sans leading-relaxed">
                                  {pub.copy}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        ) : (
          /* CALENDAR VIEW Grid card */
          <div className="card p-6 bg-white overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {weekDays.map(d => (
              <div key={d} className="text-xs font-bold uppercase tracking-wider text-gray-400 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-3">
            {daysArray.map((dayDate, idx) => {
              if (!dayDate) {
                return <div key={`empty-${idx}`} className="bg-[var(--color-refined-gray)]/20 rounded-premium border border-dashed border-gray-100 min-h-[140px]"></div>
              }

              const dateStr = getLocalDateString(dayDate)
              const dayPubs = publications.filter(p => p.date === dateStr)
              const isToday = new Date().toDateString() === dayDate.toDateString()

              return (
                <div
                  key={`day-${dateStr}`}
                  className={`min-h-[140px] bg-white border rounded-premium p-3 flex flex-col justify-between hover:shadow-md transition-shadow group relative cursor-pointer ${
                    isToday ? 'border-[var(--color-deep-green)] ring-1 ring-[var(--color-deep-green)]/20' : 'border-gray-200'
                  }`}
                  onClick={() => {
                    if (dayPubs.length > 0) {
                      setSelectedPub(dayPubs[0]) // Select first pub on cell click (usual case)
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      isToday ? 'bg-[var(--color-deep-green)] text-white px-2 py-0.5 rounded-full shadow-sm' : 'text-gray-500'
                    }`}>
                      <span>{dayDate.getDate()}</span>
                      <span className={`text-[9px] ${isToday ? 'text-white/80' : 'text-gray-400'} font-semibold`}>
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayDate.getDay()]}
                      </span>
                    </span>
                  </div>

                  {/* Day items list */}
                  <div className="flex-1 flex flex-col gap-1.5 mt-2">
                    {(() => {
                      let storyIndex = 0
                      return dayPubs.sort((a, b) => {
                        if (a.type === 'post' && b.type !== 'post') return -1;
                        if (a.type !== 'post' && b.type === 'post') return 1;
                        return 0;
                      }).map(pub => {
                        const isPost = pub.type === 'post'
                        let displayTitle = pub.title
                        if (!isPost) {
                          storyIndex++
                          displayTitle = `Historia ${storyIndex}: ${pub.title}`
                        }
                        const terrConfig = getTerritorioConfig(pub.territorio)
                        const cardBgClass = isPost ? terrConfig.color.bg : 'bg-transparent'
                        const cardBorderClass = isPost ? terrConfig.color.border : 'border-gray-200 border-dashed'
                        const cardHoverBgClass = isPost ? terrConfig.color.hoverBg : 'hover:bg-gray-50'
                        const textClass = isPost ? (terrConfig.color.text || 'text-[var(--color-dark-gray)]') : 'text-[var(--color-dark-gray)]'
                        return (
                          <div
                            key={pub.id}
                            onClick={(e) => {
                              e.stopPropagation() // prevent double click
                              setSelectedPub(pub)
                            }}
                            className={`p-2 border rounded text-left transition-all hover:-translate-y-0.5 group/card relative ${cardBgClass} ${cardBorderClass} ${cardHoverBgClass} ${textClass}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${
                                  isPost ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'
                                }`}>
                                  {isPost ? 'Feed' : 'Story'}
                                </span>
                                {pub.post_format && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-gray-500 border border-gray-150 uppercase tracking-tighter">
                                    {pub.post_format === 'carrousel' ? 'Carrusel' :
                                     pub.post_format === 'reel' ? 'Reel' :
                                     pub.post_format === 'placa' ? 'Placa' :
                                     pub.post_format === 'video' ? 'Video' : pub.post_format}
                                  </span>
                                )}
                              </div>
                              <span className={`w-2 h-2 rounded-full ${
                                pub.status_piece === 'published' ? 'bg-emerald-500' :
                                pub.status_piece === 'ready' ? 'bg-teal-500' :
                                pub.status_piece === 'pending_design' ? 'bg-amber-500' :
                                pub.status_piece === 'pending_assets' ? 'bg-orange-500' : 'bg-gray-400'
                              }`} title={`Pieza: ${getPieceStatusLabel(pub.status_piece)}`} />
                            </div>
                            <p className="text-[11px] font-bold truncate leading-tight opacity-90">
                              {displayTitle}
                            </p>
                            {pub.territorio && (
                              <p className="text-[9px] font-bold uppercase tracking-tighter mt-0.5 opacity-75">
                                {pub.territorio}
                              </p>
                            )}

                            {/* Hover preview tooltip popover */}
                            <div className="hidden group-hover/card:flex flex-col gap-2 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 pointer-events-none transition-all animate-fade-in text-left">
                              {pub.graphic_url && (() => {
                                const firstUrl = getFirstGraphicUrl(pub.graphic_url)
                                return firstUrl && (
                                  <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                                    {isVideoFile(firstUrl, pub.post_format) ? (
                                      <video
                                        src={firstUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        loop
                                        autoPlay
                                        playsInline
                                      />
                                    ) : (
                                      <img
                                        src={firstUrl}
                                        alt={pub.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                )
                              })()}
                              <div>
                                <p className="font-bold text-xs text-[var(--color-deep-green)] line-clamp-1">{displayTitle}</p>
                                <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5 tracking-tight flex items-center justify-between gap-2">
                                  <span>{pub.type === 'post' ? 'Feed' : 'Story'} · {pub.post_format === 'carrousel' ? 'Carrusel' : pub.post_format}</span>
                                  {pub.territorio && (
                                    <span className="text-[9px] text-[var(--color-deep-green)] font-bold tracking-tight bg-[var(--color-deep-green)]/5 px-1.5 py-0.5 rounded uppercase">
                                      {pub.territorio}
                                    </span>
                                  )}
                                </p>
                                {pub.territorio && (
                                  <p className="text-[9px] text-gray-400 font-medium leading-relaxed italic mt-1 normal-case">
                                    Eje: {terrConfig.desc}
                                  </p>
                                )}
                                {pub.copy && (
                                  <p className="text-[10px] text-[var(--color-dark-gray)]/80 mt-1 line-clamp-3 bg-gray-50 p-2 rounded border border-gray-150 font-mono whitespace-pre-wrap">
                                    {pub.copy}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}
      </main>

      {/* Publication Mockup Drawer / Modal */}
      {selectedPub && (
        <div className="modal-overlay animate-fade-in" onClick={() => setSelectedPub(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row gap-8 relative text-left animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPub(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-250 text-gray-500 hover:text-gray-700 transition-colors z-20"
            >
              <span className="material-symbols-outlined text-xl leading-none">close</span>
            </button>

            {/* Mockup Preview Area (Left column on desktop) */}
            <div className="md:w-1/2 flex items-center justify-center">
              {selectedPub.type === 'post' ? (
                /* Instagram Feed Post Mockup */
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden w-full max-w-sm">
                  {/* Mockup Header */}
                  <div className="p-3 flex items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-deep-green)] text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{client.name}</p>
                        {selectedPub.territorio && (
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                            {selectedPub.territorio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Graphic image container */}
                  <div className={`w-full relative bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100 ${
                    selectedPub.dimensions === '1080x1920' ? 'aspect-[9/16]' : selectedPub.dimensions === '1080x1350' ? 'aspect-[4/5]' : 'aspect-square'
                  }`}>
                    {selectedPub.post_format === 'carrousel' ? (
                      (() => {
                        const carouselUrls = getGraphicUrls(selectedPub.graphic_url)
                        if (carouselUrls.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
                              <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">photo_library</span>
                              <p className="text-xs font-bold uppercase tracking-wider">Carrusel de imágenes</p>
                              <p className="text-[10px] mt-1 text-gray-400/80 font-medium">{selectedPub.dimensions || '1080x1080'} px</p>
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
                      selectedPub.graphic_url ? (
                        isVideoFile(selectedPub.graphic_url, selectedPub.post_format) ? (
                          <video
                            key={selectedPub.graphic_url}
                            src={selectedPub.graphic_url}
                            controls
                            loop
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={selectedPub.graphic_url}
                            alt={selectedPub.title}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
                          <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">
                            {selectedPub.post_format === 'reel' ? 'movie' : 'image'}
                          </span>
                          <p className="text-xs font-bold uppercase tracking-wider">
                            {selectedPub.post_format === 'reel' ? 'Video Reel' : 'Pieza Gráfica'}
                          </p>
                          <p className="text-[10px] mt-1 text-gray-400/80">
                            {selectedPub.dimensions || '1080x1080'} px
                          </p>
                        </div>
                      )
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                      {selectedPub.dimensions || '1080x1080'}
                    </div>
                  </div>

                  {/* Actions Mockup */}
                  <div className="p-3.5 flex items-center gap-4 text-gray-700">
                    <span className="material-symbols-outlined text-xl">favorite</span>
                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                    <span className="material-symbols-outlined text-xl">send</span>
                  </div>

                  {/* Copy Mockup */}
                  <div className="p-3.5 pt-0 text-left border-t border-gray-50 max-h-[140px] overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-900">
                      {client.name} 
                      <span className="font-normal text-gray-800 ml-1.5 whitespace-pre-wrap leading-relaxed">
                        {selectedPub.copy || 'Sin copy redactado.'}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                /* Instagram Story Mockup */
                <div className="bg-gray-950 border-[6px] border-black rounded-[2rem] shadow-xl overflow-hidden w-full max-w-sm aspect-[9/16] relative text-white">
                  {selectedPub.graphic_url ? (
                    isVideoFile(selectedPub.graphic_url, selectedPub.post_format) ? (
                      <video
                        key={selectedPub.graphic_url}
                        src={selectedPub.graphic_url}
                        controls
                        loop
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                      />
                    ) : (
                      <img
                        src={selectedPub.graphic_url}
                        alt={selectedPub.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-600 bg-gradient-to-b from-gray-800 to-gray-950">
                      <span className="material-symbols-outlined text-4xl mb-2 text-gray-700">photo_album</span>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Historia Vertical</p>
                      <p className="text-[10px] mt-1 text-gray-600 font-bold">{selectedPub.dimensions || '1080x1920'}</p>
                    </div>
                  )}

                  {/* Header overlay */}
                  <div className="absolute top-4 inset-x-4 z-10 space-y-2">
                    <div className="flex gap-0.5">
                      <div className="h-0.5 bg-white flex-1 rounded-full"></div>
                      <div className="h-0.5 bg-white/40 flex-1 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-deep-green)] text-white font-extrabold flex items-center justify-center text-[10px] border border-white/20">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold shadow-text leading-tight">{client.name}</p>
                        {selectedPub.territorio && (
                          <p className="text-[8px] text-white/70 font-semibold uppercase tracking-wider">
                            {selectedPub.territorio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Story copy overlay */}
                  {selectedPub.copy && (
                    <div className="absolute bottom-16 inset-x-4 z-10 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-left">
                      <p className="text-[11px] text-white leading-relaxed whitespace-pre-wrap">
                        {selectedPub.copy}
                      </p>
                    </div>
                  )}

                  {/* Simulated send message bar */}
                  <div className="absolute bottom-4 inset-x-4 z-10 flex items-center justify-between gap-3 text-white">
                    <div className="flex-1 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-[10px] text-white/60 font-semibold backdrop-blur-sm text-left">
                      Enviar mensaje...
                    </div>
                    <span className="material-symbols-outlined text-lg">favorite</span>
                    <span className="material-symbols-outlined text-lg">send</span>
                  </div>
                </div>
              )}
            </div>

            {/* Description & Action details (Right column on desktop) */}
            <div className="md:w-1/2 flex flex-col justify-between py-2">
              <div className="space-y-6">
                <div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${getPieceStatusBadgeClass(selectedPub.status_piece)}`}>
                    {getPieceStatusLabel(selectedPub.status_piece)}
                  </span>
                  <h3 className="text-2xl font-black text-[var(--color-deep-green)] mt-3 leading-snug">
                    {selectedPub.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                    Fecha programada: {selectedPub.date.split('-').reverse().join('/')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--color-refined-gray)]/40 border border-gray-150 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo / Canal</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 capitalize">
                        {selectedPub.type === 'post' ? 'Feed Post' : 'Instagram Story'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Formato de Pieza</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 capitalize">
                        {selectedPub.post_format}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dimensiones</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">
                        {selectedPub.dimensions || '1080 x 1080 px'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Temática / Territorio</p>
                      {selectedPub.territorio ? (
                        (() => {
                          const tConf = getTerritorioConfig(selectedPub.territorio)
                          return (
                            <div className="relative group/terr inline-block mt-0.5">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-help ${tConf.color.badge}`}>
                                {selectedPub.territorio}
                              </span>
                              <div className="hidden group-hover/terr:block absolute z-50 bottom-full left-0 mb-2 w-64 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-premium p-2.5 shadow-2xl border border-gray-800 pointer-events-none normal-case leading-relaxed font-normal text-left">
                                <p className="font-bold text-[var(--color-deep-green)] mb-1 text-[10px] uppercase tracking-wider">{selectedPub.territorio}</p>
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

                {selectedPub.copy && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Texto de Publicación (Copy)</p>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">
                      {selectedPub.copy}
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
                  href={getWhatsAppLink(selectedPub)}
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
        </div>
      )}
    </div>
  )
}
