import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function AttendanceCheck() {
  const { slug } = useParams()
  const { getEventBySlug, fetchEventData, registrations, markAttendance } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [selectedReg, setSelectedReg] = useState(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const eventData = await getEventBySlug(slug)
      if (eventData) {
        setEvent(eventData)
        await fetchEventData(eventData.id)
      }
      setLoading(false)
    }
    init()
  }, [slug])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center p-4">Cargando...</div>
  }

  if (!event || (event.status !== 'in_progress' && event.status !== 'published' && event.status !== 'completed')) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-6xl text-[var(--color-dark-gray)]/20 mb-4 block">event_busy</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Asistencia no disponible</h1>
          <p className="text-[var(--color-dark-gray)]/60 font-medium">El registro de asistencia no está habilitado en este momento.</p>
        </div>
      </div>
    )
  }

  const eventRegs = registrations
    .filter(r => r.status !== 'cancelled')
    .map(r => ({
      ...r,
      // In Supabase with join, it's often r.participants (plural in select)
      participant: r.participants,
    }))

  const filtered = search.length >= 2
    ? eventRegs.filter(r =>
        r.participant?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.participant?.last_name?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const handleConfirm = async (reg) => {
    await markAttendance(reg.id, 'present', 'self')
    setSelectedReg(reg)
    setConfirmed(true)
  }

  if (confirmed) {
    const p = selectedReg?.participant
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-[var(--color-light-green)]/30 flex items-center justify-center mx-auto mb-8">
            <span className="material-symbols-outlined text-5xl text-[var(--color-deep-green)]">check_circle</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-[var(--color-deep-green)]">¡Asistencia registrada!</h1>
          {p && <p className="text-lg text-[var(--color-dark-gray)] font-medium mb-2">Hola, {p.first_name} {p.last_name}</p>}
          <p className="text-base text-[var(--color-dark-gray)]/60 mb-8">Gracias por participar en <strong>{event.title}</strong></p>
          <a href="https://www.leandrovelasques.com.ar" className="text-sm font-semibold text-[var(--color-deep-green)]/60 hover:text-[var(--color-deep-green)] transition-colors">
            leandrovelasques.com.ar
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)]">
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-6 flex items-center h-16">
          <a href="https://www.leandrovelasques.com.ar" target="_blank" rel="noreferrer" className="flex items-center gap-2">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight">LEANDRO VELASQUES</span>
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 lg:py-12 animate-fade-in">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] mb-3 block">fact_check</span>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">Confirmá tu asistencia</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">{event.title}</p>
        </div>

        <div className="card p-6">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
            Buscá tu nombre
          </label>
          <input
            className="form-input"
            placeholder="Escribí tu nombre o apellido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          {search.length >= 2 && (
            <div className="mt-4 space-y-2 animate-fade-in">
              {filtered.length === 0 ? (
                <p className="text-sm text-[var(--color-dark-gray)]/40 text-center py-4">No se encontraron coincidencias</p>
              ) : (
                filtered.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleConfirm(r)}
                    className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/10 hover:border-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--color-deep-green)]/10 flex items-center justify-center text-[var(--color-deep-green)] font-bold text-sm">
                      {r.participant?.first_name?.charAt(0)}{r.participant?.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--color-dark-gray)]">{r.participant?.first_name} {r.participant?.last_name}</p>
                      <p className="text-xs text-[var(--color-dark-gray)]/50">{r.participant?.email || 'Sin email'}</p>
                    </div>
                    <span className="material-symbols-outlined text-[var(--color-deep-green)]">check_circle</span>
                  </button>
                ))
              )}
            </div>
          )}

          {search.length > 0 && search.length < 2 && (
            <p className="text-xs text-[var(--color-dark-gray)]/30 mt-2">Escribí al menos 2 caracteres para buscar</p>
          )}
        </div>
      </main>
    </div>
  )
}
