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
    setNotification({ item, to: item.requester_email || '', subject, message })
  }
  const closeNotification = () => setNotification(null)
  const copyNotification = async () => {
    if (!notification) return
    await navigator.clipboard.writeText(notification.message)
    notify('Mensaje copiado al portapapeles.')
  }
  const mailtoNotification = () => {
    if (!notification?.to.trim()) { notify('Completá el correo de la persona interesada.', 'error'); return }
    const href = `mailto:${notification.to.trim()}?subject=${encodeURIComponent(notification.subject)}&body=${encodeURIComponent(notification.message)}`
    window.location.href = href
    closeNotification()
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
    {notification && <NotificationModal notification={notification} onChange={setNotification} onClose={closeNotification} onCopy={copyNotification} onMailto={mailtoNotification} />}
  </div>
}

function Stat({ label, value, accent }) { return <div className={`rounded-2xl px-5 py-3 border ${accent ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)]' : 'bg-white border-[var(--color-deep-green)]/10'}`}><p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-white/65' : 'text-gray-400'}`}>{label}</p><p className="text-2xl font-extrabold">{value}</p></div> }
function AdminField({ label, children }) { return <label className="block text-xs font-bold text-[var(--color-dark-gray)]/75">{label}<div className="mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-gray-200 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm">{children}</div></label> }
function RequestCard({ item, onEdit, onQuick, onNotify, onDelete, deleting }) { const state = requestState(item.status); return <article className="bg-white rounded-2xl border border-[var(--color-deep-green)]/8 p-5 hover:shadow-sm transition-shadow"><div className="flex flex-col md:flex-row gap-4 justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2 items-center mb-2"><span className={`inline-flex gap-1 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}><span className="material-symbols-outlined text-sm">{state.icon}</span>{state.label}</span><span className="text-xs text-gray-400">{item.crm_clients?.company || item.crm_clients?.name || 'Sin cliente'} · {new Date(item.created_at).toLocaleDateString('es-AR')}</span></div><h3 className="font-extrabold text-[var(--color-dark-gray)]">{item.title}</h3><p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">{item.description}</p>{item.requester_name && <p className="mt-2 text-xs text-gray-500"><span className="material-symbols-outlined text-sm align-middle">person</span> Pedido por {item.requester_name}{item.requester_email ? ` · ${item.requester_email}` : ''}</p>}{item.affected_area && <p className="mt-2 text-xs text-[var(--color-deep-green)] font-semibold"><span className="material-symbols-outlined text-sm align-middle">web</span> {item.affected_area}</p>}{item.attachments?.length > 0 && <p className="mt-3 text-xs font-bold text-[var(--color-deep-green)]"><span className="material-symbols-outlined text-sm align-middle">attach_file</span> {item.attachments.length} archivo(s) adjunto(s)</p>}</div><div className="flex md:flex-col gap-2 shrink-0"><select value={item.status} onChange={e => onQuick(item, 'status', e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-bold">{Object.entries(REQUEST_STATES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>{item.status === 'in_progress' && <button type="button" onClick={onNotify} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white transition"><span className="material-symbols-outlined text-sm align-middle">mail</span> Notificar</button>}<button onClick={onEdit} className="rounded-lg px-3 py-1.5 text-xs font-bold bg-[var(--color-deep-green)]/7 text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)] hover:text-white transition">Ver y editar</button><button type="button" onClick={onDelete} disabled={deleting} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition disabled:opacity-50">{deleting ? 'Eliminando…' : 'Eliminar'}</button></div></div></article> }

function NotificationModal({ notification, onChange, onClose, onCopy, onMailto }) {
  return <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] p-4 grid place-items-center" role="dialog" aria-modal="true" aria-labelledby="notification-title"><div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-[var(--color-deep-green)]/10 p-6"><div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-[10px] uppercase tracking-widest font-bold text-blue-700/70">Aviso manual</p><h2 id="notification-title" className="text-xl font-extrabold text-[var(--color-deep-green)]">Notificar que está en proceso</h2><p className="text-sm text-gray-500 mt-1">Revisá el texto y abrí tu correo para enviarlo.</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button></div><div className="space-y-4"><AdminField label="Para"><input type="email" value={notification.to} onChange={e => onChange({ ...notification, to: e.target.value })} placeholder="correo@cliente.com" /></AdminField><AdminField label="Asunto"><input value={notification.subject} onChange={e => onChange({ ...notification, subject: e.target.value })} /></AdminField><AdminField label="Mensaje"><textarea rows="8" value={notification.message} onChange={e => onChange({ ...notification, message: e.target.value })} /></AdminField></div><div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">Cancelar</button><button type="button" onClick={onCopy} className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--color-deep-green)] bg-[var(--color-mint)]/35 hover:bg-[var(--color-mint)]"><span className="material-symbols-outlined text-sm align-middle">content_copy</span> Copiar mensaje</button><button type="button" onClick={onMailto} className="btn-primary justify-center"><span className="material-symbols-outlined text-sm">mail</span> Abrir correo</button></div></div></div>
}
