import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '../../store/useStore'
import { EVENT_PROFESSIONS, validateEventRegistration } from '../../lib/agentsEvent'
import { getArgentinaDateKey } from '../../lib/eventPricing'
import '../../styles/agents-event.css'
import EventAssistantBubble from '../../components/EventAssistantBubble'

const Icon = ({ children }) => <span className="material-symbols-outlined" aria-hidden="true">{children}</span>
const TOPICS = [
  ['Del chat a delegar una tarea', 'De pedir una respuesta a definir un objetivo, aportar contexto y revisar un resultado.'],
  ['Qué hay detrás de un agente', 'Modelo, instrucciones, contexto y herramientas: las piezas que permiten pasar de la consulta a la acción.'],
  ['Agentes en tu trabajo cotidiano', 'Atender consultas, preparar un informe o seguir pendientes. Qué herramientas y permisos necesita cada tarea.'],
  ['Del pedido al seguimiento', 'Agentes que responden, ejecutan tareas y pueden acercarte novedades. Qué delegar y cuándo intervenir.'],
]

export default function AgentsEventPage({ event, registration = false, preview = false }) {
  const selfRegister = useStore(state => state.selfRegister)
  const [values, setValues] = useState({ first_name: '', last_name: '', profession: '', other_profession: '', residence_city: '', email: '', request_slides: false })
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('form')
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState('')
  const panelRef = useRef(null)
  useEffect(() => {
    if (stage === 'success') {
      panelRef.current?.scrollIntoView({ block: 'start' })
      panelRef.current?.focus({ preventScroll: true })
    }
  }, [stage])
  const date = new Date(`${event.event_date}T12:00:00`)
  const dateText = isValid(date) ? format(date, "EEEE d 'de' MMMM", { locale: es }) : 'Fecha a confirmar'
  const basePath = preview ? '/preview.html' : `/evento/${event.slug}`
  const landingPath = preview ? `${basePath}?view=landing` : basePath
  const registrationPath = preview ? `${basePath}?view=registration` : `${basePath}/inscripcion`
  const lastDate = [event.event_date, ...(Array.isArray(event.offered_dates) ? event.offered_dates : [])].filter(Boolean).sort().at(-1)
  const registrationOpen = event.registrations_open && ['published', 'in_progress'].includes(event.status) && ['self', 'both'].includes(event.registration_mode || 'self') && lastDate >= getArgentinaDateKey()
  const update = e => { const { name, value, type, checked } = e.target; setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value })); setErrors(previous => ({ ...previous, [name]: undefined })); setFailure('') }
  const confirm = async e => {
    e?.preventDefault()
    if (sending) return
    const nextErrors = validateEventRegistration(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      document.getElementById(`ae-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }
    if (preview) { setStage('success'); return }
    if (!registrationOpen) { setFailure('Las inscripciones todavía no están abiertas.'); return }
    setSending(true)
    setFailure('')
    try {
      const result = await selfRegister(event.slug, {
        first_name: values.first_name.trim(), last_name: values.last_name.trim(), email: values.email.trim().toLowerCase(),
        attendance_mode: 'presencial', selected_date: event.event_date,
        survey_responses: { profesion: 'Profesional de Ciencias Económicas', profesion_carrera: values.profession === EVENT_PROFESSIONS.at(-1) ? values.other_profession.trim() : values.profession, 'Ciudad de residencia': values.residence_city.trim(), solicitud_diapositivas: values.request_slides },
      })
      if (!result.success) { setFailure(typeof result.error === 'string' ? result.error : 'No pudimos completar la inscripción. Intentá nuevamente.'); return }
      setStage('success')
    } catch { setFailure('No pudimos conectar. Revisá tu conexión e intentá nuevamente.') }
    finally { setSending(false) }
  }
  const field = (name, label, extra = {}) => <label className="ae-field" htmlFor={`ae-${name}`}><span>{label}</span><input id={`ae-${name}`} name={name} value={values[name]} onChange={update} required maxLength={name === 'email' ? 254 : 100} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `ae-${name}-error` : undefined} {...extra} />{errors[name] && <small id={`ae-${name}-error`}>{errors[name]}</small>}</label>

  return <div className="agents-event-page">
    {preview && <div className="ae-preview-banner">Vista previa · Los datos del formulario no se guardan ni se envían.</div>}
    <header className="ae-header"><a href="/" className="ae-brand"><img src={`${import.meta.env.BASE_URL}event-assets/triskel-oficial.png`} alt="" /><span>LEANDRO VELASQUES<small>Lic. Administración · IA</small></span></a><a href={registration ? landingPath : '#contenidos'} className="ae-header-link">{registration ? 'Volver al encuentro' : 'Sobre la charla'}<Icon>{registration ? 'arrow_back' : 'south'}</Icon></a></header>
    <main>
      {registration ? <section className="ae-registration-layout">
        <div className="ae-registration-intro"><p className="ae-kicker">ENCUENTRO DE JÓVENES PROFESIONALES</p><h1>{stage === 'success' ? (preview ? 'Así se vería tu confirmación.' : 'Tu inscripción quedó registrada.') : 'Nos vemos en la charla.'}</h1><p>Agentes de inteligencia artificial en ciencias económicas.</p><div className="ae-registration-meta"><span><Icon>calendar_month</Icon>{dateText} · {event.start_time?.slice(0, 5)} h</span><span><Icon>location_on</Icon>{event.location || 'Comodoro Rivadavia'}</span><span><Icon>person</Icon>{event.coordinator}</span></div><img src={`${import.meta.env.BASE_URL}event-assets/charla-agentes-2026.png`} alt="Placa del encuentro: agentes de inteligencia artificial en ciencias económicas" className="ae-form-poster" /></div>
        <div className="ae-form-panel" ref={panelRef} tabIndex={-1} aria-live="polite">
          {stage === 'form' && <form onSubmit={confirm} noValidate><p className="ae-kicker">INSCRIPCIÓN</p><h2>Completá tus datos</h2><p>Dejanos tu correo para las comunicaciones y los materiales de esta charla.</p><div className="ae-fields-row">{field('first_name', 'Nombre', { autoComplete: 'given-name' })}{field('last_name', 'Apellido', { autoComplete: 'family-name' })}</div><label className="ae-field" htmlFor="ae-profession"><span>Profesión</span><select id="ae-profession" name="profession" value={values.profession} onChange={update} required aria-invalid={Boolean(errors.profession)} aria-describedby={errors.profession ? 'ae-profession-error' : undefined}><option value="">Seleccioná tu profesión</option>{EVENT_PROFESSIONS.map(profession => <option key={profession}>{profession}</option>)}</select>{errors.profession && <small id="ae-profession-error">{errors.profession}</small>}</label>{values.profession === EVENT_PROFESSIONS.at(-1) && field('other_profession', '¿Cuál es tu profesión?')}{field('residence_city', 'Ciudad de residencia', { autoComplete: 'address-level2', placeholder: 'Por ejemplo, Comodoro Rivadavia' })}{field('email', 'Correo electrónico', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'nombre@correo.com' })}<label className="ae-check"><input name="request_slides" type="checkbox" checked={values.request_slides} onChange={update} /><span>Quiero recibir las diapositivas cuando estén disponibles.</span></label>{failure && <p className="ae-error" role="alert">{failure}</p>}<button className="ae-button" type="submit" disabled={sending || (!preview && !registrationOpen)}>{sending ? 'Guardando inscripción…' : preview ? 'Probar inscripción' : 'Confirmar inscripción'} <Icon>arrow_forward</Icon></button><p className="ae-form-note">Al confirmar, guardamos tu inscripción y te mostramos el resultado acá.</p></form>}
          {stage === 'success' && <div className="ae-success"><span className="ae-success-icon"><Icon>check</Icon></span><p className="ae-kicker">{preview ? 'PRUEBA DEL FORMULARIO' : 'INSCRIPCIÓN CONFIRMADA'}</p><h2>Gracias, {values.first_name.trim()}.</h2><p>{preview ? 'El recorrido está completo. Esta prueba no creó una inscripción ni envió correos.' : 'Tus datos quedaron registrados para esta charla.'}</p>{values.request_slides && <p>{preview ? 'También se mostraría tu solicitud de diapositivas.' : 'También registramos tu solicitud de diapositivas para cuando estén disponibles.'}</p>}<a className="ae-button" href={landingPath}>Volver a la charla <Icon>arrow_forward</Icon></a></div>}
        </div>
      </section> : <>
        <section className="ae-hero">
          <div className="ae-hero-copy"><p className="ae-kicker">CPCE CHUBUT · COMODORO RIVADAVIA</p><div className="ae-encounter">ENCUENTRO DE<br /><strong>JÓVENES PROFESIONALES</strong></div><p className="ae-format">CHARLA · {event.duration_minutes} MINUTOS</p><h1>Agentes de inteligencia artificial <span>en ciencias económicas.</span></h1><p className="ae-lead">Del chat a delegar tareas: cómo trabajan los agentes y qué lugar pueden ocupar en tu práctica profesional.</p><div className="ae-hero-actions">{(preview || registrationOpen) && <a className="ae-button" href={registrationPath}>Inscribirme <Icon>arrow_forward</Icon></a>}<a className="ae-secondary-link" href="#contenidos">Ver los temas <Icon>south</Icon></a></div><p className="ae-speaker">Con <strong>{event.coordinator}</strong></p></div>
          <figure className="ae-poster"><img src={event.official_banner_url || `${import.meta.env.BASE_URL}event-assets/charla-agentes-2026.png`} alt="Placa oficial de la charla de agentes de inteligencia artificial, sábado 21 de noviembre a las 14:30" fetchPriority="high" /></figure>
        </section>
        <section className="ae-facts" aria-label="Datos del encuentro"><div><Icon>calendar_month</Icon><span>CUÁNDO<strong>{dateText}</strong></span></div><div><Icon>schedule</Icon><span>HORARIO<strong>{event.start_time?.slice(0, 5)} h · {event.duration_minutes} minutos</strong></span></div><div><Icon>location_on</Icon><span>DÓNDE<strong>{event.location || 'Comodoro Rivadavia'}</strong></span></div></section>
        <section id="contenidos" className="ae-content"><div className="ae-content-intro"><p className="ae-kicker">PARA LLEVAR A TU TRABAJO</p><h2>Un objetivo.<br />Varios pasos.<br /><em>Vos definís el alcance.</em></h2><p>¿Qué cambia cuando la IA puede usar herramientas? Vamos a recorrer los conceptos con ejemplos de estudios contables, consultoras y equipos de trabajo.</p></div><div className="ae-topics">{TOPICS.map(([title, text], i) => <article key={title}><span className="ae-topic-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
        <section className="ae-journey" aria-labelledby="ae-journey-title"><div className="ae-journey-heading"><p className="ae-kicker">DEL CHAT AL TRABAJO CON AGENTES</p><h2 id="ae-journey-title">¿Cómo pasa de un pedido a un resultado?</h2></div><ol><li><Icon>flag</Icon><strong>Definís el objetivo</strong><p>Qué necesitás resolver y con qué criterios.</p></li><li><Icon>build</Icon><strong>El agente trabaja</strong><p>Consulta información y usa las herramientas habilitadas.</p></li><li><Icon>fact_check</Icon><strong>Revisás el resultado</strong><p>Validás lo que hizo y decidís cómo seguir.</p></li></ol><p className="ae-journey-note">Los permisos y la supervisión forman parte del proceso. Si falta información o autorización, el agente puede pedir tu intervención.</p></section>
        <section className="ae-participate"><div><p className="ae-kicker">PARTICIPÁ DEL ENCUENTRO</p><h2>Traé tus preguntas.</h2><p>Podés dejar tus datos y solicitar las diapositivas de la charla.</p></div>{(preview || registrationOpen) ? <a className="ae-button" href={registrationPath}>Completar inscripción <Icon>arrow_forward</Icon></a> : <p className="ae-closed">Inscripciones aún no abiertas.</p>}</section>
      </>}
    </main>
    {preview && !registration && <EventAssistantBubble registrationPath={registrationPath} />}
    <footer className="ae-footer"><span>{event.organizer || 'Comisión de Jóvenes Profesionales · CPCE Chubut'}</span><a href="https://www.leandrovelasques.com.ar">Lic. Leandro Velasques <Icon>north_east</Icon></a></footer>
  </div>
}
