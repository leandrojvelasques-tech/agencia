import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function EventCertificates() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, attendance, certificates, isLoading } = useStore()
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

  const sent = certificates.filter(c => c.status === 'sent').length
  const presentRegIds = attendance.filter(a => a.status === 'present' || a.status === 'late').map(a => a.registration_id)
  const pending = registrations.filter(r => 
    presentRegIds.includes(r.id) && 
    !certificates.find(c => c.registration_id === r.id)
  ).length
  const failed = certificates.filter(c => c.status === 'failed').length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Certificados</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title}</p>
        </div>
        <button className="btn-primary" disabled={event.status !== 'completed'}>
          <span className="material-symbols-outlined text-lg">send</span>
          Generar y enviar todos
        </button>
      </div>

      {event.status !== 'completed' && (
        <div className="card p-4 mb-6 bg-amber-50 border-amber-200 flex items-center gap-3">
          <span className="material-symbols-outlined text-xl text-amber-600">info</span>
          <p className="text-sm font-medium text-amber-800">Los certificados solo se pueden generar una vez que el evento esté completado y la asistencia registrada.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-[var(--color-deep-green)]">{sent}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Enviados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-500">{pending}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Pendientes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-red-500">{failed}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Con error</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Email</th>
                <th>Asistencia</th>
                <th>Certificado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[var(--color-dark-gray)]/30">No hay datos</td></tr>
              ) : registrations.map(reg => {
                const att = attendance.find(a => a.registration_id === reg.id)
                const cert = certificates.find(c => c.registration_id === reg.id)
                const p = reg.participants
                
                const attStatus = att?.status
                const certStatus = cert?.status
                const isPresent = attStatus === 'present' || attStatus === 'late'
                const hasEmail = !!p?.email

                return (
                  <tr key={reg.id}>
                    <td className="font-semibold">{p?.first_name} {p?.last_name}</td>
                    <td>{hasEmail ? <span className="text-sm">{p.email}</span> : <span className="text-xs text-amber-600 font-semibold">Sin email</span>}</td>
                    <td>
                      <span className={`badge ${isPresent ? 'badge-green' : attStatus === 'absent' ? 'badge-red' : 'badge-gray'}`}>
                        {isPresent ? 'Presente' : attStatus === 'absent' ? 'Ausente' : 'Sin registro'}
                      </span>
                    </td>
                    <td>
                      {certStatus === 'sent' && <span className="badge badge-green">✓ Enviado</span>}
                      {certStatus === 'pending' && <span className="badge badge-yellow">Pendiente</span>}
                      {certStatus === 'failed' && <span className="badge badge-red">Error</span>}
                      {!certStatus && !isPresent && <span className="badge badge-gray">No aplica</span>}
                      {!certStatus && isPresent && !hasEmail && <span className="badge badge-yellow">Sin email</span>}
                      {!certStatus && isPresent && hasEmail && <span className="badge badge-yellow">Pendiente</span>}
                    </td>
                    <td>
                      {certStatus === 'failed' && (
                        <button className="btn-ghost text-xs !text-[var(--color-deep-green)]">
                          <span className="material-symbols-outlined text-sm">refresh</span> Reintentar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
