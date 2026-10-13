import { novemberCaseBlocks } from '../../lib/workshopNovemberProgram'
import './workshopCaseMap.css'
import WorkshopBlockBadge from './WorkshopBlockBadge'

export default function WorkshopCaseMap() {
  return <section className="case-map" aria-labelledby="case-map-title">
    <p className="case-map__eyebrow">MAPA PRELIMINAR DE LA JORNADA 2</p>
    <h3 id="case-map-title">Del caso a la rutina de trabajo.</h3>
    <p className="case-map__intro">Dos bloques para resolver una situación profesional y preparar el trabajo que se repite.</p>
    <div className="case-map__route">
      {novemberCaseBlocks.map((block, index) => <article className={`case-map__block case-map__block--${index + 1}`} key={block.number}>
        <div className="case-map__block-top"><WorkshopBlockBadge number={index + 1} /><small>{index === 0 ? '14:00 a 15:15' : '15:30 a 16:45'}</small></div>
        <h4>{block.title}</h4>
        <ul>{block.mapItems.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="case-map__annotation">{block.mapNote}</p>
      </article>)}
      <div className="case-map__connection" aria-hidden="true"><svg viewBox="0 0 70 40"><path d="M5 20c15-13 34-13 54 0M47 9l14 11-14 10" /></svg><span>receso</span></div>
    </div>
    <p className="case-map__closing">Primero resolvemos el caso. Después dejamos preparada una forma de repetir, seguir y mejorar ese trabajo.</p>
    <p className="case-map__note">El grado de autonomía depende de la tarea, las herramientas disponibles y los puntos de revisión definidos.</p>
  </section>
}
