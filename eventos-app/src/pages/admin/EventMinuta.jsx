import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function EventMinuta() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, attendance } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  const [summary, setSummary] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [recipients, setRecipients] = useState('attendees')
  const [sent, setSent] = useState(false)

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

  if (loading) return <div className="text-center py-20"><p className="animate-pulse">Cargando...</p></div>
  if (!event) return <div className="text-center py-20"><p>Evento no encontrado</p></div>

  const attendees = registrations
    .filter(r => {
      const att = attendance.find(a => a.registration_id === r.id)
      return att?.status === 'present' || att?.status === 'late'
    })
    .map(r => r.participants)
    .filter(Boolean)

  const handleSend = () => {
    // In production, this would trigger n8n webhook
    setSent(true)
  }

  if (sent) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[var(--color-light-green)]/30 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]">check_circle</span>
        </div>
        <h2 className="text-2xl font-extrabold mb-3">¡Minuta enviada!</h2>
        <p className="text-[var(--color-dark-gray)]/60 mb-8">La minuta fue enviada correctamente a los destinatarios seleccionados.</p>
        <Link to={`/admin/eventos/${id}`} className="btn-primary">Volver al evento</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Minuta Post-Evento</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title}</p>
        </div>
      </div>

      <div className="card p-6 lg:p-8 space-y-6">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
            Resumen del evento
          </label>
          <textarea
            className="form-input min-h-[150px]"
            placeholder="Escribí un resumen de los temas tratados, conclusiones y próximos pasos..."
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
            Foto del evento <span className="normal-case text-[var(--color-dark-gray)]/30">(URL)</span>
          </label>
          <input
            className="form-input"
            placeholder="https://... (URL de la foto)"
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
          />
          {photoUrl && (
            <img src={photoUrl} alt="Preview" className="mt-3 rounded-[var(--radius-card)] max-h-48 object-cover w-full" onError={e => e.target.style.display = 'none'} />
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">
            Listado de asistentes
          </label>
          {attendees.length > 0 ? (
            <div className="bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] p-4">
              <p className="text-xs font-bold text-[var(--color-deep-green)] mb-2">{attendees.length} asistentes incluidos automáticamente:</p>
              <div className="flex flex-wrap gap-2">
                {attendees.map(p => (
                  <span key={p.id} className="badge badge-green">{p.first_name} {p.last_name}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-dark-gray)]/40">No hay asistentes registrados aún.</p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Destinatarios</label>
          <div className="space-y-2">
            {[
              { value: 'attendees', label: 'Solo asistentes con email' },
              { value: 'all', label: 'Todos los inscriptos con email' },
            ].map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-[var(--radius-premium)] border cursor-pointer transition-all ${
                recipients === opt.value ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5' : 'border-[var(--color-deep-green)]/8'
              }`}>
                <input type="radio" name="recipients" value={opt.value} checked={recipients === opt.value} onChange={e => setRecipients(e.target.value)} className="accent-[var(--color-deep-green)]" />
                <span className="text-sm font-semibold">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Link to={`/admin/eventos/${id}`} className="btn-secondary">Cancelar</Link>
        <button onClick={handleSend} className="btn-primary" disabled={!summary}>
          <span className="material-symbols-outlined text-lg">send</span>
          Enviar Minuta
        </button>
      </div>
    </div>
  )
}
