import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { formatArsPrice, getApplicablePriceTier, getArgentinaDateKey, getPriceAmount } from '../../lib/eventPricing'
import { AI_TOOLS, ARGENTINA_PROVINCES, DOCUMENT_TYPES, MAX_DOCUMENT_SIZE, REGISTRATION_DOCUMENT_BUCKET } from '../../lib/novemberRegistration'
import './novemberWorkshopRegistration.css'

function Field({ label, children, optional = false }) {
  return <div><label className="block text-sm font-bold mb-2">{label}{optional ? ' (opcional)' : ' *'}{children}</label></div>
}

function DocumentPicker({ label, onChange, multiple = false, disabled = false, buttonLabel = 'Agregar archivo', children }) {
  const inputRef = useRef(null)
  return <div>
    <p className="text-sm font-bold mb-3">{label} *</p>
    <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50">
      <span aria-hidden="true" className="material-symbols-outlined text-xl">attach_file</span>{buttonLabel}
    </button>
    <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple={multiple} disabled={disabled} onChange={onChange} aria-label={label} className="hidden" />
    <p className="text-xs text-gray-500 mt-2">{children}</p>
  </div>
}

export default function NovemberWorkshopRegistration({ event, registrations }) {
  const navigate = useNavigate()
  const selfRegister = useStore(state => state.selfRegister)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', province: 'Chubut', city: '', occupation: '', ai_tools: [], ai_other: '', paid_ai_subscription: '', student_discount: false })
  const [receipts, setReceipts] = useState([])
  const [certificate, setCertificate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dateKey, setDateKey] = useState(getArgentinaDateKey)
  const [uploaded, setUploaded] = useState({})
  const [uploadFolder] = useState(() => crypto.randomUUID())
  useEffect(() => { const timer = setInterval(() => setDateKey(getArgentinaDateKey()), 30000); return () => clearInterval(timer) }, [])
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const currentTier = getApplicablePriceTier(event.prices, dateKey)
  const upcomingTier = [...(event.prices || [])].sort((a, b) => a.start_date.localeCompare(b.start_date)).find(tier => tier.start_date > dateKey)
  const shownTier = currentTier || upcomingTier
  const baseAmount = shownTier ? getPriceAmount(shownTier.price) : 0
  const amount = form.student_discount ? baseAmount / 2 : baseAmount
  const capacity = Number(event.max_capacity_virtual)
  const capacityFull = event.max_capacity_virtual !== null && event.max_capacity_virtual !== undefined && event.max_capacity_virtual !== '' && registrations.filter(r => r.attendance_mode === 'virtual').length >= capacity
  const lastDate = [...(event.offered_dates || [event.event_date])].sort().at(-1)
  const available = event.status === 'published' && event.registrations_open !== false && ['self', 'both'].includes(event.registration_mode) && dateKey <= lastDate && !capacityFull
  const openingDateLabel = upcomingTier ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' }).format(new Date(`${upcomingTier.start_date}T12:00:00`)) : ''
  const availabilityMessage = !available
    ? (capacityFull ? 'Los cupos virtuales están completos.' : 'Este evento no acepta inscripciones en este momento.')
    : !currentTier
      ? (upcomingTier ? `La inscripción abre el ${openingDateLabel} de 2026. Podrás confirmar a partir de esa fecha.` : 'No hay un arancel de inscripción disponible para la fecha actual.')
      : ''

  const validateFile = file => {
    if (!DOCUMENT_TYPES.includes(file.type)) throw new Error('Elegí archivos PDF, JPG, PNG o WEBP.')
    if (file.size > MAX_DOCUMENT_SIZE) throw new Error('Cada archivo puede pesar hasta 5 MB.')
  }
  const chooseReceipts = event => {
    try {
      const next = [...receipts, ...Array.from(event.target.files || [])]
      if (next.length > 2) throw new Error('Podés adjuntar hasta dos comprobantes de pago.')
      next.forEach(validateFile)
      setReceipts(next); setError('')
    } catch (err) { setError(err.message) }
    event.target.value = ''
  }
  const chooseCertificate = event => {
    try { const file = event.target.files?.[0]; if (file) { validateFile(file); setCertificate(file); setError('') } } catch (err) { setError(err.message) }
    event.target.value = ''
  }
  const toggleTool = tool => update('ai_tools', form.ai_tools.includes(tool) ? form.ai_tools.filter(item => item !== tool) : tool === 'No uso ninguna' ? [tool] : [...form.ai_tools.filter(item => item !== 'No uso ninguna'), tool])

  const upload = async (file, kind) => {
    const key = `${kind}:${file.name}:${file.size}:${file.lastModified}`
    if (uploaded[key]) return uploaded[key]
    const extensions = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const path = `${event.id}/${uploadFolder}/${kind}-${crypto.randomUUID()}.${extensions[file.type]}`
    const { error: uploadError } = await supabase.storage.from(REGISTRATION_DOCUMENT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw new Error('No se pudo adjuntar el archivo. Intentá nuevamente antes de confirmar la inscripción.')
    const document = { bucket: REGISTRATION_DOCUMENT_BUCKET, path, name: file.name, kind }
    setUploaded(previous => ({ ...previous, [key]: document }))
    return document
  }
  const submit = async eventForm => {
    eventForm.preventDefault(); setError('')
    const today = getArgentinaDateKey()
    const tier = getApplicablePriceTier(event.prices, today)
    if (!available || !tier) { setError('La inscripción no está disponible para esta fecha.'); return }
    if (today !== dateKey) { setDateKey(today); setError('Cambió el tramo de inscripción. Revisá el importe actualizado antes de confirmar.'); return }
    if (!receipts.length) { setError('Adjuntá al menos un comprobante de pago antes de confirmar.'); return }
    if (form.student_discount && !certificate) { setError('Para solicitar el 50% de descuento, adjuntá tu certificado de alumno regular.'); return }
    setBusy(true)
    try {
      const documents = []
      for (const file of receipts) documents.push(await upload(file, 'payment_receipt'))
      if (form.student_discount) documents.push(await upload(certificate, 'student_certificate'))
      const result = await selfRegister(event.slug, {
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), phone: form.phone.trim(), telegram: form.city.trim(), attendance_mode: 'virtual',
        survey_responses: {
          registration_schema: 'workshop_november_2026', profesion: form.occupation.trim(), provincia: form.province, ciudad: form.city.trim(),
          herramientas_ia: form.ai_tools, otra_herramienta_ia: form.ai_tools.includes('Otra') ? form.ai_other.trim() : '', suscripcion_ia_paga: form.paid_ai_subscription,
          student_discount_requested: form.student_discount, student_discount_percent: form.student_discount ? 50 : 0,
          pricing_mode: 'date', price_concept: tier.concept, price_base_amount: getPriceAmount(tier.price), price_amount: amount, price_applied_date: today,
          payment_review_status: 'pending', documents,
        },
      })
      if (!result.success) throw new Error(result.error)
      navigate(`/evento/${event.slug}/confirmacion`, { state: { paymentReviewPending: true } })
    } catch (err) { setError(err.message || 'No se pudo completar la inscripción. Intentá nuevamente.') } finally { setBusy(false) }
  }

  return <div className="november-registration min-h-screen bg-[var(--color-refined-gray)]">
    <header className="glass-nav sticky top-0 z-30"><div className="max-w-2xl mx-auto px-6 flex items-center h-16"><Link to={`/evento/${event.slug}`} className="font-semibold text-sm">← Volver al evento</Link></div></header>
    <main className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold text-[var(--color-deep-green)] mb-3">Inscripción al taller</h1>
      <h2 className="font-bold mb-3">{event.title}</h2>
      {(event.official_banner_url || event.banner_url) && <img src={event.official_banner_url || event.banner_url} alt={event.title} className="w-full h-auto rounded-xl mb-6" />}
      <p className="november-registration__description text-sm leading-relaxed mb-6">Tres jornadas en modalidad online, 7 horas en total: 11 y 12 de noviembre, de 14 a 17 h; 13 de noviembre, de 14 a 15 h. Recorrido por ChatGPT Work, caso práctico y consultas. Tu inscripción incluye los tres encuentros y las grabaciones. Te recomendamos tener la aplicación de escritorio instalada, con una cuenta gratuita o paga.</p>
      <form onSubmit={submit} className="card p-4 sm:p-6 space-y-6">
        <fieldset disabled={busy} className="november-registration__section november-registration__section--data space-y-5">
          <legend className="text-lg font-bold mb-4">Tus datos</legend>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Nombre"><input required maxLength={100} className="form-input mt-2" value={form.first_name} onChange={e => update('first_name', e.target.value)} autoComplete="given-name" /></Field>
            <Field label="Apellido"><input required maxLength={100} className="form-input mt-2" value={form.last_name} onChange={e => update('last_name', e.target.value)} autoComplete="family-name" /></Field>
          </div>
          <Field label="Email"><input required type="email" className="form-input mt-2" value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></Field>
          <Field label="Teléfono"><input required type="tel" className="form-input mt-2" value={form.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" /></Field>
          <Field label="Provincia de residencia"><select required className="form-input mt-2" value={form.province} onChange={e => update('province', e.target.value)}>{ARGENTINA_PROVINCES.map(province => <option key={province}>{province}</option>)}</select></Field>
          <Field label="Ciudad de residencia" optional><input className="form-input mt-2" maxLength={150} placeholder="Ej: Comodoro Rivadavia" value={form.city} onChange={e => update('city', e.target.value)} autoComplete="address-level2" /></Field>
          <Field label="Ocupación actual"><input required className="form-input mt-2" maxLength={200} placeholder="Contanos a qué te dedicás" value={form.occupation} onChange={e => update('occupation', e.target.value)} /></Field>
        </fieldset>
        <fieldset disabled={busy} className="november-registration__section november-registration__section--experience space-y-5">
          <legend className="text-lg font-bold">Tu experiencia con IA (opcional)</legend>
          <p className="text-sm text-gray-600">Estas dos preguntas nos ayudan a preparar las actividades. Podés dejarlas sin responder.</p>
          <fieldset><legend className="text-sm font-bold mb-3">¿Qué herramientas o aplicaciones de inteligencia artificial usás?</legend><div className="grid sm:grid-cols-2 gap-3">{AI_TOOLS.map(tool => <label key={tool} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ai_tools.includes(tool)} onChange={() => toggleTool(tool)} />{tool}</label>)}</div>{form.ai_tools.includes('Otra') && <input aria-label="Otra herramienta de IA" className="form-input mt-3" maxLength={150} placeholder="¿Cuál?" value={form.ai_other} onChange={e => update('ai_other', e.target.value)} />}</fieldset>
          <Field label="¿Tenés alguna suscripción paga a una herramienta de IA?" optional><select className="form-input mt-2" value={form.paid_ai_subscription} onChange={e => update('paid_ai_subscription', e.target.value)}><option value="">Prefiero no responder</option><option>Sí</option><option>No, uso versiones gratuitas</option><option>No uso herramientas de IA</option></select></Field>
        </fieldset>
        <fieldset disabled={busy} className="november-registration__section november-registration__section--payment space-y-5">
          <legend className="text-lg font-bold">Arancel y comprobantes</legend>
          <div className="rounded-xl bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/20 p-5" aria-live="polite">
            <p className="font-semibold">{currentTier ? 'Importe a transferir según la fecha de inscripción' : 'Importe al abrir la inscripción'}</p>
            {shownTier && <><p className="text-3xl font-extrabold text-[var(--color-deep-green)] my-2">{formatArsPrice(amount)}</p><p className="text-sm">{shownTier.concept}{form.student_discount && ' · con 50% de descuento'}</p>{!currentTier && <p className="text-sm mt-2">La inscripción abre el 15 de octubre de 2026.</p>}</>}
            <ul className="text-sm space-y-1 mt-4">{event.prices.map(tier => <li key={tier.start_date}>{tier.start_date === '2026-10-15' ? '15–31 de octubre' : tier.start_date === '2026-11-01' ? '1–8 de noviembre' : 'Desde el 9 de noviembre'}: {formatArsPrice(getPriceAmount(tier.price) * (form.student_discount ? .5 : 1))}</li>)}</ul>
            {form.student_discount && <p className="text-sm mt-3">El beneficio requiere certificado de alumno regular y queda sujeto a su revisión.</p>}
          </div>
          {event.payment_methods && <div><h3 className="font-bold text-sm mb-2">Datos para la transferencia</h3><p className="text-sm whitespace-pre-line rounded-xl bg-gray-50 p-4">{event.payment_methods}</p></div>}
          <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={form.student_discount} onChange={e => update('student_discount', e.target.checked)} /><span><strong>Solicito el 50% de descuento para estudiantes.</strong><br />Soy alumno regular de Ciencias Económicas de la Facultad de Ciencias Económicas de la UNPSJB, en cualquiera de sus delegaciones.</span></label>
          <DocumentPicker label="Comprobantes de pago" multiple disabled={busy || receipts.length >= 2} onChange={chooseReceipts} buttonLabel={receipts.length ? 'Agregar otro archivo' : 'Agregar archivo'}>Uno o dos archivos. PDF, JPG, PNG o WEBP · hasta 5 MB cada uno.</DocumentPicker>
          {receipts.length > 0 && <p className="text-sm font-semibold text-[var(--color-deep-green)]">{receipts.length} de 2 archivos agregados.</p>}
          {receipts.map((file, index) => <div className="flex items-center gap-3 justify-between text-sm" key={`${file.name}-${index}`}><span className="break-all">{file.name}</span><button type="button" className="font-bold text-red-700" onClick={() => setReceipts(items => items.filter((_, i) => i !== index))}>Quitar</button></div>)}
          {form.student_discount && <div><DocumentPicker label="Certificado de alumno regular" disabled={busy} onChange={chooseCertificate} buttonLabel={certificate ? 'Cambiar archivo' : 'Agregar archivo'}>Adjuntalo además del comprobante de pago para solicitar el beneficio.</DocumentPicker>{certificate && <p className="text-sm mt-3 break-all">{certificate.name} <button type="button" className="font-bold text-red-700 ml-2" onClick={() => setCertificate(null)}>Quitar</button></p>}</div>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
        {availabilityMessage && <p id="registration-availability" role="status" className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 p-4 rounded-xl">{availabilityMessage}</p>}
        {shownTier && <p className="text-sm font-bold text-[var(--color-deep-green)]">{currentTier ? 'Importe a transferir' : `Arancel desde el ${openingDateLabel}`}: {formatArsPrice(amount)}</p>}
        <p className="text-xs text-gray-600">Al confirmar, enviaremos tus comprobantes para revisión. El envío de la inscripción no acredita por sí solo el pago ni el beneficio estudiantil.</p>
        <button disabled={busy || !available || !currentTier} aria-describedby={availabilityMessage ? 'registration-availability' : undefined} className="btn-primary w-full justify-center disabled:opacity-50" type="submit">{busy ? 'Adjuntando archivos y registrando…' : !available ? 'Inscripción no disponible' : !currentTier && upcomingTier ? `Inscripción desde el ${openingDateLabel}` : 'Confirmar inscripción'}</button>
      </form>
    </main>
  </div>
}
