import { useRef, useState } from 'react'
import './workshopPreviousEdition.css'

const previousWorkshopPhotos = [
  ['leandro-camisa-blanca-adaptada.png', 'Imagen adaptada de Leandro Velasques con camisa blanca durante una capacitación virtual.', 'Primera jornada · recorrido por ChatGPT Work'],
  ['virtual-septiembre-jornada-1.jpg', 'Encuentro virtual de la primera jornada del workshop de septiembre.', 'Primera jornada · recorrido por ChatGPT Work'],
  ['virtual-septiembre-jornada-2.jpg', 'Participantes conectados a la segunda jornada del workshop de septiembre.', 'Segunda jornada · aplicación práctica'],
  ['virtual-septiembre-consultas.jpg', 'Encuentro virtual de consultas posterior al workshop de septiembre.', 'Encuentro de consultas · dudas y avances'],
]

// Verified against the September event's eight anonymous survey responses on 2026-10-13.
// Overall average: 198 / 40 ratings = 4.95. Quotes retain their original wording.
const previousWorkshopComments = [
  'Sólo quiero agradecer por la claridad de exposición',
  'Excelente, muy claro y a utilizar esta herramienta en nuestro trabajo',
  'muy interesante para seguir metiendose en este nuevo mundo totalemnete indispensable que se viene por delante',
]

export default function WorkshopPreviousEdition() {
  const galleryRef = useRef(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [edges, setEdges] = useState({ start: true, end: false })
  const updateEdges = () => {
    const gallery = galleryRef.current
    if (!gallery) return
    if (window.matchMedia('(max-width: 600px)').matches) {
      setEdges({ start: activePhoto === 0, end: activePhoto === previousWorkshopPhotos.length - 1 })
      return
    }
    setEdges({ start: gallery.scrollLeft < 2, end: gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2 })
  }
  const moveGallery = direction => {
    if (window.matchMedia('(max-width: 600px)').matches) {
      const next = Math.max(0, Math.min(previousWorkshopPhotos.length - 1, activePhoto + direction))
      setActivePhoto(next)
      setEdges({ start: next === 0, end: next === previousWorkshopPhotos.length - 1 })
      return
    }
    const gallery = galleryRef.current
    if (!gallery) return
    const step = gallery.firstElementChild.getBoundingClientRect().width + 24
    gallery.scrollBy({ left: direction * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return (
    <section className="work-landing__section previous-workshop" id="workshop-anterior" aria-labelledby="previous-workshop-title">
      <header className="previous-workshop__intro">
        <p className="work-landing__eyebrow">LA EDICIÓN ANTERIOR</p>
        <h2 id="previous-workshop-title">Así se viven los encuentros virtuales.</h2>
        <p>Workshop de septiembre de 2026 y encuentro posterior de consultas.</p>
      </header>

      <div className="previous-workshop__gallery-controls">
        <span>4 fotos de encuentros virtuales</span>
        <div>
          <button type="button" onClick={() => moveGallery(-1)} disabled={edges.start} aria-label="Ver fotos anteriores" aria-controls="previous-workshop-gallery">←</button>
          <button type="button" onClick={() => moveGallery(1)} disabled={edges.end} aria-label="Ver siguientes fotos" aria-controls="previous-workshop-gallery">→</button>
        </div>
      </div>
      <div className="previous-workshop__gallery" id="previous-workshop-gallery" ref={galleryRef} onScroll={updateEdges} tabIndex={0} role="region" aria-label="Fotos de encuentros virtuales anteriores">
        {previousWorkshopPhotos.map(([file, alt, caption], index) => (
          <figure key={file} data-active={index === activePhoto}>
            <img src={`${import.meta.env.BASE_URL}workshop-chatgpt-work/${file}`} alt={alt} loading="lazy" />
            <figcaption>{caption}</figcaption>
          </figure>
        ))}
      </div>

      <div className="previous-workshop__feedback" aria-labelledby="previous-workshop-feedback-title">
        <div className="previous-workshop__feedback-heading">
          <p className="work-landing__eyebrow">OPINIONES DE PARTICIPANTES</p>
          <h3 id="previous-workshop-feedback-title">Lo que dijeron después del taller.</h3>
        </div>
        <div className="previous-workshop__reviews">
          <div className="previous-workshop__rating">
            <span>Promedio de la encuesta</span>
            <strong aria-label="4,95 sobre 5">4,95 <small>/ 5</small></strong>
            <p>8 respuestas · edición de septiembre</p>
            <small>Promedio de los cinco aspectos evaluados en la encuesta de satisfacción.</small>
          </div>
          {previousWorkshopComments.map(comment => (
            <figure className="previous-workshop__quote" key={comment}>
              <span aria-hidden="true">“</span>
              <blockquote>{comment}</blockquote>
              <figcaption>Respuesta anónima · septiembre 2026</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
