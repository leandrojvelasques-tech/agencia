import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note', next: 'Publicar', nextStatus: 'published' },
  published: { label: 'Publicado', color: 'green', icon: 'public', next: 'Iniciar evento', nextStatus: 'in_progress' },
  in_progress: { label: 'En curso', color: 'yellow', icon: 'play_circle', next: 'Finalizar', nextStatus: 'completed' },
  completed: { label: 'Finalizado', color: 'green', icon: 'check_circle' },
  cancelled: { label: 'Cancelado', color: 'red', icon: 'cancel' },
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getEventById, getEventStats, updateEvent, publishEvent, deleteEvent, isLoading } = useStore()
  const [event, setEvent] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      const statsData = await getEventStats(id)
      setEvent(eventData)
      setStats(statsData)
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

  const ACTIONS = [
    { to: `/admin/eventos/${id}/participantes`, icon: 'group', label: 'Participantes', count: stats.totalRegistered },
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
          <div key={stat.label} className="card p-5 text-center">
            <span className={`material-symbols-outlined text-2xl text-[var(--color-${stat.color})]/30 mb-2 block`}>{stat.icon}</span>
            <p className="text-3xl font-extrabold text-[var(--color-deep-green)]">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
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
              <button onClick={() => copyToClipboard(eventUrl)} className="btn-ghost !px-3 !py-1.5 text-xs">
                <span className="material-symbols-outlined text-base">content_copy</span>
                Copiar
              </button>
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
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !py-2 !text-xs flex-1"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      Abrir
                    </a>
                    
                    {material.type === 'presentation' && (
                      <a
                        href={material.url.replace('index.html', 'presentacion.pdf')}
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
    </div>
  )
}
