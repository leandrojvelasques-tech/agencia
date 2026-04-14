import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function EventConfirmation() {
  const { slug } = useParams()
  const { getEventBySlug } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvent() {
      setLoading(true)
      const data = await getEventBySlug(slug)
      setEvent(data)
      setLoading(false)
    }
    loadEvent()
  }, [slug])

  if (loading) return <div className="min-h-screen flex items-center justify-center p-4">Cargando...</div>

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-[var(--color-light-green)]/30 flex items-center justify-center mx-auto mb-8">
          <span className="material-symbols-outlined text-5xl text-[var(--color-deep-green)]">check_circle</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-[var(--color-deep-green)]">
          ¡Inscripción confirmada!
        </h1>
        <p className="text-base text-[var(--color-dark-gray)]/60 font-medium mb-8">
          Tu inscripción ha sido registrada correctamente.
        </p>

        {event && (
          <div className="card p-6 text-left mb-8">
            <h2 className="text-lg font-bold text-[var(--color-deep-green)] mb-4">{event.title}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]/50">calendar_today</span>
                <span className="font-medium">{format(new Date(event.event_date + 'T12:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]/50">schedule</span>
                <span className="font-medium">{event.start_time} hs · {event.duration_minutes} minutos</span>
              </div>
              {event.organizer && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-lg text-[var(--color-deep-green)]/50">apartment</span>
                  <span className="font-medium">{event.organizer}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-[var(--color-light-green)]/15 rounded-[var(--radius-card)] p-5 text-left mb-8">
          <p className="text-sm font-bold text-[var(--color-deep-green)] mb-2">¿Qué sigue?</p>
          <ul className="space-y-2 text-sm text-[var(--color-dark-gray)]/70">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-sm text-[var(--color-deep-green)] mt-0.5">mail</span>
              Si proporcionaste email, recibirás una confirmación
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-sm text-[var(--color-deep-green)] mt-0.5">notifications</span>
              Te enviaremos un recordatorio antes del evento
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-sm text-[var(--color-deep-green)] mt-0.5">workspace_premium</span>
              Al finalizar, recibirás tu certificado de participación
            </li>
          </ul>
        </div>

        <a href="https://www.leandrovelasques.com.ar" className="text-sm font-semibold text-[var(--color-deep-green)]/60 hover:text-[var(--color-deep-green)] transition-colors">
          leandrovelasques.com.ar
        </a>
      </div>
    </div>
  )
}
