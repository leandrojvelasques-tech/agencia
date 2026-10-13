import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatArsPrice } from '../lib/eventPricing'
import { REGISTRATION_DOCUMENT_BUCKET } from '../lib/novemberRegistration'

export default function NovemberRegistrationDetails({ responses }) {
  const [links, setLinks] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const openDocument = async document => {
    setBusy(document.path); setError('')
    const { data, error: linkError } = await supabase.storage.from(REGISTRATION_DOCUMENT_BUCKET).createSignedUrl(document.path, 300)
    if (linkError) setError('No se pudo abrir el archivo. Revisá que hayas iniciado sesión con la cuenta de administración.')
    else { setLinks(previous => ({ ...previous, [document.path]: data.signedUrl })); window.open(data.signedUrl, '_blank', 'noopener,noreferrer') }
    setBusy('')
  }
  return <details className="mt-2 text-xs">
    <summary className="font-bold text-[var(--color-deep-green)] cursor-pointer">Ver datos, encuesta y comprobantes</summary>
    <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2 max-w-sm">
      <p><strong>Ocupación:</strong> {responses.profesion}</p>
      <p><strong>Residencia:</strong> {[responses.ciudad, responses.provincia].filter(Boolean).join(', ')}</p>
      <p><strong>Herramientas de IA:</strong> {responses.herramientas_ia?.join(', ') || 'Sin respuesta'}{responses.otra_herramienta_ia && ` (${responses.otra_herramienta_ia})`}</p>
      <p><strong>Suscripción paga:</strong> {responses.suscripcion_ia_paga || 'Sin respuesta'}</p>
      <p><strong>Arancel declarado:</strong> {formatArsPrice(responses.price_amount)} · {responses.price_applied_date}</p>
      <p><strong>Descuento estudiantil solicitado:</strong> {responses.student_discount_requested ? '50% · verificar certificado UNPSJB' : 'No'}</p>
      <p><strong>Pago:</strong> {responses.payment_review_status === 'pending' ? 'Pendiente de revisión' : responses.payment_review_status}</p>
      {(responses.documents || []).filter(document => document.bucket === REGISTRATION_DOCUMENT_BUCKET).map((document, index) => <div key={document.path} className="border-t pt-2">
        <p className="break-all">{document.kind === 'student_certificate' ? 'Certificado de alumno regular' : `Comprobante ${index + 1}`}: {document.name}</p>
        <button type="button" disabled={busy === document.path} onClick={() => openDocument(document)} className="font-bold underline text-[var(--color-deep-green)] mt-1">{busy === document.path ? 'Abriendo…' : 'Ver archivo'}</button>
        {links[document.path] && <a className="block underline mt-1" href={links[document.path]} target="_blank" rel="noopener noreferrer">Abrir archivo si no se abrió automáticamente</a>}
      </div>)}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
  </details>
}
