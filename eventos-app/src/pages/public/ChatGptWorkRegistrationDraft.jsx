import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import './chatGptWorkRegistrationDraft.css'

const EVENT_SLUG = 'chatgpt-work-de-0-a-100'

const situations = [
  { id: 'matriculado', label: 'Soy matriculado/a del CPCE Chubut', description: 'Buscá tu nombre o matrícula en el padrón.' },
  { id: 'estudiante', label: 'Soy estudiante', description: 'Contanos dónde y qué estás estudiando.' },
  { id: 'otro', label: 'Otro perfil', description: 'Profesional no matriculado u otra situación.' },
]

const normalize = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const toTitleCase = (value = '') => value.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { first_name: parts[0] || '', last_name: '' }
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts.at(-1) }
}

export default function ChatGptWorkRegistrationDraft() {
  const { selfRegister } = useStore()
  const [situation, setSituation] = useState('matriculado')
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', university: '', career: '', approvedSubjects: '', background: '', comments: '' })
  const [roster, setRoster] = useState([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState(false)
  const [rosterSearch, setRosterSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (situation !== 'matriculado' || roster.length || rosterLoading) return
    setRosterLoading(true)
    fetch(`${import.meta.env.BASE_URL}matriculados.json`)
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el padrón')
        return response.json()
      })
      .then((data) => setRoster(Array.isArray(data) ? data : []))
      .catch(() => setRosterError(true))
      .finally(() => setRosterLoading(false))
  }, [situation, roster.length, rosterLoading])

  const rosterResults = useMemo(() => {
    const query = normalize(rosterSearch.trim())
    if (query.length < 2 || selectedMember) return []
    return roster.filter((member) => {
      const fullName = `${member.apellido || ''} ${member.nombres || ''}`
      return normalize(fullName).includes(query) || String(member.matricula || '').includes(query)
    }).slice(0, 8)
  }, [roster, rosterSearch, selectedMember])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus({ type: '', message: '' })
  }

  function chooseMember(member) {
    const fullName = `${toTitleCase(member.nombres)}, ${toTitleCase(member.apellido)}`.replace(/^,\s*/, '')
    setSelectedMember(member)
    setRosterSearch(fullName)
    updateField('fullName', fullName)
  }

  function changeSituation(nextSituation) {
    setSituation(nextSituation)
    setSelectedMember(null)
    setRosterSearch('')
    setStatus({ type: '', message: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (situation === 'matriculado' && !selectedMember) {
      setStatus({ type: 'error', message: 'Seleccioná tu nombre en el padrón del CPCE Chubut para continuar.' })
      return
    }

    const person = selectedMember
      ? { first_name: toTitleCase(selectedMember.nombres), last_name: toTitleCase(selectedMember.apellido) }
      : splitFullName(form.fullName)

    if (!person.first_name || !person.last_name) {
      setStatus({ type: 'error', message: 'Ingresá tu nombre y apellido completos.' })
      return
    }

    setSubmitting(true)
    setStatus({ type: '', message: '' })
    const surveyResponses = {
      situacion_actual: situation,
      matriculado_cpcech: situation === 'matriculado' ? 'Sí' : 'No',
      matricula: selectedMember?.matricula || null,
      tomo: selectedMember?.tomo || null,
      folio: selectedMember?.folio || null,
      delegacion: selectedMember?.delegacion || null,
      universidad: situation === 'estudiante' ? form.university.trim() : null,
      carrera: situation === 'estudiante' ? form.career.trim() : null,
      materias_aprobadas: situation === 'estudiante' && form.approvedSubjects !== '' ? Number(form.approvedSubjects) : null,
      perfil: situation === 'otro' ? form.background.trim() : null,
      comentarios: form.comments.trim() || null,
    }

    const result = await selfRegister(EVENT_SLUG, {
      ...person,
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.comments.trim() || null,
      attendance_mode: 'virtual',
      selected_date: '2026-09-15',
      survey_responses: surveyResponses,
    })
    setSubmitting(false)

    if (result.success) {
      setStatus({ type: 'success', message: 'Tu inscripción quedó confirmada. Te vamos a contactar con las indicaciones para participar.' })
      return
    }
    setStatus({ type: 'error', message: result.error || 'No pudimos procesar la inscripción. Intentá nuevamente.' })
  }

  return (
    <main className="work-registration">
      <header className="work-registration__header">
        <a href="/brochure/chatgpt-work" className="work-registration__back">← Volver al programa</a>
        <span>CHATGPT WORK · INSCRIPCIÓN</span>
      </header>

      <section className="work-registration__hero">
        <p className="work-registration__eyebrow">INSCRIPCIÓN ABIERTA</p>
        <h1>Reservá tu lugar<br /><em>para trabajar con agentes.</em></h1>
        <p>Dos jornadas virtuales para conocer, configurar y aplicar ChatGPT Work a situaciones profesionales concretas.</p>
      </section>

      <section className="work-registration__content" aria-label="Formulario de inscripción">
        <aside className="work-registration__summary">
          <p>CHATGPT WORK</p>
          <h2>De 0 a 100</h2>
          <div className="work-registration__facts">
            <div><strong>15 · 16</strong><span>septiembre</span></div>
            <div><strong>18 h</strong><span>inicio</span></div>
            <div><strong>6 h</strong><span>totales</span></div>
          </div>
          <div className="work-registration__summary-note">
            <span>01</span><p>Modalidad virtual · 18:00 a 20:30 ambos días.</p>
            <span>02</span><p>Sin cargo para matriculados CPCE Chubut y estudiantes de Ciencias Económicas.</p>
            <span>03</span><p>Arancel para externos: $115.000.</p>
          </div>
        </aside>

        <form className="work-registration__form" onSubmit={handleSubmit}>
          <section className="work-registration__step">
            <div className="work-registration__step-head"><span>01</span><div><h2>Datos de contacto</h2><p>Usaremos estos datos para confirmar tu inscripción y comunicarnos con vos.</p></div></div>
            <div className="work-registration__fields">
              <label>Nombre y apellido<input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Como figura habitualmente" required /></label>
              <label>Email<input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" placeholder="nombre@email.com" required /></label>
              <label className="work-registration__field-full">Teléfono<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} type="tel" placeholder="Código de área y número" required /></label>
            </div>
          </section>

          <section className="work-registration__step">
            <div className="work-registration__step-head"><span>02</span><div><h2>Situación actual</h2><p>Elegí la opción que mejor describe tu situación hoy.</p></div></div>
            <div className="work-registration__choices">
              {situations.map((item) => <label className={`work-registration__choice ${situation === item.id ? 'is-selected' : ''}`} key={item.id}>
                <input type="radio" name="situation" value={item.id} checked={situation === item.id} onChange={() => changeSituation(item.id)} />
                <span><strong>{item.label}</strong><small>{item.description}</small></span><i aria-hidden="true" />
              </label>)}
            </div>

            {situation === 'matriculado' && <div className="work-registration__conditional">
              <label>Buscar en el padrón del CPCE Chubut<input value={rosterSearch} onChange={(event) => { setSelectedMember(null); setRosterSearch(event.target.value) }} placeholder="Escribí tu nombre o matrícula" required /></label>
              {rosterLoading && <p>Cargando padrón…</p>}
              {rosterError && <p>No pudimos cargar el padrón. Probá recargar la página.</p>}
              {rosterResults.length > 0 && <div className="work-registration__roster-results">{rosterResults.map((member) => <button type="button" key={`${member.matricula}-${member.apellido}`} onClick={() => chooseMember(member)}><strong>{toTitleCase(member.apellido)}, {toTitleCase(member.nombres)}</strong><span>Matrícula {member.matricula}</span></button>)}</div>}
              {selectedMember && <p className="work-registration__selected-member">✓ Matrícula {selectedMember.matricula} seleccionada.</p>}
            </div>}

            {situation === 'estudiante' && <div className="work-registration__conditional work-registration__fields">
              <label>Universidad o institución<input value={form.university} onChange={(event) => updateField('university', event.target.value)} placeholder="Ej.: Universidad Nacional..." required /></label>
              <label>Carrera<input value={form.career} onChange={(event) => updateField('career', event.target.value)} placeholder="Ej.: Contador Público" required /></label>
              <label className="work-registration__field-full">Cantidad de materias aprobadas<input value={form.approvedSubjects} onChange={(event) => updateField('approvedSubjects', event.target.value)} type="number" min="0" placeholder="0" required /></label>
            </div>}

            {situation === 'otro' && <div className="work-registration__conditional"><label>Actividad, profesión o vínculo con la temática<input value={form.background} onChange={(event) => updateField('background', event.target.value)} placeholder="Contanos brevemente tu perfil" required /></label></div>}
          </section>

          <section className="work-registration__step work-registration__step--last">
            <div className="work-registration__step-head"><span>03</span><div><h2>Comentarios o consultas</h2><p>Opcional. Podés dejar una pregunta o necesidad particular sobre el taller.</p></div></div>
            <label className="work-registration__textarea">Comentarios<textarea value={form.comments} onChange={(event) => updateField('comments', event.target.value)} rows="5" placeholder="Escribí tu comentario acá" /></label>
            <label className="work-registration__consent"><input type="checkbox" required /><span>Confirmo que los datos informados son correctos y acepto ser contactado/a por información vinculada al taller.</span></label>
          </section>

          {status.message && <p className={`work-registration__notice work-registration__notice--${status.type}`} role="status">{status.message}</p>}
          <button type="submit" className="work-registration__submit" disabled={submitting}>{submitting ? 'Confirmando inscripción…' : <>Confirmar inscripción <span>→</span></>}</button>
        </form>
      </section>
    </main>
  )
}
