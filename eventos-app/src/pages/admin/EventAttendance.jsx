import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function EventAttendance() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, attendance, markAttendance, isLoading } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length
  const totalCount = registrations.filter(r => r.status !== 'cancelled').length
  const attendanceUrl = `${window.location.origin}/evento/${event.slug}/asistencia`

  const handleToggle = async (registrationId, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present'
    await markAttendance(registrationId, newStatus, 'admin')
  }

  const handleMarkAll = async () => {
    const promises = registrations
      .filter(r => r.status !== 'cancelled')
      .map(r => markAttendance(r.id, 'present', 'admin'))
    
    await Promise.all(promises)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Asistencia</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title} · {presentCount}/{totalCount} presentes ({totalCount > 0 ? Math.round(presentCount/totalCount*100) : 0}%)</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <button onClick={handleMarkAll} className="btn-ghost text-xs !text-[var(--color-deep-green)]">
          <span className="material-symbols-outlined text-base">done_all</span>
          Marcar todos presentes
        </button>
        <div className="flex-1" />
        <button onClick={() => navigator.clipboard.writeText(attendanceUrl)} className="btn-ghost text-xs">
          <span className="material-symbols-outlined text-base">link</span>
          Copiar link de auto-asistencia
        </button>
      </div>

      <div className="space-y-2">
        {registrations.filter(r => r.status !== 'cancelled').map(reg => {
          const attn = attendance.find(a => a.registration_id === reg.id)
          const p = reg.participants
          const status = attn?.status || 'unmarked'
          const isPresent = status === 'present' || status === 'late'

          return (
            <div key={reg.id} className="card p-4 flex items-center gap-4">
              <button
                onClick={() => handleToggle(reg.id, status)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isPresent
                    ? 'bg-[var(--color-deep-green)] text-white'
                    : status === 'absent'
                      ? 'bg-red-100 text-red-500'
                      : 'bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)]/30 hover:bg-[var(--color-light-green)]/30'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isPresent ? 'check' : status === 'absent' ? 'close' : 'radio_button_unchecked'}
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-dark-gray)]">
                  {p?.first_name} {p?.last_name}
                </p>
                <p className="text-xs text-[var(--color-dark-gray)]/50">
                  {p?.email || 'Sin email'} {attn?.marked_by === 'self' && '· Auto-registro'}
                </p>
              </div>
              <span className={`badge ${isPresent ? 'badge-green' : status === 'absent' ? 'badge-red' : 'badge-gray'}`}>
                {isPresent ? 'Presente' : status === 'absent' ? 'Ausente' : 'Sin marcar'}
              </span>
            </div>
          )
        })}
      </div>

      {totalCount === 0 && (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">group_off</span>
          <p className="text-lg font-semibold text-[var(--color-dark-gray)]/40">No hay inscriptos para tomar asistencia</p>
        </div>
      )}
    </div>
  )
}
