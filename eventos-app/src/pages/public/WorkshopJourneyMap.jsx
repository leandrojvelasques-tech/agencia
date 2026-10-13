import './workshopJourneyMap.css'

const blocks = [
  ['01', 'Configuración general', 'Interfaz, privacidad, seguridad y confidencialidad.', 'Preparar la base'],
  ['02', 'Proyectos', 'Chats, instrucciones, AGENTS.md y MEMORY.md.', 'Dar contexto y reglas'],
  ['03', 'Complementos', 'Plugins, apps, conectores y skills.', 'Sumar capacidades'],
  ['04', 'Space', 'Páginas, archivos, presentaciones y Sites.', 'Conservar y compartir'],
  ['05', 'Navegador y computadora', 'Investigá y usá herramientas con supervisión.', 'Revisar las acciones'],
]

function HandArrow({ className = '' }) {
  return <svg className={`journey-map__hand-arrow ${className}`} viewBox="0 0 84 46" aria-hidden="true"><path d="M4 9C29 1 62 4 70 34M58 26l13 12 8-17" /></svg>
}

export default function WorkshopJourneyMap() {
  return <section className="journey-map" aria-labelledby="journey-map-title">
    <div className="journey-map__heading">
      <p>MAPA DE LA JORNADA 1</p>
      <h3 id="journey-map-title">El recorrido práctico de ChatGPT Work</h3>
      <span>Seis bloques para configurar, trabajar y delegar con criterio.</span>
    </div>
    <div className="journey-map__body">
      <div className="journey-map__reactive">
        <div className="journey-map__annotation">Agente reactivo <HandArrow /></div>
        <div className="journey-map__reactive-outline">
          <ol className="journey-map__steps">
            <li className="journey-map__phase">Primer tramo · bloques 1, 2 y 3 <span>preparar el entorno →</span></li>
            {blocks.slice(0, 3).map(([number, title, copy, note]) => <li className="journey-map__step" key={number}><span className="journey-map__number">{number}</span><h4>{title}</h4><p>{copy}</p><small>{note}</small></li>)}
            <li className="journey-map__phase journey-map__phase--second">Segundo tramo · bloques 4, 5 y 6 <span>pasar a la acción ↴</span></li>
            {blocks.slice(3).map(([number, title, copy, note]) => <li className="journey-map__step journey-map__step--wide" key={number}><span className="journey-map__number">{number}</span><h4>{title}</h4><p>{copy}</p><small>{note}</small></li>)}
          </ol>
        </div>
        <p className="journey-map__margin-note">Vos iniciás el pedido. El agente responde y actúa con supervisión.</p>
      </div>
      <div className="journey-map__proactive">
        <div className="journey-map__annotation">Agente proactivo <HandArrow /></div>
        <article className="journey-map__dot">
          <span className="journey-map__dot-label">06 · DOTS</span>
          <h4>El agente trabaja por vos.</h4>
          <p>Le asignás una responsabilidad. Detecta cambios y propone próximos pasos.</p>
          <div className="journey-map__dot-note">Definir contexto,<br />límites y cuándo avisar <HandArrow /></div>
          <small>Según la disponibilidad de tu cuenta. Las decisiones que requieren criterio humano se revisan con vos.</small>
        </article>
        <p className="journey-map__margin-note journey-map__margin-note--dots">Del pedido puntual al seguimiento.</p>
      </div>
    </div>
    <p className="journey-map__closing">De ser vos quien pide a ser el agente quien propone <span>qué hacer y cuándo.</span></p>
  </section>
}
