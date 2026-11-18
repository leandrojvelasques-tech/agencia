import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
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

async function ownerHeaders(ownerPreview) {
  if (!ownerPreview) return {}
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}

export default function EventAssistantBubble({ registrationPath, designPreview = false }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const end = useRef(null)
  const launcher = useRef(null)
  const closeButton = useRef(null)
  const resetSession = useRef(false)
  const ownerPreview = new URLSearchParams(window.location.search).get('asistente') === 'prueba'
  useEffect(() => {
    if (!open || designPreview) return
    let active = true
    async function refresh() {
      try {
        const response = await fetch(`/api/event-chat-status${ownerPreview ? '?preview=true' : ''}`, { headers: await ownerHeaders(ownerPreview), cache: 'no-store' })
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (active) setStatus(data)
      } catch { if (active) setStatus({ available: false, message: 'El asistente no está disponible en este momento. Podés inscribirte con el formulario.' }) }
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [open, ownerPreview, designPreview]) // The token is read fresh for each owner request.
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages, sending, error])
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKeyDown = event => { if (event.key === 'Escape') { setOpen(false); requestAnimationFrame(() => launcher.current?.focus()) } }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])
  const close = () => { setOpen(false); requestAnimationFrame(() => launcher.current?.focus()) }
  async function send(event) {
    event.preventDefault()
    if (!draft.trim() || sending || !status?.available) return
    const question = draft.trim()
    const history = messages.slice(-10)
    setMessages(previous => [...previous, { role: 'user', content: question }])
    setDraft(''); setError(''); setSending(true)
    try {
      const response = await fetch('/api/event-chat', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...await ownerHeaders(ownerPreview) },
        body: JSON.stringify({ message: question, history, preview: ownerPreview, reset: resetSession.current }), signal: AbortSignal.timeout(115000) })
      const data = await response.json()
      if (!response.ok || !data.answer) throw new Error(data.error || 'No pude responder. Intentá nuevamente.')
      resetSession.current = false
      setMessages(previous => [...previous, { role: 'assistant', content: data.answer }])
    } catch (failure) {
      setMessages(previous => previous.slice(0, -1))
      setDraft(question)
      setError(failure.name === 'TimeoutError' ? 'La respuesta está demorando. Intentá nuevamente.' : failure.message)
    } finally { setSending(false) }
  }

  return <aside className={`event-assistant-widget${open ? ' is-open' : ''}`} aria-label="Asistente del evento">
    {open && <section className={`event-assistant-panel${status?.available ? ' is-connected' : ''}`} role="dialog" aria-labelledby="event-assistant-heading">
      <header><div className="event-assistant-mini"><AssistantCharacter /></div><div><h2 id="event-assistant-heading">Asistente del evento</h2><p>Consultas e inscripción</p></div><button ref={closeButton} type="button" onClick={close} aria-label="Cerrar asistente"><span aria-hidden="true">×</span></button></header>
      <div className="event-assistant-content">
        {status?.preview && <span className="event-assistant-preview">Prueba privada del organizador</span>}
        <div className="event-assistant-messages" role="log" aria-label="Conversación" aria-live="polite" aria-relevant="additions">
          <p className="event-assistant-message">Hola. Puedo ayudarte a conocer la charla y orientarte para inscribirte. ¿Qué te gustaría saber?</p>
          {messages.map((message, index) => <p key={index} className={`event-assistant-message event-assistant-${message.role}`}>{message.content}</p>)}
          {sending && <p className="event-assistant-pending" role="status">Estoy preparando tu respuesta…</p>}
          {error && <p className="event-assistant-error" role="alert">{error}</p>}
          <div ref={end} />
        </div>
        {!status?.available && <p className="event-assistant-pending">{designPreview ? 'Vista previa del asistente. La conversación estará disponible el día del encuentro.' : status?.message || 'Consultando disponibilidad…'}</p>}
        {status?.available && <form className="event-assistant-compose" onSubmit={send}>
          <label htmlFor="event-assistant-question">Tu consulta sobre el evento</label>
          <textarea id="event-assistant-question" value={draft} maxLength={1500} rows={2} disabled={sending} onChange={event => setDraft(event.target.value)} placeholder="¿Qué vamos a ver en la charla?" />
          <button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Respondiendo…' : 'Enviar consulta →'}</button>
        </form>}
        <a href={registrationPath}>Ir a la inscripción <span aria-hidden="true">→</span></a>
        {messages.length > 0 && !sending && <button className="event-assistant-restart" type="button" onClick={() => { resetSession.current = true; setMessages([]); setError(''); setDraft('') }}>Nueva conversación</button>}
      </div>
      <footer>Asistente con IA · Puede cometer errores. Revisá los datos del evento.</footer>
    </section>}
    <button ref={launcher} type="button" className="event-assistant-launcher" onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-label={open ? 'Cerrar asistente de eventos' : '¿Tenés alguna duda? Preguntame. Abrir asistente de eventos'}>
      {!open && <span className="event-assistant-greeting"><strong>¿Tenés alguna duda?</strong><span>Preguntame <b aria-hidden="true">↗</b></span></span>}
      <span className="event-assistant-avatar"><AssistantCharacter /></span>
    </button>
  </aside>
}
