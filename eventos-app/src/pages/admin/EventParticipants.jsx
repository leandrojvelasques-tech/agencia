import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function EventParticipants() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, addParticipantManual, isLoading } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      setEvent(eventData)
      await fetchEventData(id)
      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) return <div className="text-center py-20"><p className="text-lg text-[var(--color-dark-gray)]/40 font-medium animate-pulse">Cargando...</p></div>
  if (!event) return <div className="text-center py-20"><p className="text-lg text-[var(--color-dark-gray)]/40">Evento no encontrado</p></div>

  const filtered = registrations.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    const p = r.participants || {}
    return p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
  })

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name) return
    await addParticipantManual(id, form)
    setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
    setShowModal(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Participantes</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title} · {registrations.length} inscriptos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>

      <div className="card p-4 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
        <input type="text" className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30" placeholder="Buscar participante..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Origen</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">No hay participantes registrados</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold text-[var(--color-dark-gray)]">{r.participants?.first_name} {r.participants?.last_name}</td>
                  <td>
                    {r.participants?.email ? (
                      <span className="text-sm">{r.participants.email}</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Sin email
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-[var(--color-dark-gray)]/70">{r.participants?.phone || '—'}</td>
                  <td><span className="badge badge-gray">{r.source === 'manual' ? 'Manual' : 'Autoinscripción'}</span></td>
                  <td><span className={`badge ${r.status === 'confirmed' ? 'badge-green' : r.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{r.status === 'confirmed' ? 'Confirmado' : r.status === 'cancelled' ? 'Cancelado' : 'Registrado'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Participant Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card p-6 lg:p-8 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">Agregar Participante</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Nombre *</label>
                  <input className="form-input !py-2.5" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Apellido *</label>
                  <input className="form-input !py-2.5" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Email</label>
                <input type="email" className="form-input !py-2.5" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Teléfono</label>
                <input className="form-input !py-2.5" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Observaciones</label>
                <textarea className="form-input !py-2.5 min-h-[60px]" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleAdd} className="btn-primary flex-1" disabled={!form.first_name || !form.last_name}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
