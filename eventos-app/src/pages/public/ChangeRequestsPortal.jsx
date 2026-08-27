import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { requestState } from '../../lib/changeRequests'

const REQUEST_CATEGORIES = { website: 'Sitio web', agenda: 'Agenda', crm: 'CRM', forms: 'Formularios', automation: 'Automatización', content: 'Contenido', design: 'Diseño', question: 'Consulta', other: 'Otro' }
const initialForm = { requester_name: '', requester_email: '', title: '', request_type: 'improvement', category: 'other', affected_area: '', description: '', expected_result: '', priority: 'normal' }

export default function ChangeRequestsPortal() {
  const { token } = useParams()
  const [client, setClient] = useState(null)
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState(initialForm)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('change-requests-portal', { body: { token, action: 'load' } })
    if (error || !data?.client) { setNotice({ type: 'error', text: data?.error || 'El enlace no es válido o ya no está disponible.' }); setLoading(false); return }
    setClient(data.client)
    setRequests(data.requests || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [token])

  const uploadFiles = async (requestId) => {
    const uploads = await Promise.all(files.map(async file => {
      const ext = file.name.split('.').pop()
      const { data: signature, error: signatureError } = await supabase.functions.invoke('change-requests-portal', { body: { token, action: 'sign-upload', requestId, extension: ext, size: file.size } })
      if (signatureError || !signature?.path || !signature?.token) throw new Error(signature?.error || signatureError?.message || 'No se pudo preparar el adjunto.')
      const { error } = await supabase.storage.from('change-request-files').uploadToSignedUrl(signature.path, signature.token, file, { contentType: file.type })
      if (error) throw error
      return { path: signature.path, name: file.name }
    }))
    return uploads
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.requester_name.trim() || !form.requester_email.trim() || !form.title.trim() || !form.description.trim()) { setNotice({ type: 'error', text: 'Completá tus datos, el título y la descripción del pedido.' }); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('change-requests-portal', { body: { token, action: 'create', request: form } })
      if (error || !data?.request) throw new Error(data?.error || error?.message || 'No se pudo crear la solicitud.')
      const attachments = files.length ? await uploadFiles(data.request.id) : []
      if (attachments.length) {
        const { data: attachData, error: attachError } = await supabase.functions.invoke('change-requests-portal', { body: { token, action: 'attach', requestId: data.request.id, attachments } })
        if (attachError || !attachData?.ok) throw new Error(attachData?.error || attachError?.message || 'No se pudieron asociar los adjuntos.')
      }
      setForm(initialForm); setFiles([]); setNotice({ type: 'success', text: 'Tu solicitud fue recibida. Te avisaremos cuando comencemos a trabajarla.' }); load()
    } catch (error) { setNotice({ type: 'error', text: `No pudimos guardar la solicitud: ${error.message}` }) } finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-[var(--color-refined-gray)] text-[var(--color-deep-green)] font-bold">Cargando solicitudes…</div>
  if (!client) return <div className="min-h-screen grid place-items-center p-6 text-center">{notice?.text}</div>

  return <div className="min-h-screen bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)] pb-16">
    <header className="bg-white border-b border-black/5 px-6 py-4"><div className="max-w-5xl mx-auto flex justify-between items-center gap-4"><div className="flex items-center gap-3"><img src="/logo_triskel.png" alt="Leandro Velasques" className="h-8 w-8 object-contain" style={{ mixBlendMode: 'multiply' }} /><div><p className="text-xs font-extrabold text-[var(--color-deep-green)]">LEANDRO VELASQUES</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">Solicitudes de cambio</p></div></div><Link to={`/crm/cliente/${token}`} className="text-xs font-bold text-[var(--color-deep-green)] hover:underline">Volver al portal</Link></div></header>
    <main className="max-w-5xl mx-auto px-6 py-9 space-y-8">
      <div className="flex items-center gap-4"><ClientLogo client={client} /><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/60">{client.company || client.name}</p><h1 className="text-3xl font-extrabold text-[var(--color-deep-green)] mt-1">Solicitá un cambio</h1><p className="text-sm text-gray-500 mt-2 max-w-2xl">Describí qué necesitás y, si podés, adjuntá capturas. Vamos a revisar tu pedido antes de iniciarlo.</p></div></div>
      {notice && <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>{notice.text}</div>}
      <form onSubmit={submit} className="bg-white border border-black/5 shadow-sm rounded-3xl p-6 md:p-8 space-y-5">
        <div className="grid md:grid-cols-2 gap-5"><Field label="Tu nombre *"><input required value={form.requester_name} onChange={e => setForm({ ...form, requester_name: e.target.value })} autoComplete="name" /></Field><Field label="Tu correo *"><input required type="email" value={form.requester_email} onChange={e => setForm({ ...form, requester_email: e.target.value })} autoComplete="email" /></Field></div>
        <div className="grid md:grid-cols-2 gap-5"><Field label="Título del pedido *"><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej.: Actualizar botón de contacto" /></Field><Field label="Sitio, pantalla o sección"><input value={form.affected_area} onChange={e => setForm({ ...form, affected_area: e.target.value })} placeholder="Ej.: Inicio / formulario de contacto" /></Field></div>
        <div className="grid md:grid-cols-3 gap-5"><Field label="Temática"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.entries(REQUEST_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Tipo de pedido"><select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })}><option value="improvement">Mejora</option><option value="correction">Corrección</option><option value="new_feature">Nueva funcionalidad</option><option value="question">Consulta</option></select></Field><Field label="Urgencia percibida"><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option></select></Field></div>
        <Field label="¿Qué sucede hoy y qué necesitás cambiar? *"><textarea required rows="5" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Contanos el contexto y qué problema te genera." /></Field>
        <Field label="¿Cómo esperás que funcione o se vea?"><textarea rows="3" value={form.expected_result} onChange={e => setForm({ ...form, expected_result: e.target.value })} placeholder="Ej.: Que el botón redirija a WhatsApp con un mensaje precargado." /></Field>
        <Field label="Capturas o archivos"><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple onChange={e => { const selected = Array.from(e.target.files || []); const valid = selected.filter(file => file.size <= 10 * 1024 * 1024).slice(0, 8); setFiles(valid); if (valid.length !== selected.length) setNotice({ type: 'error', text: 'Podés adjuntar hasta 8 imágenes o PDF de un máximo de 10 MB cada uno.' }) }} /><p className="text-xs text-gray-400 mt-1">Hasta 8 imágenes o PDF de 10 MB cada uno. {files.length ? `${files.length} archivo(s) seleccionado(s).` : ''}</p></Field>
        <div className="pt-2 flex justify-end"><button disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enviando…' : 'Enviar solicitud'} <span className="material-symbols-outlined text-lg">send</span></button></div>
      </form>
      <section><div className="flex items-end justify-between mb-4"><div><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Seguimiento</p><h2 className="text-xl font-extrabold text-[var(--color-deep-green)]">Tus solicitudes</h2></div><span className="text-sm font-bold text-gray-400">{requests.length}</span></div>{requests.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center text-sm text-gray-400 border border-black/5">Todavía no registraste solicitudes.</div> : <div className="space-y-3">{requests.map(item => { const state = requestState(item.status); return <article key={item.id} className="bg-white rounded-2xl border border-black/5 p-5 flex flex-col md:flex-row md:items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2 mb-2"><span className="inline-flex rounded-full bg-[var(--color-deep-green)] text-white px-2.5 py-1 text-xs font-extrabold tracking-wide">{item.request_code || 'Sin código'}</span><span className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-bold ${state.className}`}><span className="material-symbols-outlined text-sm">{state.icon}</span>{state.label}</span><span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('es-AR')}</span></div><h3 className="font-extrabold text-[var(--color-dark-gray)]">{item.title}</h3><p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</p>{item.attachments?.length > 0 && <div className="flex gap-2 flex-wrap mt-3">{item.attachments.map((attachment, index) => attachment.url && <a key={index} href={attachment.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--color-deep-green)] bg-[var(--color-mint)]/30 px-2.5 py-1 rounded-lg">{attachment.name || `Adjunto ${index + 1}`}</a>)}</div>}{item.client_note && <p className="mt-3 text-sm bg-[var(--color-refined-gray)] rounded-xl p-3"><strong className="text-[var(--color-deep-green)]">Respuesta:</strong> {item.client_note}</p>}</div></article> })}</div>}</section>
    </main>
  </div>
}

function Field({ label, children }) { return <label className="block text-sm font-bold text-[var(--color-dark-gray)]">{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-gray-200 [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm">{children}</div></label> }

function ClientLogo({ client }) {
  const [failed, setFailed] = useState(false)
  const label = client.company || client.name || 'Cliente'
  if (!client.logo_url || failed) return <div className="shrink-0 h-20 w-20 rounded-2xl bg-white border border-[var(--color-deep-green)]/10 shadow-sm flex items-center justify-center text-2xl font-extrabold text-[var(--color-deep-green)]">{label.charAt(0).toUpperCase()}</div>
  return <div className="shrink-0 h-20 w-20 rounded-2xl bg-white border border-[var(--color-deep-green)]/10 shadow-sm p-2 flex items-center justify-center overflow-hidden"><img src={client.logo_url} alt={`Logo de ${label}`} onError={() => setFailed(true)} className="w-full h-full object-contain" /></div>
}
