import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'

export default function EventParticipantsPublic() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { getEventBySlug } = useStore()

  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setError('Acceso denegado: Token de seguridad faltante.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Load event info
        const eventData = await getEventBySlug(slug)
        if (!eventData || eventData.private_link_token !== token) {
          setError('Acceso denegado: Token inválido o evento no encontrado.')
          setLoading(false)
          return
        }
        setEvent(eventData)

        // Load participants via RPC (security definer bypasses RLS)
        const { data, error: rpcErr } = await supabase.rpc('get_participants_by_token', { event_token: token })
        if (rpcErr) throw rpcErr
        setParticipants(data || [])
      } catch (err) {
        console.error(err)
        setError('Error al cargar el listado de participantes.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [slug, token])

  const filtered = participants.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  })

  const presencialCount = participants.filter(p => p.attendance_mode === 'presencial').length
  const virtualCount = participants.filter(p => p.attendance_mode === 'virtual').length

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] mb-2 block animate-spin">progress_activity</span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/40">Cargando listado de inscriptos...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">lock</span>
          <h1 className="text-xl font-extrabold text-[var(--color-deep-green)] mb-2">Acceso restringido</h1>
          <p className="text-[var(--color-dark-gray)]/60 text-sm leading-relaxed mb-6">{error || 'No tienes permisos para ver esta página.'}</p>
          <a href="https://www.leandrovelasques.com.ar" className="btn-primary inline-flex justify-center w-full">Volver al sitio principal</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] pb-12">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight hidden sm:inline">LEANDRO VELASQUES</span>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--color-deep-green)]/8 text-[var(--color-deep-green)] border border-[var(--color-deep-green)]/10 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">shield</span> Vista de Seguimiento Externa
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
        {/* Event Banner */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-1">{event.title}</h1>
            <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">Listado oficial de inscripciones para el Consejo de Ciencias Económicas</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-5 text-center bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1">Total Inscritos</p>
            <p className="text-3xl font-extrabold text-[var(--color-deep-green)]">{participants.length}</p>
          </div>
          <div className="card p-5 text-center bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1">Presenciales</p>
            <p className="text-3xl font-extrabold text-emerald-600">{presencialCount}</p>
          </div>
          <div className="card p-5 text-center bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1">Virtuales</p>
            <p className="text-3xl font-extrabold text-indigo-600">{virtualCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4 mb-4 flex items-center gap-2 bg-white shadow-sm">
          <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
          <input 
            type="text" 
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30" 
            placeholder="Buscar por nombre, apellido o email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        {/* Table list */}
        <div className="card overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre y Perfil</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Modalidad</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-[var(--color-dark-gray)]/30 font-medium">No se encontraron inscritos</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.registration_id}>
                    <td className="font-semibold text-[var(--color-dark-gray)]">
                      <div className="flex flex-col">
                        <span>{p.first_name} {p.last_name}</span>
                        {p.survey_responses && (
                          <div className="mt-2 text-[11px] text-[var(--color-dark-gray)]/60 font-normal leading-relaxed bg-[var(--color-refined-gray)]/40 p-2.5 rounded-lg border border-[var(--color-deep-green)]/10 max-w-xs space-y-0.5 shadow-sm">
                            {p.survey_responses.matriculado && <div><strong className="text-[var(--color-deep-green)]">Matrícula:</strong> {p.survey_responses.matriculado}{p.survey_responses.consejo ? ` (${p.survey_responses.consejo})` : ''}</div>}
                            {p.survey_responses.profesion && (
                              <div><strong className="text-[var(--color-deep-green)]">Profesión:</strong> {p.survey_responses.profesion}
                                {p.survey_responses.profesion === 'Estudiante Universitario' && p.survey_responses.profesion_estudiante_carrera && ` (${p.survey_responses.profesion_estudiante_carrera} en ${p.survey_responses.profesion_estudiante_univ})`}
                                {p.survey_responses.profesion === 'Otro' && p.survey_responses.profesion_otro && ` (${p.survey_responses.profesion_otro})`}
                              </div>
                            )}
                            {p.survey_responses.empleo && (
                              <div><strong className="text-[var(--color-deep-green)]">Empleo:</strong> {p.survey_responses.empleo}
                                {p.survey_responses.empleo === 'Dependiente' && p.survey_responses.empleo_empresa && ` (${p.survey_responses.empleo_empresa})`}
                                {p.survey_responses.empleo === 'Independiente' && p.survey_responses.empleo_actividad && ` (${p.survey_responses.empleo_actividad})`}
                                {p.survey_responses.empleo === 'Otro' && p.survey_responses.empleo_otro && ` (${p.survey_responses.empleo_otro})`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {p.email ? (
                        <span className="text-sm">{p.email}</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Sin email
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-[var(--color-dark-gray)]/70">{p.phone || '—'}</td>
                    <td>
                      <span className={`badge ${p.attendance_mode === 'virtual' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                        {p.attendance_mode === 'virtual' ? '💻 Virtual' : '🏫 Presencial'}
                      </span>
                    </td>
                    <td className="text-xs text-[var(--color-dark-gray)]/50">
                      {new Date(p.registered_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
