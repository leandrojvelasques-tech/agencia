import './workshopJourneyMap.css'

const units = [
  ['01', 'Configuración general', 'Interfaz, privacidad, seguridad y confidencialidad.', 'Preparar la base'],
  ['02', 'Proyectos', 'Chats, instrucciones, AGENTS.md y MEMORY.md.', 'Dar contexto y reglas'],
  ['03', 'Complementos', 'Plugins, apps, conectores y skills.', 'Sumar capacidades'],
  ['04', 'Space', 'Páginas, archivos, presentaciones y Sites.', 'Conservar y compartir'],
  ['05', 'Navegador y computadora', 'Investigá y usá herramientas con supervisión.', 'Revisar las acciones'],
]

function HandArrow({ className = '' }) {
  return <svg className={`journey-map__hand-arrow ${className}`} viewBox="0 0 84 46" aria-hidden="true"><path d="M4 9C29 1 62 4 70 34M58 26l13 12 8-17" /></svg>
}

function BlockIcon({ number }) {
  const shapes = {
    '01': <><path d="m17 5 1-3h4l1 3 3 2 3-1 2 3-2 3v4l2 3-2 3-3-1-3 2-1 3h-4l-1-3-3-2-3 1-2-3 2-3v-4l-2-3 2-3 3 1Z" /><circle cx="20" cy="15" r="5" /><path d="M9 32h22M14 32v5m12-5v5" /></>,
    '02': <><path d="M5 12V8a3 3 0 0 1 3-3h10l4 5h10a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V12Z" /><path d="M5 14h30" /></>,
    '03': <><path d="M31 29a15 15 0 1 1 4-12M29 13l6 4 3-6" /><path d="M25 22v-6a6 6 0 1 0-1 7m1-7v7a3 3 0 0 0 6 0v-5" /></>,
    '04': <><rect x="5" y="12" width="21" height="23" rx="4" transform="rotate(-8 15 24)" /><rect x="15" y="5" width="20" height="23" rx="4" transform="rotate(13 25 16)" /><path d="M20 13h9m-8 5h8" /></>,
    '05': <><rect x="3" y="4" width="27" height="21" rx="4" /><path d="M3 10h27M8 7h1m3 0h1" /><path d="m22 17 13 5-6 3-2 7-5-15Z" /><path d="M10 31h9m-5-6v6" /></>,
  }
  return <span className={`journey-map__symbol journey-map__symbol--${number}`} aria-hidden="true"><svg viewBox="0 0 40 42" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[number]}</svg></span>
}

function BlockCard({ block, wide = false }) {
  const [number, title, copy, note] = block
  return <li className={`journey-map__step${wide ? ' journey-map__step--wide' : ''}`}>
    <div className="journey-map__card-top"><span className="journey-map__number">{number}</span><BlockIcon number={number} /></div>
    <h4>{title}</h4><p>{copy}</p><small>{note}</small>
  </li>
}

export default function WorkshopJourneyMap() {
  return <section className="journey-map" aria-labelledby="journey-map-title">
    <div className="journey-map__heading">
      <p>MAPA DE LA JORNADA 1</p>
      <h3 id="journey-map-title">El recorrido práctico de ChatGPT Work</h3>
      <span>Dos bloques, seis unidades para configurar, trabajar y delegar con criterio.</span>
    </div>
    <div className="journey-map__body">
      <div className="journey-map__reactive">
        <div className="journey-map__annotation">Agente reactivo <HandArrow /></div>
        <div className="journey-map__reactive-outline">
          <ol className="journey-map__steps">
            <li className="journey-map__phase">Bloque 1 · Unidades 1, 2 y 3 <span>preparar el entorno →</span></li>
            {units.slice(0, 3).map(unit => <BlockCard key={unit[0]} block={unit} />)}
            <li className="journey-map__phase journey-map__phase--second">Bloque 2 · Unidades 4, 5 y 6 <span>pasar a la acción ↴</span></li>
            {units.slice(3).map(unit => <BlockCard key={unit[0]} block={unit} wide />)}
          </ol>
        </div>
        <p className="journey-map__margin-note">Vos iniciás el pedido. El agente responde y actúa con supervisión.</p>
      </div>
      <div className="journey-map__proactive">
        <div className="journey-map__annotation">Agente proactivo <HandArrow /></div>
        <article className="journey-map__dot">
          <span className="journey-map__dot-label"><span>Bloque 2</span><strong>Unidad 6 · DOTS</strong></span>
          <h4>El agente trabaja por vos.</h4>
          <p>Le asignás una responsabilidad. Detecta cambios y propone próximos pasos.</p>
          <img className="journey-map__dots-image" src={`${import.meta.env.BASE_URL}workshop-chatgpt-work/dots-personajes-referencia.png`} alt="Personajes de Dots de distintos colores" width="462" height="315" />
        </article>
        <p className="journey-map__margin-note journey-map__margin-note--dots">Del pedido puntual al seguimiento.</p>
      </div>
    </div>
    <p className="journey-map__closing">De ser vos quien pide a ser el agente quien propone <span>qué hacer y cuándo.</span></p>
  </section>
}
