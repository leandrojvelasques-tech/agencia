import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '../../store/useStore'
import { EVENT_PROFESSIONS, validateEventRegistration } from '../../lib/agentsEvent'
import { getArgentinaDateKey } from '../../lib/eventPricing'
import '../../styles/agents-event.css'

const Icon = ({ children }) => <span className="material-symbols-outlined" aria-hidden="true">{children}</span>
const TOPICS = [
  ['Qué es un agente de IA', 'Cómo funciona y qué necesita para realizar una tarea.'],
  ['Aplicaciones en tu profesión', 'Ejemplos para estudios contables, consultoras y equipos de trabajo.'],
  ['Herramientas y conexiones', 'Cómo se vincula con un sitio web, formularios y canales de consulta.'],
  ['Una demostración en vivo', 'Consultas, inscripción y coordinación entre asistentes especializados.'],
]

export default function AgentsEventPage({ event, registration = false, preview = false }) {
  const selfRegister = useStore(state => state.selfRegister)
  const [values, setValues] = useState({ first_name: '', last_name: '', profession: '', other_profession: '', email: '', request_slides: false })
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('form')
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState('')
  const date = new Date(`${event.event_date}T12:00:00`)
  const dateText = isValid(date) ? format(date, "EEEE d 'de' MMMM", { locale: es }) : 'Fecha a confirmar'
  const basePath = preview ? '/preview.html' : `/evento/${event.slug}`
  const landingPath = preview ? `${basePath}?view=landing` : basePath
  const registrationPath = preview ? `${basePath}?view=registration` : `${basePath}/inscripcion`
  const lastDate = [event.event_date, ...(Array.isArray(event.offered_dates) ? event.offered_dates : [])].filter(Boolean).sort().at(-1)
  const registrationOpen = event.registrations_open && ['published', 'in_progress'].includes(event.status) && ['self', 'both'].includes(event.registration_mode || 'self') && lastDate >= getArgentinaDateKey()
  const update = e => { const { name, value, type, checked } = e.target; setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value })); setErrors(previous => ({ ...previous, [name]: undefined })); setFailure('') }
  const review = e => {
    e.preventDefault()
    const nextErrors = validateEventRegistration(values)
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) { setStage('review'); setFailure('') }
  }
  const confirm = async () => {
    if (sending) return
    if (preview) { setStage('success'); return }
    if (!registrationOpen) { setFailure('Las inscripciones todavía no están abiertas.'); return }
    setSending(true)
    setFailure('')
    try {
      const result = await selfRegister(event.slug, {
        first_name: values.first_name.trim(), last_name: values.last_name.trim(), email: values.email.trim().toLowerCase(),
        attendance_mode: 'presencial', selected_date: event.event_date,
        survey_responses: { profesion: 'Profesional de Ciencias Económicas', profesion_carrera: values.profession === EVENT_PROFESSIONS.at(-1) ? values.other_profession.trim() : values.profession, solicitud_diapositivas: values.request_slides },
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
        <div className="ae-form-panel" aria-live="polite">
          {stage === 'form' && <form onSubmit={review} noValidate><p className="ae-kicker">INSCRIPCIÓN</p><h2>Completá tus datos</h2><p>Dejanos tu correo para las comunicaciones y los materiales de esta charla.</p><div className="ae-fields-row">{field('first_name', 'Nombre', { autoComplete: 'given-name' })}{field('last_name', 'Apellido', { autoComplete: 'family-name' })}</div><label className="ae-field" htmlFor="ae-profession"><span>Profesión</span><select id="ae-profession" name="profession" value={values.profession} onChange={update} required aria-invalid={Boolean(errors.profession)} aria-describedby={errors.profession ? 'ae-profession-error' : undefined}><option value="">Seleccioná tu profesión</option>{EVENT_PROFESSIONS.map(profession => <option key={profession}>{profession}</option>)}</select>{errors.profession && <small id="ae-profession-error">{errors.profession}</small>}</label>{values.profession === EVENT_PROFESSIONS.at(-1) && field('other_profession', '¿Cuál es tu profesión?')}{field('email', 'Correo electrónico', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'nombre@correo.com' })}<label className="ae-check"><input name="request_slides" type="checkbox" checked={values.request_slides} onChange={update} /><span>Quiero recibir las diapositivas cuando estén disponibles.</span></label><button className="ae-button" type="submit">Revisar mis datos <Icon>arrow_forward</Icon></button><p className="ae-form-note">Podés revisar y corregir tus datos antes de confirmar.</p></form>}
          {stage === 'review' && <div><p className="ae-kicker">ANTES DE CONFIRMAR</p><h2>Revisá tu inscripción</h2><p>Comprobá especialmente el correo donde querés recibir los materiales.</p><dl className="ae-review"><div><dt>Nombre y apellido</dt><dd>{values.first_name.trim()} {values.last_name.trim()}</dd></div><div><dt>Profesión</dt><dd>{values.profession === EVENT_PROFESSIONS.at(-1) ? values.other_profession : values.profession}</dd></div><div><dt>Correo electrónico</dt><dd>{values.email.trim()}</dd></div><div><dt>Diapositivas</dt><dd>{values.request_slides ? 'Solicito recibirlas cuando estén disponibles' : 'Sin solicitud de envío'}</dd></div></dl>{failure && <p className="ae-error" role="alert">{failure}</p>}<button className="ae-button" type="button" onClick={confirm} disabled={sending || (!preview && !registrationOpen)}>{sending ? 'Guardando inscripción…' : preview ? 'Probar confirmación' : 'Confirmar inscripción'}<Icon>check</Icon></button>{!preview && !registrationOpen && <p className="ae-form-note">Las inscripciones todavía no están abiertas.</p>}<button className="ae-text-button" type="button" onClick={() => setStage('form')} disabled={sending}>Corregir mis datos</button></div>}
          {stage === 'success' && <div className="ae-success"><span className="ae-success-icon"><Icon>check</Icon></span><p className="ae-kicker">{preview ? 'PRUEBA DEL FORMULARIO' : 'INSCRIPCIÓN CONFIRMADA'}</p><h2>Gracias, {values.first_name.trim()}.</h2><p>{preview ? 'El recorrido está completo. Esta prueba no creó una inscripción ni envió correos.' : 'Tus datos quedaron registrados para esta charla.'}</p>{values.request_slides && <p>{preview ? 'También se mostraría tu solicitud de diapositivas.' : 'También registramos tu solicitud de diapositivas para cuando estén disponibles.'}</p>}<a className="ae-button" href={landingPath}>Volver a la charla <Icon>arrow_forward</Icon></a></div>}
        </div>
      </section> : <>
        <section className="ae-hero">
          <div className="ae-hero-copy"><p className="ae-kicker">CPCE CHUBUT · COMODORO RIVADAVIA</p><div className="ae-encounter">ENCUENTRO DE<br /><strong>JÓVENES PROFESIONALES</strong></div><p className="ae-format">CHARLA · {event.duration_minutes} MINUTOS</p><h1>Agentes de inteligencia artificial <span>en ciencias económicas.</span></h1><p className="ae-lead">Qué pueden hacer, cómo funcionan y cómo empezar a aplicarlos en tu trabajo.</p><div className="ae-hero-actions">{(preview || registrationOpen) && <a className="ae-button" href={registrationPath}>Inscribirme <Icon>arrow_forward</Icon></a>}<a className="ae-secondary-link" href="#contenidos">Ver los temas <Icon>south</Icon></a></div><p className="ae-speaker">Con <strong>{event.coordinator}</strong></p></div>
          <figure className="ae-poster"><img src={event.official_banner_url || `${import.meta.env.BASE_URL}event-assets/charla-agentes-2026.png`} alt="Placa oficial de la charla de agentes de inteligencia artificial, sábado 21 de noviembre a las 14:30" fetchPriority="high" /></figure>
        </section>
        <section className="ae-facts" aria-label="Datos del encuentro"><div><Icon>calendar_month</Icon><span>CUÁNDO<strong>{dateText}</strong></span></div><div><Icon>schedule</Icon><span>HORARIO<strong>{event.start_time?.slice(0, 5)} h · {event.duration_minutes} minutos</strong></span></div><div><Icon>location_on</Icon><span>DÓNDE<strong>{event.location || 'Comodoro Rivadavia'}</strong></span></div></section>
        <section id="contenidos" className="ae-content"><div className="ae-content-intro"><p className="ae-kicker">PARA LLEVAR A TU TRABAJO</p><h2>Entender los agentes.<br />Verlos en acción.</h2><p>Una charla para profesionales de ciencias económicas, con ejemplos y una demostración participativa.</p></div><div className="ae-topics">{TOPICS.map(([title, text], i) => <article key={title}><span className="ae-topic-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
        <section className="ae-participate"><div><p className="ae-kicker">PARTICIPÁ DEL ENCUENTRO</p><h2>Traé tus preguntas.</h2><p>Podés dejar tus datos y solicitar las diapositivas de la charla.</p></div>{(preview || registrationOpen) ? <a className="ae-button" href={registrationPath}>Completar inscripción <Icon>arrow_forward</Icon></a> : <p className="ae-closed">Inscripciones aún no abiertas.</p>}</section>
        {preview && <section className="ae-assistant-proposal"><Icon>chat_bubble</Icon><div><h2>Un asistente para consultar sobre el evento</h2><p>Este espacio se conectará con el agente de eventos en Hermes. La conversación todavía no está activada.</p></div><span>En preparación</span></section>}
      </>}
    </main>
    <footer className="ae-footer"><span>{event.organizer || 'Comisión de Jóvenes Profesionales · CPCE Chubut'}</span><a href="https://www.leandrovelasques.com.ar">Lic. Leandro Velasques <Icon>north_east</Icon></a></footer>
  </div>
}
