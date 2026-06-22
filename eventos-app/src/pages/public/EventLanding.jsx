import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ensureAbsoluteUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:')) return url
  return `https://${url}`
}

export default function EventLanding() {
  const { slug } = useParams()
  const { getEventBySlug } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvent() {
      setLoading(true)
      const data = await getEventBySlug(slug)
      setEvent(data)
      setLoading(false)
    }
    loadEvent()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] mb-2 block">hourglass_empty</span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/40">Cargando...</p>
        </div>
      </div>
    )
  }

  const searchParams = new URLSearchParams(window.location.search)
  const isPreview = searchParams.get('preview') === 'true'

  if (!event || (event.status === 'draft' && !isPreview)) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-6xl text-[var(--color-dark-gray)]/20 mb-4 block">event_busy</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Evento no disponible</h1>
          <p className="text-[var(--color-dark-gray)]/60 font-medium">Este evento no existe o aún no ha sido publicado.</p>
          <a href="https://www.leandrovelasques.com.ar" className="btn-primary mt-6 inline-flex">Ir al sitio principal</a>
        </div>
      </div>
    )
  }

  if (event.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-6xl text-red-300 mb-4 block">cancel</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Evento cancelado</h1>
          <p className="text-[var(--color-dark-gray)]/60 font-medium">Lamentablemente, este evento ha sido cancelado.</p>
        </div>
      </div>
    )
  }

  const eventDate = new Date(event.event_date + 'T23:59:59')
  const isPastEvent = eventDate < new Date()
  const canRegister = event.status === 'published' && !isPastEvent && (event.registration_mode === 'self' || event.registration_mode === 'both')

  const materials = event.event_materials?.filter(m => m.type !== 'image') || []
  const photos = event.event_materials?.filter(m => m.type === 'image') || []

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)]">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 flex items-center h-16">
          <a href="https://www.leandrovelasques.com.ar" target="_blank" rel="noreferrer" className="flex items-center gap-2">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight">LEANDRO VELASQUES</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 lg:py-12 animate-fade-in">
        {/* Banner */}
        {event.banner_url && (
          <div className="rounded-[var(--radius-card)] overflow-hidden mb-8 shadow-[var(--shadow-premium)]">
            <img src={event.banner_url} alt={event.title} className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Event Type Badge */}
        <div className="mb-4">
          <span className="badge badge-green text-xs">
            {event.type === 'charla' ? '🎤 Charla' : '🛠 Taller'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-2">{event.title}</h1>
        {event.subtitle && <p className="text-lg text-[var(--color-dark-gray)]/60 font-medium mb-6">{event.subtitle}</p>}

        {/* Key Info */}
        <div className="card p-5 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">calendar_today</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Fecha</p>
                <p className="text-sm font-semibold">{format(eventDate, "d 'de' MMMM, yyyy", { locale: es })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">schedule</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Horario</p>
                <p className="text-sm font-semibold">{event.start_time} hs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">timer</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Duración</p>
                <p className="text-sm font-semibold">{event.duration_minutes >= 60 ? `${Math.floor(event.duration_minutes/60)}h ${event.duration_minutes % 60 > 0 ? event.duration_minutes % 60 + 'min' : ''}` : `${event.duration_minutes} min`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">person</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Coordinador</p>
                <p className="text-sm font-semibold">{event.coordinator}</p>
              </div>
            </div>
          </div>
          {event.organizer && (
            <div className="mt-4 pt-4 border-t border-[var(--color-deep-green)]/8 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]/50">apartment</span>
              <p className="text-sm font-medium text-[var(--color-dark-gray)]/60">Organiza: <span className="font-semibold text-[var(--color-dark-gray)]">{event.organizer}</span></p>
            </div>
          )}
        </div>

        {/* Live link banner */}
        {event.live_link && (
          <div className="card p-5 mb-8 bg-blue-50/50 border border-blue-100 flex items-center gap-4 animate-fade-in">
            <div className="w-12 h-12 rounded-[var(--radius-premium)] bg-blue-600 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">video_camera_back</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-0.5">Transmisión en Vivo / Videollamada</p>
              <a 
                href={ensureAbsoluteUrl(event.live_link)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-bold text-blue-700 hover:text-blue-900 transition-all break-all flex items-center gap-1.5 group"
              >
                Unirse a Google Meet / Transmisión
                <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">open_in_new</span>
              </a>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-8">
          <p className="text-base text-[var(--color-dark-gray)]/80 leading-relaxed">{event.description_short}</p>
          {event.description_extended && (
            <p className="text-base text-[var(--color-dark-gray)]/70 leading-relaxed mt-4">{event.description_extended}</p>
          )}
        </div>

        {/* Agenda */}
        {event.agenda && event.agenda.length > 0 && event.agenda[0].topic && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">list_alt</span>
              Agenda
            </h2>
            <div className="space-y-3">
              {event.agenda.filter(a => a.topic || a.block).map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5">
                  <div className="flex-shrink-0 w-full sm:w-24">
                    <span className="text-sm font-bold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 px-3 py-1.5 rounded-[var(--radius-premium)] whitespace-nowrap text-center block">
                      {item.time || '—'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0 sm:pt-1">
                    {item.block && <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-deep-green)]/60 mb-1">{item.block}</p>}
                    <p className="text-sm text-[var(--color-dark-gray)] font-medium">{item.topic}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materiales */}
        {materials.length > 0 && (
          <div className="card p-6 mb-8 bg-[var(--color-deep-green)]/5 border-dashed border-[var(--color-deep-green)]/20">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-deep-green)]">
              <span className="material-symbols-outlined text-xl">folder_zip</span>
              Materiales del Evento
            </h2>
            <div className="space-y-3">
              {materials.map((material, i) => (
                <a 
                  key={i} 
                  href={ensureAbsoluteUrl(material.url)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-4 p-3 rounded-[var(--radius-premium)] bg-white/50 hover:bg-white transition-all border border-transparent hover:border-[var(--color-deep-green)]/10 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-deep-green)]/10 flex items-center justify-center text-[var(--color-deep-green)] group-hover:bg-[var(--color-deep-green)] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">
                      {material.type === 'presentation' ? 'present_to_all' : 'description'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--color-dark-gray)]">{material.title}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-dark-gray)]/40">
                      {material.type === 'presentation' ? 'Diapositivas' : 'Recurso'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[var(--color-dark-gray)]/20 group-hover:text-[var(--color-deep-green)] group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Galería de Fotos del Evento */}
        {photos.length > 0 && (
          <div className="card p-6 mb-8 bg-white shadow-[var(--shadow-premium)]">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-deep-green)]">
              <span className="material-symbols-outlined text-xl">photo_library</span>
              Fotos del Evento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((photo, i) => (
                <div key={i} className="group rounded-[var(--radius-premium)] overflow-hidden border border-[var(--color-deep-green)]/5 shadow-sm hover:shadow-md transition-all relative flex flex-col bg-[var(--color-refined-gray)]/30">
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={photo.url} 
                      alt={photo.title || 'Foto del evento'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                      onClick={() => window.open(photo.url, '_blank')}
                    />
                  </div>
                  {photo.title && (
                    <div className="p-3 bg-white border-t border-[var(--color-deep-green)]/5">
                      <p className="text-xs font-semibold text-[var(--color-dark-gray)]/85 text-center leading-snug">{photo.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {canRegister && (
          <div className="text-center py-6">
            <Link to={`/evento/${slug}/inscripcion`} className="btn-primary !text-lg !px-10 !py-5">
              <span className="material-symbols-outlined text-2xl">how_to_reg</span>
              Inscribirme ahora
            </Link>
          </div>
        )}

        {(event.status === 'completed' || isPastEvent) && (
          <div className="card p-6 text-center bg-[var(--color-light-green)]/15">
            <span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)] mb-2 block">check_circle</span>
            <p className="text-sm font-semibold text-[var(--color-deep-green)]">Este evento ya finalizó</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-deep-green)]/8 py-6 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs text-[var(--color-dark-gray)]/40 font-medium">
            Organizado por <a href="https://www.leandrovelasques.com.ar" target="_blank" rel="noreferrer" className="text-[var(--color-deep-green)]/60 hover:text-[var(--color-deep-green)]">Leandro Velasques</a> · leandrovelasques.com.ar
          </p>
        </div>
      </footer>
    </div>
  )
}
