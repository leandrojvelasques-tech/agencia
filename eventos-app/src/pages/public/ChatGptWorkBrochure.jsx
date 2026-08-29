import './chatGptWorkBrochure.css'

const heroImage = '/workshop-chatgpt-work/hero-agent-network-option-1.png'
const proposalPhoto = '/workshop-chatgpt-work/taller-cpce-trabajo-en-equipo.jpeg'
const dayOnePhoto = '/workshop-chatgpt-work/taller-cpce-demostracion-en-vivo.jpeg'
const practicePhoto = '/workshop-chatgpt-work/taller-cpce-experiencia-presencial.jpeg'
const registrationUrl = 'mailto:leandrojvelasques@gmail.com?subject=Consulta%20-%20Taller%20ChatGPT%20Work'

const dayOneBlocks = [
  {
    number: '01',
    title: 'Configurar las bases del entorno',
    type: 'Demostración en vivo',
    items: [
      'Qué diferencia a Chat, Work y Codex.',
      'Escritorio, entorno local y nube.',
      'Proyectos: contexto, fuentes, archivos y organización.',
      'AGENTS.md: instrucciones, criterios y reglas persistentes.',
      'Plugins, apps y conectores para ampliar capacidades.',
    ],
    practice: 'Creación de un proyecto, incorporación de materiales y configuración inicial de sus instrucciones de trabajo.',
  },
  {
    number: '02',
    title: 'Ampliar las capacidades del agente',
    type: 'Demostración en vivo',
    items: [
      'Skills: procesos reutilizables que pueden instalarse o construirse.',
      'Sites: de un resultado a una herramienta compartible.',
      'Navegador y computadora: tareas web con supervisión.',
      'Actividades programadas: tareas que vuelven a ejecutarse.',
    ],
    practice: 'Resolución de una tarea profesional combinando distintas capacidades de ChatGPT Work.',
  },
]

const dayTwoBlocks = [
  {
    number: '03',
    title: 'Construcción guiada desde cero',
    type: 'Actividad práctica',
    items: [
      'Análisis del caso, objetivo y criterios de calidad.',
      'Creación del proyecto y organización de los archivos.',
      'Construcción del archivo AGENTS.md.',
      'Selección de plugins, apps y fuentes.',
      'Diseño inicial de un skill orientado al caso.',
    ],
    practice: 'Cada participante o equipo configura el entorno y comienza a resolver el caso siguiendo la guía paso a paso.',
  },
  {
    number: '04',
    title: 'Prueba, integración y mejora',
    type: 'Actividad práctica',
    items: [
      'Ejecución y prueba del skill construido.',
      'Uso del navegador para completar o mejorar el trabajo.',
      'Integración de capacidades dentro de un mismo flujo.',
      'Construcción de un Site u otro entregable aplicable.',
      'Configuración de una automatización.',
      'Comparación de resultados e intercambio final.',
    ],
    practice: 'Puesta en funcionamiento del entorno, revisión del resultado y propuesta de una siguiente mejora.',
  },
]

const dayTwoSteps = [
  ['01', 'Analizar el caso', 'Comprender la situación, el objetivo y los criterios de calidad.'],
  ['02', 'Definir el resultado', 'Acordar qué debe producir el entorno y cómo se evaluará.'],
  ['03', 'Configurar el proyecto', 'Ordenar el contexto, los archivos y las fuentes de trabajo.'],
  ['04', 'Construir reglas y skill', 'Crear las instrucciones y el proceso reutilizable para el caso.'],
  ['05', 'Integrar y ejecutar', 'Combinar herramientas, navegador y aplicaciones necesarias.'],
  ['06', 'Revisar y mejorar', 'Comparar resultados e incorporar una siguiente mejora.'],
]

const dayOneSteps = [
  ['01', 'Configuración', 'Instalá la aplicación y elegí dónde se ejecutará el trabajo.'],
  ['02', 'Proyectos', 'Reuní conversaciones, archivos y contexto en un mismo espacio.'],
  ['03', 'Instrucciones · AGENTS.md', 'Dejá por escrito las reglas que el agente debe seguir.'],
  ['04', 'Plugins', 'Agregá capacidades y herramientas listas para utilizar.'],
  ['05', 'Apps y conectores', 'Conectá las herramientas y fuentes que ya usás.'],
  ['06', 'Skills', 'Convertí un proceso probado en una forma reutilizable.'],
  ['07', 'Sites', 'Creá sitios, tableros o herramientas internas.'],
  ['08', 'Navegador y computadora', 'Investigá y operá herramientas con supervisión.'],
]

