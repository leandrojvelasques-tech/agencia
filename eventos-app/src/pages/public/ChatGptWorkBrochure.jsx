import './chatGptWorkBrochure.css'

const slides = [
  ['ChatGPT Work: de 0 a 100', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-tapa-chatgpt-work-de-0-a-agente.png'],
  ['Mapa general del recorrido práctico', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787700708337-qqxkc.png'],
  ['Configuración', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787710576444-a0o6e.png'],
  ['Configuración: escritorio, local y nube', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787698966195-iofg3.png'],
  ['Proyectos', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787710577216-d1564.png'],
  ['Proyectos: el espacio de trabajo de Work', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787703468118-3pvtb.png'],
  ['AGENTS.md', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787710577816-298v8.png'],
  ['AGENTS.md: dejá por escrito cómo debe trabajar', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787708499708-7egju.png'],
  ['Plugins', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787710578436-uapog.png'],
  ['Plugins: agregá capacidades listas para usar', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787710578907-ehl2h.png'],
  ['Apps sin plugin', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-mapa-05-apps-sin-plugin.png'],
  ['Apps sin plugin: conexiones personalizadas', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787712308178-1wz0q.png'],
  ['Skills', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-mapa-06-skills.png'],
  ['Skills: usá una existente o creá la tuya', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-02-06-skills-usar-o-crear.png'],
  ['Sites', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-mapa-07-sites.png'],
  ['Sites: pasá de entregar archivos a compartir herramientas', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-02-07-sites-compartir-herramientas.png'],
  ['Navegador y computadora', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-mapa-08-navegador-y-computadora.png'],
  ['Navegador y computadora: delegá tareas web con supervisión', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-02-08-navegador-y-computadora.png'],
  ['Actividades programadas', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-02-09-actividades-programadas.png'],
]

const blocks = [
  {
    number: '01',
    duration: '1 h 15 min',
    title: 'Configurá y ordená ChatGPT Work',
    text: 'Cómo preparar el entorno, organizar proyectos y dejar instrucciones claras para trabajar con continuidad.',
    items: ['Configuración del espacio de trabajo', 'Proyectos y contexto compartido', 'Instrucciones persistentes con AGENTS.md', 'Plugins para ampliar capacidades'],
  },
  {
    number: '02',
    duration: '1 h 15 min',
    title: 'Llevalo a tareas concretas',
    text: 'Recursos para conectar herramientas, reutilizar procesos y convertir el trabajo con IA en resultados útiles.',
    items: ['Apps y conexiones personalizadas', 'Skills para procesos reutilizables', 'Sites para compartir herramientas', 'Navegador, computadora y actividades programadas'],
  },
]

export default function ChatGptWorkBrochure() {
  return (
    <main className="work-brochure">
      <header className="work-brochure__header">
        <a href="#inicio" aria-label="Inicio del brochure">
          <img src="/logo_triskel.png" alt="Símbolo de Leandro Velasques" />
        </a>
        <span>Leandro Velasques · IA aplicada</span>
      </header>

      <section className="work-brochure__hero" id="inicio">
        <div className="work-brochure__hero-copy">
          <p className="work-brochure__eyebrow">CHATGPT WORK · PROGRAMA DEL TALLER</p>
          <h1><span>De 0</span> a agentes.</h1>
          <p className="work-brochure__lead">De conversar con la IA a poner un agente a trabajar con vos: una propuesta para organizar el entorno, ampliar sus capacidades y aplicarlo a tareas concretas.</p>
          <div className="work-brochure__facts" aria-label="Datos principales del taller">
            <div><strong>2 h 45 min</strong><span>duración total</span></div>
            <div><strong>2 bloques</strong><span>de trabajo guiado</span></div>
            <div><strong>15 min</strong><span>de break</span></div>
          </div>
        </div>
        <figure className="work-brochure__hero-art">
          <img src={slides[0][1]} alt="Imagen oficial del workshop ChatGPT Work: de 0 a 100" />
          <figcaption>Imagen oficial del workshop</figcaption>
        </figure>
      </section>

      <section className="work-brochure__section work-brochure__intro">
        <p className="work-brochure__eyebrow">LA PROPUESTA</p>
        <div>
          <h2>Menos teoría aislada, más criterio para trabajar.</h2>
          <p>El taller combina explicación, demostraciones y ejemplos de trabajo para que cada participante pueda reconocer qué conviene pedirle a un agente, qué necesita definir antes y cómo revisar el resultado.</p>
        </div>
      </section>

      <section className="work-brochure__section work-brochure__program">
        <div className="work-brochure__section-head">
          <div><p className="work-brochure__eyebrow">PROGRAMA</p><h2>Dos tramos para pasar de la configuración a la práctica.</h2></div>
          <p>La jornada está pensada para personas que buscan incorporar estas herramientas de manera gradual, clara y aplicada a su trabajo cotidiano.</p>
        </div>
        <div className="work-brochure__block-grid">
          {blocks.map((block) => (
            <article className="work-brochure__block" key={block.number}>
              <div className="work-brochure__block-top"><span>{block.number}</span><small>{block.duration}</small></div>
              <h3>{block.title}</h3>
              <p>{block.text}</p>
              <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
          <aside className="work-brochure__break"><span>BREAK</span><strong>15 min</strong><p>Un corte entre ambos bloques para retomar el recorrido con tiempo de consulta e intercambio.</p></aside>
        </div>
      </section>

      <section className="work-brochure__section work-brochure__method">
        <p className="work-brochure__eyebrow">FORMA DE TRABAJO</p>
        <div className="work-brochure__method-grid">
          <h2>Entender, probar y revisar.</h2>
          <div><p>Cada tema se presenta desde una situación de trabajo concreta: qué problema ayuda a resolver, qué información necesita el agente y qué control debe conservar la persona.</p><p>La intención es que los participantes se lleven criterios para continuar explorando después del taller, no una receta única para todos los casos.</p></div>
        </div>
      </section>

      <section className="work-brochure__slides" id="diapositivas">
        <div className="work-brochure__slides-heading"><p className="work-brochure__eyebrow">MUESTRA VISUAL</p><h2>Diapositivas que acompañan el recorrido.</h2><p>La siguiente selección muestra el material de trabajo previsto para la jornada.</p></div>
        <div className="work-brochure__slide-list">
          {slides.slice(1).map(([title, image], index) => (
            <figure className="work-brochure__slide" key={image}>
              <figcaption><span>{String(index + 2).padStart(2, '0')}</span><strong>{title}</strong></figcaption>
              <img src={image} alt={`Diapositiva ${index + 2}: ${title}`} loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <footer className="work-brochure__footer">
        <img src="/logo_triskel.png" alt="Símbolo de Leandro Velasques" />
        <div><strong>Lic. Adm. Leandro Velasques</strong><span>MP Tomo III – Folio 58</span></div>
        <a href="https://www.leandrovelasques.com.ar">www.leandrovelasques.com.ar</a>
      </footer>
    </main>
  )
}
