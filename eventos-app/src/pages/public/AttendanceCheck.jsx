import { useParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'

export default function AttendanceCheck() {
  const { slug } = useParams()
  const { getEventBySlug, fetchEventData, registrations, markAttendance } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [selectedReg, setSelectedReg] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

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

  // Sort registrations alphabetically by name
  const sortedRegs = [...eventRegs].sort((a, b) => {
    const nameA = `${a.participant?.first_name || ''} ${a.participant?.last_name || ''}`.trim().toLowerCase()
    const nameB = `${b.participant?.first_name || ''} ${b.participant?.last_name || ''}`.trim().toLowerCase()
    return nameA.localeCompare(nameB)
  })

  // Filter list based on search term
  const filtered = search.trim() !== ''
    ? sortedRegs.filter(r =>
        r.participant?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.participant?.last_name?.toLowerCase().includes(search.toLowerCase())
      )
    : sortedRegs

  const handleConfirm = async (reg) => {
    await markAttendance(reg.id, 'present', 'self')
    setSelectedReg(reg)
    setConfirmed(true)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

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

        <div className="card p-6" ref={dropdownRef}>
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
            Buscá tu nombre
          </label>
          
          <div className="relative">
            {/* Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between p-4 bg-[var(--color-refined-gray)] rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/10 hover:border-[var(--color-deep-green)]/30 transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
            >
              {selectedReg ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-deep-green)]/10 flex items-center justify-center text-[var(--color-deep-green)] font-bold text-xs shrink-0">
                    {selectedReg.participant?.first_name?.charAt(0)}{selectedReg.participant?.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-dark-gray)] leading-tight">
                      {selectedReg.participant?.first_name} {selectedReg.participant?.last_name}
                    </p>
                    <p className="text-[10px] text-[var(--color-dark-gray)]/50">
                      {selectedReg.participant?.email || 'Sin email'}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-[var(--color-dark-gray)]/40 font-medium">
                  Seleccioná tu nombre de la lista...
                </span>
              )}
              <span className="material-symbols-outlined text-[var(--color-dark-gray)]/60 select-none">
                {isOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown Dropbox Menu */}
            {isOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-[var(--color-deep-green)]/10 rounded-[var(--radius-premium)] shadow-[var(--shadow-premium)] z-50 overflow-hidden animate-fade-in">
                {/* Search field inside dropdown */}
                <div className="p-3 border-b border-[var(--color-refined-gray)] sticky top-0 bg-white z-10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[var(--color-dark-gray)]/40 select-none">
                    search
                  </span>
                  <input
                    type="text"
                    ref={searchInputRef}
                    className="w-full text-sm outline-none bg-transparent py-1 text-[var(--color-dark-gray)] font-medium"
                    placeholder="Buscar por nombre o apellido..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="material-symbols-outlined text-sm text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/85 select-none focus:outline-none"
                    >
                      close
                    </button>
                  )}
                </div>

                {/* Dropdown Items list */}
                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-[var(--color-dark-gray)]/45 text-center py-6">
                      No se encontraron coincidencias
                    </p>
                  ) : (
                    filtered.map(r => {
                      const isSelected = selectedReg?.id === r.id
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedReg(r)
                            setIsOpen(false)
                            setSearch('')
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--color-deep-green)]/10 border-l-4 border-[var(--color-deep-green)]'
                              : 'hover:bg-[var(--color-deep-green)]/5'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-[var(--color-deep-green)]/10 flex items-center justify-center text-[var(--color-deep-green)] font-bold text-xs shrink-0">
                            {r.participant?.first_name?.charAt(0)}{r.participant?.last_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-dark-gray)] truncate">
                              {r.participant?.first_name} {r.participant?.last_name}
                            </p>
                            <p className="text-[10px] text-[var(--color-dark-gray)]/50 truncate">
                              {r.participant?.email || 'Sin email'}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-sm text-[var(--color-deep-green)] shrink-0 select-none">
                              check
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="mt-6">
            <button
              onClick={() => selectedReg && handleConfirm(selectedReg)}
              disabled={!selectedReg}
              className="w-full btn-primary py-4 text-center justify-center font-bold tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">how_to_reg</span>
              Confirmar asistencia
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
