import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

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
  const [presentations, setPresentations] = useState([])

  useEffect(() => {
    async function loadEvent() {
      setLoading(true)
      const data = await getEventBySlug(slug)
      setEvent(data)
      if (data) {
        try {
          const { data: presData } = await supabase
            .from('crm_presentations')
            .select('id, title')
            .eq('event_id', data.id)
          setPresentations(presData || [])
        } catch (err) {
          console.error('Error loading presentations:', err)
        }
      }
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

        {/* Video explicativo */}
        {event.video_url && (() => {
          let embedUrl = '';
          const urlStr = event.video_url.trim();
          
          // YouTube parsing
          if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be')) {
            let videoId = '';
            if (urlStr.includes('youtu.be/')) {
              videoId = urlStr.split('youtu.be/')[1]?.split(/[?#]/)[0];
            } else {
              const urlParams = new URLSearchParams(urlStr.split('?')[1]);
              videoId = urlParams.get('v');
            }
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
          }
          // Vimeo parsing
          else if (urlStr.includes('vimeo.com')) {
            const videoId = urlStr.split('vimeo.com/')[1]?.split(/[?#]/)[0];
            if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
          }

          if (embedUrl) {
            return (
              <div className="rounded-[var(--radius-card)] overflow-hidden mb-8 shadow-[var(--shadow-premium)] aspect-video bg-black">
                <iframe
                  src={embedUrl}
                  title="Video explicativo"
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            );
          } else {
            // Direct MP4 video file
            return (
              <div className="rounded-[var(--radius-card)] overflow-hidden mb-8 shadow-[var(--shadow-premium)] bg-black">
                <video
                  src={event.video_url}
                  controls
                  className="w-full max-h-[450px]"
                />
              </div>
            );
          }
        })()}

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
            <div className="flex items-start gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-[var(--radius-premium)] bg-[var(--color-deep-green)]/8 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">calendar_today</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50">Fecha(s)</p>
                {event.offered_dates && event.offered_dates.length > 0 ? (
                  <div className="space-y-1">
                    {event.offered_dates.map(dateStr => {
                      const d = new Date(dateStr + 'T23:59:59');
                      const formatted = format(d, "EEEE d 'de' MMMM", { locale: es });
                      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                      return (
                        <p key={dateStr} className="text-xs font-semibold whitespace-nowrap">
                          {capitalized}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm font-semibold">{format(eventDate, "d 'de' MMMM, yyyy", { locale: es })}</p>
                )}
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



        {/* Description */}
        <div className="mb-8">
          <p className="text-base text-[var(--color-dark-gray)]/80 leading-relaxed">{event.description_short}</p>
          {event.description_extended && (
            <p className="text-base text-[var(--color-dark-gray)]/70 leading-relaxed mt-4">{event.description_extended}</p>
          )}
        </div>

        {/* Agenda */}
        {event.agenda && event.agenda.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-[var(--color-deep-green)]/10 pb-2">
              <span className="material-symbols-outlined text-xl text-[var(--color-deep-green)]">list_alt</span>
              Agenda / Programa
            </h2>
            <div className="space-y-6">
              {/* Check if new format (nested classes/blocks) */}
              {event.agenda[0] && 'blocks' in event.agenda[0] ? (
                event.agenda.map((c, classIdx) => (
                  <div key={classIdx} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-deep-green)]/5 pb-1">
                      <h3 className="text-md font-bold text-[var(--color-deep-green)] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-deep-green)]"></span>
                        {c.title}
                      </h3>
                      {(c.start_time || c.end_time) && (
                        <span className="text-xs font-bold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {c.start_time || '—'}{c.end_time ? ` - ${c.end_time}` : ''} hs
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 pl-4 border-l border-[var(--color-deep-green)]/10">
                      {(c.blocks || []).map((b, blockIdx) => (
                        <div key={blockIdx} className="p-3 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70 mb-1">
                            {b.title || `Bloque ${blockIdx + 1}`}
                          </p>
                          {b.description ? (
                            <p className="text-sm text-[var(--color-dark-gray)]/85 font-medium leading-relaxed">
                              {b.description}
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--color-dark-gray)]/40 italic">Sin descripción general</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {c.break_duration > 0 && (
                      <div className="flex items-center gap-2.5 bg-[var(--color-light-green)]/15 border border-[var(--color-deep-green)]/10 rounded-[var(--radius-premium)] p-3 my-3 ml-4">
                        <div className="flex items-center gap-1.5 text-[var(--color-deep-green)]">
                          <span className="material-symbols-outlined text-md">coffee</span>
                          <span className="text-base select-none">🧉 🥐</span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]">Break / Receso ({c.break_duration} min)</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Old format fallback */
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
              )}
            </div>
          </div>
        )}

        {/* Requisitos del Evento */}
        {event.requirements && (
          <div className="card p-6 mb-8 bg-amber-50/60 border border-amber-300/30">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-700">
              <span className="material-symbols-outlined text-xl">checklist</span>
              Requisitos
            </h2>
            <div className="text-sm text-[var(--color-dark-gray)]/85 font-medium leading-relaxed whitespace-pre-line">
              {event.requirements}
            </div>
          </div>
        )}

        {/* Presentaciones y Clases del Evento (Comentado temporalmente por solicitud del usuario)
        {presentations.length > 0 && (
          <div className="card p-6 mb-8 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-deep-green)]">
              <span className="material-symbols-outlined text-xl">slideshow</span>
              Clases y Diapositivas
            </h2>
            <div className="space-y-3">
              {presentations.map((pres) => (
                <Link
                  key={pres.id}
                  to={`/presentacion/${pres.id}`}
                  target="_blank"
                  className="flex items-center gap-4 p-3.5 rounded-[var(--radius-premium)] bg-white hover:bg-white transition-all border border-transparent hover:border-[var(--color-deep-green)]/10 group shadow-sm animate-fade-in"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-deep-green)]/10 flex items-center justify-center text-[var(--color-deep-green)] group-hover:bg-[var(--color-deep-green)] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">present_to_all</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--color-dark-gray)]">{pres.title}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-dark-gray)]/45">
                      Ver diapositivas de clase
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[var(--color-dark-gray)]/20 group-hover:text-[var(--color-deep-green)] group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        */}



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

        {/* Precios y Medios de Pago */}
        {((event.prices && event.prices.length > 0) || event.payment_methods) && (
          <div className="card p-6 mb-8 bg-white border border-[var(--color-deep-green)]/10 shadow-[var(--shadow-premium)]">
            {event.prices && event.prices.length > 0 && (
              <div className={event.payment_methods ? "mb-6" : ""}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-deep-green)]">
                  <span className="material-symbols-outlined text-xl">payments</span>
                  Inversión y Aranceles
                </h2>
                <div className="divide-y divide-[var(--color-deep-green)]/5">
                  {event.prices.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                      <span className="text-sm font-semibold text-[var(--color-dark-gray)]/85">{item.concept}</span>
                      <span className="text-sm font-bold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 px-3 py-1 rounded-full">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.payment_methods && (
              <div className={event.prices && event.prices.length > 0 ? "pt-6 border-t border-[var(--color-deep-green)]/10" : ""}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-deep-green)] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-lg">account_balance</span>
                  Medios de Pago / Datos de Transferencia
                </h3>
                <div className="bg-[var(--color-refined-gray)]/45 p-4 rounded-xl border border-[var(--color-deep-green)]/5 font-mono text-xs text-[var(--color-dark-gray)]/80 whitespace-pre-wrap leading-relaxed">
                  {event.payment_methods}
                </div>
              </div>
            )}
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

        {!canRegister && event.status === 'published' && !isPastEvent && event.registration_mode === 'manual' && (
          <div className="card p-6 text-center bg-[var(--color-deep-green)]/5 border border-dashed border-[var(--color-deep-green)]/20 rounded-[var(--radius-card)] max-w-md mx-auto">
            <span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)] mb-2 block">lock</span>
            <p className="text-sm font-bold text-[var(--color-dark-gray)]">Inscripción cerrada al público</p>
            <p className="text-xs text-[var(--color-dark-gray)]/60 mt-1 leading-relaxed">
              El acceso a este evento es exclusivo mediante invitación privada. Si recibiste una invitación, puedes registrarte a través del enlace que te fue enviado.
            </p>
          </div>
        )}

        {event.contact_info && (
          <div className="mt-8 text-center bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/10 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-deep-green)] mb-1">
              Consultas por Inscripciones
            </p>
            <p className="text-sm font-semibold text-[var(--color-dark-gray)]/80">
              {event.contact_info}
            </p>
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
