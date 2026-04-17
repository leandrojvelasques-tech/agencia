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
  const [observations, setObservations] = useState('')
  const [includeAttendees, setIncludeAttendees] = useState(true)
  const [includeAbsentees, setIncludeAbsentees] = useState(false)
  const [externalEmails, setExternalEmails] = useState('')
  const [presentationLink, setPresentationLink] = useState('')
  const [extraFiles, setExtraFiles] = useState('')
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
            Observaciones post evento <span className="normal-case text-[var(--color-dark-gray)]/30">(Opcional)</span>
          </label>
          <textarea
            className="form-input min-h-[100px]"
            placeholder="Avisos, compromisos, tareas pendientes para la próxima reunión, etc."
            value={observations}
            onChange={e => setObservations(e.target.value)}
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
          <div className="space-y-4">
            <div className="flex flex-col gap-2 bg-[var(--color-refined-gray)]/50 p-4 rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={includeAttendees} onChange={e => setIncludeAttendees(e.target.checked)} className="accent-[var(--color-deep-green)] w-4 h-4 rounded" />
                <span className="text-sm font-semibold">Incluir asistentes al evento</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={includeAbsentees} onChange={e => setIncludeAbsentees(e.target.checked)} className="accent-[var(--color-deep-green)] w-4 h-4 rounded" />
                <span className="text-sm font-semibold">Incluir inscriptos ausentes</span>
              </label>
            </div>
            
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                Emails Adicionales (externos)
              </label>
              <input
                className="form-input"
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
                value={externalEmails}
                onChange={e => setExternalEmails(e.target.value)}
              />
              <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-2">Podés ingresar varios emails separados por coma (ej: personas que no se inscribieron pero quieren el resumen).</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-deep-green)]/10">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Archivos Adjuntos (Links)</label>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                Link de la Presentación
              </label>
              <input
                className="form-input"
                placeholder="https://... (URL de Canva, Google Slides o PDF compartido)"
                value={presentationLink}
                onChange={e => setPresentationLink(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                Otros Archivos Adicionales
              </label>
              <input
                className="form-input"
                placeholder="https://... (URL a carpeta de Drive, Dropbox, etc.)"
                value={extraFiles}
                onChange={e => setExtraFiles(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="card p-6 lg:p-8 mt-6 mb-6">
        <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">visibility</span>
          Vista Previa del Email
        </h3>
        <div className="border border-[var(--color-dark-gray)]/10 rounded-[var(--radius-premium)] overflow-hidden bg-white shadow-sm">
          <div className="bg-[var(--color-refined-gray)]/50 px-4 py-3 border-b border-[var(--color-dark-gray)]/5 flex gap-2 items-center">
             <div className="flex gap-1.5 mr-4">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80"></span>
             </div>
             <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-dark-gray)]/40">Minuta - {event.title}</p>
          </div>
          <div className="p-6 md:p-10 max-w-2xl mx-auto font-sans text-gray-800">
            <h2 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-1">¡Gracias por participar!</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">Resumen de: {event.title}</p>
            
            <div className="bg-gray-50 border border-gray-100 rounded-[10px] p-5 mb-8 text-sm text-gray-700">
               <p className="mb-2"><strong>Fecha:</strong> {new Date(event.event_date + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'long' })}</p>
               <p className="mb-2"><strong>Coordinador:</strong> {event.coordinator}</p>
               {attendees.length > 0 && (
                 <div>
                   <p className="font-bold mb-1">Asistentes:</p>
                   <p className="text-gray-600 leading-relaxed text-[13px]">
                     {attendees.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                   </p>
                 </div>
               )}
            </div>

            {photoUrl && (
              <img src={photoUrl} alt="Evento" className="w-full h-auto max-h-80 object-cover rounded-[10px] mb-8 shadow-sm grayscale hover:grayscale-0 transition-all duration-700" onError={e => e.target.style.display = 'none'} />
            )}

            <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700 mb-8 border-l-2 border-[var(--color-deep-green)]/30 pl-5">
              {summary || <span className="italic text-gray-400">El resumen del evento aparecerá aquí. Los destinatarios leerán esto para entender las conclusiones y próximos pasos.</span>}
            </div>

            {observations && (
              <div className="mb-8">
                <h4 className="font-bold text-[var(--color-deep-green)] mb-3 text-sm border-b border-[var(--color-deep-green)]/10 pb-2">Observaciones y Tareas Pendientes</h4>
                <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-700 bg-amber-50 p-4 rounded-[8px] border-l-4 border-amber-400">
                  {observations}
                </div>
              </div>
            )}

            {(presentationLink || extraFiles) && (
              <div className="bg-[var(--color-refined-gray)]/30 rounded-[10px] p-6 mb-6 border border-[var(--color-deep-green)]/5">
                <h4 className="font-bold text-[var(--color-deep-green)] mb-4 text-[11px] uppercase tracking-widest">Materiales del evento</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  {presentationLink && (
                    <a href={presentationLink} onClick={e => e.preventDefault()} className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[var(--color-deep-green)] text-white px-5 py-2.5 rounded-[8px] hover:opacity-90 transition-all shadow-premium w-full sm:w-auto">
                      <span className="material-symbols-outlined text-lg">present_to_all</span>
                      Ver Presentación
                    </a>
                  )}
                  {extraFiles && (
                    <a href={extraFiles} onClick={e => e.preventDefault()} className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-white text-[var(--color-deep-green)] border border-[var(--color-deep-green)]/20 px-5 py-2.5 rounded-[8px] hover:bg-gray-50 transition-all w-full sm:w-auto">
                      <span className="material-symbols-outlined text-lg">folder_open</span>
                      Ver Archivos Adicionales
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <hr className="border-gray-100 my-8" />
            <p className="text-xs text-gray-400 text-center font-medium uppercase tracking-widest">Enviado por Leandro Velasques</p>
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
