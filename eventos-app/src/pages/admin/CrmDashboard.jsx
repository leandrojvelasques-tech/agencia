import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTerritorioConfig } from '../../lib/crmConfig'

export default function CrmDashboard() {
  const navigate = useNavigate()

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
  
  // State
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  
  // Filter states for list view
  const [filterType, setFilterType] = useState('all')
  const [filterPieceStatus, setFilterPieceStatus] = useState('all')
  const [filterPostStatus, setFilterPostStatus] = useState('all')

  // Notification toast
  const [toast, setToast] = useState(null)

  const [selectedPubIds, setSelectedPubIds] = useState([])

  useEffect(() => {
    setSelectedPubIds([])
  }, [selectedClientId, viewMode])

  // Fetch clients
  useEffect(() => {
    async function loadClients() {
      try {
        const { data, error } = await supabase
          .from('crm_clients')
          .select('*')
          .order('name')
        if (error) throw error
        setClients(data || [])
        if (data && data.length > 0) {
          setSelectedClientId(data[0].id)
        }
      } catch (err) {
        console.error('Error fetching CRM clients:', err)
        showToast('Error al cargar los clientes.', 'error')
      }
    }
    loadClients()
  }, [])

  // Fetch publications for selected client
  useEffect(() => {
    if (!selectedClientId) return
    
    async function loadPublications() {
      setLoading(true)
      try {
        // Fetch all publications for this client
        const { data, error } = await supabase
          .from('crm_publications')
          .select('*')
          .eq('client_id', selectedClientId)
          .order('date', { ascending: true })
        if (error) throw error
        setPublications(data || [])
      } catch (err) {
        console.error('Error loading publications:', err)
        showToast('Error al cargar la grilla de publicaciones.', 'error')
      } finally {
        setLoading(false)
      }
    }
    
    loadPublications()
  }, [selectedClientId])

  const selectedClient = clients.find(c => c.id === selectedClientId)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Copy share portal link
  const copyShareLink = () => {
    if (!selectedClient) return
    const url = `${window.location.origin}/crm/cliente/${selectedClient.share_token}`
    navigator.clipboard.writeText(url)
    showToast('¡Enlace del cliente copiado al portapapeles!')
  }

  // Delete publication
  const handleDeletePublication = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return
    try {
      const { error } = await supabase
        .from('crm_publications')
        .delete()
        .eq('id', id)
      if (error) throw error
      setPublications(prev => prev.filter(p => p.id !== id))
      setSelectedPubIds(prev => prev.filter(item => item !== id))
      showToast('Publicación eliminada correctamente.')
    } catch (err) {
      console.error('Error deleting:', err)
      showToast('Error al eliminar la publicación.', 'error')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPubIds.length === 0) return
    if (!window.confirm(`¿Estás seguro de que deseas eliminar las ${selectedPubIds.length} publicaciones seleccionadas?`)) return
    try {
      const { error } = await supabase
        .from('crm_publications')
        .delete()
        .in('id', selectedPubIds)
      if (error) throw error
      setPublications(prev => prev.filter(p => !selectedPubIds.includes(p.id)))
      setSelectedPubIds([])
      showToast('Publicaciones eliminadas correctamente.')
    } catch (err) {
      console.error('Error bulk deleting:', err)
      showToast('Error al eliminar las publicaciones.', 'error')
    }
  }

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }
  const resetToToday = () => {
    setCurrentDate(new Date())
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

  // Group publication count by status for stats
  const stats = {
    total: publications.length,
    posts: publications.filter(p => p.type === 'post').length,
    stories: publications.filter(p => p.type === 'story').length,
    publishedPieces: publications.filter(p => p.status_piece === 'published').length,
    pendingDesign: publications.filter(p => p.status_piece === 'pending_design').length,
    pendingAssets: publications.filter(p => p.status_piece === 'pending_assets').length,
    ready: publications.filter(p => p.status_piece === 'ready').length,
    drafts: publications.filter(p => p.status_piece === 'draft').length
  }

  // Format date to ISO string local YYYY-MM-DD
  const getLocalDateString = (dateObj) => {
    if (!dateObj) return ''
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Helper for status classes
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

  // Filtered publications for List view
  const filteredPublications = publications.filter(pub => {
    if (filterType !== 'all' && pub.type !== filterType) return false
    if (filterPieceStatus !== 'all' && pub.status_piece !== filterPieceStatus) return false
    if (filterPostStatus !== 'all' && pub.status_post !== filterPostStatus) return false
    return true
  })

  return (
    <div className="space-y-8 animate-fade-in">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--color-deep-green)]">CRM & Calendario de Contenidos</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-1">
            Planificá, gestioná y compartí el calendario de publicaciones en redes sociales con tus clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/crm/publicacion/nueva?client_id=${selectedClientId}`}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-lg">calendar_add_on</span>
            Programar Contenido
          </Link>
        </div>
      </div>

      {/* Client Selector & Quick actions */}
      <div className="card p-6 bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Client tabs */}
          <div className="w-full lg:w-auto">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 block mb-3">
              Seleccionar Cliente
            </label>
            <div className="flex flex-wrap gap-2">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`px-5 py-3 rounded-premium-btn text-sm font-bold border transition-all ${
                    selectedClientId === client.id
                      ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)] shadow-[var(--shadow-premium)]'
                      : 'bg-[var(--color-refined-gray)]/50 text-[var(--color-dark-gray)] border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {client.name}
                </button>
              ))}
            </div>
          </div>

          {/* Client portal link share */}
          {selectedClient && (
            <div className="w-full lg:w-auto p-4 rounded-premium bg-[var(--color-refined-gray)]/40 border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-1 max-w-2xl">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]">Portal del Cliente</h4>
                <p className="text-xs text-[var(--color-dark-gray)]/60 mt-0.5">
                  Enlace público y directo para que el cliente visualice su calendario.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 bg-white border border-gray-300 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copiar Enlace
                </button>
                <a
                  href={`/crm/cliente/${selectedClient.share_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[var(--color-deep-green)]/10 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 hover:bg-[var(--color-deep-green)]/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Ver Portal
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      {selectedClient && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5 bg-white flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Planificación</span>
            <span className="text-3xl font-extrabold text-[var(--color-deep-green)] mt-2">{stats.total}</span>
            <span className="text-xs text-[var(--color-dark-gray)]/60 mt-1">publicaciones del mes</span>
          </div>
          <div className="card p-5 bg-white flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Formato Post / Story</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-indigo-700">{stats.posts}</span>
              <span className="text-xs text-[var(--color-dark-gray)]/40 font-bold">feed</span>
              <span className="text-dark-gray/20">|</span>
              <span className="text-3xl font-extrabold text-pink-600">{stats.stories}</span>
              <span className="text-xs text-[var(--color-dark-gray)]/40 font-bold">stories</span>
            </div>
            <span className="text-xs text-[var(--color-dark-gray)]/60 mt-1">distribución de canales</span>
          </div>
          <div className="card p-5 bg-white flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Listos / Publicados</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-600">{stats.publishedPieces}</span>
              <span className="text-xs text-emerald-600/80 font-bold">Pub.</span>
              <span className="text-dark-gray/20">/</span>
              <span className="text-3xl font-extrabold text-teal-600">{stats.ready}</span>
              <span className="text-xs text-teal-600/80 font-bold">Listos</span>
            </div>
            <span className="text-xs text-[var(--color-dark-gray)]/60 mt-1">avances sobre piezas</span>
          </div>
          <div className="card p-5 bg-white flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Faltante Diseño / Assets</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-amber-600">{stats.pendingDesign}</span>
              <span className="text-xs text-amber-600/80 font-bold">Dis.</span>
              <span className="text-dark-gray/20">/</span>
              <span className="text-3xl font-extrabold text-orange-600">{stats.pendingAssets}</span>
              <span className="text-xs text-orange-600/80 font-bold">Mat.</span>
            </div>
            <span className="text-xs text-[var(--color-dark-gray)]/60 mt-1">piezas pendientes</span>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {selectedClient && (
        <div className="card bg-white overflow-hidden">
          {/* View Toolbar */}
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {viewMode === 'calendar' || viewMode === 'weekly' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-2 border border-gray-200 rounded-premium hover:bg-gray-50 text-[var(--color-dark-gray)]"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
                  </button>
                  <h3 className="text-lg font-bold text-[var(--color-deep-green)] min-w-[140px] text-center">
                    {monthNames[month]} {year}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-2 border border-gray-200 rounded-premium hover:bg-gray-50 text-[var(--color-dark-gray)]"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
                  </button>
                  <button
                    onClick={resetToToday}
                    className="text-xs font-bold text-[var(--color-deep-green)] px-3 py-1.5 rounded-premium bg-[var(--color-deep-green)]/5 hover:bg-[var(--color-deep-green)]/10 ml-2"
                  >
                    Hoy
                  </button>
                </div>
              ) : (
                <h3 className="text-lg font-bold text-[var(--color-deep-green)]">
                  Listado de Contenidos
                </h3>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* View Selector */}
              <div className="p-1 bg-[var(--color-refined-gray)]/80 rounded-premium border border-gray-200 flex items-center">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                    viewMode === 'calendar'
                      ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                      : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">calendar_view_month</span>
                  Vista Calendario
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                    viewMode === 'list'
                      ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                      : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                  Vista Tabla
                </button>
                <button
                  onClick={() => setViewMode('feed')}
                  className={`px-4 py-2 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                    viewMode === 'feed'
                      ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                      : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">grid_on</span>
                  Vista Feed
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-4 py-2 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                    viewMode === 'weekly'
                      ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                      : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">view_week</span>
                  Vista Semanal
                </button>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/30 animate-pulse">
                hourglass_empty
              </span>
              <p className="text-sm font-semibold text-[var(--color-dark-gray)]/50 mt-3">
                Cargando publicaciones de {selectedClient.name}...
              </p>
            </div>
          ) : viewMode === 'calendar' ? (
            /* CALENDAR VIEW */
            <div className="p-6">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {weekDays.map(d => (
                  <div key={d} className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/40 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2.5">
                {daysArray.map((dayDate, idx) => {
                  if (!dayDate) {
                    return <div key={`empty-${idx}`} className="bg-[var(--color-refined-gray)]/20 rounded-premium border border-dashed border-gray-100 min-h-[120px]"></div>
                  }

                  const dateStr = getLocalDateString(dayDate)
                  const dayPubs = publications.filter(p => p.date === dateStr)
                  const isToday = new Date().toDateString() === dayDate.toDateString()

                  return (
                    <div
                      key={`day-${dateStr}`}
                      className={`min-h-[140px] bg-white border rounded-premium p-3 flex flex-col justify-between hover:shadow-md transition-shadow group/day relative ${
                        isToday ? 'border-[var(--color-deep-green)] ring-1 ring-[var(--color-deep-green)]/20' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-bold ${
                          isToday ? 'bg-[var(--color-deep-green)] text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'text-[var(--color-dark-gray)]'
                        }`}>
                          {dayDate.getDate()}
                        </span>
                        
                        {/* Quick create button visible on hover */}
                        <Link
                          to={`/admin/crm/publicacion/nueva?client_id=${selectedClientId}&date=${dateStr}`}
                          className="opacity-0 group-hover/day:opacity-100 p-1 text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded transition-all"
                          title="Programar post en este día"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                        </Link>
                      </div>

                      {/* Day contents */}
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
                             return (
                              (() => {
                                const terrConfig = getTerritorioConfig(pub.territorio)
                                const cardBgClass = isPost ? terrConfig.color.bg : 'bg-transparent'
                                const cardBorderClass = isPost ? terrConfig.color.border : 'border-gray-200 border-dashed'
                                const cardHoverBgClass = isPost ? terrConfig.color.hoverBg : 'hover:bg-gray-50'
                                const cardHoverBorderClass = isPost ? terrConfig.color.hoverBorder : 'hover:border-gray-300 hover:border-solid'
                                const textClass = isPost ? (terrConfig.color.text || 'text-[var(--color-dark-gray)]') : 'text-[var(--color-dark-gray)]'
                                return (
                                  <div
                                    key={pub.id}
                                    onClick={() => navigate(`/admin/crm/publicacion/${pub.id}/editar`)}
                                    className={`p-2 border rounded text-left cursor-pointer transition-all hover:-translate-y-0.5 group/card relative ${cardBgClass} ${cardBorderClass} ${cardHoverBgClass} ${cardHoverBorderClass} ${textClass}`}
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
                              })()
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : viewMode === 'feed' ? (
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
                          onClick={() => navigate(`/admin/crm/publicacion/${pub.id}/editar`)}
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
            /* WEEKLY VIEW */
            <div className="p-6 space-y-10 max-w-5xl mx-auto">
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
                              onClick={() => navigate(`/admin/crm/publicacion/${pub.id}/editar`)}
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
            /* LIST/TABLE VIEW */
            <div className="overflow-x-auto">
              {/* Filters toolbar */}
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-dark-gray/50 block mb-1.5">Canal / Tipo</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-premium px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                  >
                    <option value="all">Todos los formatos</option>
                    <option value="post">Feed (Post/Reel)</option>
                    <option value="story">Historia (Story)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-dark-gray/50 block mb-1.5">Estado de la Pieza</label>
                  <select
                    value={filterPieceStatus}
                    onChange={(e) => setFilterPieceStatus(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-premium px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="published">Publicada</option>
                    <option value="ready">Lista para publicar</option>
                    <option value="pending_design">Pendiente Elaborar Placa</option>
                    <option value="pending_assets">Pendiente Material / Fotos</option>
                    <option value="draft">Borrador</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-dark-gray/50 block mb-1.5">Estado de Publicación</label>
                  <select
                    value={filterPostStatus}
                    onChange={(e) => setFilterPostStatus(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-premium px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="scheduled">Programado</option>
                    <option value="published">Publicado</option>
                    <option value="draft">Borrador</option>
                  </select>
                </div>
              </div>

              {selectedPubIds.length > 0 && (
                <div className="p-4 bg-red-50/70 border-b border-red-100 flex items-center justify-between text-red-900">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-red-650">check_box</span>
                    {selectedPubIds.length} publicaciones seleccionadas
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedPubIds([])}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-premium-btn transition-colors shadow-sm"
                    >
                      Deseleccionar todo
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-premium-btn flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Eliminar Seleccionadas
                    </button>
                  </div>
                </div>
              )}

              {filteredPublications.length === 0 ? (
                <div className="py-20 text-center text-dark-gray/40">
                  <span className="material-symbols-outlined text-4xl block mb-2">find_in_page</span>
                  <p className="text-sm font-bold">No se encontraron publicaciones con los filtros aplicados.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredPublications.length > 0 && filteredPublications.every(pub => selectedPubIds.includes(pub.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPubIds(prev => {
                                const newSelection = [...prev]
                                filteredPublications.forEach(pub => {
                                  if (!newSelection.includes(pub.id)) newSelection.push(pub.id)
                                })
                                return newSelection
                              })
                            } else {
                              setSelectedPubIds(prev => prev.filter(id => !filteredPublications.some(pub => pub.id === id)))
                            }
                          }}
                          className="rounded text-[var(--color-deep-green)] focus:ring-[var(--color-deep-green)] w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th>Fecha</th>
                      <th>Publicación</th>
                      <th>Canal / Formato</th>
                      <th>Territorio</th>
                      <th>Estado Pieza</th>
                      <th>Estado Post</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPublications.map(pub => {
                      const isSelected = selectedPubIds.includes(pub.id)
                      return (
                        <tr key={pub.id} className={isSelected ? 'bg-[var(--color-deep-green)]/5' : ''}>
                          <td className="w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedPubIds(prev =>
                                  prev.includes(pub.id) ? prev.filter(id => id !== pub.id) : [...prev, pub.id]
                                )
                              }}
                              className="rounded text-[var(--color-deep-green)] focus:ring-[var(--color-deep-green)] w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="font-bold text-[var(--color-dark-gray)]">
                            {pub.date.split('-').reverse().join('/')}
                          </td>
                          <td>
                            <div>
                              <p className="font-bold text-[var(--color-deep-green)]">{pub.title}</p>
                            {pub.copy && (
                              <p className="text-xs text-dark-gray/60 truncate max-w-xs mt-0.5">{pub.copy}</p>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={`badge ${pub.type === 'post' ? 'badge-green' : 'badge-yellow'}`}>
                              {pub.type === 'post' ? 'Feed' : 'Story'}
                            </span>
                            <span className="text-xs text-dark-gray/50 uppercase font-semibold">
                              ({pub.post_format} - {pub.dimensions})
                            </span>
                          </div>
                        </td>
                        <td>
                          {pub.territorio ? (
                            (() => {
                              const tConf = getTerritorioConfig(pub.territorio)
                              const isPost = pub.type === 'post'
                              const badgeClass = isPost ? tConf.color.badge : 'bg-transparent text-gray-500 border-gray-200'
                              return (
                                <div className="relative group/terr inline-block">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-help ${badgeClass}`}>
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
                            <span className="text-xs font-bold text-dark-gray/40">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getPieceStatusBadgeClass(pub.status_piece)}`}>
                            {getPieceStatusLabel(pub.status_piece)}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={`status-dot ${
                              pub.status_post === 'published' ? 'status-dot-green' :
                              pub.status_post === 'scheduled' ? 'status-dot-yellow' : 'status-dot-gray'
                            }`} />
                            <span className="text-xs font-semibold capitalize text-dark-gray/80">
                              {pub.status_post === 'scheduled' ? 'Programado' :
                               pub.status_post === 'published' ? 'Publicado' : 'Borrador'}
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/admin/crm/publicacion/${pub.id}/editar`}
                              className="p-1.5 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-lg leading-none">edit</span>
                            </Link>
                            <button
                              onClick={() => handleDeletePublication(pub.id)}
                              className="p-1.5 hover:bg-gray-100 rounded text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined text-lg leading-none">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
