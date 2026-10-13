import { novemberCaseBlocks } from '../../lib/workshopNovemberProgram'
import './workshopCaseMap.css'
import WorkshopBlockBadge from './WorkshopBlockBadge'

export default function WorkshopCaseMap() {
  return <section className="case-map" aria-labelledby="case-map-title">
    <p className="case-map__eyebrow">MAPA DE LA JORNADA 2</p>
    <h3 id="case-map-title">Del caso a la rutina de trabajo.</h3>
    <p className="case-map__intro">Dos bloques para resolver una situación profesional y preparar el trabajo que se repite.</p>
    <div className="case-map__route">
      {novemberCaseBlocks.map((block, index) => <div className={`case-map__stage case-map__stage--${index + 1}`} key={block.number}>
        <p className="case-map__annotation"><span>{block.mapNote}</span><svg viewBox="0 0 84 46" aria-hidden="true"><path d="M4 9C29 1 62 4 70 34M58 26l13 12 8-17" /></svg></p>
        <article className="case-map__block">
        <div className="case-map__block-top"><WorkshopBlockBadge number={index + 1} /><small>{index === 0 ? '14:00 a 15:15' : '15:30 a 16:45'}</small></div>
        <h4>{block.title}</h4>
        <ul>{block.mapItems.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>)}
    </div>
  </section>
}
