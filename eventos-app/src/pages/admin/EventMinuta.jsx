import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function EventMinuta() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, attendance, updateParticipantManual, updateEvent } = useStore()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSent, setIsSent] = useState(false)
  const [sentAt, setSentAt] = useState(null)

  const [summary, setSummary] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [observations, setObservations] = useState([''])
  const [includeAttendees, setIncludeAttendees] = useState(true)
  const [includeAbsentees, setIncludeAbsentees] = useState(false)
  const [externalEmails, setExternalEmails] = useState('')
  const [presentationLink, setPresentationLink] = useState('')
  const [extraFiles, setExtraFiles] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const eventData = await getEventById(id)
      setEvent(eventData)
      await fetchEventData(id)

      const draft = localStorage.getItem(`minuta_draft_${id}`)
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
          if (parsed.summary) setSummary(parsed.summary)
          if (parsed.photoUrl) setPhotoUrl(parsed.photoUrl)
          if (parsed.observations) setObservations(parsed.observations)
          if (parsed.presentationLink) setPresentationLink(parsed.presentationLink)
          if (parsed.extraFiles) setExtraFiles(parsed.extraFiles)
          if (parsed.includeAttendees !== undefined) setIncludeAttendees(parsed.includeAttendees)
          if (parsed.includeAbsentees !== undefined) setIncludeAbsentees(parsed.includeAbsentees)
          if (parsed.externalEmails) setExternalEmails(parsed.externalEmails)
        } catch (e) {
          console.error("Error loading draft", e)
        }
      }
      setLoading(false)
    }

    const checkSentStatus = async () => {
      const { data } = await supabase.from('event_reports').select('*').eq('event_id', id).maybeSingle()
      if (data && data.sent) {
        setIsSent(true)
        setSentAt(data.sent_at)
        // If we don't have a fresh draft, use the DB values
        const draft = localStorage.getItem(`minuta_draft_${id}`)
        if (!draft) {
          if (data.summary) setSummary(data.summary)
          if (data.photo_url) setPhotoUrl(data.photo_url)
          // Note: observations and other fields should be added to the DB schema if needed
        }
      }
    }

    loadData()
    checkSentStatus()
  }, [id])

  if (loading) return <div className="text-center py-20"><p className="animate-pulse">Cargando...</p></div>
  if (!event) return <div className="text-center py-20"><p>Evento no encontrado</p></div>

  const attendees = registrations
    .filter(r => {
      const att = attendance.find(a => a.registration_id === r.id)
      return att?.status === 'present' || att?.status === 'late'
    })
    .map(r => r.participants || r.participant)
    .filter(Boolean)

  const handleSaveDraft = () => {
    const draft = {
      summary,
      photoUrl,
      observations,
      presentationLink,
      extraFiles,
      includeAttendees,
      includeAbsentees,
      externalEmails
    }
    localStorage.setItem(`minuta_draft_${id}`, JSON.stringify(draft))
    setToast('Borrador guardado exitosamente en este dispositivo')
    setTimeout(() => setToast(''), 3000)
  }

  const handleSend = async () => {
    if (!summary) {
      setToast('El resumen es obligatorio')
      setTimeout(() => setToast(''), 3000)
      return
    }
    
    // Data safety checks
    if (!event) {
      setToast('Error: Datos del evento no cargados')
      setSending(false)
      return
    }

    // Construct payload with safety filters
    // Construct payload with correct data mapping
    // 1. Obtener asistencia y registros frescos de la store
    const localAttendance = Array.isArray(attendance) ? attendance : []
    const localRegistrations = Array.isArray(registrations) ? registrations : []

    // Helper para lidiar con el formato de Supabase (a veces trae array, a veces objeto)
    const getParticipant = (r) => {
      let p = r.participants || r.participant
      if (Array.isArray(p)) return p[0]
      return p
    }

    if (localRegistrations.length > 0) {
      console.log('ESTRUCTURA DE UN REGISTRO:', localRegistrations[0])
    }

    // 2. Filtrar exactamente como el preview
    const presentRegs = localRegistrations.filter(r => {
      const att = localAttendance.find(a => a.registration_id === r.id)
      return att?.status === 'present' || att?.status === 'late'
    })

    const absentRegs = localRegistrations.filter(r => {
      const att = localAttendance.find(a => a.registration_id === r.id)
      return !att || (att.status !== 'present' && att.status !== 'late')
    })
    
    // 3. Extraer emails con helper
    const attendeeEmails = includeAttendees 
      ? presentRegs.map(r => getParticipant(r)?.email).filter(Boolean)
      : []
    
    const absenteeEmails = includeAbsentees
      ? absentRegs.map(r => getParticipant(r)?.email).filter(Boolean)
      : []

    const externalEmailsList = externalEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))

    const finalEmails = [...new Set([...attendeeEmails, ...absenteeEmails, ...externalEmailsList])]

    const payload = {
      eventId: id,
      eventTitle: event?.title || 'Evento',
      eventDate: event?.event_date,
      coordinator: event?.coordinator,
      summary,
      observations: observations.filter(o => o.trim()),
      photoUrl,
      presentationLink,
      extraFiles: extraFiles ? [extraFiles] : [],
      attendees: includeAttendees ? presentRegs.map(r => {
        const p = getParticipant(r)
        return `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
      }).filter(Boolean) : [],
      absentees: includeAbsentees ? absentRegs.map(r => {
        const p = getParticipant(r)
        return `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
      }).filter(Boolean) : [],
      emails: finalEmails
    }

    console.log('DEBUG MINUTA PAYLOAD:', payload)

    if (payload.emails.length === 0) {
      setToast('Atención: No hay destinatarios. Verificá que los asistentes tengan email o agregá uno externo.')
      setTimeout(() => setToast(''), 5000)
      setSending(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const webhookUrl = 'https://leandro-velasques-n8n.dwocd5.easypanel.host/webhook/minuta-evento'
      console.log('Iniciando fetch a n8n...', payload)
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) throw new Error(`n8n respondió con error ${response.status}`)
      
      console.log('¡Respuesta de n8n recibida exitosamente!')

      // Registrar en BDD como enviado
      const { error: dbError } = await supabase.from('event_reports').upsert({
        event_id: id,
        summary: summary,
        photo_url: photoUrl,
        sent: true,
        sent_at: new Date().toISOString()
      }, { onConflict: 'event_id' })

      if(!dbError) {
        setIsSent(true)
        setSentAt(new Date().toISOString())
        await updateEvent(id, { status: 'completed' })
      }
      
      localStorage.removeItem(`minuta_draft_${id}`)
      setSent(true)
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Error detallado:', err)
      
      let errorMsg = err.name === 'AbortError' 
        ? 'Tiempo de espera agotado (15s). n8n no responde.' 
        : 'Error: ' + err.message

      setToast(errorMsg)
      setTimeout(() => setToast(''), 6000)
    } finally {
      setSending(false)
    }
  }

  const handleAddObservation = () => {
    setObservations([...observations, ''])
  }

  const handleObservationChange = (index, value) => {
    const newObservations = [...observations]
    newObservations[index] = value
    setObservations(newObservations)
  }

  const handleRemoveObservation = (index) => {
    const newObservations = observations.filter((_, i) => i !== index)
    setObservations(newObservations.length ? newObservations : [''])
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
      {toast && (
        <div className="fixed top-4 right-4 bg-[var(--color-deep-green)] text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/admin/eventos/${id}`} className="btn-ghost !p-2">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Minuta Post-Evento</h1>
          <p className="text-[15px] max-w-2xl text-[var(--color-dark-gray)]/80 mt-2 mb-6">
            Redactá el resumen del evento, subí fotos, adjuntos extra o comentarios, y generá la Minuta Final que recibirán los asistentes.
          </p>
        </div>
      </div>

      {isSent && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between mb-8 shadow-sm border border-green-200 gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
            <div>
              <span className="font-bold block text-sm">Minuta Enviada {sentAt ? `el ${new Date(sentAt).toLocaleDateString()}` : ''}</span>
              <span className="text-xs block opacity-80">El evento figura como Finalizado de cara al público.</span>
            </div>
          </div>
          <span className="text-xs bg-white/60 px-3 py-1.5 rounded-full font-semibold border border-green-100">Podés editar y reenviar debajo</span>
        </div>
      )}

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

        <div className="pt-4 border-t border-[var(--color-deep-green)]/10 space-y-4">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">
            Observaciones post evento <span className="normal-case text-[var(--color-dark-gray)]/30">(Opcionales)</span>
          </label>
          
          {observations.map((obs, index) => (
            <div key={index} className="relative bg-[var(--color-refined-gray)]/30 p-3 rounded-[8px] border border-[var(--color-dark-gray)]/5">
               <label className="text-[10px] font-bold text-[var(--color-dark-gray)]/50 mb-2 flex justify-between items-center">
                 <span>Observación {index + 1}</span>
                 {observations.length > 1 && (
                    <button type="button" onClick={() => handleRemoveObservation(index)} className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      Eliminar
                    </button>
                 )}
               </label>
               <textarea className="form-input min-h-[60px]" placeholder="Avisos, compromisos, temas para la próxima reunión, etc." value={obs} onChange={e => handleObservationChange(index, e.target.value)} />
            </div>
          ))}

          <button type="button" onClick={handleAddObservation} className="btn-secondary !text-xs !py-2 w-full border-dashed border-[var(--color-deep-green)]/30 hover:bg-[var(--color-deep-green)]/5">
             <span className="material-symbols-outlined text-base">add_circle</span>
             Agregar nueva observación
          </button>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
            Foto del evento <span className="normal-case text-[var(--color-dark-gray)]/30">(Link a imagen)</span>
          </label>
          <input
            className="form-input"
            placeholder="Link directo a la imagen, JPG o PNG..."
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
          />
          <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-2">
            <strong>¿Cómo subirla?</strong> Por ahora no se suben fotos directo al sistema por políticas de peso. Tenés que subir la foto a <strong>Google Drive o Google Photos</strong>, configurarla para que "Cualquier persona con el link pueda verla" y pegar acá ese enlace abierto.
          </p>
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
              <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-1">Asegurate de que el permiso diga "Cualquier persona con el enlace puede leer".</p>
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

      <div className="card p-6 lg:p-8 mt-6 mb-6">
        <h3 className="text-sm font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-widest mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">visibility</span>
            Vista Previa del Email
          </span>
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

            <div className="mb-8 mt-2">
              <h4 className="text-[13px] font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-3 border-b-2 border-gray-100 pb-2">Resumen del Evento</h4>
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700 border-l-3 border-[var(--color-deep-green)]/30 pl-4 py-1">
                {summary || <span className="italic text-gray-400">El resumen del evento aparecerá aquí...</span>}
              </div>
            </div>

            {observations.filter(o => o.trim()).length > 0 && (
              <div className="mb-8">
                <h4 className="font-bold text-[var(--color-deep-green)] mb-3 text-sm border-b border-[var(--color-deep-green)]/10 pb-2">Observaciones y Siguientes Pasos</h4>
                <div className="space-y-4 bg-amber-50 p-5 rounded-[8px] border-l-4 border-amber-400">
                  {observations.filter(o => o.trim()).map((obs, index) => (
                    <div key={index} className={index > 0 ? "pt-4 border-t border-amber-200/50" : ""}>
                      <p className="text-[11px] uppercase font-bold text-amber-800 tracking-wider mb-1">Observación {index + 1}</p>
                      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-700">{obs}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(photoUrl || presentationLink || extraFiles) && (
              <div className="mt-8 pt-6 border-t border-[var(--color-dark-gray)]/10">
                <h4 className="text-[13px] font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-4">Materiales del Evento</h4>
                
                {presentationLink && (
                  <div className="mb-3">
                    <a href={presentationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-refined-gray)] hover:bg-gray-200 rounded-[var(--radius-normal)] text-sm font-bold text-[var(--color-deep-green)] transition-colors">
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      Ver Presentación Utilizada
                    </a>
                  </div>
                )}
                
                {photoUrl && (
                  <div className="mb-3">
                    <a href={photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-refined-gray)] hover:bg-gray-200 rounded-[var(--radius-normal)] text-sm font-bold text-[var(--color-deep-green)] transition-colors">
                      <span className="material-symbols-outlined text-[18px]">photo_library</span>
                      Ver Álbum / Foto del Evento
                    </a>
                  </div>
                )}

                {extraFiles && (
                  <a href={extraFiles} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-refined-gray)] hover:bg-gray-200 rounded-[var(--radius-normal)] text-sm font-bold text-[var(--color-deep-green)] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">folder_open</span>
                    Ver Archivos Adicionales
                  </a>
                )}
              </div>
            )}
            
            <hr className="border-gray-100 my-8" />
            <p className="text-xs text-gray-400 text-center font-medium uppercase tracking-widest">Enviado por Leandro Velasques</p>
          </div>
        </div>
      </div>

      <div className="card p-4 border-t-4 border-t-[var(--color-deep-green)] sticky bottom-6 z-40 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="hidden sm:block">
          <h3 className="font-extrabold text-base text-[var(--color-deep-green)]">Acciones</h3>
          {!summary && <p className="text-[10px] text-red-500 font-semibold m-0 mt-0.5">El resumen es obligatorio</p>}
        </div>
        
        <div className="flex w-full sm:w-auto gap-3">
          <button className="btn-secondary flex-1 sm:flex-none !py-3 !px-5 flex items-center justify-center gap-2 text-sm whitespace-nowrap" onClick={handleSaveDraft}>
            <span className="material-symbols-outlined text-[18px]">save</span>
            Guardar Borrador
          </button>
  
          <button 
            onClick={handleSend} 
            className="btn-primary flex-1 sm:flex-none !py-3 !px-7 flex items-center justify-center gap-2 text-sm whitespace-nowrap disabled:opacity-50" 
            disabled={!summary || sending}
          >
            {sending ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Enviando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">{isSent ? 'forward_to_inbox' : 'send'}</span>
                {isSent ? 'Reenviar Corregida' : 'Enviar Oficial'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
