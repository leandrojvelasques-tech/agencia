import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import html2canvas from 'html2canvas'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note', next: 'Publicar', nextStatus: 'published' },
  published: { label: 'Publicado', color: 'green', icon: 'public', next: 'Iniciar evento', nextStatus: 'in_progress' },
  in_progress: { label: 'En curso', color: 'yellow', icon: 'play_circle', next: 'Finalizar', nextStatus: 'completed' },
  completed: { label: 'Finalizado', color: 'green', icon: 'check_circle' },
  cancelled: { label: 'Cancelado', color: 'red', icon: 'cancel' },
}

const ensureAbsoluteUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:')) return url
  return `https://${url}`
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEventById, getEventStats, updateEvent, publishEvent, deleteEvent, isLoading } = useStore()
  const [event, setEvent] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalityCounts, setModalityCounts] = useState({ presencial: 0, virtual: 0 })
  const [showFlyerModal, setShowFlyerModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const flyerRef = useRef(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      const statsData = await getEventStats(id)
      setEvent(eventData)
      setStats(statsData)

      if (eventData) {
        // Query registrations to count by modality
        const { data: regs } = await supabase
          .from('registrations')
          .select('attendance_mode')
          .eq('event_id', eventData.id)
          .neq('status', 'cancelled')
          
        const pCount = regs?.filter(r => r.attendance_mode === 'presencial').length || 0
        const vCount = regs?.filter(r => r.attendance_mode === 'virtual').length || 0
        setModalityCounts({ presencial: pCount, virtual: vCount })
      }

      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) {
    return <div className="max-w-4xl mx-auto p-12 text-center">Cargando evento...</div>
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">error</span>
        <p className="text-lg font-semibold text-[var(--color-dark-gray)]/40">Evento no encontrado</p>
        <Link to="/admin/eventos" className="btn-primary mt-6 inline-flex">Volver al listado</Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft
  const eventDate = new Date(event.event_date + 'T12:00:00')
  const eventUrl = `${window.location.origin}/evento/${event.slug}`
  const attendanceUrl = `${window.location.origin}/evento/${event.slug}/asistencia`

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'published') {
      await publishEvent(event.id)
    } else {
      await updateEvent(event.id, { status: newStatus })
    }
    // Refresh data
    const updatedStatusEventData = await getEventById(id)
    setEvent(updatedStatusEventData)
  }

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que querés eliminar este evento? Esta acción no se puede deshacer.')) {
      deleteEvent(event.id)
      navigate('/admin/eventos')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleResetToken = async () => {
    if (window.confirm('¿Estás seguro de que querés restablecer el enlace de seguimiento? El enlace anterior dejará de funcionar inmediatamente.')) {
      setLoading(true)
      try {
        const newToken = Array.from({length: 32}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
        const { error } = await supabase
          .from('events')
          .update({ private_link_token: newToken })
          .eq('id', event.id)
        
        if (error) throw error
        
        const updated = await getEventById(id)
        setEvent(updated)
        alert('Enlace de seguimiento restablecido correctamente.')
      } catch (err) {
        alert('Error al restablecer el enlace: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
  }
  const downloadFlyer = async () => {
    if (!flyerRef.current) return
    setExporting(true)
    try {
      // Delay for QR code image to render
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const canvas = await html2canvas(flyerRef.current, {
        useCORS: true,
        scale: 1, // Full size is 1080x1920
        logging: false,
        backgroundColor: '#022c22'
      })
      
      const link = document.createElement('a')
      link.download = `flyer-${event.slug}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.click()
    } catch (err) {
      alert('Error al generar el flyer: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const ACTIONS = [
    { to: `/admin/eventos/${id}/participantes`, icon: 'group', label: 'Participantes', count: stats.totalRegistered },
    { to: `/admin/eventos/${id}/participantes?tab=survey`, icon: 'assignment', label: 'Encuestas', count: null },
    { to: `/admin/eventos/${id}/asistencia`, icon: 'fact_check', label: 'Asistencia', count: stats.present },
    { to: `/admin/eventos/${id}/minuta`, icon: 'description', label: 'Minuta', count: null },
  ]
  const materials = event.event_materials?.filter(m => m.type !== 'image') || []
  const photos = event.event_materials?.filter(m => m.type === 'image') || []

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/eventos" className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge badge-${statusCfg.color}`}>
              <span className={`status-dot status-dot-${statusCfg.color}`} />
              {statusCfg.label}
            </span>
            <span className="badge badge-gray">{event.type === 'charla' ? 'Charla' : 'Taller'}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight truncate">{event.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFlyerModal(true)} className="btn-primary flex items-center gap-1.5 shadow-[var(--shadow-premium)]">
            <span className="material-symbols-outlined text-lg">campaign</span>
            <span>Flyer 1080x1920</span>
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <Link to={`/admin/eventos/${id}/editar`} className="btn-ghost">
            <span className="material-symbols-outlined text-lg">edit</span>
            <span className="hidden sm:inline">Editar</span>
          </Link>
          <button onClick={handleDelete} className="btn-ghost text-red-500 hover:!bg-red-50">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, .btn-ghost, .btn-primary, .btn-secondary, .badge, .status-dot, button { display: none !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; break-inside: avoid; }
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
          h1 { font-size: 24pt !important; }
          .material-symbols-outlined { color: black !important; }
          .print-only { display: block !important; }
        }
      ` }} />

      {/* Event Info Card */}
      <div className="card p-6 lg:p-8 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">calendar_today</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Fecha</p>
              <p className="text-sm font-semibold">{format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">schedule</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Horario</p>
              <p className="text-sm font-semibold">{event.start_time} hs · {event.duration_minutes} min</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">person</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Coordinador</p>
              <p className="text-sm font-semibold">{event.coordinator}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">apartment</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1">Organizador</p>
              <p className="text-sm font-semibold">{event.organizer || '—'}</p>
            </div>
          </div>
        </div>
        {event.description_short && (
          <p className="mt-6 pt-6 border-t border-[var(--color-deep-green)]/8 text-sm text-[var(--color-dark-gray)]/70 leading-relaxed">
            {event.description_short}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Inscriptos', value: stats.totalRegistered, icon: 'group', color: 'deep-green' },
          { label: 'Presentes', value: stats.present, icon: 'check_circle', color: 'deep-green' },
          { label: 'Ausentes', value: stats.absent, icon: 'cancel', color: 'dark-gray' },
        ].map(stat => (
          <div key={stat.label} className="card p-5 text-center flex flex-col justify-between min-h-[140px]">
            <div>
              <span className={`material-symbols-outlined text-2xl text-[var(--color-${stat.color})]/30 mb-2 block`}>{stat.icon}</span>
              <p className="text-3xl font-extrabold text-[var(--color-deep-green)]">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mt-1">{stat.label}</p>
            </div>
            {stat.label === 'Inscriptos' && (
              <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-[var(--color-deep-green)]/8 text-xs font-semibold">
                <span className="text-[var(--color-dark-gray)]/60" title="Inscriptos presenciales / Capacidad">
                  🏫 {modalityCounts.presencial} {event.max_capacity_presencial ? `/ ${event.max_capacity_presencial}` : ''}
                </span>
                <span className="text-[var(--color-dark-gray)]/60" title="Inscriptos virtuales / Capacidad">
                  💻 {modalityCounts.virtual} {event.max_capacity_virtual ? `/ ${event.max_capacity_virtual}` : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ACTIONS.map(action => (
          <Link key={action.to} to={action.to} className="card card-interactive p-5 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center group-hover:bg-[var(--color-deep-green)] transition-colors">
              <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)] group-hover:text-white transition-colors">{action.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--color-dark-gray)]">{action.label}</p>
              {action.count !== null && (
                <p className="text-xs text-[var(--color-dark-gray)]/50 font-medium">{action.count} registros</p>
              )}
            </div>
            <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/20 group-hover:text-[var(--color-deep-green)] group-hover:translate-x-1 transition-all">
              arrow_forward
            </span>
          </Link>
        ))}
      </div>

      {/* Links & Actions */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest">Links del Evento</h3>

        {event.status !== 'draft' && (
          <>
            <div className="flex items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3">
              <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]">link</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de inscripción</p>
                <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{eventUrl}</p>
              </div>
              <button onClick={() => { copyToClipboard(eventUrl); alert('Copiado al portapapeles'); }} className="btn-ghost !px-3 !py-1.5 text-xs">
                <span className="material-symbols-outlined text-base">content_copy</span>
                Copiar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3 border border-[var(--color-deep-green)]/10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="material-symbols-outlined text-lg text-emerald-600">visibility</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de seguimiento (Consejo / Externo)</p>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{`${window.location.origin}/evento/${event.slug}/inscritos?token=${event.private_link_token}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button onClick={() => { copyToClipboard(`${window.location.origin}/evento/${event.slug}/inscritos?token=${event.private_link_token}`); alert('Copiado al portapapeles'); }} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Copiar
                </button>
                <button onClick={handleResetToken} className="btn-ghost !px-3 !py-1.5 text-xs text-red-500 hover:bg-red-50" title="Restablecer enlace de seguridad">
                  <span className="material-symbols-outlined text-base">lock_reset</span>
                  Restablecer
                </button>
              </div>
            </div>

            {event.attendance_link_token && (
              <div className="flex items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3">
                <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]">fact_check</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de asistencia</p>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{attendanceUrl}</p>
                </div>
                <button onClick={() => copyToClipboard(attendanceUrl)} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Copiar
                </button>
              </div>
            )}

            {event.live_link && (
              <div className="flex items-center gap-3 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-3">
                <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]">video_camera_back</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">Link de transmisión (Meet)</p>
                  <p className="text-sm font-medium text-[var(--color-dark-gray)] truncate">{event.live_link}</p>
                </div>
                <a href={ensureAbsoluteUrl(event.live_link)} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Abrir
                </a>
                <button onClick={() => copyToClipboard(event.live_link)} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Copiar
                </button>
              </div>
            )}
          </>
        )}

        {/* Materiales del Evento */}
        {materials.length > 0 && (
          <div className="border-t border-[var(--color-deep-green)]/10 pt-6">
            <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest mb-4">Materiales Disponibles</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {materials.map((material, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)] border border-[var(--color-deep-green)]/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">
                      {material.type === 'presentation' ? 'present_to_all' : 'description'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-0.5">
                        {material.type === 'presentation' ? 'Presentación Interactiva' : 'Documento'}
                      </p>
                      <p className="text-sm font-bold text-[var(--color-dark-gray)] truncate">{material.title}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={ensureAbsoluteUrl(material.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !py-2 !text-xs flex-1"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Abrir
                    </a>
                    
                    {material.type === 'presentation' && (
                      <a
                        href={ensureAbsoluteUrl(material.url).replace('index.html', 'presentacion.pdf')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !py-2 !text-xs !bg-white hover:!bg-red-50 !text-red-600 !border-red-100"
                        title="Descargar PDF (si está disponible)"
                      >
                        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        PDF
                      </a>
                    )}
                    
                    <button 
                      onClick={() => copyToClipboard(material.url)} 
                      className="btn-ghost !p-2 !min-w-0"
                      title="Copiar link"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos del Evento */}
        {photos.length > 0 && (
          <div className="border-t border-[var(--color-deep-green)]/10 pt-6">
            <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest mb-4">Fotos del Evento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)] border border-[var(--color-deep-green)]/5">
                  <div className="aspect-video overflow-hidden rounded-[var(--radius-premium)]">
                    <img src={photo.url} alt={photo.title || 'Foto'} className="w-full h-full object-cover" />
                  </div>
                  {photo.title && (
                    <p className="text-xs font-semibold text-[var(--color-dark-gray)]/70 text-center truncate">{photo.title}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <a href={photo.url} target="_blank" rel="noreferrer" className="btn-primary !py-1.5 !text-[10px] flex-1 text-center">
                      Ver grande
                    </a>
                    <button onClick={() => copyToClipboard(photo.url)} className="btn-ghost !p-1.5 !min-w-0" title="Copiar URL">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback para Manual de Supervivencia si no está en la DB todavía */}
        {!event.event_materials?.length && event.title?.toLowerCase().includes('manual de supervivencia') && (
          <div className="border-t border-[var(--color-deep-green)]/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-3">Presentación Interactiva</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`${window.location.origin}/manual-de-supervivencia.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <span className="material-symbols-outlined text-lg">present_to_all</span>
                Abrir Presentación
              </a>
            </div>
          </div>
        )}

        {/* Status action button */}
        <div className="flex gap-3 pt-2">
          {statusCfg.next && (
            <button onClick={() => handleStatusChange(statusCfg.nextStatus)} className="btn-primary">
              <span className="material-symbols-outlined text-lg">{STATUS_CONFIG[statusCfg.nextStatus]?.icon}</span>
              {statusCfg.next}
            </button>
          )}
          {(event.status === 'completed' || event.status === 'cancelled') && (
            <button onClick={() => handleStatusChange('published')} className="btn-primary">
              <span className="material-symbols-outlined text-lg">public</span>
              Restaurar a Publicado
            </button>
          )}
          {event.status !== 'draft' && (
            <button onClick={() => handleStatusChange('draft')} className="btn-ghost !text-[var(--color-dark-gray)]/60">
              <span className="material-symbols-outlined text-lg">edit_note</span>
              Volver a Borrador
            </button>
          )}
          {event.status !== 'cancelled' && event.status !== 'completed' && (
            <button onClick={() => handleStatusChange('cancelled')} className="btn-secondary !border-red-300 !text-red-600 hover:!bg-red-600 hover:!text-white">
              <span className="material-symbols-outlined text-lg">cancel</span>
              Cancelar Evento
            </button>
          )}
        </div>
      </div>

      {/* Hidden 1080x1920 flyer target for html2canvas */}
      <div 
        ref={flyerRef}
        style={{
          width: '1080px',
          height: '1920px',
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '90px 80px',
          background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)',
          color: '#ffffff',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          boxSizing: 'border-box',
          zIndex: -100
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" style={{ height: '70px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '4px', color: '#10b981' }}>LEANDRO VELASQUES</span>
          </div>
          <span style={{ 
            fontSize: '22px', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '2px', 
            padding: '10px 24px', 
            borderRadius: '40px', 
            border: '2px solid #10b981',
            color: '#10b981'
          }}>
            {event.type === 'charla' ? '🎤 Charla' : '🛠 Taller'}
          </span>
        </div>

        {/* Central Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', margin: '80px 0' }}>
          <h1 style={{ 
            fontSize: '72px', 
            fontWeight: 900, 
            lineHeight: 1.15, 
            letterSpacing: '-2px', 
            margin: 0,
            background: 'linear-gradient(to right, #ffffff, #a7f3d0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {event.title}
          </h1>
          {event.subtitle && (
            <p style={{ fontSize: '32px', color: '#a7f3d0', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
              {event.subtitle}
            </p>
          )}
          <div style={{ height: '4px', width: '150px', background: '#10b981', borderRadius: '2px' }} />
          <p style={{ fontSize: '24px', color: '#e2e8f0', margin: 0, lineHeight: 1.6, opacity: 0.9 }}>
            {event.description_short}
          </p>
        </div>

        {/* Details and QR Grid */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid rgba(16, 185, 129, 0.2)', paddingTop: '60px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#10b981' }}>calendar_today</span>
              <div>
                <p style={{ fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', color: '#a7f3d0', margin: '0 0 5px 0', fontWeight: 700 }}>Fecha</p>
                <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{format(eventDate, "EEEE d 'de' MMMM", { locale: es })}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#10b981' }}>schedule</span>
              <div>
                <p style={{ fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', color: '#a7f3d0', margin: '0 0 5px 0', fontWeight: 700 }}>Horario</p>
                <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{event.start_time} hs <span style={{ fontSize: '22px', opacity: 0.7 }}>· {event.duration_minutes} min</span></p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#10b981' }}>person</span>
              <div>
                <p style={{ fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', color: '#a7f3d0', margin: '0 0 5px 0', fontWeight: 700 }}>Coordinador</p>
                <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{event.coordinator}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.05)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(eventUrl)}`} 
              alt="QR Code" 
              style={{ width: '220px', height: '220px', borderRadius: '12px', border: '8px solid white' }}
            />
            <p style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#10b981', margin: 0 }}>Escaneá para Inscribirte</p>
          </div>
        </div>
      </div>

      {/* Flyer Modal */}
      {showFlyerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[var(--radius-card)] max-w-md w-full p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-[var(--color-dark-gray)]">Flyer Promocional (1080x1920)</h2>
              <button onClick={() => setShowFlyerModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Flyer Aspect Ratio Preview */}
            <div className="aspect-[9/16] w-full max-h-[50vh] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-[var(--radius-premium)] shadow-inner p-6 flex flex-col justify-between text-white overflow-hidden select-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-black text-[10px] tracking-widest text-emerald-400">L. VELASQUES</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-400 text-emerald-400">
                  {event.type === 'charla' ? '🎤 Charla' : '🛠 Taller'}
                </span>
              </div>
              
              <div className="flex flex-col gap-2 my-4">
                <h3 className="text-xl font-black leading-tight text-white line-clamp-2">{event.title}</h3>
                {event.subtitle && <p className="text-xs text-emerald-200 font-medium line-clamp-1">{event.subtitle}</p>}
                <p className="text-[10px] text-gray-200 line-clamp-3 leading-relaxed opacity-85">{event.description_short}</p>
              </div>
              
              <div className="flex justify-between items-end border-t border-emerald-400/20 pt-3">
                <div className="flex flex-col gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-white">
                    <span className="material-symbols-outlined text-xs text-emerald-400">calendar_today</span>
                    <span>{format(eventDate, "d 'de' MMMM", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white">
                    <span className="material-symbols-outlined text-xs text-emerald-400">schedule</span>
                    <span>{event.start_time} hs</span>
                  </div>
                </div>
                <div className="bg-white/5 p-1.5 rounded border border-emerald-400/10 flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded flex items-center justify-center p-0.5">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(eventUrl)}`} alt="QR" className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={downloadFlyer} 
                className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Generando imagen...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">download</span>
                    Descargar Imagen (JPG)
                  </>
                )}
              </button>
              <button onClick={() => setShowFlyerModal(false)} className="btn-secondary py-3 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
