import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const PRIORITIES = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' }
const emptyIntake = {
  current_issue: '', summary: '', requested_change: '', product_location: '', area: 'both',
  observed_by: '', intended_users: '', current_behavior: '', expected_behavior: '',
  resolution_criteria: '', reproduction_steps: '', evidence_description: '', scope_included: '',
  scope_excluded: '', dependencies: '', sensitive_data: 'no informado', source: '',
}
const emptySub = () => ({ id: crypto.randomUUID(), title: '', description: '', expected_result: '' })

export default function ChangeRequestCreate() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [clientMode, setClientMode] = useState('existing')
  const [clientName, setClientName] = useState('')
  const [form, setForm] = useState({ client_id: '', title: '', priority: 'normal' })
  const [intake, setIntake] = useState(emptyIntake)
  const [subRequests, setSubRequests] = useState([])
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    supabase.from('crm_clients').select('id, name, company').order('name').then(({ data }) => setClients(data || []))
  }, [])

  const selectedClient = clients.find(client => client.id === form.client_id)
  const clientLabel = clientMode === 'new' ? clientName.trim() : (selectedClient?.company || selectedClient?.name || 'Sin cliente seleccionado')
  const updateIntake = (field, value) => setIntake(current => ({ ...current, [field]: value }))
  const updateSub = (id, field, value) => setSubRequests(items => items.map(item => item.id === id ? { ...item, [field]: value } : item))

  const addFiles = event => {
    const selected = Array.from(event.target.files || [])
    const total = [...files, ...selected]
    const valid = total.filter(file => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE).slice(0, 8)
    if (valid.length !== total.length) setNotice({ type: 'error', text: 'Podés adjuntar hasta 8 imágenes o PDF de un máximo de 10 MB cada uno.' })
    setFiles(valid)
    event.target.value = ''
  }

  const fileToAttachment = file => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const validate = () => {
    if (!clientLabel || clientLabel === 'Sin cliente seleccionado') return 'Seleccioná un cliente o indicá su nombre.'
    if (!form.title.trim() || !intake.current_issue.trim() || !intake.summary.trim() || !intake.expected_behavior.trim()) return 'Completá título, qué ocurre, síntesis y comportamiento esperado.'
    if (!intake.scope_included.trim() && !intake.scope_excluded.trim()) return 'Indicá el alcance incluido o aclaralo como pendiente de definir.'
    return null
  }

  const save = async () => {
    const validationError = validate()
    if (validationError) { setNotice({ type: 'error', text: validationError }); setPreview(false); return }
    setSaving(true)
    try {
      const attachments = await Promise.all(files.map(fileToAttachment))
      const description = [`Qué ocurre:\n${intake.current_issue}`, `Síntesis:\n${intake.summary}`, `Qué debe cambiar:\n${intake.requested_change}`, `Alcance:\n${intake.scope_included || 'Pendiente de definir'}`, `Evidencia:\n${intake.evidence_description || (attachments.length ? 'Archivos adjuntos' : 'No disponible')}`, `Prioridad: ${PRIORITIES[form.priority]}`].join('\n\n')
      const payload = {
        client_id: clientMode === 'existing' ? form.client_id : null,
        title: form.title.trim(), description, affected_area: intake.product_location.trim(),
        category: 'other', request_type: 'improvement', priority: form.priority, status: 'initiated',
        billing_status: 'pending', internal_note: '', client_note: '', origin: 'admin', attachments,
        sub_requests: subRequests.map((item, index) => ({ position: index + 1, title: item.title.trim(), description: item.description.trim(), expected_result: item.expected_result.trim() })),
        intake_data: { ...intake, client_name: clientMode === 'new' ? clientName.trim() : null, client_mode: clientMode },
      }
      const { error } = await supabase.from('change_requests').insert(payload)
      if (error) throw error
      navigate('/admin/pedidos-cambios', { state: { notice: 'Solicitud creada en estado Iniciado.' } })
    } catch (error) {
      setNotice({ type: 'error', text: `No se pudo guardar: ${error.message}` })
      setSaving(false)
    }
  }

  return <div className="max-w-6xl mx-auto pb-12">
    <div className="flex items-start justify-between gap-4 mb-8">
      <div><Link to="/admin/pedidos-cambios" className="text-xs font-bold text-[var(--color-deep-green)] hover:underline">← Volver a pedidos de cambios</Link><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-deep-green)]/55 mt-5">Relevamiento de pedido web</p><h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--color-deep-green)]">Nueva solicitud</h1><p className="text-sm text-gray-500 mt-2 max-w-3xl">Completá el contexto del pedido y revisá la ficha antes de registrarla. El pedido se creará como <strong>Iniciado</strong> sólo después de tu confirmación.</p></div><div className="hidden sm:flex h-14 w-14 rounded-2xl bg-[var(--color-mint)]/45 items-center justify-center text-[var(--color-deep-green)]"><span className="material-symbols-outlined text-3xl">assignment</span></div>
    </div>
    {notice && <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>{notice.text}</div>}
    <form onSubmit={event => { event.preventDefault(); setPreview(true) }} className="change-request-form space-y-6">
      <section className="card"><SectionTitle eyebrow="1 · Identificación" title="¿Para quién y sobre qué es el pedido?" text="El cliente se identifica automáticamente cuando corresponda o puede seleccionarse/escribirse." /><div className="grid md:grid-cols-2 gap-5"><Field label="Cliente *"><div className="flex gap-2 mb-2"><button type="button" onClick={() => setClientMode('existing')} className={modeClass(clientMode === 'existing')}>Cliente existente</button><button type="button" onClick={() => setClientMode('new')} className={modeClass(clientMode === 'new')}>Escribir cliente</button></div>{clientMode === 'existing' ? <select required value={form.client_id} onChange={event => setForm({ ...form, client_id: event.target.value })}><option value="">Seleccionar…</option>{clients.map(client => <option key={client.id} value={client.id}>{client.company || client.name}</option>)}</select> : <input value={clientName} onChange={event => setClientName(event.target.value)} placeholder="Nombre del cliente" />}</Field><Field label="Título accionable *"><input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ej.: Mejorar el formulario de inscripción" /></Field></div><Field label="Producto, sitio, URL, pantalla, ruta o módulo"><input value={intake.product_location} onChange={event => updateIntake('product_location', event.target.value)} placeholder="Ej.: Panel administrativo / Pedidos de cambios / Nueva solicitud" /></Field></section>
      <section className="card"><SectionTitle eyebrow="2 · Problema y resultado" title="Qué ocurre y qué debería pasar" text="Describí el problema actual con palabras observables y el resultado esperado." /><Field label="Qué ocurre *"><textarea required rows="4" value={intake.current_issue} onChange={event => updateIntake('current_issue', event.target.value)} placeholder="¿Qué problema o necesidad se detectó?" /></Field><Field label="Síntesis *"><textarea required rows="3" value={intake.summary} onChange={event => updateIntake('summary', event.target.value)} placeholder="Resumí el cambio y el resultado esperado en una o dos frases." /></Field><Field label="Qué debe cambiar"><textarea rows="5" value={intake.requested_change} onChange={event => updateIntake('requested_change', event.target.value)} placeholder="Describí el cambio desde la intención de quien solicita, sin explicar la solución técnica." /></Field><div className="grid md:grid-cols-2 gap-5"><Field label="Comportamiento actual"><textarea rows="4" value={intake.current_behavior} onChange={event => updateIntake('current_behavior', event.target.value)} /></Field><Field label="Comportamiento esperado *"><textarea required rows="4" value={intake.expected_behavior} onChange={event => updateIntake('expected_behavior', event.target.value)} /></Field></div><div className="grid md:grid-cols-2 gap-5"><Field label="Resultado para considerar resuelto"><textarea rows="3" value={intake.resolution_criteria} onChange={event => updateIntake('resolution_criteria', event.target.value)} placeholder="Criterio observable de aceptación." /></Field><Field label="Ejemplos o pasos para reproducir"><textarea rows="3" value={intake.reproduction_steps} onChange={event => updateIntake('reproduction_steps', event.target.value)} /></Field></div></section>
      <section className="card"><SectionTitle eyebrow="3 · Alcance y contexto" title="Quiénes participan y hasta dónde llega" text="Dejá visibles los límites y las dependencias para evitar reinterpretaciones." /><div className="grid md:grid-cols-2 gap-5"><Field label="Área afectada"><select value={intake.area} onChange={event => updateIntake('area', event.target.value)}><option value="front_office">Sitio público / front office</option><option value="back_office">Panel administrativo / back office</option><option value="both">Ambos</option><option value="not_informed">No informado</option></select></Field><Field label="Quién observa el problema"><input value={intake.observed_by} onChange={event => updateIntake('observed_by', event.target.value)} /></Field><Field label="Quién debería usar el resultado"><input value={intake.intended_users} onChange={event => updateIntake('intended_users', event.target.value)} /></Field><Field label="Responsable o fuente del pedido"><input value={intake.source} onChange={event => updateIntake('source', event.target.value)} /></Field></div><div className="grid md:grid-cols-2 gap-5"><Field label="Alcance incluido"><textarea rows="4" value={intake.scope_included} onChange={event => updateIntake('scope_included', event.target.value)} placeholder="Qué queda incluido." /></Field><Field label="Fuera del pedido"><textarea rows="4" value={intake.scope_excluded} onChange={event => updateIntake('scope_excluded', event.target.value)} placeholder="Qué queda expresamente fuera o pendiente." /></Field></div><div className="grid md:grid-cols-2 gap-5"><Field label="Dependencias, permisos o decisiones pendientes"><textarea rows="3" value={intake.dependencies} onChange={event => updateIntake('dependencies', event.target.value)} /></Field><Field label="¿Hay datos personales o sensibles?"><select value={intake.sensitive_data} onChange={event => updateIntake('sensitive_data', event.target.value)}><option value="no">No</option><option value="yes">Sí, requiere cuidado</option><option value="not_informed">No informado</option></select></Field></div></section>
      <section className="card"><SectionTitle eyebrow="4 · Evidencia" title="Capturas y archivos" text="Adjuntá evidencia cuando el pedido se refiera a algo existente. Ocultá credenciales y datos sensibles." /><Field label="Descripción de la evidencia"><textarea rows="3" value={intake.evidence_description} onChange={event => updateIntake('evidence_description', event.target.value)} placeholder="Qué muestra la captura o el archivo y dónde se observa el problema." /></Field><label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-deep-green)]/20 bg-[var(--color-refined-gray)]/50 px-5 text-center hover:border-[var(--color-deep-green)]/50"><span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)]">upload_file</span><span className="mt-2 text-sm font-extrabold text-[var(--color-deep-green)]">Elegir capturas o archivos</span><span className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP o PDF · hasta 8 archivos · 10 MB cada uno</span><input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,application/pdf" multiple onChange={addFiles} /></label>{files.length > 0 && <div className="grid sm:grid-cols-2 gap-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-refined-gray)] px-3 py-2 text-sm"><span className="truncate font-semibold">{file.name}</span><button type="button" onClick={() => setFiles(items => items.filter((_, fileIndex) => fileIndex !== index))} className="shrink-0 text-xs font-bold text-red-600">Quitar</button></div>)}</div>}</section>
      <section className="card"><SectionTitle eyebrow="5 · Objetivos relacionados" title="Sub-pedidos opcionales" text="Usalos sólo cuando haya objetivos independientes dentro del mismo tema." /><button type="button" onClick={() => setSubRequests(items => [...items, emptySub()])} className="rounded-xl bg-[var(--color-mint)]/40 px-3 py-2 text-xs font-extrabold text-[var(--color-deep-green)] hover:bg-[var(--color-mint)]">+ Agregar objetivo relacionado</button>{subRequests.length > 0 && <div className="space-y-4 mt-4">{subRequests.map((item, index) => <div key={item.id} className="rounded-2xl border border-[var(--color-deep-green)]/12 bg-[var(--color-refined-gray)]/55 p-5"><div className="flex items-center justify-between mb-4"><p className="text-sm font-extrabold text-[var(--color-deep-green)]">Objetivo relacionado {index + 1}</p><button type="button" onClick={() => setSubRequests(items => items.filter(sub => sub.id !== item.id))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button></div><div className="space-y-4"><Field label="Título"><input value={item.title} onChange={event => updateSub(item.id, 'title', event.target.value)} /></Field><Field label="Descripción"><textarea rows="3" value={item.description} onChange={event => updateSub(item.id, 'description', event.target.value)} /></Field><Field label="Resultado esperado"><textarea rows="2" value={item.expected_result} onChange={event => updateSub(item.id, 'expected_result', event.target.value)} /></Field></div></div>)}</div>}</section>
      <section className="card"><SectionTitle eyebrow="6 · Prioridad" title="Definición operativa" text="La prioridad debe reflejar la urgencia del pedido, no una estimación técnica." /><Field label="Prioridad"><select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}>{Object.entries(PRIORITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></section>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3"><Link to="/admin/pedidos-cambios" className="rounded-xl px-5 py-3 text-center text-sm font-bold text-gray-500 hover:bg-gray-100">Cancelar</Link><button disabled={saving} className="btn-primary justify-center px-6 disabled:opacity-60"><span className="material-symbols-outlined text-lg">visibility</span> Revisar vista previa</button></div>
    </form>
    {preview && <PreviewModal form={form} intake={intake} clientLabel={clientLabel} files={files} subRequests={subRequests} saving={saving} onClose={() => setPreview(false)} onConfirm={save} />}
  </div>
}

function PreviewModal({ form, intake, clientLabel, files, subRequests, saving, onClose, onConfirm }) {
  return <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] p-4 grid place-items-center" role="dialog" aria-modal="true" aria-labelledby="preview-title"><div className="w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-[var(--color-deep-green)]/10 p-6 md:p-8"><div className="flex items-start justify-between gap-4 mb-6"><div><p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-deep-green)]/60">Vista previa</p><h2 id="preview-title" className="text-2xl font-extrabold text-[var(--color-deep-green)]">Revisar antes de registrar</h2><p className="text-sm text-gray-500 mt-1">Al confirmar, se creará el pedido con estado <strong>Iniciado</strong>.</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button></div><div className="space-y-5"><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-[var(--color-mint)]/45 px-3 py-1.5 text-[var(--color-deep-green)]">Prioridad {PRIORITIES[form.priority]}</span><span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600">Cliente: {clientLabel}</span><span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600">Estado: Iniciado</span></div><PreviewBlock title="Título" value={form.title} /><PreviewBlock title="Qué ocurre" value={intake.current_issue} /><PreviewBlock title="Síntesis" value={intake.summary} /><PreviewBlock title="Qué debe cambiar" value={intake.requested_change || 'Pendiente de definir'} /><PreviewBlock title="Alcance" value={`Incluido: ${intake.scope_included || 'Pendiente de definir'}\nFuera: ${intake.scope_excluded || 'No informado'}`} /><PreviewBlock title="Resultado esperado" value={intake.expected_behavior} /><PreviewBlock title="Evidencia" value={`${intake.evidence_description || 'No disponible'}${files.length ? `\nArchivos: ${files.map(file => file.name).join(', ')}` : ''}`} />{subRequests.length > 0 && <PreviewBlock title="Objetivos relacionados" value={subRequests.map((item, index) => `${index + 1}. ${item.title || 'Sin título'} — ${item.description || 'Sin descripción'}`).join('\n')} />}</div><div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-8"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Volver a editar</button><button type="button" onClick={onConfirm} disabled={saving} className="btn-primary justify-center px-5 py-3 disabled:opacity-60"><span className="material-symbols-outlined text-sm">check</span>{saving ? 'Registrando…' : 'Confirmar y registrar'}</button></div></div></div>
}

function PreviewBlock({ title, value }) { return <section className="border-t border-gray-100 pt-4"><h3 className="text-sm font-extrabold text-[var(--color-deep-green)]">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{value}</p></section> }
function SectionTitle({ eyebrow, title, text }) { return <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[var(--color-deep-green)]/60">{eyebrow}</p><h2 className="mt-1 text-xl font-extrabold text-[var(--color-deep-green)]">{title}</h2><p className="mt-1 text-sm text-gray-500">{text}</p></div> }
function Field({ label, children }) { return <label className="block text-sm font-bold text-[var(--color-dark-gray)]">{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_input]:text-sm [&_input]:outline-none [&_input:focus]:border-[var(--color-deep-green)] [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-gray-200 [&_select]:bg-white [&_select]:px-4 [&_select]:py-3 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:bg-white [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:leading-relaxed [&_textarea]:outline-none [&_textarea:focus]:border-[var(--color-deep-green)]">{children}</div></label> }
function modeClass(active) { return `rounded-lg px-3 py-1.5 text-xs font-bold ${active ? 'bg-[var(--color-deep-green)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}` }
