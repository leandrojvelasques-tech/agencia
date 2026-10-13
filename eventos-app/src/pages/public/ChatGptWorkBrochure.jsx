import './chatGptWorkBrochure.css'
import WorkshopJourneyMap from './WorkshopJourneyMap'
import WorkshopCaseMap from './WorkshopCaseMap'
import WorkshopBlockBadge from './WorkshopBlockBadge'
import WorkshopPreviousEdition from './WorkshopPreviousEdition'
import { novemberCaseBlocks, novemberConsultationBlock } from '../../lib/workshopNovemberProgram'
import { formatArsPrice } from '../../lib/eventPricing'

const workshopAssetBase = `${import.meta.env.BASE_URL}workshop-chatgpt-work/`
const heroImage = `${workshopAssetBase}hero-option-1-selected.png`
const heroMobileImage = `${workshopAssetBase}hero-option-1-mobile-v1.png`
const proposalPhoto = `${workshopAssetBase}taller-cpce-trabajo-en-equipo.jpeg`
const dayOnePhoto = `${workshopAssetBase}taller-cpce-demostracion-en-vivo.jpeg`
const practicePhoto = `${workshopAssetBase}taller-cpce-experiencia-presencial.jpeg`
const desktopDownloadUrl = 'https://chatgpt.com/es-419/download/'
const formatEditionDate = (date) => new Intl.DateTimeFormat('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(`${date}T12:00:00`))

const formatTimeRange = (startTime, durationMinutes) => {
  if (!startTime) return ''
  const [hours, minutes] = startTime.slice(0, 5).split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + (durationMinutes || 0)
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${startTime.slice(0, 5)} a ${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} hs`
}

const eventAgendaBlocks = (event, classIndex, fallbackBlocks, type) => {
  const blocks = event?.agenda?.[classIndex]?.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return fallbackBlocks
  const isNovemberEdition = event.slug === 'chatgpt-work-de-0-a-100-noviembre-2026'

  return blocks.map((block, index) => ({
    number: String(isNovemberEdition ? index + 1 : classIndex * 2 + index + 1).padStart(2, '0'),
    title: block.title || `Bloque ${index + 1}`,
    subtitle: block.subtitle || '',
    type: isNovemberEdition ? (classIndex === 0 ? `Bloque ${index < 3 ? 1 : index < 5 ? 2 : 3} · Unidad ${index + 1}` : `Bloque ${index + 1}`) : type,
    items: [],
    practice: block.description || '',
    practiceLabel: 'Descripción',
    durationLabel: event.slug === 'chatgpt-work-de-0-a-100-noviembre-2026' ? '' : '1 hora',
  }))
}

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

const genericFaqItems = [
  ['Nunca usé inteligencia artificial. ¿Puedo hacer el taller?', 'Sí. El taller está pensado también para quienes arrancan desde cero, nunca descargaron la aplicación o solo la usaron de manera muy básica. Vamos a comenzar por la configuración general de ChatGPT y recorrer las funciones más importantes, de forma gradual y aplicada.'],
  ['¿Puedo participar con la versión gratuita de ChatGPT?', 'Sí. La versión gratuita permite explorar la interfaz y probar distintas funcionalidades, aunque con límites de uso. No es una condición excluyente para participar.'],
  ['¿Soy estudiante universitario? ¿Puedo participar?', 'Sí. La inscripción es gratuita para estudiantes de Ciencias Económicas de la Facultad de Ciencias Económicas de la Universidad Nacional de la Patagonia San Juan Bosco (UNPSJB).'],
  ['¿Necesito tener ChatGPT Plus?', 'No es obligatorio. Podés participar con una cuenta gratuita o incluso comenzar desde cero. La diferencia es que, durante la jornada práctica, una cuenta Plus permite realizar más pruebas e iteraciones antes de alcanzar los límites de uso de la versión gratuita. De todos modos, quedarte sin crédito en algún momento no impide que participes ni que puedas seguir el desarrollo del caso práctico.'],
  ['Yo uso Claude u otra inteligencia artificial. ¿Me sirve igualmente?', 'Sí. El taller se concentra en ChatGPT Work, pero los conceptos de proyectos, instrucciones, skills, agentes y formas de trabajo se pueden trasladar a otras herramientas, como Claude, Gemini u otras IA que ya uses.'],
  ['¿Cómo será la parte práctica?', 'Durante la segunda jornada vamos a desarrollar un estudio de caso guiado. Vas a configurar un proyecto, definir instrucciones, construir un skill y probar distintas capacidades dentro de un entorno de trabajo agéntico.\n\nPodés seguir el desarrollo del docente o ir practicando en tu propio ChatGPT para escritorio lo que se va haciendo. Al comienzo vas a recibir una carpeta con todos los materiales de la práctica, los archivos y los elementos del caso, para que puedas replicar el ejercicio en tu computadora. También podés seguir solamente la demostración y observar cómo se resuelve el caso paso a paso.'],
  ['¿Va a quedar grabado el evento?', 'Sí. Se va a grabar toda la actividad de las dos jornadas para que después puedas volver a verla y repasarla. Apenas la grabación esté disponible, se enviará a todas las personas inscriptas.'],
  ['¿Necesito instalar algo antes?', 'Para el primer día no es necesario tener instalada la aplicación: la jornada será principalmente expositiva. Para aprovechar mejor el segundo día, recomendamos instalar ChatGPT para escritorio con anticipación y evitar perder tiempo en la instalación. Si tenés una cuenta gratuita, podés seguir la demostración del docente, trabajar junto con alguien que tenga ChatGPT Plus o participar con las restricciones propias de tu plan. También necesitás una computadora con conexión estable a internet y acceso a Zoom.'],
  ['¿Las jornadas quedarán grabadas?', 'Sí. La presentación quedará grabada y el video será compartido con las personas inscriptas dentro de las 48 horas posteriores.'],
  ['¿Qué pasa si no puedo participar de una de las jornadas en vivo?', 'Vas a poder acceder a la grabación. De todos modos, la segunda jornada tiene una dinámica práctica, por lo que recomendamos asistir en vivo para aprovechar el acompañamiento y el intercambio.'],
]

function ProgramBlock({ block }) {
  return (
    <article className="work-landing__block">
      <div className="work-landing__block-top">
        <span>{block.number}</span>
        {(block.durationLabel ?? '1 hora') && <small>{block.durationLabel ?? '1 hora'}</small>}
      </div>
      <p className="work-landing__block-type">{block.type}</p>
      <h3>{block.title}</h3>
      {block.subtitle && <p className="work-landing__block-subtitle">{block.subtitle}</p>}
      {block.items.length > 0 && <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>}
      {block.practice && <p className="work-landing__practice"><strong>{block.practiceLabel || 'En acción'}:</strong> {block.practice}</p>}
    </article>
  )
}

function FaqAnswer({ question, answer }) {
  const paragraphs = answer.split('\n\n')

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={`${question}-${index}`}>
          {paragraph}
          {question === '¿Necesito instalar algo antes?' && index === paragraphs.length - 1 && (
            <> <a href={desktopDownloadUrl} target="_blank" rel="noreferrer">Descargar ChatGPT para escritorio</a>.</>
          )}
        </p>
      ))}
    </>
  )
}

export default function ChatGptWorkBrochure({ event = null }) {
  const isNovemberEdition = event?.slug === 'chatgpt-work-de-0-a-100-noviembre-2026'
  const isEventEdition = Boolean(event)
  const registrationUrl = event ? `/evento/${event.slug}/inscripcion` : '/brochure/chatgpt-work/inscripcion'
  const dates = event?.offered_dates?.length ? event.offered_dates : (event?.event_date ? [event.event_date] : [])
  const editionDates = dates.map(formatEditionDate)
  const hasTwoDayAgenda = Array.isArray(event?.agenda) && event.agenda.length >= 2 && event.agenda.slice(0, 2).every(day => Array.isArray(day.blocks) && day.blocks.length > 0)
  const hasVirtualCapacity = event && (
    event.max_capacity_virtual === null ||
    event.max_capacity_virtual === undefined ||
    event.max_capacity_virtual === '' ||
    Number(event.max_capacity_virtual) > 0
  )
  const isVirtualEdition = Boolean(event && (
    event.registration_mode === 'virtual' ||
    (Number(event.max_capacity_presencial) === 0 && hasVirtualCapacity)
  ))
  const hasCustomPricing = Boolean(event?.prices?.length)
  const agendaDayOneBlocks = hasTwoDayAgenda ? eventAgendaBlocks(event, 0, dayOneBlocks, 'Demostración en vivo') : dayOneBlocks
  const agendaDayTwoBlocks = isNovemberEdition ? novemberCaseBlocks : (hasTwoDayAgenda ? eventAgendaBlocks(event, 1, dayTwoBlocks, 'Actividad práctica') : dayTwoBlocks)
  const dayOneTitle = hasTwoDayAgenda ? event.agenda[0].title?.replace(/^Día\s*1\s*·\s*/i, '') : 'Conocer el entorno y verlo en acción'
  const dayTwoTitle = hasTwoDayAgenda ? event.agenda[1].title?.replace(/^Día\s*2\s*·\s*/i, '') : 'Construir un caso práctico integrador'
  const faqItems = isEventEdition
    ? genericFaqItems.filter(([question]) => ![
      '¿Las jornadas quedarán grabadas?',
      '¿Qué pasa si no puedo participar de una de las jornadas en vivo?',
    ].includes(question)).map(([question, answer]) => {
      if (isNovemberEdition && question === 'Nunca usé inteligencia artificial. ¿Puedo hacer el taller?') return [question, `${answer}\n\nPara aprovechar mejor el tiempo, te recomendamos tener ChatGPT para escritorio descargado e instalado antes de comenzar, tanto si usás una cuenta gratuita como paga. La descarga y la instalación no se harán durante el taller.`]
      if (isNovemberEdition && question === '¿Cómo será la parte práctica?') return [question, `${answer}\n\nEntre la segunda y la tercera jornada, podés seguir practicando en tu casa. Las dudas que aparezcan al trabajar por tu cuenta también las podés llevar a la tercera jornada de consultas, donde vamos a revisar cuestiones prácticas, avances y dificultades.`]
      if (isNovemberEdition && question === '¿Necesito instalar algo antes?') return [question, 'Sí. Te recomendamos descargar e instalar ChatGPT para escritorio antes de la primera jornada, tanto si usás una cuenta gratuita como paga. La descarga y la instalación no se harán durante el taller, para aprovechar el tiempo de trabajo.\n\nPara realizar la práctica, recomendamos una computadora con conexión estable a internet. Podés seguir las jornadas desde cualquier dispositivo que permita acceder a Google Meet.']
      if (isNovemberEdition && question === '¿Soy estudiante universitario? ¿Puedo participar?') return [question, 'Sí. Esta edición está abierta a estudiantes, profesionales y personas de otras áreas.\n\nLos estudiantes que estén cursando Ciencias Económicas en la Facultad de Ciencias Económicas de la Universidad Nacional de la Patagonia San Juan Bosco (UNPSJB) tienen un 50% de descuento sobre el arancel vigente al momento de la inscripción, presentando su certificado de alumno regular. El beneficio aplica a estudiantes de cualquiera de sus delegaciones.']
      if (isNovemberEdition && question === '¿Va a quedar grabado el evento?') return ['¿Quedan grabadas las sesiones?', 'Sí. Las sesiones quedan grabadas y podés verlas después, aunque no hayas podido participar en vivo.\n\nAl finalizar cada día, se enviará la grabación completa, sin edición ni cortes. Dentro de las 48 horas posteriores a cada jornada, se pondrá a disposición la versión editada, con los cortes y ajustes correspondientes.']
      if (question === '¿Necesito instalar algo antes?') return [question, 'Para el primer día no es necesario tener instalada la aplicación: la jornada será principalmente expositiva. Para aprovechar mejor el segundo día, recomendamos instalar ChatGPT para escritorio con anticipación y evitar perder tiempo en la instalación. Si tenés una cuenta gratuita, podés seguir la demostración del docente, trabajar junto con alguien que tenga ChatGPT Plus o participar con las restricciones propias de tu plan. También necesitás una computadora con conexión estable a internet y acceso a Zoom.']
      return [question, answer]
    }).filter(Boolean)
    : genericFaqItems
  if (isNovemberEdition) faqItems.splice(1, 0, ['¿Necesito asistir presencialmente a alguna de las jornadas?', 'No. Las tres jornadas serán virtuales, por Google Meet. Vas a poder participar desde cualquier dispositivo con conexión a internet que permita acceder a Google Meet.'])
  if (isNovemberEdition) faqItems.push(
    ['¿Puedo cancelar mi inscripción y solicitar un reembolso?', 'Sí. Si avisás hasta el día previo al inicio del taller, inclusive, recibirás un reembolso del 100% del importe transferido. Si avisás el mismo día del inicio del taller, el reintegro será del 50% del importe transferido.'],
    ['¿Podés enviarme una factura?', 'Sí. Puedo emitirte una factura C. Al momento de inscribirte, enviame tus datos de facturación para que pueda emitirla y enviártela.'],
    ['¿Puedo contratar este taller de forma personalizada para mi empresa?', 'Sí. Realizo cursos y talleres presenciales o virtuales personalizados para empresas. Adapto la propuesta a la cantidad de participantes y a los días y horarios de trabajo que les resulten convenientes.'],
    ['¿El taller se vuelve a realizar en otros meses?', 'Sí. El taller se repite en otras oportunidades y su contenido se actualiza cada mes. Cada edición incorpora las nuevas funcionalidades que OpenAI va sumando, por lo que el programa evoluciona junto con la herramienta.'],
  )
  return (
    <main className="work-landing">
      <section className="work-landing__hero" id="inicio">
        <figure className="work-landing__hero-selected">
          <picture>
            <source media="(max-width: 760px)" srcSet={heroMobileImage} />
            <img src={heroImage} alt="Propuesta visual del taller ChatGPT Work: de 0 a 100" />
          </picture>
          {isNovemberEdition && <>
            <span className="work-landing__hero-november-count work-landing__hero-november-count--days" aria-label="3 jornadas">3</span>
            <span className="work-landing__hero-november-count work-landing__hero-november-count--blocks" aria-label="6 bloques">6</span>
          </>}
          <span className={`work-landing__hero-duration${isNovemberEdition ? ' work-landing__hero-duration--november' : ''}`} aria-label={isNovemberEdition ? '7 horas y media en tres jornadas' : '5 horas de duración estimada'}>{isNovemberEdition ? '7,5 h' : '5 h'}</span>
          {(!isEventEdition || isVirtualEdition) && (
            <div className="work-landing__hero-mode" aria-label={isNovemberEdition ? 'Modalidad online por Google Meet' : 'Modalidad online por Zoom'}>
              <span className="work-landing__hero-mode-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img"><path d="M4.5 7.5h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Zm11 3.2 4.2-2.4c.8-.5 1.8.1 1.8 1v5.4c0 .9-1 1.5-1.8 1l-4.2-2.4v-2.6Z" /></svg>
              </span>
              <span><small>Modalidad online</small><strong>{isNovemberEdition ? 'Google Meet' : 'Por Zoom'}</strong></span>
            </div>
          )}
          <a className="work-landing__hero-selected-cta" href="#programa" aria-label="Conocer el programa"><span>Conocer el programa</span></a>
          <a className="work-landing__hero-register-cta" href={registrationUrl}>Inscribirme</a>
        </figure>
      </section>

      {isEventEdition && (
        <section className="work-landing__edition" aria-label="Datos de esta edición">
          <p className="work-landing__eyebrow">{isNovemberEdition ? 'EDICIÓN ONLINE · GOOGLE MEET' : isVirtualEdition ? 'EDICIÓN ONLINE · POR ZOOM' : 'EDICIÓN PRESENCIAL · COMODORO RIVADAVIA'}</p>
          <div className="work-landing__edition-data">
            <div className="work-landing__edition-dates"><span>Fechas</span><strong>{editionDates.join(' · ')}</strong></div>
            <div className="work-landing__edition-time"><span>Horario</span><strong>{isNovemberEdition ? <>Jornadas 1 y 2: 14:00 a 17:00<br />Jornada 3: 14:00 a 15:30</> : formatTimeRange(event.start_time, event.duration_minutes)}</strong></div>
            <div className="work-landing__edition-location"><span>Lugar</span><strong>{isVirtualEdition ? 'Online' : (event.location || '—')}</strong></div>
            {event.organizer && <div className="work-landing__edition-organizer"><span>Organiza</span><span className="work-landing__edition-organizer-brand">{event.client_logo_url && <img src={event.client_logo_url} alt={`Logo de ${event.organizer}`} />}<strong>{event.organizer}</strong></span></div>}
          </div>
          <p className="work-landing__edition-note">
            {hasCustomPricing
              ? 'Inscripción previa. Consultá las modalidades y aranceles en el formulario de inscripción.'
              : (isVirtualEdition ? `Actividad online por ${isNovemberEdition ? 'Google Meet' : 'Zoom'}, con inscripción previa.` : 'Sin cargo para matriculados del CPCE Chubut, de todas sus delegaciones, con inscripción previa.')}
          </p>
        </section>
      )}

      <section className="work-landing__section work-landing__context">
        {isNovemberEdition ? (
          <figure className="work-landing__context-illustration">
            <img src={`${import.meta.env.BASE_URL}workshop-chatgpt-work/entorno-agentico.png`} alt="Un agente conecta documentos, proyectos, herramientas y tareas en un mismo entorno de trabajo." loading="lazy" width="1024" height="1024" />
          </figure>
        ) : <div className="work-landing__context-index" aria-hidden="true">2026</div>}
        <div className="work-landing__context-copy">
          <p className="work-landing__eyebrow">UN CAMBIO DE ETAPA</p>
          <h2>La era de los entornos agénticos ya empezó.</h2>
          <p>En 2026, el trabajo con inteligencia artificial dio un salto: pasamos de conversar con un chat a trabajar en entornos capaces de integrar contexto, instrucciones, herramientas y acciones para producir resultados concretos.</p>
          <p>{isNovemberEdition ? 'El taller está abierto a profesionales, equipos administrativos, estudiantes y personas de otras áreas que quieran incorporar estas herramientas a su trabajo.' : 'Para los profesionales de Ciencias Económicas, aprender a trabajar con agentes se está convirtiendo en una capacidad necesaria para ampliar los servicios, mejorar la forma de resolver problemas y sostener la competitividad profesional.'}</p>
        </div>
      </section>

      <section className="work-landing__section work-landing__proposal">
        <div className="work-landing__proposal-intro">
          <p className="work-landing__eyebrow">LA PROPUESTA</p>
          <h2>{isNovemberEdition ? 'Tres jornadas para conocer el entorno, practicar y resolver consultas.' : 'Dos jornadas de inmersión a la IA para pasar de 0 a 100.'}</h2>
        </div>
        <div className="work-landing__proposal-copy">
          <p>El taller recorre el entorno de ChatGPT Work para que comprendas su lógica y aprendas a configurarlo por tu propia cuenta.</p>
          <p>En la primera jornada vas a conocer sus principales capacidades a través de explicaciones y demostraciones aplicadas a situaciones concretas. En la segunda, vas a construir, probar y mejorar un entorno de trabajo agéntico aplicado a un caso profesional.{isNovemberEdition && ' En la tercera, vas a tener un espacio abierto para consultar el caso integrador, mostrar otros trabajos y pedir asesoramiento.'}</p>
          {isNovemberEdition && <p>Jornadas 1 y 2, de 14 a 17 h: 75 minutos de trabajo, 15 minutos de receso, otros 75 minutos de trabajo y 15 minutos finales de consultas. Jornada 3, de 14 a 15:30 h: consultas abiertas, sin receso.</p>}
        </div>
        <figure className="work-landing__proposal-photo">
          <img src={proposalPhoto} alt="Participantes trabajando en equipo durante un taller presencial" loading="lazy" />
          <figcaption><strong>{isNovemberEdition ? 'Taller de IA presencial' : 'Experiencia aplicada'}</strong><span>{isNovemberEdition ? 'Consejo Profesional de Ciencias Económicas del Chubut' : 'Aprender, probar y resolver en equipo.'}</span></figcaption>
        </figure>
        <aside className="work-landing__proposal-result"><strong>Al finalizar</strong><span>Vas a contar con los conceptos, los criterios y la práctica necesarios para empezar a pensar, configurar y desarrollar tus propios entornos de trabajo agénticos adaptados a tus necesidades.</span></aside>
      </section>

      <section className="work-landing__program" id="programa">
        <div className="work-landing__program-head">
          <p className="work-landing__eyebrow">PROGRAMA</p>
          <h2>Conceptos, demostraciones y práctica guiada para llevar ChatGPT Work a tu trabajo.</h2>
        </div>

        <section className="work-landing__day">
           <div className="work-landing__day-title">
             <span>Jornada 1</span>
             <div><h3>{dayOneTitle}</h3><p>Una primera jornada de demostraciones y recorrido guiado por las capacidades de ChatGPT Work, desde la configuración del entorno hasta sus herramientas de ampliación.</p></div>
           </div>
           {isNovemberEdition ? <>
             <div className="work-landing__session-head"><h4><WorkshopBlockBadge number={1} /> Antes del receso</h4><span>14:00 a 15:15 · Unidades 1, 2 y 3</span></div>
             <div className="work-landing__blocks work-landing__units">{agendaDayOneBlocks.slice(0, 3).map(block => <ProgramBlock key={block.number} block={block} />)}</div>
             <p className="work-landing__session-break">Receso · 15:15 a 15:30</p>
             <div className="work-landing__session-head"><h4><WorkshopBlockBadge number={2} /> Space, navegador y computadora</h4><span>Después del receso · Unidades 4 y 5</span></div>
             <div className="work-landing__blocks">{agendaDayOneBlocks.slice(3, 5).map(block => <ProgramBlock key={block.number} block={block} />)}</div>
             <div className="work-landing__session-head"><h4><WorkshopBlockBadge number={3} /> Dots</h4><span>Dentro del mismo tramo de 15:30 a 16:45 · Unidad 6</span></div>
             <div className="work-landing__blocks">{agendaDayOneBlocks.slice(5).map(block => <ProgramBlock key={block.number} block={block} />)}</div>
             <p className="work-landing__session-break">Consultas finales · 16:45 a 17:00</p>
           </> : <div className="work-landing__blocks">{agendaDayOneBlocks.map(block => <ProgramBlock key={block.number} block={block} />)}</div>}
          {(!event || event.slug === 'chatgpt-work-de-0-a-100-noviembre-2026') ? <WorkshopJourneyMap /> : (
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
          )}
        </section>

        <section className="work-landing__day work-landing__day--practice">
           <div className="work-landing__day-title">
             <span>Jornada 2</span>
             <div><h3>{dayTwoTitle}</h3><p>{isNovemberEdition ? 'Primero presentamos el caso, reunimos la información y comenzamos a resolverlo. Después convertimos lo trabajado en una rutina reutilizable, con skills, tareas programadas, Sites y seguimiento.' : 'Una jornada práctica para aplicar los recursos trabajados durante el primer día y construir, probar y mejorar una solución sobre un caso profesional concreto.'}</p></div>
           </div>
           <div className="work-landing__blocks">{agendaDayTwoBlocks.map((block) => <ProgramBlock block={block} key={block.number} />)}</div>
          {isNovemberEdition ? <WorkshopCaseMap /> : <div className="work-landing__practice-showcase">
            <figure className="work-landing__practice-photo work-landing__practice-photo--day-two">
               <img src={practicePhoto} alt={isVirtualEdition ? 'Participantes trabajando sobre un caso profesional' : 'Edición presencial de capacitación en el CPCE Chubut'} loading="lazy" />
               <figcaption><span>{isVirtualEdition ? 'De la configuración a la solución' : 'Del mapa a la práctica'}</span><strong>{isVirtualEdition ? 'Trabajo guiado sobre un caso profesional.' : 'Trabajo presencial y colaborativo.'}</strong></figcaption>
            </figure>
            <div className="work-landing__practice-map">
              <div className="work-landing__practice-map-head"><span>Mapa preliminar de la jornada 2</span><strong>Seis pasos para construir, probar y mejorar.</strong></div>
              <ol>{dayTwoSteps.map(([number, title, description]) => <li key={number}><span>{number}</span><strong>{title}</strong><small>{description}</small></li>)}</ol>
              <p className="work-landing__practice-map-note">El paso a paso se ajustará al caso práctico definitivo.</p>
            </div>
          </div>}
        </section>
      </section>

      {isNovemberEdition && <>
        <section className="work-landing__program work-landing__november-day-three" id="consultas-jornada-3">
          <div className="work-landing__day-title"><span>Jornada 3</span><div><h3>Espacio abierto de consultas</h3><p>Un encuentro de 14:00 a 15:30, sin receso, para consultar el caso integrador, mostrar dudas y avances de otros trabajos, pedir asesoramiento y escuchar las preguntas de otras personas.</p></div></div>
          <div className="work-landing__blocks work-landing__open-consultation"><ProgramBlock block={novemberConsultationBlock} /></div>
        </section>
      </>}

      {isNovemberEdition && <WorkshopPreviousEdition />}

      {isNovemberEdition && (
        <section className="work-landing__section work-landing__november-pricing" aria-label="Aranceles de noviembre">
          <p className="work-landing__eyebrow">INSCRIPCIÓN A LAS TRES JORNADAS</p><h2>Arancel según la fecha de inscripción.</h2>
          <div className="work-landing__november-tiers">{event.prices.map(tier => <article key={tier.start_date}><span>{tier.concept}</span><strong>{formatArsPrice(tier.price)}</strong><p>{tier.start_date === '2026-10-15' ? '15 al 31 de octubre' : tier.start_date === '2026-11-01' ? '1 al 8 de noviembre' : 'Desde el 9 de noviembre'}</p></article>)}</div>
        </section>
      )}

      <section className="work-landing__faq" id="preguntas-frecuentes">
        <div className="work-landing__faq-intro">
          <p className="work-landing__eyebrow">PREGUNTAS FRECUENTES</p>
          <h2>Antes de empezar, despejemos las dudas más comunes.</h2>
        </div>
        <div className="work-landing__faq-list">
          {faqItems.map(([question, answer]) => (
            <details key={question}>
              <summary><span>{question}</span><b aria-hidden="true">+</b></summary>
              <FaqAnswer question={question} answer={answer} />
            </details>
          ))}
        </div>
      </section>

      <section className="work-landing__section work-landing__trainer" id="capacitador">
        <div className="work-landing__portrait"><img src={`${import.meta.env.BASE_URL}slides/comodoro/leandro_profile.jpg`} alt="Lic. Adm. Leandro Velasques" loading="lazy" /></div>
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
        <p className="work-landing__eyebrow">{isEventEdition ? 'INSCRIPCIÓN' : 'PRÓXIMAS EDICIONES'}</p>
        <h2>Prepará tu práctica profesional para trabajar con agentes.</h2>
        <p>{isEventEdition
          ? (hasCustomPricing
            ? (isNovemberEdition ? 'La inscripción comprende las tres jornadas. La edición está abierta a todo público y el arancel depende de la fecha de inscripción.' : 'La inscripción comprende las dos jornadas. Matriculados CPCECh: sin costo. Profesionales no matriculados: $ 116.300.-. Título en trámite y estudiantes avanzados de Ciencias Económicas: sin cargo. Requiere inscripción previa.')
            : 'La actividad es sin cargo y está destinada a matriculados del CPCE Chubut de todas sus delegaciones. Requiere inscripción previa.')
          : 'Consultá por próximas fechas, grupos cerrados y capacitaciones para equipos e instituciones.'}</p>
        <a className="work-landing__button work-landing__button--light" href={registrationUrl}>{isEventEdition ? 'Completar inscripción' : 'Inscribirme'}</a>
      </section>

      <footer className="work-landing__footer">
        <div><img src={`${import.meta.env.BASE_URL}logo_triskel.png`} alt="" /><strong>Lic. Adm. Leandro Velasques</strong><span>MP Tomo III – Folio 58</span></div>
        <a href="https://www.leandrovelasques.com.ar">www.leandrovelasques.com.ar</a>
      </footer>
    </main>
  )
}
