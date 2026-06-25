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
  const [importantEvents, setImportantEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  
  // Filter states for list view
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Export report states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportDateRange, setExportDateRange] = useState('all_month') // 'all_month' | 'rest_of_month'
  const [exportStatusFilter, setExportStatusFilter] = useState('all') // 'all' | 'pending'
  const [exportTypeFilter, setExportTypeFilter] = useState('all') // 'all' | 'post' | 'story'

  // Notification toast
  const [toast, setToast] = useState(null)

  const [selectedPubIds, setSelectedPubIds] = useState([])
  const [draggedOverDate, setDraggedOverDate] = useState(null)

  // Important event form states
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0])
  const [newEventTitle, setNewEventTitle] = useState('')

  const getExportedPublications = () => {
    const todayStr = getLocalDateString(new Date())
    return publications.filter(pub => {
      // Month filter: must match selected month and year
      const pubDate = new Date(pub.date + 'T00:00:00')
      if (pubDate.getFullYear() !== year || pubDate.getMonth() !== month) return false

      // Date range filter
      if (exportDateRange === 'rest_of_month' && pub.date < todayStr) return false

      // Status filter
      if (exportStatusFilter === 'pending') {
        if (getPublicationState(pub).id !== 'design_in_progress') return false
      }

      // Type filter
      if (exportTypeFilter !== 'all' && pub.type !== exportTypeFilter) return false

      return true
    }).sort((a, b) => a.date.localeCompare(b.date))
  }

  const handlePrintReport = () => {
    setIsExportModalOpen(false)
    setTimeout(() => {
      window.print()
    }, 300)
  }

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

        // Fetch all important events
        const { data: eventsData, error: eventsErr } = await supabase
          .from('crm_important_events')
          .select('*')
        if (eventsErr) throw eventsErr
        setImportantEvents(eventsData || [])
      } catch (err) {
        console.error('Error loading publications or events:', err)
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

  // Move / Reschedule publication
  const handleMovePublication = async (pubId, targetDateStr) => {
    try {
      const { error } = await supabase
        .from('crm_publications')
        .update({ date: targetDateStr })
        .eq('id', pubId)
      
      if (error) throw error
      
      setPublications(prev => prev.map(p => {
        if (p.id === pubId) {
          return { ...p, date: targetDateStr }
        }
        return p
      }))
      showToast('Publicación reprogramada correctamente.')
    } catch (err) {
      console.error('Error rescheduling publication:', err)
      showToast('Error al reprogramar la publicación.', 'error')
    }
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

  const handleAddImportantEvent = async (dateStr) => {
    const title = window.prompt('Ingresá el nombre del evento importante o fecha clave (ej: Día del Padre, Partido de Argentina):')
    if (!title || !title.trim()) return
    try {
      const { data, error } = await supabase
        .from('crm_important_events')
        .insert({
          client_id: selectedClientId,
          date: dateStr,
          title: title.trim()
        })
        .select()
      if (error) throw error
      setImportantEvents(prev => [...prev, ...data])
      showToast('Evento clave agregado.')
    } catch (err) {
      console.error(err)
      showToast('Error al agregar el evento clave.', 'error')
    }
  }

  const handleDeleteImportantEvent = async (e, evtId) => {
    if (e) e.stopPropagation()
    if (!window.confirm('¿Deseas eliminar este evento clave?')) return
    try {
      const { error } = await supabase
        .from('crm_important_events')
        .delete()
        .eq('id', evtId)
      if (error) throw error
      setImportantEvents(prev => prev.filter(x => x.id !== evtId))
      showToast('Evento clave eliminado.')
    } catch (err) {
      console.error(err)
      showToast('Error al eliminar el evento clave.', 'error')
    }
  }

  const handleAddImportantEventFromForm = async (e) => {
    e.preventDefault()
    if (!newEventDate || !newEventTitle.trim()) {
      showToast('Por favor, ingresá una fecha y una descripción.', 'error')
      return
    }
    try {
      const { data, error } = await supabase
        .from('crm_important_events')
        .insert({
          client_id: selectedClientId,
          date: newEventDate,
          title: newEventTitle.trim()
        })
        .select()
      if (error) throw error
      setImportantEvents(prev => [...prev, ...data])
      setNewEventTitle('')
      showToast('Fecha clave agregada correctamente.')
    } catch (err) {
      console.error(err)
      showToast('Error al agregar la fecha clave.', 'error')
    }
  }

  const handleUpdateImportantEvent = async (evtId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return
    try {
      const { error } = await supabase
        .from('crm_important_events')
        .update({ title: newTitle.trim() })
        .eq('id', evtId)
      if (error) throw error
      setImportantEvents(prev => prev.map(x => x.id === evtId ? { ...x, title: newTitle.trim() } : x))
      showToast('Fecha clave actualizada.')
    } catch (err) {
      console.error(err)
      showToast('Error al actualizar la fecha clave.', 'error')
    }
  }

  const handleCompleteTask = async (pub, taskText) => {
    const currentTasks = pub.status_piece.split('\n').filter(line => line.trim() !== '')
    const updatedTasks = currentTasks.filter(line => line.trim() !== taskText.trim())
    const updatedStatusPiece = updatedTasks.join('\n')

    try {
      const { error } = await supabase
        .from('crm_publications')
        .update({ status_piece: updatedStatusPiece })
        .eq('id', pub.id)
      
      if (error) throw error
      
      setPublications(prev => prev.map(p => {
        if (p.id === pub.id) {
          return { ...p, status_piece: updatedStatusPiece }
        }
        return p
      }))
      showToast('¡Tarea completada!')
    } catch (err) {
      console.error('Error completing task:', err)
      showToast('Error al completar la tarea.', 'error')
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

  const getPublicationState = (pub) => {
    if (!pub) return { label: 'Pendiente', colorClass: 'bg-gray-400', badgeClass: 'bg-gray-100 text-gray-800 border-gray-200', dotColor: 'bg-gray-400' }
    const hasPendingTasks = pub.status_piece && pub.status_piece.trim() !== ''
    if (hasPendingTasks) {
      return {
        id: 'design_in_progress',
        label: 'En proceso de diseño',
        colorClass: 'bg-gray-400',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
        dotColor: 'bg-gray-400'
      }
    } else {
      const isProgrammed = pub.status_post === 'scheduled' || pub.status_post === 'published'
      if (isProgrammed) {
        return {
          id: 'done_programmed',
          label: 'Diseño terminado y programado en Meta',
          colorClass: 'bg-emerald-500',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotColor: 'bg-emerald-500'
        }
      } else {
        return {
          id: 'done_not_programmed',
          label: 'Diseño terminado sin programar en Meta',
          colorClass: 'bg-amber-500',
          badgeClass: 'bg-amber-100 text-amber-850 border-amber-250',
          dotColor: 'bg-amber-500'
        }
      }
    }
  }

  // Group publication count by status for stats
  const stats = {
    total: publications.length,
    posts: publications.filter(p => p.type === 'post').length,
    stories: publications.filter(p => p.type === 'story').length,
    designInProgress: publications.filter(p => getPublicationState(p).id === 'design_in_progress').length,
    designDoneNotProgrammed: publications.filter(p => getPublicationState(p).id === 'done_not_programmed').length,
    designDoneProgrammed: publications.filter(p => getPublicationState(p).id === 'done_programmed').length,
  }

  // Format date to ISO string local YYYY-MM-DD
  const getLocalDateString = (dateObj) => {
    if (!dateObj) return ''
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Filtered publications for List view
  const filteredPublications = publications.filter(pub => {
    if (filterType !== 'all' && pub.type !== filterType) return false
    if (filterStatus !== 'all') {
      if (getPublicationState(pub).id !== filterStatus) return false
    }
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
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Diseño Terminado</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-600">{stats.designDoneProgrammed}</span>
              <span className="text-xs text-emerald-600/80 font-bold">Prog.</span>
              <span className="text-dark-gray/20">/</span>
              <span className="text-3xl font-extrabold text-amber-500">{stats.designDoneNotProgrammed}</span>
              <span className="text-xs text-amber-600/80 font-bold">Sin Prog.</span>
            </div>
            <span className="text-xs text-[var(--color-dark-gray)]/60 mt-1">piezas finalizadas</span>
          </div>
          <div className="card p-5 bg-white flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">En Proceso de Diseño</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-gray-500">{stats.designInProgress}</span>
              <span className="text-xs text-gray-500/80 font-bold">Piezas</span>
            </div>
            <span className="text-xs text-[var(--color-dark-gray)]/60 mt-1">publicaciones con pendientes</span>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {selectedClient && (
        <>
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
              ) : viewMode === 'tasks' ? (
                <h3 className="text-lg font-bold text-[var(--color-deep-green)]">
                  Tareas Pendientes del Cliente
                </h3>
              ) : viewMode === 'events' ? (
                <h3 className="text-lg font-bold text-[var(--color-deep-green)]">
                  Fechas Claves del Cliente
                </h3>
              ) : (
                <h3 className="text-lg font-bold text-[var(--color-deep-green)]">
                  Listado de Contenidos
                </h3>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
              {selectedClient && (
                <>
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Copiar enlace público de solo lectura para el cliente"
                  >
                    <span className="material-symbols-outlined text-base">share</span>
                    Compartir (Solo Lectura)
                  </button>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Exportar reporte de publicaciones a PDF"
                  >
                    <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                    Exportar PDF / Reporte
                  </button>
                </>
              )}

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
                <button
                  onClick={() => setViewMode('tasks')}
                  className={`px-4 py-2 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                    viewMode === 'tasks'
                      ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                      : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">checklist</span>
                  Tareas
                </button>
                <button
                  onClick={() => setViewMode('events')}
                  className={`px-4 py-2 text-xs font-bold rounded-premium-btn transition-all flex items-center gap-1.5 ${
                    viewMode === 'events'
                      ? 'bg-white text-[var(--color-deep-green)] shadow-sm'
                      : 'text-[var(--color-dark-gray)]/60 hover:text-[var(--color-dark-gray)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">star</span>
                  Fechas Claves
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
                  const dayEvents = importantEvents.filter(e => e.client_id === selectedClientId && e.date === dateStr)
                  const isToday = new Date().toDateString() === dayDate.toDateString()

                  return (
                    <div
                      key={`day-${dateStr}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDragEnter={() => {
                        setDraggedOverDate(dateStr);
                      }}
                      onDragLeave={() => {
                        if (draggedOverDate === dateStr) {
                          setDraggedOverDate(null);
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDraggedOverDate(null);
                        const pubId = e.dataTransfer.getData('text/plain');
                        if (pubId) {
                          handleMovePublication(pubId, dateStr);
                        }
                      }}
                      className={`min-h-[140px] bg-white border rounded-premium p-3 flex flex-col justify-between hover:shadow-md transition-all group/day relative ${
                        isToday ? 'border-[var(--color-deep-green)] ring-1 ring-[var(--color-deep-green)]/20' : 'border-gray-200'
                      } ${
                        draggedOverDate === dateStr ? 'bg-emerald-50/50 border-emerald-400 scale-[1.01] z-10 shadow-md' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          isToday ? 'bg-[var(--color-deep-green)] text-white px-2 py-0.5 rounded-full shadow-sm' : 'text-[var(--color-dark-gray)]'
                        }`}>
                          <span>{dayDate.getDate()}</span>
                          <span className={`text-[9px] ${isToday ? 'text-white/80' : 'text-gray-400'} font-semibold`}>
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayDate.getDay()]}
                          </span>
                        </span>
                        
                        {/* Quick actions visible on hover */}
                        <div className="opacity-0 group-hover/day:opacity-100 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddImportantEvent(dateStr); }}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-all"
                            title="Agregar evento clave / fecha importante"
                          >
                            <span className="material-symbols-outlined text-base">star</span>
                          </button>
                          <Link
                            to={`/admin/crm/publicacion/nueva?client_id=${selectedClientId}&date=${dateStr}`}
                            className="p-1 text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded transition-all"
                            title="Programar post en este día"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                          </Link>
                        </div>
                      </div>

                      {/* Important events list */}
                      {dayEvents.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {dayEvents.map(evt => (
                            <div 
                              key={evt.id} 
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 rounded-premium px-1.5 py-1 flex items-center justify-between gap-1 group/evt select-none"
                              title="Fecha clave / Evento importante"
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="material-symbols-outlined text-[12px] text-amber-600 flex-shrink-0">star</span>
                                <span className="truncate">{evt.title}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteImportantEvent(e, evt.id)}
                                className="opacity-0 group-hover/evt:opacity-100 text-amber-600 hover:text-amber-950 p-0.5 rounded transition-all leading-none"
                                title="Eliminar evento clave"
                              >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Day contents */}
                      <div className="flex-1 flex flex-col gap-1.5 mt-2">
                        {(() => {
                          return dayPubs.sort((a, b) => {
                            if (a.type === 'post' && b.type !== 'post') return -1;
                            if (a.type !== 'post' && b.type === 'post') return 1;
                            return 0;
                          }).map(pub => {
                            const isPost = pub.type === 'post'
                            const displayTitle = pub.title
                             return (
                              (() => {
                                const terrConfig = getTerritorioConfig(pub.territorio)
                                const cardBgClass = isPost ? terrConfig.color.bg : 'bg-transparent'
                                const cardBorderClass = isPost ? terrConfig.color.border : 'border-gray-200 border-dashed'
                                const cardHoverBgClass = isPost ? terrConfig.color.hoverBg : 'hover:bg-gray-50'
                                const cardHoverBorderClass = isPost ? terrConfig.color.hoverBorder : 'hover:border-gray-300 hover:border-solid'
                                const textClass = isPost ? (terrConfig.color.text || 'text-[var(--color-dark-gray)]') : 'text-[var(--color-dark-gray)]'
                                const dayOfWeek = dayDate.getDay() // 0 = Sunday, 1 = Monday, etc.
                                let tooltipAlignClass = 'left-1/2 -translate-x-1/2'
                                if (dayOfWeek === 1 || dayOfWeek === 2) {
                                  tooltipAlignClass = 'left-0 translate-x-0'
                                } else if (dayOfWeek === 6 || dayOfWeek === 0) {
                                  tooltipAlignClass = 'right-0 left-auto translate-x-0'
                                }

                                return (
                                  <div
                                    key={pub.id}
                                    draggable="true"
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', pub.id);
                                    }}
                                    onClick={() => navigate(`/admin/crm/publicacion/${pub.id}/editar`)}
                                    className={`p-2 border rounded text-left cursor-pointer transition-all hover:-translate-y-0.5 group/card relative ${cardBgClass} ${cardBorderClass} ${cardHoverBgClass} ${cardHoverBorderClass} ${textClass} active:scale-95 active:opacity-50`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${
                                          isPost ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'
                                        }`}>
                                          {isPost ? 'Feed' : 'Story'}
                                        </span>
                                        {isPost && pub.post_format && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-gray-500 border border-gray-150 uppercase tracking-tighter">
                                            {pub.post_format === 'carrousel' ? 'Carrusel' :
                                             pub.post_format === 'reel' ? 'Reel' :
                                             pub.post_format === 'placa' ? 'Placa' :
                                             pub.post_format === 'video' ? 'Video' : pub.post_format}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`w-2.5 h-2.5 rounded-full ${getPublicationState(pub).colorClass}`} title={getPublicationState(pub).label} />
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
                                    <div className={`hidden group-hover/card:flex flex-col gap-2 absolute z-50 bottom-full mb-2 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 pointer-events-none transition-all animate-fade-in text-left ${tooltipAlignClass} ${
                                      isPost ? 'w-96' : 'w-64'
                                    }`}>
                                      {pub.graphic_url && (() => {
                                        const firstUrl = getFirstGraphicUrl(pub.graphic_url)
                                        return firstUrl && (
                                          <div className={`w-full rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center ${
                                            isPost ? 'h-56' : 'h-96'
                                          }`}>
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
                                        {pub.territorio && !isPost && (
                                          <p className="text-[9px] text-gray-400 font-medium leading-relaxed italic mt-1 normal-case">
                                            Eje: {terrConfig.desc}
                                          </p>
                                        )}
                                        {pub.copy && (
                                          <p className={`text-[10px] text-[var(--color-dark-gray)]/80 mt-1 bg-gray-50 p-2 rounded border border-gray-150 font-mono whitespace-pre-wrap ${
                                            isPost ? '' : 'line-clamp-3'
                                          }`}>
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
                          
                          // Precompute status attributes
                          const pubState = getPublicationState(pub)
                          const hasPending = pub.status_piece && pub.status_piece.trim() !== ''
                          const pendingCount = hasPending ? pub.status_piece.split('\n').filter(Boolean).length : 0

                          // Determine dot color
                          const dotColorClass = pubState.colorClass
                          const statusLabel = pubState.label
                          
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
                                  <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} title={`Pieza: ${statusLabel}`} />
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {pub.territorio && (
                                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border mt-2 ${terrConfig.color.badge}`}>
                                        {pub.territorio}
                                      </span>
                                    )}
                                    {hasPending && (
                                      <span className="inline-flex text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 items-center gap-1 mt-2">
                                        <span className="material-symbols-outlined text-[10px] leading-none">assignment_late</span>
                                        {pendingCount} pendientes
                                      </span>
                                     )}
                                  </div>
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
          ) : viewMode === 'tasks' ? (
            /* PENDING TASKS VIEW (TABLE LAYOUT) */
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
              {(() => {
                const pubsWithTasks = publications.filter(pub => {
                  return pub.status_piece &&
                    !['draft', 'ready', 'published', 'pending_design', 'pending_assets'].includes(pub.status_piece) &&
                    pub.status_piece.trim() !== ''
                })

                if (pubsWithTasks.length === 0) {
                  return (
                    <div className="py-20 text-center text-dark-gray/40">
                      <span className="material-symbols-outlined text-4xl block mb-2">checklist_rtl</span>
                      <p className="text-sm font-bold">¡Buen trabajo! No tenés ninguna tarea pendiente de diseño/material para este cliente.</p>
                    </div>
                  )
                }

                return (
                  <div className="overflow-x-auto border border-gray-150 rounded-2xl bg-white shadow-sm">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="w-12 text-center"></th>
                          <th>Tarea Pendiente</th>
                          <th>Publicación</th>
                          <th>Fecha</th>
                          <th className="text-right w-24">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pubsWithTasks.flatMap(pub => {
                          const tasksList = pub.status_piece.split('\n').filter(line => line.trim() !== '')
                          return tasksList.map((task, idx) => {
                            const formattedDate = pub.date.split('-').reverse().join('/')
                            return (
                              <tr key={`${pub.id}-${idx}`} className="hover:bg-gray-50/50">
                                <td className="text-center py-3">
                                  <input
                                    type="checkbox"
                                    onChange={() => handleCompleteTask(pub, task)}
                                    className="w-4 h-4 text-[var(--color-deep-green)] bg-white border-gray-300 rounded focus:ring-[var(--color-deep-green)] transition-all cursor-pointer"
                                  />
                                </td>
                                <td className="font-semibold text-xs text-gray-800 py-3">
                                  {task}
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${
                                      pub.type === 'post' ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'
                                    }`}>
                                      {pub.type === 'post' ? 'Feed' : 'Story'}
                                    </span>
                                    <span className="font-bold text-xs text-gray-900 leading-snug line-clamp-1">{pub.title}</span>
                                  </div>
                                </td>
                                <td className="text-xs text-gray-500 font-semibold py-3">{formattedDate}</td>
                                <td className="text-right py-3 pr-4">
                                  <Link
                                    to={`/admin/crm/publicacion/${pub.id}/editar`}
                                    className="inline-flex p-1.5 hover:bg-gray-150 rounded text-blue-600 transition-colors"
                                    title="Editar publicación"
                                  >
                                    <span className="material-symbols-outlined text-lg leading-none">edit</span>
                                  </Link>
                                </td>
                              </tr>
                            )
                          })
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          ) : viewMode === 'events' ? (
            (() => {
              const clientEvents = importantEvents.filter(evt => evt.client_id === selectedClientId)
              
              // Helper to get client name for suggested events
              const getClientName = (cid) => {
                const c = clients.find(x => x.id === cid)
                return c ? c.name : 'Otro'
              }

              // Extract unique event templates from other clients
              const suggestedEvents = []
              const seenSuggestions = new Set()
              importantEvents.forEach(evt => {
                if (evt.client_id !== selectedClientId) {
                  const key = `${evt.date}-${evt.title.toLowerCase().trim()}`
                  if (!seenSuggestions.has(key)) {
                    seenSuggestions.add(key)
                    suggestedEvents.push({
                      id: evt.id,
                      date: evt.date,
                      title: evt.title,
                      clientName: getClientName(evt.client_id)
                    })
                  }
                }
              })

              return (
                <div className="p-6 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  {/* Form to add new key date */}
                  <div className="md:col-span-1 bg-white rounded-2xl border border-gray-150 p-5 shadow-sm space-y-4 h-fit">
                    <div>
                      <h4 className="font-bold text-sm text-[var(--color-deep-green)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">star_rate</span>
                        Nueva Fecha Clave
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Cargá fechas importantes del mes (ej: Día del Padre, efemérides, partidos) para tenerlas presentes al diseñar.
                      </p>
                    </div>
                    
                    <form onSubmit={handleAddImportantEventFromForm} className="space-y-3.5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-dark-gray/60 block mb-1">Fecha</label>
                        <input
                          type="date"
                          required
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-premium px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-dark-gray/60 block mb-1">Descripción / Nombre del Evento</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Día del Padre, Argentina vs Jordania"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-premium px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 mt-2"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Cargar Fecha Clave
                      </button>
                    </form>

                    {/* Suggestions Section */}
                    {suggestedEvents.length > 0 && (
                      <div className="pt-4 border-t border-gray-100 space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 block">
                          Copiar de otros clientes:
                        </label>
                        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                          {suggestedEvents.map(sug => (
                            <button
                              key={sug.id}
                              type="button"
                              onClick={() => {
                                setNewEventDate(sug.date)
                                setNewEventTitle(sug.title)
                                showToast('Cargada en formulario. Podés modificarla antes de guardar.')
                              }}
                              className="text-[10px] bg-amber-50/60 hover:bg-amber-100/80 text-amber-900 border border-amber-200/40 rounded px-2.5 py-1.5 text-left transition-colors font-medium flex flex-col gap-0.5 group/sug w-full"
                              title="Hacé clic para usar esta fecha y descripción"
                            >
                              <span className="font-bold truncate group-hover/sug:text-amber-955">{sug.title}</span>
                              <span className="text-[8px] text-amber-600 font-semibold">
                                {sug.date.split('-').reverse().join('/')} ({sug.clientName})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* List of existing key dates */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-sm text-[var(--color-deep-green)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">event_note</span>
                        Fechas Registradas
                      </h4>
                      <span className="text-[11px] font-bold bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)] px-2.5 py-1 rounded-full border border-[var(--color-deep-green)]/15">
                        {clientEvents.length} {clientEvents.length === 1 ? 'fecha' : 'fechas'} en total
                      </span>
                    </div>

                    {clientEvents.length === 0 ? (
                      <div className="py-16 text-center text-dark-gray/40 border border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                        <span className="material-symbols-outlined text-4xl block mb-2 text-gray-300">event_busy</span>
                        <p className="text-xs font-bold">No hay fechas claves cargadas para este cliente.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {clientEvents
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map(evt => {
                            const dateObj = new Date(evt.date + 'T00:00:00');
                            const dayNum = dateObj.getDate();
                            const monthName = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][dateObj.getMonth()];
                            const weekdayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dateObj.getDay()];
                            
                            return (
                              <div 
                                key={evt.id} 
                                className="bg-white rounded-premium border border-gray-150 p-3.5 flex items-center justify-between gap-4 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  {/* Calendar Badge */}
                                  <div className="w-11 h-11 rounded-premium bg-amber-50 border border-amber-250/50 flex flex-col items-center justify-center flex-shrink-0">
                                    <span className="text-[8px] font-extrabold text-amber-700 uppercase tracking-tighter leading-none">{monthName}</span>
                                    <span className="text-base font-black text-amber-900 leading-none mt-0.5">{dayNum}</span>
                                  </div>
                                  
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block mb-1">
                                      {weekdayName}
                                    </span>
                                    <p className="font-bold text-sm text-gray-800 truncate" title={evt.title}>
                                      {evt.title}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newTitle = window.prompt('Editar descripción de la fecha clave:', evt.title)
                                      if (newTitle !== null) {
                                        handleUpdateImportantEvent(evt.id, newTitle)
                                      }
                                    }}
                                    className="p-2 hover:bg-gray-100 text-blue-600 rounded-premium-btn transition-colors"
                                    title="Editar descripción"
                                  >
                                    <span className="material-symbols-outlined text-lg leading-none">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteImportantEvent(e, evt.id)}
                                    className="p-2 hover:bg-red-50 text-red-600 rounded-premium-btn transition-colors"
                                    title="Eliminar fecha clave"
                                  >
                                    <span className="material-symbols-outlined text-lg leading-none">delete</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()
          ) : (
            /* LIST/TABLE VIEW */
            <div className="overflow-x-auto">
              {/* Filters toolbar */}
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-dark-gray/50 block mb-1.5">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-premium px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="design_in_progress">En proceso de diseño</option>
                    <option value="done_not_programmed">Diseño terminado sin programar en Meta</option>
                    <option value="done_programmed">Diseño terminado y programado en Meta</option>
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
                      <th>Estado</th>
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
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${getPublicationState(pub).colorClass}`} />
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getPublicationState(pub).badgeClass}`}>
                              {getPublicationState(pub).label}
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
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      {/* Export Configurations Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsExportModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-150 p-6 relative text-left animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors z-20"
            >
              <span className="material-symbols-outlined text-xl leading-none">close</span>
            </button>

            <h3 className="text-lg font-bold text-[var(--color-deep-green)] mb-1">Exportar Reporte PDF</h3>
            <p className="text-xs text-gray-550 mb-6">Configurá el reporte de publicaciones antes de generar el archivo PDF.</p>

            <div className="space-y-4">
              {/* Date Range Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-650 block mb-2">Rango de fechas</label>
                <select
                  value={exportDateRange}
                  onChange={(e) => setExportDateRange(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-premium px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                >
                  <option value="all_month">Todo el mes ({monthNames[month]} {year})</option>
                  <option value="rest_of_month">Lo que resta del mes (desde hoy)</option>
                </select>
              </div>

              {/* Status Filter Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-650 block mb-2">Filtrar por estado</label>
                <select
                  value={exportStatusFilter}
                  onChange={(e) => setExportStatusFilter(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-premium px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                >
                  <option value="all">Todas las publicaciones</option>
                  <option value="pending">Solo con tareas pendientes (En proceso de diseño)</option>
                </select>
              </div>

              {/* Format Filter Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-650 block mb-2">Filtrar por canal</label>
                <select
                  value={exportTypeFilter}
                  onChange={(e) => setExportTypeFilter(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-premium px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-deep-green)]"
                >
                  <option value="all">Todos los formatos</option>
                  <option value="post">Feed (Post / Reel)</option>
                  <option value="story">Historia (Story)</option>
                </select>
              </div>

              <div className="pt-2 text-[10px] text-gray-450 font-medium">
                Se exportarán {getExportedPublications().length} publicaciones al reporte final.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  disabled={getExportedPublications().length === 0}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Imprimir / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print layout */}
      <div className="hidden print:block w-full text-black p-8 bg-white text-xs font-sans leading-relaxed">
        {/* Print Header */}
        <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Leandro Velasques</h1>
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">Agencia de IA & Automatización</p>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-gray-800">Reporte de Publicaciones</h2>
            <p className="text-[10px] text-gray-500 font-semibold uppercase">
              Cliente: {selectedClient?.name} · {monthNames[month]} {year}
            </p>
            <p className="text-[9px] text-gray-400 font-medium">Generado el: {new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>

        {/* Filters Summary */}
        <div className="mb-4 p-3 bg-gray-100 rounded border border-gray-300 flex justify-between text-[10px] font-medium text-gray-600">
          <span>Rango: {exportDateRange === 'all_month' ? 'Todo el mes' : 'Lo que resta del mes'}</span>
          <span>Estado: {exportStatusFilter === 'all' ? 'Todas las publicaciones' : 'Solo tareas pendientes'}</span>
          <span>Canal: {exportTypeFilter === 'all' ? 'Todos' : exportTypeFilter === 'post' ? 'Feed' : 'Historias'}</span>
        </div>

        {/* Content list */}
        {getExportedPublications().length === 0 ? (
          <p className="text-center py-10 text-gray-500 font-semibold">No se encontraron publicaciones con los filtros aplicados.</p>
        ) : (
          <div className="space-y-6">
            {getExportedPublications().map((pub, idx) => {
              const pubState = getPublicationState(pub)
              return (
                <div key={pub.id} className="border border-gray-300 rounded p-4 space-y-3 break-inside-avoid">
                  {/* Top line */}
                  <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 mr-2">#{idx + 1}</span>
                      <span className="text-xs font-bold text-gray-900">{pub.date.split('-').reverse().join('/')}</span>
                      <span className="ml-3 text-[10px] font-bold text-gray-700 uppercase">
                        {pub.type === 'post' ? 'Feed' : 'Story'} ({pub.post_format || 'placa'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pub.territorio && (
                        <span className="text-[9px] font-bold border border-gray-300 px-1.5 py-0.5 rounded uppercase">
                          {pub.territorio}
                        </span>
                      )}
                      <span className="text-[9px] font-bold border border-gray-300 px-1.5 py-0.5 rounded uppercase">
                        {pubState.label}
                      </span>
                    </div>
                  </div>

                  {/* Body title & Copy */}
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">{pub.title}</h4>
                    {pub.copy ? (
                      <p className="mt-1.5 text-[10px] text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 font-mono whitespace-pre-wrap leading-relaxed">
                        {pub.copy}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[10px] italic text-gray-400">Sin copy redactado.</p>
                    )}
                  </div>

                  {/* Pending tasks / Notes */}
                  {(pub.status_piece && pub.status_piece.trim() !== '') || (pub.notes && pub.notes.trim() !== '') ? (
                    <div className="grid grid-cols-2 gap-4 pt-1 text-[10px]">
                      {pub.status_piece && pub.status_piece.trim() !== '' && (
                        <div className="space-y-1">
                          <p className="font-bold text-gray-600 uppercase tracking-wider text-[8px]">Tareas Pendientes</p>
                          <div className="border border-gray-200 p-2 rounded bg-gray-50 space-y-1 text-gray-700">
                            {pub.status_piece.split('\n').filter(Boolean).map((task, tidx) => (
                              <div key={tidx} className="flex items-start gap-1">
                                <span>•</span>
                                <span className="leading-tight">{task}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {pub.notes && pub.notes.trim() !== '' && (
                        <div className="space-y-1">
                          <p className="font-bold text-gray-600 uppercase tracking-wider text-[8px]">Observaciones</p>
                          <p className="border border-gray-200 p-2 rounded bg-gray-50 text-gray-700 whitespace-pre-wrap leading-tight">
                            {pub.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
