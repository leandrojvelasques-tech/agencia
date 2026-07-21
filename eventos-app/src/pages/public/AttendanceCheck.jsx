import { useParams } from 'react-router-dom'
import { useState, useEffect, useRef, Component } from 'react'
import { useStore } from '../../store/useStore'

// Error Boundary to prevent blank screen crashes on unexpected data
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AttendanceCheck ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
          <div className="card p-8 max-w-md w-full text-center">
            <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">error</span>
            <h2 className="text-xl font-bold text-[var(--color-deep-green)] mb-2">Ocurrió un error al cargar la asistencia</h2>
            <p className="text-xs text-[var(--color-dark-gray)]/70 mb-6">
              Por favor, recargá la página o intentá nuevamente en unos minutos.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary py-2 px-6 text-sm"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AttendanceCheckContent() {
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
      try {
        const eventData = await getEventBySlug(slug)
        if (eventData) {
          setEvent(eventData)
          await fetchEventData(eventData.id)
        }
      } catch (err) {
        console.error('Error loading event data:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [slug])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <p className="font-heading text-base font-bold text-[var(--color-deep-green)] tracking-widest animate-pulse">
            CARGANDO ASISTENCIA...
          </p>
        </div>
      </div>
    )
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

  // Safe helper to extract participant object
  const getParticipant = (r) => {
    if (!r) return {}
    let p = r.participants || r.participant
    if (Array.isArray(p)) p = p[0]
    return p || {}
  }

  // Safe helper for full name
  const getFullName = (p) => {
    const fn = (p?.first_name || '').toString().trim()
    const ln = (p?.last_name || '').toString().trim()
    const full = `${fn} ${ln}`.trim()
    return full || 'Participante sin nombre'
  }

  const eventRegs = (registrations || [])
    .filter(r => r && r.status !== 'cancelled')
    .map(r => ({
      ...r,
      participant: getParticipant(r),
    }))

  // Sort registrations alphabetically by name
  const sortedRegs = [...eventRegs].sort((a, b) => {
    const nameA = getFullName(a.participant).toLowerCase()
    const nameB = getFullName(b.participant).toLowerCase()
    return nameA.localeCompare(nameB)
  })

  // Filter list based on search term
  const searchLower = search.trim().toLowerCase()
  const filtered = searchLower !== ''
    ? sortedRegs.filter(r => {
        const p = r.participant
        const fn = (p.first_name || '').toString().toLowerCase()
        const ln = (p.last_name || '').toString().toLowerCase()
        const email = (p.email || '').toString().toLowerCase()
        return fn.includes(searchLower) || ln.includes(searchLower) || email.includes(searchLower)
      })
    : sortedRegs

  const handleConfirm = async (reg) => {
    if (!reg) return
    try {
      await markAttendance(reg.id, 'present', 'self')
      setSelectedReg(reg)
      setConfirmed(true)
    } catch (err) {
      console.error('Error marking attendance:', err)
    }
  }

  if (confirmed) {
    const p = selectedReg?.participant
    const fullName = getFullName(p)
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-[var(--color-light-green)]/30 flex items-center justify-center mx-auto mb-8">
            <span className="material-symbols-outlined text-5xl text-[var(--color-deep-green)]">check_circle</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-[var(--color-deep-green)]">¡Asistencia registrada!</h1>
          <p className="text-lg text-[var(--color-dark-gray)] font-medium mb-2">Hola, {fullName}</p>
          <p className="text-base text-[var(--color-dark-gray)]/60 mb-8">Gracias por participar en <strong>{event.title}</strong></p>
          <a href="https://www.leandrovelasques.com.ar" className="text-sm font-semibold text-[var(--color-deep-green)]/60 hover:text-[var(--color-deep-green)] transition-colors">
            leandrovelasques.com.ar
          </a>
        </div>
      </div>
    )
  }

  const selectedParticipant = selectedReg ? selectedReg.participant : null
  const selectedFullName = selectedParticipant ? getFullName(selectedParticipant) : ''

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
                    {(selectedParticipant?.first_name?.charAt(0) || selectedFullName?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-dark-gray)] leading-tight">
                      {selectedFullName}
                    </p>
                    <p className="text-[10px] text-[var(--color-dark-gray)]/50">
                      {selectedParticipant?.email || 'Sin email'}
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
                      const p = r.participant
                      const name = getFullName(p)
                      const isSelected = selectedReg?.id === r.id
                      const initial = (p?.first_name?.charAt(0) || name?.charAt(0) || '?').toUpperCase()
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
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-dark-gray)] truncate">
                              {name}
                            </p>
                            <p className="text-[10px] text-[var(--color-dark-gray)]/50 truncate">
                              {p?.email || 'Sin email'}
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

export default function AttendanceCheck() {
  return (
    <ErrorBoundary>
      <AttendanceCheckContent />
    </ErrorBoundary>
  )
}
