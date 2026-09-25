import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'

const ensureAbsoluteUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function Unavailable({ title, message }) {
  return (
    <main className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-5">
      <section className="card max-w-lg w-full p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-[var(--color-deep-green)]/50 mb-4 block">folder_off</span>
        <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">{title}</h1>
        <p className="text-[var(--color-dark-gray)]/70">{message}</p>
        <a href="https://www.leandrovelasques.com.ar" className="btn-primary mt-6 inline-flex">Ir al sitio principal</a>
      </section>
    </main>
  )
}

export default function EventMaterials() {
  const { slug } = useParams()
  const { getEventBySlug } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getEventBySlug(slug)
      .then(data => { if (active) setEvent(data) })
      .catch(error => console.error('Error al cargar materiales:', error))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [getEventBySlug, slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-5">
        <p className="font-semibold text-[var(--color-deep-green)] animate-pulse">Cargando materiales...</p>
      </main>
    )
  }

  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'
  if (!event || (event.status === 'draft' && !isPreview)) {
    return <Unavailable title="Materiales no disponibles" message="Este evento no existe o todavía no fue publicado." />
  }
  if (event.status === 'cancelled') {
    return <Unavailable title="Evento cancelado" message="Los materiales de este evento ya no están disponibles." />
  }

  const materials = (event.event_materials || []).filter(material => material.type !== 'image' && material.url)

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)]">
      <header className="glass-nav">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 h-16 flex items-center">
          <a href="https://www.leandrovelasques.com.ar" className="flex items-center gap-2">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="" className="h-7 w-auto" />
            <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight">LEANDRO VELASQUES</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <Link to={`/evento/${slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-deep-green)] hover:underline mb-7">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver al evento
        </Link>

        <section className="mb-8 sm:mb-10">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-[var(--color-deep-green)]/65 mb-3">Recursos para participantes</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[var(--color-deep-green)] mb-3">Materiales de trabajo</h1>
          <p className="text-lg text-[var(--color-dark-gray)]/80">{event.title}</p>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-2">Abrí cada recurso para consultarlo o descargarlo. Los permisos de descarga dependen del servicio donde esté alojado.</p>
        </section>

        {materials.length === 0 ? (
          <section className="card p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/40 mb-3 block">inventory_2</span>
            <h2 className="text-lg font-bold text-[var(--color-dark-gray)] mb-1">Todavía no hay materiales publicados</h2>
            <p className="text-sm text-[var(--color-dark-gray)]/60">Cuando estén disponibles, aparecerán en esta página.</p>
          </section>
        ) : (
          <section aria-label="Archivos disponibles" className="grid gap-4 sm:grid-cols-2">
            {materials.map((material, index) => (
              <article key={`${material.url}-${index}`} className="card p-5 sm:p-6 flex flex-col">
                <div className="flex gap-4 items-start mb-5">
                  <span className="material-symbols-outlined text-2xl text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 rounded-xl p-3">
                    {material.type === 'presentation' ? 'present_to_all' : 'description'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--color-dark-gray)]/50 mb-1">
                      {material.type === 'presentation' ? 'Presentación' : 'Documento'}
                    </p>
                    <h2 className="font-bold text-[var(--color-dark-gray)] break-words">{material.title || `Material ${index + 1}`}</h2>
                  </div>
                </div>
                <a href={ensureAbsoluteUrl(material.url)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center mt-auto">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Abrir / descargar
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                </a>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
