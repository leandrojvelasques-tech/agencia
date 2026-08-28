import './chatGptWorkBrochure.css'

const heroImage = 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-tapa-chatgpt-work-de-0-a-agente.png'
const journeyMap = 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787700708337-qqxkc.png'
const credentialUrl = 'https://cpcech-team.com.ar/validar/valida_credencial.php?d1=MA==&d2=MzA5NTUxNjY='
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
  ['01', 'Analizar el caso'],
  ['02', 'Definir el resultado'],
  ['03', 'Configurar el proyecto'],
  ['04', 'Construir reglas y skill'],
  ['05', 'Integrar y ejecutar'],
  ['06', 'Revisar y mejorar'],
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
      <header className="work-landing__header">
        <a className="work-landing__brand" href="#inicio" aria-label="Ir al inicio">
          <img src="/logo_triskel.png" alt="" />
          <span>Leandro Velasques · IA aplicada</span>
        </a>
        <a className="work-landing__header-link" href="#participar">Participar</a>
      </header>

      <section className="work-landing__hero" id="inicio">
        <div className="work-landing__hero-copy">
          <p className="work-landing__eyebrow">TALLER INTENSIVO · CIENCIAS ECONÓMICAS</p>
          <h1><span>ChatGPT Work:</span> Tu nuevo entorno de trabajo</h1>
          <p className="work-landing__lead">Una propuesta para potenciar tus capacidades profesionales a través del entorno de trabajo agéntico de ChatGPT Work.</p>
          <div className="work-landing__facts" aria-label="Datos principales del taller">
            <div><strong>2</strong><span>jornadas</span></div>
            <div><strong>4</strong><span>bloques</span></div>
            <div><strong>4 h</strong><span>duración estimada</span></div>
          </div>
          <a className="work-landing__button work-landing__button--dark" href="#programa">Conocer el programa</a>
        </div>
        <figure className="work-landing__hero-art">
          <img src={heroImage} alt="Imagen oficial del taller ChatGPT Work" />
        </figure>
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
        <div>
          <p className="work-landing__eyebrow">LA PROPUESTA</p>
          <h2>Dos jornadas de inmersión a la IA para pasar de 0 a 100.</h2>
        </div>
        <div className="work-landing__proposal-copy">
          <p>El taller recorre el entorno de ChatGPT Work para que comprendas su lógica y aprendas a configurarlo por tu propia cuenta.</p>
          <p>En la primera jornada vas a conocer sus principales capacidades a través de explicaciones y demostraciones aplicadas a situaciones concretas. En la segunda, vas a construir, probar y mejorar un entorno de trabajo agéntico aplicado a un caso profesional.</p>
          <aside><strong>Al finalizar</strong><span>Vas a contar con los conceptos, los criterios y la práctica necesarios para empezar a pensar, configurar y desarrollar tus propios entornos de trabajo agénticos adaptados a tus necesidades.</span></aside>
        </div>
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
          <figure className="work-landing__map">
            <figcaption><span>Mapa de la jornada 1</span><strong>Ocho capacidades, un mismo entorno de trabajo.</strong></figcaption>
            <img src={journeyMap} alt="Mapa de ocho pasos del recorrido práctico de ChatGPT Work" loading="lazy" />
          </figure>
        </section>

        <section className="work-landing__day work-landing__day--practice">
          <div className="work-landing__day-title">
            <span>Jornada 2</span>
            <div><h3>Construir un caso práctico integrador</h3><p>Trabajo guiado para configurar y probar un entorno agéntico aplicado a una situación profesional concreta.</p></div>
          </div>
          <div className="work-landing__blocks">{dayTwoBlocks.map((block) => <ProgramBlock block={block} key={block.number} />)}</div>
          <div className="work-landing__practice-map">
            <div className="work-landing__practice-map-head"><span>Mapa preliminar de la jornada 2</span><strong>El paso a paso se ajustará al caso práctico definitivo.</strong></div>
            <ol>{dayTwoSteps.map(([number, title]) => <li key={number}><span>{number}</span><strong>{title}</strong></li>)}</ol>
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
          <p>Licenciado en Administración por la Universidad Nacional de la Patagonia San Juan Bosco, con matrícula profesional del Consejo Profesional de Ciencias Económicas del Chubut —Tomo III, Folio 58— y quince años de experiencia profesional en gestión, procesos y mejora continua.</p>
          <p>Con sede en Comodoro Rivadavia, acompaña a profesionales, pymes y organizaciones en la incorporación práctica de inteligencia artificial, automatización y marketing digital para resolver necesidades concretas y desarrollar nuevas capacidades de trabajo.</p>
          <a className="work-landing__text-link" href="https://www.linkedin.com/in/leandrojvelasques" target="_blank" rel="noreferrer">Ver perfil profesional en LinkedIn <span>↗</span></a>
        </div>
        <a className="work-landing__credential" href={credentialUrl} target="_blank" rel="noreferrer" aria-label="Validar matrícula profesional en el Consejo Profesional de Ciencias Económicas del Chubut">
          <img src="/qr-credencial-cpce.png" alt="Código QR para validar la matrícula profesional" loading="lazy" />
          <div><span>Matrícula profesional</span><strong>Tomo III · Folio 58</strong><small>Escaneá o tocá para validar</small></div>
        </a>
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
