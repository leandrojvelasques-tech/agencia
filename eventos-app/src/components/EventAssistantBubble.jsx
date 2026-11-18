import { useEffect, useRef, useState } from 'react'
import '../styles/event-assistant.css'

function AssistantCharacter() {
  return <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="event-assistant-character">
    <path d="M40 19V12" stroke="#B86F4D" strokeWidth="3" strokeLinecap="round" />
    <circle cx="40" cy="9" r="4" fill="#B86F4D" />
    <path d="M17 26c0-5 4-9 9-9h28c5 0 9 4 9 9v23c0 5-4 9-9 9H39L26 67v-9c-5 0-9-4-9-9V26Z" fill="#A8D5C1" />
    <rect x="23" y="25" width="34" height="24" rx="11" fill="#285A47" />
    <g className="event-assistant-eyes"><ellipse cx="32" cy="35" rx="2.8" ry="3.7" fill="white" /><ellipse cx="48" cy="35" rx="2.8" ry="3.7" fill="white" /></g>
    <path d="M36 42q4 4 8 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path className="event-assistant-hand" d="M64 45q9-2 9-10" stroke="#A8D5C1" strokeWidth="5" strokeLinecap="round" />
    <path d="M16 44q-6 0-7-6" stroke="#A8D5C1" strokeWidth="5" strokeLinecap="round" />
  </svg>
}

export default function EventAssistantBubble({ registrationPath }) {
  const [open, setOpen] = useState(false)
  const launcher = useRef(null)
  const closeButton = useRef(null)
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKeyDown = event => { if (event.key === 'Escape') { setOpen(false); launcher.current?.focus() } }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])
  const close = () => { setOpen(false); launcher.current?.focus() }

  return <aside className="event-assistant-widget" aria-label="Asistente del evento">
    {open && <section className="event-assistant-panel" role="dialog" aria-labelledby="event-assistant-heading">
      <header><div className="event-assistant-mini"><AssistantCharacter /></div><div><h2 id="event-assistant-heading">Lía</h2><p>Tu asistente de eventos</p></div><button ref={closeButton} type="button" onClick={close} aria-label="Cerrar asistente"><span aria-hidden="true">×</span></button></header>
      <div className="event-assistant-content"><span className="event-assistant-preview">Propuesta de identidad · Vista previa</span><p className="event-assistant-message">Hola, soy Lía. Puedo ayudarte a conocer la charla, encontrar información e iniciar tu inscripción.</p><p className="event-assistant-pending">La conversación con el agente de Hermes está en preparación. Mientras tanto, podés recorrer el evento.</p><a href="#contenidos" onClick={close}>Ver los temas <span aria-hidden="true">↗</span></a><a href={registrationPath}>Ir a la inscripción <span aria-hidden="true">→</span></a></div>
      <footer>Asistente de eventos · Lic. Leandro Velasques</footer>
    </section>}
    <button ref={launcher} type="button" className="event-assistant-launcher" onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-label={open ? 'Cerrar a Lía, asistente de eventos' : '¿Tenés alguna duda? Preguntame. Abrir a Lía, asistente de eventos'}>
      {!open && <span className="event-assistant-greeting"><strong>¿Tenés alguna duda?</strong><span>Preguntame <b aria-hidden="true">↗</b></span></span>}
      <span className="event-assistant-avatar"><AssistantCharacter /></span>
    </button>
  </aside>
}
