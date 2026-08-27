import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BILLING_STATES, REQUEST_STATES, requestState } from '../../lib/changeRequests'

const emptyForm = { client_id: '', title: '', description: '', affected_area: '', request_type: 'improvement', priority: 'normal', status: 'initiated', billing_status: 'pending', internal_note: '', client_note: '' }

export default function ChangeRequestsDashboard() {
  const [requests, setRequests] = useState([])
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({ status: 'all', client: '', billing: 'all', query: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [notification, setNotification] = useState(null)
  const [sendingNotification, setSendingNotification] = useState(false)

  const notify = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500) }
  const load = async () => {
    setLoading(true)
    const [{ data: requestData, error }, { data: clientData }] = await Promise.all([
      supabase.from('change_requests').select('*, crm_clients(name, company)').order('created_at', { ascending: false }),
      supabase.from('crm_clients').select('id, name, company').order('name'),
    ])
    if (error) notify(`No se pudieron cargar las solicitudes: ${error.message}`, 'error')
    setRequests(requestData || []); setClients(clientData || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => requests.filter(item => {
    const text = `${item.title} ${item.description} ${item.requester_name || ''} ${item.requester_email || ''} ${item.crm_clients?.name || ''}`.toLowerCase()
    return (filters.status === 'all' || item.status === filters.status) && (filters.client === '' || item.client_id === filters.client) && (filters.billing === 'all' || item.billing_status === filters.billing) && (!filters.query || text.includes(filters.query.toLowerCase()))
  }), [requests, filters])
  const billable = requests.filter(r => r.status === 'completed' && r.billing_status === 'pending')

  const edit = (item) => { setSelected(item); setForm({ ...emptyForm, ...item }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const reset = () => { setSelected(null); setForm(emptyForm) }
  const save = async (event) => {
    event.preventDefault()
    if (!form.client_id || !form.title.trim() || !form.description.trim()) { notify('Completá cliente, título y descripción.', 'error'); return }
    setSaving(true)
    const payload = { ...form, completed_at: form.status === 'completed' ? (selected?.completed_at || new Date().toISOString()) : null }
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.crm_clients; delete payload.attachments
    const response = selected ? await supabase.from('change_requests').update(payload).eq('id', selected.id) : await supabase.from('change_requests').insert({ ...payload, origin: 'admin' })
    if (response.error) notify(`No se pudo guardar: ${response.error.message}`, 'error')
    else { notify(selected ? 'Solicitud actualizada.' : 'Solicitud creada.'); reset(); load() }
    setSaving(false)
  }
  const updateQuick = async (item, field, value) => { const { error } = await supabase.from('change_requests').update({ [field]: value, ...(field === 'status' && value === 'completed' ? { completed_at: new Date().toISOString() } : {}) }).eq('id', item.id); if (error) notify(error.message, 'error'); else load() }
  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar la solicitud “${item.title}”? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    const { error } = await supabase.from('change_requests').delete().eq('id', item.id)
    if (error) notify(`No se pudo eliminar: ${error.message}`, 'error')
    else { notify('Solicitud eliminada.'); if (selected?.id === item.id) reset(); load() }
    setDeleting(false)
  }
  const openNotification = (item) => {
    const recipient = item.requester_name?.trim() || 'Hola'
    const subject = `Pedido en proceso: ${item.title}`
    const message = `Hola ${recipient},\n\nQueremos informarte que hemos iniciado a trabajar en el pedido solicitado de “${item.title}”.\n\nTe avisaremos cuando tengamos novedades.\n\nSaludos,\nLic. Leandro Velasques`
    setNotification({ item, to: item.requester_email || '', cc: [''], subject, message, attachments: [] })
  }
  const closeNotification = () => setNotification(null)
  const copyNotification = async () => {
    if (!notification) return
    await navigator.clipboard.writeText(notification.message)
    notify('Mensaje copiado al portapapeles.')
  }
  const addNotificationAttachments = async (files) => {
    if (!notification) return
    const selectedFiles = Array.from(files || [])
    const availableBytes = 8 * 1024 * 1024 - notification.attachments.reduce((sum, attachment) => sum + attachment.size, 0)
    let remainingBytes = availableBytes
    const accepted = []
    for (const file of selectedFiles) {
      if (file.size > remainingBytes || file.size > 8 * 1024 * 1024) continue
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      accepted.push({ name: file.name, content, size: file.size })
      remainingBytes -= file.size
    }
    if (accepted.length !== selectedFiles.length) notify('Algunos archivos no se agregaron: el límite total es de 8 MB.', 'error')
    setNotification({ ...notification, attachments: [...notification.attachments, ...accepted] })
  }
  const removeNotificationAttachment = (index) => setNotification({ ...notification, attachments: notification.attachments.filter((_, attachmentIndex) => attachmentIndex !== index) })
  const sendNotification = async () => {
    if (!notification?.to.trim()) { notify('Completá el correo de la persona interesada.', 'error'); return }
    setSendingNotification(true)
    try {
      const response = await fetch('/api/send-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: notification.to.trim(),
          cc: notification.cc.filter(email => email.trim()),
          recipientName: notification.item.requester_name || '',
          subject: notification.subject,
          message: notification.message,
          attachments: notification.attachments,
          requestId: notification.item.id,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo enviar el correo.')
      notify('Correo enviado desde info@leandrovelasques.com.ar.')
      closeNotification()
    } catch (error) {
      notify(`No se pudo enviar el correo: ${error.message}`, 'error')
    } finally {
      setSendingNotification(false)
    }
  }

  return <div className="max-w-7xl mx-auto">
    {toast && <div className={`fixed z-50 top-4 right-4 rounded-xl px-5 py-3 text-sm font-bold shadow-lg ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{toast.text}</div>}
    <div className="flex flex-col lg:flex-row gap-5 justify-between items-start mb-8"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-deep-green)]/55">Seguimiento operativo</p><h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Solicitudes de cambio</h1><p className="text-sm text-[var(--color-dark-gray)]/60 mt-1">Centralizá los pedidos de sitios y plataformas, desde el ingreso hasta su facturación.</p></div><div className="flex gap-3"><Stat label="Total" value={requests.length} /><Stat label="A facturar" value={billable.length} accent /></div></div>
    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-7 items-start">
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[var(--color-deep-green)]/8 p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><input value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} placeholder="Buscar solicitud…" className="lg:col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" /><select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="all">Todos los estados</option>{Object.entries(REQUEST_STATES).map(([key, state]) => <option key={key} value={key}>{state.label}</option>)}</select><select value={filters.client} onChange={e => setFilters({ ...filters, client: e.target.value })} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">Todos los clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select><select value={filters.billing} onChange={e => setFilters({ ...filters, billing: e.target.value })} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="all">Toda facturación</option>{Object.entries(BILLING_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        {loading ? <div className="py-16 text-center text-sm font-semibold text-gray-400">Cargando solicitudes…</div> : filtered.length === 0 ? <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-14 text-center text-gray-400"><span className="material-symbols-outlined text-4xl">assignment_add</span><p className="font-semibold mt-2">No hay solicitudes con estos filtros.</p></div> : <div className="space-y-3">{filtered.map(item => <RequestCard key={item.id} item={item} onEdit={() => edit(item)} onQuick={updateQuick} onNotify={() => openNotification(item)} onDelete={() => remove(item)} deleting={deleting} />)}</div>}
      </div>
      <aside className="xl:sticky xl:top-24 bg-white border border-[var(--color-deep-green)]/10 rounded-3xl shadow-sm p-6"><div className="flex items-center justify-between mb-5"><div><p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-deep-green)]/55">{selected ? 'Edición' : 'Carga interna'}</p><h2 className="text-xl font-extrabold text-[var(--color-deep-green)]">{selected ? 'Actualizar pedido' : 'Nueva solicitud'}</h2></div>{selected && <button onClick={reset} className="text-xs font-bold text-gray-400 hover:text-red-500">Cancelar</button>}</div><form onSubmit={save} className="space-y-4"><AdminField label="Cliente *"><select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">Seleccionar…</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}</select></AdminField><AdminField label="Título *"><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></AdminField><AdminField label="Descripción *"><textarea required rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></AdminField><div className="grid grid-cols-2 gap-3"><AdminField label="Estado"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.entries(REQUEST_STATES).map(([key, state]) => <option key={key} value={key}>{state.label}</option>)}</select></AdminField><AdminField label="Facturación"><select value={form.billing_status} onChange={e => setForm({ ...form, billing_status: e.target.value })}>{Object.entries(BILLING_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></AdminField></div><AdminField label="Nota interna"><textarea rows="3" value={form.internal_note || ''} onChange={e => setForm({ ...form, internal_note: e.target.value })} placeholder="Contexto para preparar el pedido técnico…" /></AdminField><AdminField label="Mensaje para el cliente"><textarea rows="3" value={form.client_note || ''} onChange={e => setForm({ ...form, client_note: e.target.value })} placeholder="Ej.: Lo estamos revisando y te avisamos novedades." /></AdminField><button disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">{saving ? 'Guardando…' : selected ? 'Guardar cambios' : 'Crear solicitud'}</button></form></aside>
    </div>
    {notification && <NotificationModal notification={notification} onChange={setNotification} onClose={closeNotification} onCopy={copyNotification} onSend={sendNotification} onAddFiles={addNotificationAttachments} onRemoveFile={removeNotificationAttachment} sending={sendingNotification} />}
  </div>
}

function Stat({ label, value, accent }) { return <div className={`rounded-2xl px-5 py-3 border ${accent ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)]' : 'bg-white border-[var(--color-deep-green)]/10'}`}><p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-white/65' : 'text-gray-400'}`}>{label}</p><p className="text-2xl font-extrabold">{value}</p></div> }
function AdminField({ label, children }) { return <label className="block text-xs font-bold text-[var(--color-dark-gray)]/75">{label}<div className="mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-gray-200 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm">{children}</div></label> }
function RequestCard({ item, onEdit, onQuick, onNotify, onDelete, deleting }) { const state = requestState(item.status); return <article className="bg-white rounded-2xl border border-[var(--color-deep-green)]/8 p-5 hover:shadow-sm transition-shadow"><div className="flex flex-col md:flex-row gap-4 justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2 items-center mb-2"><span className={`inline-flex gap-1 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}><span className="material-symbols-outlined text-sm">{state.icon}</span>{state.label}</span><span className="text-xs text-gray-400">{item.crm_clients?.company || item.crm_clients?.name || 'Sin cliente'} · {new Date(item.created_at).toLocaleDateString('es-AR')}</span></div><h3 className="font-extrabold text-[var(--color-dark-gray)]">{item.title}</h3><p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">{item.description}</p>{item.requester_name && <p className="mt-2 text-xs text-gray-500"><span className="material-symbols-outlined text-sm align-middle">person</span> Pedido por {item.requester_name}{item.requester_email ? ` · ${item.requester_email}` : ''}</p>}{item.affected_area && <p className="mt-2 text-xs text-[var(--color-deep-green)] font-semibold"><span className="material-symbols-outlined text-sm align-middle">web</span> {item.affected_area}</p>}{item.attachments?.length > 0 && <p className="mt-3 text-xs font-bold text-[var(--color-deep-green)]"><span className="material-symbols-outlined text-sm align-middle">attach_file</span> {item.attachments.length} archivo(s) adjunto(s)</p>}</div><div className="flex md:flex-col gap-2 shrink-0"><select value={item.status} onChange={e => onQuick(item, 'status', e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold">{Object.entries(REQUEST_STATES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>{item.status === 'in_progress' && <button type="button" onClick={onNotify} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition"><span className="material-symbols-outlined text-sm align-middle">mail</span> Notificar</button>}<button onClick={onEdit} className="rounded-lg px-3 py-1.5 text-xs font-bold bg-[var(--color-deep-green)]/7 text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)] hover:text-white transition">Ver y editar</button><button type="button" onClick={onDelete} disabled={deleting} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition disabled:opacity-50">{deleting ? 'Eliminando…' : 'Eliminar'}</button></div></div></article> }

function NotificationModal({ notification, onChange, onClose, onCopy, onSend, onAddFiles, onRemoveFile, sending }) {
  const [preview, setPreview] = useState(false)
  const cc = notification.cc || ['']
  const updateCc = (index, value) => onChange({ ...notification, cc: cc.map((email, emailIndex) => emailIndex === index ? value : email) })
  const addCc = () => { if (cc.length < 3) onChange({ ...notification, cc: [...cc, ''] }) }
  const removeCc = (index) => onChange({ ...notification, cc: cc.filter((_, emailIndex) => emailIndex !== index) })
  return <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] p-4 grid place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-title"><div className="w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-[var(--color-deep-green)]/10 p-6"><div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-[10px] uppercase tracking-widest font-bold text-blue-700/70">Envío directo</p><h2 id="notification-title" className="text-xl font-extrabold text-[var(--color-deep-green)]">Notificar que está en proceso</h2><p className="text-sm text-gray-500 mt-1">Se enviará desde info@leandrovelasques.com.ar.</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button></div>{preview ? <div className="rounded-2xl border border-gray-200 bg-[var(--color-refined-gray)] p-5 space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vista previa</p><p className="text-sm mt-2"><strong>De:</strong> Lic. Leandro Velasques &lt;info@leandrovelasques.com.ar&gt;</p><p className="text-sm"><strong>Para:</strong> {notification.to || '—'}</p>{cc.filter(Boolean).map((email, index) => <p className="text-sm" key={index}><strong>{index === 0 ? 'CC:' : ''}</strong> {email}</p>)}<p className="text-sm mt-3"><strong>Asunto:</strong> {notification.subject || '—'}</p></div><div className="rounded-xl bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap">{notification.message}</div>{notification.attachments.length > 0 && <div><p className="text-xs font-bold text-gray-500">Adjuntos</p><p className="text-sm">{notification.attachments.map(attachment => attachment.name).join(' · ')}</p></div>}</div> : <div className="space-y-4"><AdminField label="Para"><input type="text" inputMode="email" value={notification.to} onChange={e => onChange({ ...notification, to: e.target.value })} placeholder="correo@cliente.com" /></AdminField><div><div className="flex items-center justify-between mb-1.5"><span className="text-xs font-bold text-[var(--color-dark-gray)]/75">Copia (CC)</span><button type="button" onClick={addCc} disabled={cc.length >= 3} className="text-xs font-bold text-[var(--color-deep-green)] hover:underline disabled:opacity-40">+ Agregar copia</button></div><div className="space-y-2">{cc.map((email, index) => <div className="flex gap-2" key={index}><input type="text" inputMode="email" value={email} onChange={e => updateCc(index, e.target.value)} placeholder={index === 0 ? 'Otra persona o info@leandrovelasques.com.ar' : 'correo@cliente.com'} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />{cc.length > 1 && <button type="button" onClick={() => removeCc(index)} className="px-2 text-xs font-bold text-red-600">Quitar</button>}</div>)}</div><p className="text-xs text-gray-400 mt-1">Podés agregar hasta tres copias.</p></div><AdminField label="Asunto"><input value={notification.subject} onChange={e => onChange({ ...notification, subject: e.target.value })} /></AdminField><AdminField label="Mensaje"><textarea rows="8" value={notification.message} onChange={e => onChange({ ...notification, message: e.target.value })} /></AdminField><AdminField label="Archivos adjuntos"><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={e => onAddFiles(e.target.files)} /><p className="text-xs text-gray-400 mt-1">Podés adjuntar varios archivos, hasta 8 MB en total.</p>{notification.attachments.length > 0 && <div className="space-y-2 mt-3">{notification.attachments.map((attachment, index) => <div key={`${attachment.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-refined-gray)] px-3 py-2 text-xs"><span className="truncate font-semibold">{attachment.name}</span><button type="button" onClick={() => onRemoveFile(index)} className="shrink-0 font-bold text-red-600 hover:underline">Quitar</button></div>)}</div>}</AdminField></div>}<div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">{preview ? <button type="button" onClick={() => setPreview(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Volver a editar</button> : <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">Cancelar</button>} {!preview && <><button type="button" onClick={() => setPreview(true)} className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--color-deep-green)] bg-[var(--color-mint)]/35 hover:bg-[var(--color-mint)]"><span className="material-symbols-outlined text-sm align-middle">visibility</span> Previsualizar mail</button><button type="button" onClick={onCopy} className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--color-deep-green)] bg-[var(--color-mint)]/35 hover:bg-[var(--color-mint)]"><span className="material-symbols-outlined text-sm align-middle">content_copy</span> Copiar mensaje</button></>}<button type="button" onClick={onSend} disabled={sending || !notification.to.trim()} className="btn-primary justify-center disabled:opacity-60"><span className="material-symbols-outlined text-sm">{sending ? 'progress_activity' : 'send'}</span> {sending ? 'Enviando…' : 'Enviar mail'}</button></div></div></div>
}
