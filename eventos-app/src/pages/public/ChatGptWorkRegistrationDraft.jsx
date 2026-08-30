import { Fragment, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import './chatGptWorkRegistrationDraft.css'

const EVENT_SLUG = 'chatgpt-work-de-0-a-100'

const situations = [
  { id: 'matriculado', label: 'Soy matriculado/a del CPCE Chubut', description: 'Buscá tu nombre o matrícula en el padrón.' },
  { id: 'estudiante', label: 'Soy estudiante', description: 'Estudiantes de Ciencias Económicas de la UNPSJB.' },
  { id: 'otro', label: 'Otro perfil', description: 'Profesional no matriculado u otra situación.' },
]

const delegations = ['Delegación Comodoro Rivadavia', 'Delegación Trelew', 'Delegación Puerto Madryn', 'Delegación Esquel']
const professions = ['Contador/a Público/a', 'Licenciado/a en Administración', 'Licenciado/a en Economía']

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
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', delegation: '', profession: '', university: '', career: '', approvedSubjects: '', background: '', comments: '' })
  const [roster, setRoster] = useState([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState(false)
  const [rosterSearch, setRosterSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('')
  const [paymentReceiptName, setPaymentReceiptName] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

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
    setForm((current) => ({
      ...current,
      fullName,
      delegation: delegations.find((item) => normalize(item).includes(normalize(member.delegacion || ''))) || current.delegation,
    }))
    setStatus({ type: '', message: '' })
  }

  function changeSituation(nextSituation) {
    setSituation(nextSituation)
    setSelectedMember(null)
    setRosterSearch('')
    setPaymentReceiptUrl('')
    setPaymentReceiptName('')
    setStatus({ type: '', message: '' })
  }

  async function handleReceiptUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!acceptedTypes.includes(file.type)) {
      setStatus({ type: 'error', message: 'El comprobante debe ser una imagen JPG, PNG, WEBP o un archivo PDF.' })
      event.target.value = ''
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'El comprobante no puede superar los 8 MB.' })
      event.target.value = ''
      return
    }

    setUploadingReceipt(true)
    setStatus({ type: '', message: '' })
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const fileName = `receipts/chatgpt-work/receipt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`
      const { error } = await supabase.storage.from('banners').upload(fileName, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('banners').getPublicUrl(fileName)
      setPaymentReceiptUrl(data.publicUrl)
      setPaymentReceiptName(file.name)
    } catch (error) {
      setPaymentReceiptUrl('')
      setPaymentReceiptName('')
      setStatus({ type: 'error', message: `No pudimos subir el comprobante: ${error.message || error}` })
    } finally {
      setUploadingReceipt(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (situation === 'matriculado' && !selectedMember) {
      setStatus({ type: 'error', message: 'Seleccioná tu nombre en el padrón del CPCE Chubut para continuar.' })
      return
    }
    if (situation === 'matriculado' && (!form.delegation || !form.profession)) {
      setStatus({ type: 'error', message: 'Seleccioná tu delegación y tu título profesional para continuar.' })
      return
    }
    if (situation === 'otro' && !paymentReceiptUrl) {
      setStatus({ type: 'error', message: 'Adjuntá el comprobante de pago para confirmar la inscripción.' })
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
      delegacion: situation === 'matriculado' ? form.delegation : null,
      titulo_profesional: situation === 'matriculado' ? form.profession : null,
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
      payment_receipt_url: situation === 'otro' ? paymentReceiptUrl : null,
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
      <section className="work-registration__hero">
        <div className="work-registration__hero-nav">
          <a href="/brochure/chatgpt-work" className="work-registration__back">← Volver al programa</a>
          <span>CHATGPT WORK · INSCRIPCIÓN</span>
        </div>
        <div className="work-registration__hero-grid">
          <div className="work-registration__hero-copy">
            <p className="work-registration__eyebrow">15 Y 16 DE SEPTIEMBRE · MODALIDAD ZOOM</p>
            <h1>Completá tu<br /><em>inscripción.</em></h1>
            <p>Dejanos tus datos para reservar tu lugar en las dos jornadas de ChatGPT Work: de 0 a 100.</p>
          </div>
          <div className="work-registration__hero-visual" aria-hidden="true">
            <div className="work-registration__orbit work-registration__orbit--one" />
            <div className="work-registration__orbit work-registration__orbit--two" />
            <div className="work-registration__node work-registration__node--one">01</div>
            <div className="work-registration__node work-registration__node--two">02</div>
            <div className="work-registration__node work-registration__node--three">IA</div>
            <strong>15—16</strong>
            <span>SEP · 2026</span>
          </div>
        </div>
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
            <span>02</span><p>Sin cargo para matriculados CPCE Chubut y estudiantes de Ciencias Económicas de la UNPSJB.</p>
            <span>03</span><p>Arancel para otros perfiles: $105.000.</p>
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
              {situations.map((item) => <Fragment key={item.id}>
                <label className={`work-registration__choice ${situation === item.id ? 'is-selected' : ''}`}>
                  <input type="radio" name="situation" value={item.id} checked={situation === item.id} onChange={() => changeSituation(item.id)} />
                  <span><strong>{item.label}</strong><small>{item.description}</small></span><i aria-hidden="true" />
                </label>

                {situation === 'matriculado' && item.id === 'matriculado' && <div className="work-registration__conditional work-registration__conditional--roster">
                  <label>Buscar en el padrón del CPCE Chubut<input value={rosterSearch} onChange={(event) => { setSelectedMember(null); setRosterSearch(event.target.value) }} placeholder="Escribí tu nombre o matrícula" required /></label>
                  {rosterLoading && <p>Cargando padrón…</p>}
                  {rosterError && <p>No pudimos cargar el padrón. Probá recargar la página.</p>}
                  {rosterResults.length > 0 && <div className="work-registration__roster-results">{rosterResults.map((member) => <button type="button" key={`${member.matricula}-${member.apellido}`} onClick={() => chooseMember(member)}><strong>{toTitleCase(member.apellido)}, {toTitleCase(member.nombres)}</strong><span>Matrícula {member.matricula}</span></button>)}</div>}
                  {selectedMember && <>
                    <p className="work-registration__selected-member">✓ Matrícula {selectedMember.matricula} seleccionada.</p>
                    <div className="work-registration__fields work-registration__professional-fields">
                      <label>Delegación<select value={form.delegation} onChange={(event) => updateField('delegation', event.target.value)} required><option value="">Seleccioná una delegación</option>{delegations.map((delegation) => <option value={delegation} key={delegation}>{delegation}</option>)}</select></label>
                      <label>Título profesional<select value={form.profession} onChange={(event) => updateField('profession', event.target.value)} required><option value="">Seleccioná tu título</option>{professions.map((profession) => <option value={profession} key={profession}>{profession}</option>)}</select></label>
                    </div>
                  </>}
                </div>}

                {situation === 'estudiante' && item.id === 'estudiante' && <div className="work-registration__conditional work-registration__fields">
                  <label>Universidad o institución<input value={form.university} onChange={(event) => updateField('university', event.target.value)} placeholder="Ej.: Universidad Nacional..." required /></label>
                  <label>Carrera<input value={form.career} onChange={(event) => updateField('career', event.target.value)} placeholder="Ej.: Contador Público" required /></label>
                  <label className="work-registration__field-full">Cantidad de materias aprobadas<input value={form.approvedSubjects} onChange={(event) => updateField('approvedSubjects', event.target.value)} type="number" min="0" placeholder="0" required /></label>
                </div>}

                {situation === 'otro' && item.id === 'otro' && <div className="work-registration__conditional work-registration__conditional--payment">
                  <label>Actividad, profesión o vínculo con la temática<input value={form.background} onChange={(event) => updateField('background', event.target.value)} placeholder="Contanos brevemente tu perfil" required /></label>
                  <div className="work-registration__fee"><span>ARANCEL</span><strong>$105.000</strong><p>Para completar la inscripción, adjuntá el comprobante del pago realizado.</p></div>
                  <label className={`work-registration__upload ${paymentReceiptUrl ? 'is-uploaded' : ''}`}>
                    <span>{uploadingReceipt ? 'Subiendo comprobante…' : paymentReceiptName || 'Adjuntar comprobante de pago'}</span>
                    <small>{paymentReceiptUrl ? 'Archivo cargado correctamente' : 'JPG, PNG, WEBP o PDF · máximo 8 MB'}</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleReceiptUpload} disabled={uploadingReceipt} required={!paymentReceiptUrl} />
                  </label>
                </div>}
              </Fragment>)}
            </div>
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

      <footer className="work-registration__footer">
        <div><img src="/logo_triskel.png" alt="" /><strong>Lic. Adm. Leandro Velasques</strong><span>MP Tomo III – Folio 58</span></div>
        <a href="https://www.leandrovelasques.com.ar">www.leandrovelasques.com.ar</a>
      </footer>
    </main>
  )
}
