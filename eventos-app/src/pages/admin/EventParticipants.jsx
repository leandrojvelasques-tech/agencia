import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function EventParticipants() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, addParticipantManual, updateParticipantManual, deleteRegistration, isLoading } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '', attendance_mode: 'presencial' })
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

  const handleOpenAdd = () => {
    setEditingParticipant(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '', attendance_mode: 'presencial' })
    setShowModal(true)
  }

  const handleOpenEdit = (reg) => {
    const p = reg.participants
    setEditingParticipant({ registrationId: reg.id, participantId: p.id })
    setForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.email || '',
      phone: p.phone || '',
      notes: p.notes || '',
      attendance_mode: reg.attendance_mode || 'presencial'
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) return
    
    const payload = { ...form }

    if (editingParticipant) {
      await updateParticipantManual(editingParticipant.participantId, {
        ...payload,
        registrationId: editingParticipant.registrationId
      })
    } else {
      await addParticipantManual(id, payload)
    }
    
    setForm({ first_name: '', last_name: '', email: '', phone: '', notes: '', attendance_mode: 'presencial' })
    setEditingParticipant(null)
    setShowModal(false)
  }

  const handleDelete = async (reg) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${reg.participants.first_name} ${reg.participants.last_name} de este evento?`)) {
      await deleteRegistration(reg.id)
    }
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
        <button onClick={handleOpenAdd} className="btn-primary">
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
                <th>Modalidad</th>
                <th>Origen</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">No hay participantes registrados</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold text-[var(--color-dark-gray)]">
                    <div className="flex flex-col">
                      <span>{r.participants?.first_name} {r.participants?.last_name}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${r.status === 'confirmed' ? 'text-green-600' : r.status === 'cancelled' ? 'text-red-500' : 'text-amber-500'}`}>
                        {r.status === 'confirmed' ? 'Confirmado' : r.status === 'cancelled' ? 'Cancelado' : 'Registrado'}
                      </span>
                      {r.survey_responses && (
                        <div className="mt-2 text-[11px] text-[var(--color-dark-gray)]/60 font-normal leading-relaxed bg-[var(--color-refined-gray)]/40 p-2 rounded-lg border border-[var(--color-deep-green)]/10 max-w-xs space-y-0.5 shadow-sm">
                          {r.survey_responses.matriculado && <div><strong className="text-[var(--color-deep-green)]">Matrícula:</strong> {r.survey_responses.matriculado}{r.survey_responses.consejo ? ` (${r.survey_responses.consejo})` : ''}</div>}
                          {r.survey_responses.profesion && (
                            <div><strong className="text-[var(--color-deep-green)]">Profesión:</strong> {r.survey_responses.profesion}
                              {r.survey_responses.profesion === 'Estudiante Universitario' && r.survey_responses.profesion_estudiante_carrera && ` (${r.survey_responses.profesion_estudiante_carrera} en ${r.survey_responses.profesion_estudiante_univ})`}
                              {r.survey_responses.profesion === 'Otro' && r.survey_responses.profesion_otro && ` (${r.survey_responses.profesion_otro})`}
                            </div>
                          )}
                          {r.survey_responses.empleo && (
                            <div><strong className="text-[var(--color-deep-green)]">Empleo:</strong> {r.survey_responses.empleo}
                              {r.survey_responses.empleo === 'Dependiente' && r.survey_responses.empleo_empresa && ` (${r.survey_responses.empleo_empresa})`}
                              {r.survey_responses.empleo === 'Independiente' && r.survey_responses.empleo_actividad && ` (${r.survey_responses.empleo_actividad})`}
                              {r.survey_responses.empleo === 'Otro' && r.survey_responses.empleo_otro && ` (${r.survey_responses.empleo_otro})`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
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
                  <td>
                    <span className={`badge ${r.attendance_mode === 'virtual' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                      {r.attendance_mode === 'virtual' ? '💻 Virtual' : '🏫 Presencial'}
                    </span>
                  </td>
                  <td><span className="badge badge-gray">{r.source === 'manual' ? 'Manual' : 'Autoinscripción'}</span></td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleOpenEdit(r)} className="btn-ghost !p-1.5 text-blue-600 hover:bg-blue-50" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDelete(r)} className="btn-ghost !p-1.5 text-red-600 hover:bg-red-50" title="Eliminar">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Participant Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card p-6 lg:p-8 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">{editingParticipant ? 'Editar Participante' : 'Agregar Participante'}</h2>
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
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Modalidad *</label>
                <select className="form-input !py-2.5" value={form.attendance_mode} onChange={e => setForm(p => ({ ...p, attendance_mode: e.target.value }))}>
                  <option value="presencial">🏫 Presencial</option>
                  <option value="virtual">💻 Virtual</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Observaciones</label>
                <textarea className="form-input !py-2.5 min-h-[60px]" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} className="btn-primary flex-1" disabled={!form.first_name || !form.last_name}>
                {editingParticipant ? 'Guardar Cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