function ProgramBlock({ block }) {
  return (
    <article className="work-landing__block">
      <div className="work-landing__block-top">
        <span>{block.number}</span>
        <small>1 hora</small>
      </div>
      <p className="work-landing__block-type">{block.type}</p>
      <h3>{block.title}</h3>
      <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
      <p className="work-landing__practice"><strong>En acción:</strong> {block.practice}</p>
    </article>
  )
}

export default function ChatGptWorkBrochure() {
  return (
    <main className="work-landing">
      <section className="work-landing__hero" id="inicio">
        <div className="work-landing__hero-main">
          <div className="work-landing__hero-copy">
            <p className="work-landing__eyebrow">TALLER INTENSIVO · CIENCIAS ECONÓMICAS</p>
            <h1>Tu nuevo <span>entorno de trabajo</span></h1>
            <p className="work-landing__lead">Una propuesta para potenciar tus capacidades profesionales a través del entorno de trabajo agéntico de ChatGPT Work.</p>
            <div className="work-landing__facts" aria-label="Datos principales del taller">
              <div><strong>2</strong><span>jornadas</span></div>
              <div><strong>4</strong><span>bloques</span></div>
              <div><strong>6 h</strong><span>duración estimada</span></div>
            </div>
            <a className="work-landing__button work-landing__button--dark" href="#programa">Conocer el programa</a>
          </div>
          <figure className="work-landing__hero-art">
            <img src={heroImage} alt="Visual abstracto de un entorno de trabajo agéntico" />
          </figure>
        </div>
        <div className="work-landing__hero-continuation" aria-label="ChatGPT Work de cero a cien">
          <div>
            <h2>ChatGPT Work: <span>de 0 a 100</span></h2>
            <p>Todo lo que necesitás para empezar a trabajar con agentes de IA.</p>
          </div>
          <div className="work-landing__mode-switch" aria-label="De Chat a Work">
            <span>Chat</span>
            <i aria-hidden="true">✦</i>
            <strong>Work</strong>
          </div>
        </div>
      </section>

      <section className="work-landing__section work-landing__context">
        <div className="work-landing__context-index" aria-hidden="true">2026</div>
        <div className="work-landing__context-copy">
          <p className="work-landing__eyebrow">UN CAMBIO DE ETAPA</p>
          <h2>La era de los entornos agénticos ya empezó.</h2>
          <p>En 2026, el trabajo con inteligencia artificial dio un salto: pasamos de conversar con un chat a trabajar en entornos capaces de integrar contexto, instrucciones, herramientas y acciones para producir resultados concretos.</p>
          <p>Para los profesionales de Ciencias Económicas, aprender a trabajar con agentes se está convirtiendo en una capacidad necesaria para ampliar los servicios, mejorar la forma de resolver problemas y sostener la competitividad profesional.</p>
        </div>
      </section>

      <section className="work-landing__section work-landing__proposal">
        <div className="work-landing__proposal-intro">
          <p className="work-landing__eyebrow">LA PROPUESTA</p>
          <h2>Dos jornadas de inmersión a la IA para pasar de 0 a 100.</h2>
        </div>
        <div className="work-landing__proposal-copy">
          <p>El taller recorre el entorno de ChatGPT Work para que comprendas su lógica y aprendas a configurarlo por tu propia cuenta.</p>
          <p>En la primera jornada vas a conocer sus principales capacidades a través de explicaciones y demostraciones aplicadas a situaciones concretas. En la segunda, vas a construir, probar y mejorar un entorno de trabajo agéntico aplicado a un caso profesional.</p>
        </div>
        <figure className="work-landing__proposal-photo">
          <img src={proposalPhoto} alt="Participantes trabajando en equipo durante un taller presencial" loading="lazy" />
          <figcaption><strong>Experiencia aplicada</strong><span>Aprender, probar y resolver en equipo.</span></figcaption>
        </figure>
        <aside className="work-landing__proposal-result"><strong>Al finalizar</strong><span>Vas a contar con los conceptos, los criterios y la práctica necesarios para empezar a pensar, configurar y desarrollar tus propios entornos de trabajo agénticos adaptados a tus necesidades.</span></aside>
      </section>

      <section className="work-landing__program" id="programa">
        <div className="work-landing__program-head">
          <p className="work-landing__eyebrow">PROGRAMA</p>
          <h2>Ver cómo funciona. Construirlo con tus propias manos.</h2>
        </div>

        <section className="work-landing__day">
          <div className="work-landing__day-title">
            <span>Jornada 1</span>
            <div><h3>Conocer el entorno y verlo en acción</h3><p>Explicaciones aplicadas y demostraciones en vivo de las principales capacidades de ChatGPT Work.</p></div>
          </div>
          <div className="work-landing__blocks">{dayOneBlocks.map((block) => <ProgramBlock block={block} key={block.number} />)}</div>
          <div className="work-landing__practice-showcase work-landing__practice-showcase--day-one">
            <figure className="work-landing__practice-photo work-landing__practice-photo--day-one">
              <img src={dayOnePhoto} alt="Participantes siguiendo una demostración práctica en el CPCE Chubut" loading="lazy" />
              <figcaption><span>Demostraciones en vivo</span><strong>Capacidades, criterios y casos reales.</strong></figcaption>
            </figure>
            <div className="work-landing__practice-map work-landing__practice-map--day-one">
              <div className="work-landing__practice-map-head"><span>Mapa de la jornada 1</span><strong>Ocho capacidades, un mismo entorno de trabajo.</strong></div>
              <ol>{dayOneSteps.map(([number, title, description]) => <li key={number}><span>{number}</span><strong>{title}</strong><small>{description}</small></li>)}</ol>
              <p className="work-landing__practice-map-note">Configurá el entorno, dale contexto y reglas, y después ampliá lo que el agente puede hacer.</p>
            </div>
          </div>
        </section>

        <section className="work-landing__day work-landing__day--practice">
          <div className="work-landing__day-title">
            <span>Jornada 2</span>
            <div><h3>Construir un caso práctico integrador</h3><p>Trabajo guiado para configurar y probar un entorno agéntico aplicado a una situación profesional concreta.</p></div>
          </div>
          <div className="work-landing__blocks">{dayTwoBlocks.map((block) => <ProgramBlock block={block} key={block.number} />)}</div>
          <div className="work-landing__practice-showcase">
            <figure className="work-landing__practice-photo work-landing__practice-photo--day-two">
              <img src={practicePhoto} alt="Edición presencial de capacitación en el CPCE Chubut" loading="lazy" />
              <figcaption><span>Del mapa a la práctica</span><strong>Trabajo presencial y colaborativo.</strong></figcaption>
            </figure>
            <div className="work-landing__practice-map">
              <div className="work-landing__practice-map-head"><span>Mapa preliminar de la jornada 2</span><strong>Seis pasos para construir, probar y mejorar.</strong></div>
              <ol>{dayTwoSteps.map(([number, title, description]) => <li key={number}><span>{number}</span><strong>{title}</strong><small>{description}</small></li>)}</ol>
              <p className="work-landing__practice-map-note">El paso a paso se ajustará al caso práctico definitivo.</p>
            </div>
          </div>
          <div className="work-landing__requirements">
            <div><span className="work-landing__requirements-icon">+</span><div><strong>Recomendación para la jornada práctica</strong><p>Para participar activamente se recomienda contar con ChatGPT Plus, con acceso a las funciones utilizadas durante el taller.</p></div></div>
            <p>Quienes no dispongan de ese acceso podrán seguir el trabajo y participar de la resolución grupal o conformar equipo con participantes que lo tengan.</p>
          </div>
        </section>
      </section>

      <section className="work-landing__section work-landing__trainer" id="capacitador">
        <div className="work-landing__portrait"><img src="/slides/comodoro/leandro_profile.jpg" alt="Lic. Adm. Leandro Velasques" loading="lazy" /></div>
        <div className="work-landing__trainer-copy">
          <p className="work-landing__eyebrow">SOBRE EL CAPACITADOR</p>
          <h2>Lic. Adm. Leandro Velasques</h2>
          <p className="work-landing__trainer-role">Consultor y director de proyectos de inteligencia artificial aplicada a negocios.</p>
          <p>Licenciado en Administración (UNPSJB), matriculado en el CPCECH y con quince años de experiencia profesional en gestión, procesos y mejora continua.</p>
          <p>Desde Comodoro Rivadavia acompaña a profesionales, pymes y organizaciones en la incorporación práctica de inteligencia artificial, automatización y marketing digital.</p>
          <a className="work-landing__text-link" href="https://www.linkedin.com/in/leandrojvelasques" target="_blank" rel="noreferrer">Ver perfil profesional en LinkedIn <span>↗</span></a>
        </div>
      </section>

      <section className="work-landing__cta" id="participar">
        <p className="work-landing__eyebrow">PRÓXIMAS EDICIONES</p>
        <h2>Prepará tu práctica profesional para trabajar con agentes.</h2>
        <p>Consultá por próximas fechas, grupos cerrados y capacitaciones para equipos e instituciones.</p>
        <a className="work-landing__button work-landing__button--light" href={registrationUrl}>Quiero participar</a>
      </section>

      <footer className="work-landing__footer">
        <div><img src="/logo_triskel.png" alt="" /><strong>Lic. Adm. Leandro Velasques</strong><span>MP Tomo III – Folio 58</span></div>
        <a href="https://www.leandrovelasques.com.ar">www.leandrovelasques.com.ar</a>
      </footer>
    </main>
  )
}
