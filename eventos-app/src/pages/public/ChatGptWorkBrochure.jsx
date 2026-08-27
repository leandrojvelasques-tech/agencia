import './chatGptWorkBrochure.css'

const heroImage = 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/workshop-tapa-chatgpt-work-de-0-a-agente.png'
const slides = [['Mapa general del recorrido del taller', 'https://oaapnglvbkvxyydjnmun.supabase.co/storage/v1/object/public/banners/slide-1787700708337-qqxkc.png']]

const blocks = [
  { number: '01', duration: '1 h', title: 'Configurar el entorno de trabajo', text: 'Demostraciones en vivo para descubrir las funciones y entender cómo se articulan.', items: ['Proyectos y contexto de trabajo', 'Agentes e instrucciones con AGENTS.md', 'Plugins para ampliar capacidades', 'Skills: qué son y cuándo sirven'] },
  { number: '02', duration: '1 h', title: 'Resolver y compartir una tarea', text: 'Demostraciones de cómo estas capacidades se aplican a una necesidad concreta, con criterio profesional.', items: ['Navegador y computadora con supervisión', 'Apps vinculadas al proceso', 'Sites para compartir una solución', 'Revisión y mejora de resultados'] },
  { number: '03', duration: '1 h', title: 'Construir el caso desde cero', text: 'Construcción guiada del caso integrador: cada participante sigue un flujo de trabajo completo.', items: ['Proyecto, contexto y materiales', 'AGENTS.md y agente para la tarea', 'Construcción de un skill propio', 'Conexión de las apps necesarias'] },
  { number: '04', duration: '1 h', title: 'Probar, integrar y mejorar', text: 'Puesta en funcionamiento, revisión de resultados e intercambio para encontrar la próxima mejora.', items: ['Uso del navegador sobre el caso', 'Integración de las capacidades construidas', 'Site u otra salida aplicable al caso', 'Resultados e intercambio en equipo'] },
]

const days = [['Jornada 1', 'Demostraciones prácticas en vivo', blocks.slice(0, 2)], ['Jornada 2', 'Construcción guiada del caso integrador', blocks.slice(2, 4)]]

export default function ChatGptWorkBrochure() {
  return (
    <main className="work-brochure">
      <header className="work-brochure__header"><a href="#inicio" aria-label="Inicio del brochure"><img src="/logo_triskel.png" alt="Símbolo de Leandro Velasques" /></a><span>Leandro Velasques · IA aplicada</span></header>
      <section className="work-brochure__hero" id="inicio">
        <div className="work-brochure__hero-copy">
          <p className="work-brochure__eyebrow">CHATGPT WORK · PROGRAMA DEL TALLER</p>
          <h1><span>De 0</span> a agentes.</h1>
          <p className="work-brochure__lead">Lo mínimo que necesitás conocer para trabajar con IA de forma preparada, criteriosa y aplicable a tu práctica profesional.</p>
          <div className="work-brochure__facts" aria-label="Datos principales del taller"><div><strong>4 h</strong><span>duración estimada</span></div><div><strong>4 bloques</strong><span>de una hora</span></div><div><strong>2 jornadas</strong><span>de trabajo aplicado</span></div></div>
        </div>
        <figure className="work-brochure__hero-art"><img src={heroImage} alt="Imagen oficial del workshop ChatGPT Work: de 0 a 100" /><figcaption>Imagen oficial del workshop</figcaption></figure>
      </section>

      <section className="work-brochure__section work-brochure__intro"><p className="work-brochure__eyebrow">LA PROPUESTA</p><div><h2>Menos teoría aislada, más criterio para trabajar.</h2><p>Una primera jornada de demostraciones prácticas para entender las capacidades y una segunda para construir un caso integrador, probarlo y mejorarlo paso a paso.</p></div></section>

      <section className="work-brochure__section work-brochure__program">
        <div className="work-brochure__section-head"><div><p className="work-brochure__eyebrow">PROGRAMA</p><h2>Dos jornadas para descubrir, construir y mejorar.</h2></div><p>Las demostraciones no quedan separadas de la práctica: primero muestran el mapa completo y luego acompañan la construcción de un caso real.</p></div>
        {days.map(([day, subtitle, dayBlocks]) => <section className="work-brochure__day" key={day}><div className="work-brochure__day-heading"><span>{day}</span><strong>{subtitle}</strong></div><div className="work-brochure__block-grid">{dayBlocks.map((block) => <article className="work-brochure__block" key={block.number}><div className="work-brochure__block-top"><span>{block.number}</span><small>{block.duration}</small></div><h3>{block.title}</h3><p>{block.text}</p><ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>)}
      </section>

      <section className="work-brochure__section work-brochure__method"><p className="work-brochure__eyebrow">FORMA DE TRABAJO</p><div className="work-brochure__method-grid"><h2>Ver, construir y mejorar.</h2><div><p>La primera jornada muestra en vivo qué hace cada capacidad y cómo se utiliza. La segunda acompaña la construcción de una solución a partir de un caso preparado para el taller.</p><p>La puesta en común permite comparar resultados, identificar decisiones y pensar cómo adaptar lo aprendido a cada práctica profesional.</p></div></div></section>

      <section className="work-brochure__slides" id="diapositivas"><div className="work-brochure__slides-heading"><p className="work-brochure__eyebrow">MUESTRA VISUAL</p><h2>El mapa completo del taller.</h2><p>Una sola diapositiva para ver de un vistazo las capacidades que se recorrerán durante las dos jornadas.</p></div><div className="work-brochure__slide-list">{slides.map(([title, image], index) => <figure className="work-brochure__slide" key={image}><figcaption><span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong></figcaption><img src={image} alt={`Diapositiva ${index + 1}: ${title}`} loading="lazy" /></figure>)}</div></section>

      <footer className="work-brochure__footer"><img src="/logo_triskel.png" alt="Símbolo de Leandro Velasques" /><div><strong>Lic. Adm. Leandro Velasques</strong><span>MP Tomo III – Folio 58</span></div><a href="https://www.leandrovelasques.com.ar">www.leandrovelasques.com.ar</a></footer>
    </main>
  )
}
