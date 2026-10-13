import './workshopPreviousEdition.css'

const previousWorkshopPhotos = [
  ['virtual-septiembre-leandro-reconstruida.png', 'Retrato de Leandro Velasques reconstruido a partir de la grabación del workshop virtual de septiembre.', 'Explicaciones en vivo · imagen reconstruida'],
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
  return (
    <section className="work-landing__section previous-workshop" id="workshop-anterior" aria-labelledby="previous-workshop-title">
      <header className="previous-workshop__intro">
        <p className="work-landing__eyebrow">LA EDICIÓN ANTERIOR</p>
        <h2 id="previous-workshop-title">Así se vivió el workshop virtual.</h2>
        <p>Imágenes de las jornadas de septiembre de 2026 y del encuentro posterior de consultas.</p>
      </header>

      <div className="previous-workshop__gallery">
        {previousWorkshopPhotos.map(([file, alt, caption]) => (
          <figure key={file}>
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
