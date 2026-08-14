import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const programFromAgenda = (agenda) => {
  if (!Array.isArray(agenda)) return ''

  return agenda.flatMap((item) => {
    const heading = [item?.title, !Array.isArray(item?.blocks) ? item?.description : ''].filter(Boolean)
    const blocks = Array.isArray(item?.blocks)
      ? item.blocks
        .map((block) => [block?.title, block?.subtitle, block?.description].filter(Boolean).join(' — '))
        .filter(Boolean)
        .map((block) => `• ${block}`)
      : []
    return [...heading, ...blocks]
  }).join('\n')
}

export default function EventMinuta() {
  const { id } = useParams()
  const { getEventById, fetchEventData, registrations, attendance, updateParticipantManual, updateEvent } = useStore()
  const [event, setEvent] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSent, setIsSent] = useState(false)
  const [sentAt, setSentAt] = useState(null)

  const [summary, setSummary] = useState('')
  const [program, setProgram] = useState('')
  const [includeProgram, setIncludeProgram] = useState(true)
  const [photoUrl, setPhotoUrl] = useState('')
  const [observations, setObservations] = useState([''])
  const [includeAttendees, setIncludeAttendees] = useState(true)
  const [includeAbsentees, setIncludeAbsentees] = useState(true)
  const [externalEmails, setExternalEmails] = useState('')
  const [presentationLink, setPresentationLink] = useState('')
  const [extraFiles, setExtraFiles] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [uploadingField, setUploadingField] = useState(null)
  const [includeSurvey, setIncludeSurvey] = useState(true)
  const [includeAttendanceLink, setIncludeAttendanceLink] = useState(true)
  
  // Test send state
  const [testEmail, setTestEmail] = useState('info@leandrovelasques.com.ar')
  const [testingMinuta, setTestingMinuta] = useState(false)

  // Presentation & Slide selection state
  const [crmPresentations, setCrmPresentations] = useState([])
  const [selectedPresentationId, setSelectedPresentationId] = useState('')
  const [selectedSlideId, setSelectedSlideId] = useState('')
  const [attachedSlideInfo, setAttachedSlideInfo] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        let eventData = await getEventById(id)
        if (!eventData) {
          const { data: d1 } = await supabase.from('events').select('*, event_materials(*)').eq('id', id).maybeSingle()
          eventData = d1
        }
        if (!eventData) {
          const { data: d2 } = await supabase.from('events').select('*, event_materials(*)').eq('slug', id).maybeSingle()
          eventData = d2
        }

        setEvent(eventData)

        if (eventData) {
          const targetId = eventData.id || id
          await fetchEventData(targetId)
          const suggestedProgram = programFromAgenda(eventData.agenda)

          if (eventData.client_id) {
            const { data: clientData, error: clientError } = await supabase
              .from('crm_clients')
              .select('id, name, company, logo_url')
              .eq('id', eventData.client_id)
              .maybeSingle()
            if (clientError) console.error('Error loading event client:', clientError)
            else setClient(clientData)
          } else {
            setClient(null)
          }

          // Auto populate presentation link if materials exist
          if (eventData.event_materials && Array.isArray(eventData.event_materials)) {
            const presMat = eventData.event_materials.find(m => m.type === 'presentation' || m.url?.includes('.pdf'))
            if (presMat?.url) {
              setPresentationLink(presMat.url)
            }
          }

          // Fetch CRM presentations
          try {
            let { data: presData, error: presErr } = await supabase
              .from('crm_presentations')
              .select('*')
              .order('updated_at', { ascending: false })

            if (presErr) {
              console.warn('Fallback: Error al consultar crm_presentations con select(*), reintentando...', presErr)
              const fallbackRes = await supabase.from('crm_presentations').select('id, title')
              presData = fallbackRes.data
            }

            if (presData && presData.length > 0) {
              setCrmPresentations(presData)
              const match = presData.find(p => p.event_id === targetId)
              if (match) {
                setSelectedPresentationId(match.id)
                const presLink = match.pdf_url || `${window.location.origin}/presentacion/${match.id}`
                setPresentationLink(presLink)
                if (match.slides && Array.isArray(match.slides) && match.slides.length > 0) {
                  const sl = match.slides[0]
                  setSelectedSlideId(sl.id || 'slide-0')
                  setAttachedSlideInfo({
                    presentationId: match.id,
                    presentationTitle: match.title,
                    slideId: sl.id || 'slide-0',
                    slideTitle: sl.title || 'Diapositiva 1',
                    mediaUrl: sl.mediaUrl || '',
                    ficha: sl.ficha || null,
                    notes: sl.notes || ''
                  })
                }
              }
            }
          } catch (err) {
            console.error('Error fetching CRM presentations:', err)
          }

          // Load draft if available
          const draft = localStorage.getItem(`minuta_draft_${targetId}`) || localStorage.getItem(`minuta_draft_${id}`)
          if (draft) {
            try {
              const parsed = JSON.parse(draft)
              if (parsed.summary) setSummary(parsed.summary)
              if (parsed.program !== undefined) setProgram(parsed.program)
              else setProgram(suggestedProgram)
              if (parsed.includeProgram !== undefined) setIncludeProgram(parsed.includeProgram)
              if (parsed.photoUrl) setPhotoUrl(parsed.photoUrl)
              if (Array.isArray(parsed.observations)) setObservations(parsed.observations)
              if (parsed.presentationLink) setPresentationLink(parsed.presentationLink)
              if (parsed.extraFiles) setExtraFiles(parsed.extraFiles)
              if (parsed.includeAttendees !== undefined) setIncludeAttendees(parsed.includeAttendees)
              if (parsed.includeAbsentees !== undefined) setIncludeAbsentees(parsed.includeAbsentees)
              if (parsed.externalEmails) setExternalEmails(parsed.externalEmails)
              if (parsed.includeSurvey !== undefined) setIncludeSurvey(parsed.includeSurvey)
              if (parsed.selectedPresentationId) setSelectedPresentationId(parsed.selectedPresentationId)
              if (parsed.selectedSlideId) setSelectedSlideId(parsed.selectedSlideId)
              if (parsed.attachedSlideInfo) setAttachedSlideInfo(parsed.attachedSlideInfo)
            } catch (e) {
              console.error("Error loading draft", e)
              setProgram(suggestedProgram)
            }
          } else {
            setProgram(suggestedProgram)
          }

          // Check sent status
          try {
            const { data: reportData } = await supabase.from('event_reports').select('*').eq('event_id', targetId).maybeSingle()
            if (reportData && reportData.sent) {
              setIsSent(true)
              setSentAt(reportData.sent_at)
              const draft = localStorage.getItem(`minuta_draft_${targetId}`)
              if (!draft) {
                if (reportData.summary) setSummary(reportData.summary)
                if (reportData.photo_url) setPhotoUrl(reportData.photo_url)
                if (reportData.program) setProgram(reportData.program)
                if (reportData.include_program !== undefined) setIncludeProgram(reportData.include_program)
              }
            }
          } catch (err) {
            console.error('Error checking sent status:', err)
          }
        }
      } catch (err) {
        console.error('Error loading minuta data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  // Sincronizar automáticamente el enlace de la presentación cuando cambie la selección o las presentaciones carguen
  useEffect(() => {
    if (selectedPresentationId && crmPresentations.length > 0) {
      const pres = crmPresentations.find(p => String(p.id) === String(selectedPresentationId))
      if (pres) {
        const link = pres.pdf_url || `${window.location.origin}/presentacion/${pres.id}`
        setPresentationLink(prev => prev || link)

        if (!attachedSlideInfo) {
          if (pres.slides && Array.isArray(pres.slides) && pres.slides.length > 0) {
            const sl = pres.slides[0]
            setSelectedSlideId(sl.id || 'slide-0')
            setAttachedSlideInfo({
              presentationId: pres.id,
              presentationTitle: pres.title,
              slideId: sl.id || 'slide-0',
              slideTitle: sl.title || 'Diapositiva 1',
              mediaUrl: sl.mediaUrl || '',
              ficha: sl.ficha || null,
              notes: sl.notes || ''
            })
          } else {
            setAttachedSlideInfo({
              presentationId: pres.id,
              presentationTitle: pres.title,
              slideId: 'slide-0',
              slideTitle: 'Presentación Completa',
              mediaUrl: '',
              ficha: null,
              notes: ''
            })
          }
        }
      }
    }
  }, [selectedPresentationId, crmPresentations])

  if (loading) return <div className="text-center py-20"><p className="animate-pulse text-[var(--color-deep-green)] font-bold">Cargando minuta...</p></div>
  if (!event) return <div className="text-center py-20"><p className="text-gray-600">Evento no encontrado</p></div>

  const attendees = (registrations || [])
    .filter(r => {
      const att = (attendance || []).find(a => a.registration_id === r.id)
      return att?.status === 'present' || att?.status === 'late'
    })
    .map(r => {
      let p = r.participants || r.participant
      if (Array.isArray(p)) return p[0]
      return p
    })
    .filter(Boolean)

  const formattedEventDate = (() => {
    if (!event?.event_date) return ''
    try {
      const d = new Date(event.event_date.includes('T') ? event.event_date : event.event_date + 'T12:00:00')
      return isNaN(d.getTime()) ? event.event_date : d.toLocaleDateString('es-AR', { dateStyle: 'long' })
    } catch {
      return event.event_date
    }
  })()

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Supabase Free Tier maximum file size limit (50MB)
    const MAX_SIZE_MB = 50
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
    if (file.size > MAX_SIZE_BYTES) {
      alert(`El archivo es demasiado grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). La cuenta de Supabase tiene un límite de ${MAX_SIZE_MB} MB por archivo.\n\nTe recomendamos:\n1. Si es la presentación, descárgala de nuevo como PDF (ahora son mucho más ligeros).\n2. Si es otro archivo grande, súbelo a Google Drive/Dropbox y pega el enlace directo.`);
      return
    }

    setUploadingField(field)
    try {
      const ext = file.name.split('.').pop()
      const folder = field === 'photo' ? 'minuta-photos' : field === 'presentation' ? 'minuta-presentations' : 'minuta-files'
      const fileName = `${folder}/minuta-${id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
      
      const { error: upErr } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true, contentType: file.type })
      
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName)
      
      if (field === 'photo') {
        setPhotoUrl(publicUrl)
      } else if (field === 'presentation') {
        setPresentationLink(publicUrl)
      } else if (field === 'extra') {
        setExtraFiles(publicUrl)
      }
      
      setToast('Archivo subido correctamente')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      console.error('Error al subir archivo:', err)
      setToast('Error al subir el archivo: ' + err.message)
      setTimeout(() => setToast(''), 5000)
    } finally {
      setUploadingField(null)
    }
  }

  const handleSaveDraft = () => {
    const draft = {
      summary,
      program,
      includeProgram,
      photoUrl,
      observations,
      presentationLink,
      extraFiles,
      includeAttendees,
      includeAbsentees,
      externalEmails,
      includeSurvey,
      selectedPresentationId,
      selectedSlideId,
      attachedSlideInfo
    }
    localStorage.setItem(`minuta_draft_${id}`, JSON.stringify(draft))
    setToast('Borrador guardado exitosamente en este dispositivo')
    setTimeout(() => setToast(''), 3000)
  }

  const handleTestSend = async () => {
    if (!summary) {
      setToast('El resumen es obligatorio para hacer la prueba')
      setTimeout(() => setToast(''), 3000)
      return
    }

    if (!testEmail || !testEmail.includes('@')) {
      setToast('Ingresá un correo de prueba válido.')
      setTimeout(() => setToast(''), 3000)
      return
    }

    setTestingMinuta(true)
    
    // Construct payload for test send
    const localAttendance = Array.isArray(attendance) ? attendance : []
    const localRegistrations = Array.isArray(registrations) ? registrations : []

    const getParticipant = (r) => {
      let p = r.participants || r.participant
      if (Array.isArray(p)) return p[0]
      return p
    }

    const presentRegs = localRegistrations.filter(r => {
      const att = localAttendance.find(a => a.registration_id === r.id)
      return att?.status === 'present' || att?.status === 'late'
    })

    const displayCoordinator = event?.coordinator === 'Leandro Velasques' 
      ? 'Lic. Leandro Velasques' 
      : event?.coordinator

    const payload = {
      eventId: id,
      eventTitle: event?.title || 'Evento',
      eventDate: event?.event_date,
      coordinator: displayCoordinator,
      summary: summary + '\n\n*(Este es un envío de prueba individual)*',
      program: includeProgram ? program : '',
      client: client ? { name: client.company || client.name, logoUrl: client.logo_url || '' } : null,
      observations: observations.filter(o => o.trim()),
      photoUrl,
      presentationLink,
      attachedSlideInfo,
      extraFiles: extraFiles ? [extraFiles] : [],
      attendees: includeAttendees ? presentRegs.map(r => {
        const p = getParticipant(r)
        return `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
      }).filter(Boolean) : [],
      emails: [testEmail.trim()],
      surveyLink: includeSurvey ? `${window.location.origin}/encuesta/${event.slug}` : null,
      attendanceLink: includeAttendanceLink ? `${window.location.origin}/evento/${event.slug}/asistencia` : null
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch('/api/send-minuta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `El servidor respondió con error ${res.status}`)
      }

      setToast(`¡Minuta de prueba enviada exitosamente a ${testEmail}!`)
      setTimeout(() => setToast(''), 5000)
    } catch (err) {
      clearTimeout(timeoutId)
      const errorMsg = err.name === 'AbortError' 
        ? 'Tiempo de espera agotado (15s).' 
        : 'Error: ' + err.message
      setToast(errorMsg)
      setTimeout(() => setToast(''), 6000)
    } finally {
      setTestingMinuta(false)
    }
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

    const displayCoordinator = event?.coordinator === 'Leandro Velasques' 
      ? 'Lic. Leandro Velasques' 
      : event?.coordinator

    const payload = {
      eventId: id,
      eventTitle: event?.title || 'Evento',
      eventDate: event?.event_date,
      coordinator: displayCoordinator,
      summary,
      program: includeProgram ? program : '',
      client: client ? { name: client.company || client.name, logoUrl: client.logo_url || '' } : null,
      observations: observations.filter(o => o.trim()),
      photoUrl,
      presentationLink,
      attachedSlideInfo,
      extraFiles: extraFiles ? [extraFiles] : [],
      attendees: includeAttendees ? presentRegs.map(r => {
        const p = getParticipant(r)
        return `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
      }).filter(Boolean) : [],
      absentees: includeAbsentees ? absentRegs.map(r => {
        const p = getParticipant(r)
        return `${p?.first_name || ''} ${p?.last_name || ''}`.trim()
      }).filter(Boolean) : [],
      emails: finalEmails,
      surveyLink: includeSurvey ? `${window.location.origin}/encuesta/${event.slug}` : null,
      attendanceLink: includeAttendanceLink ? `${window.location.origin}/evento/${event.slug}/asistencia` : null
    }

    console.log('DEBUG MINUTA PAYLOAD:', payload)

    if (payload.emails.length === 0) {
      setToast('Atención: No hay destinatarios. Verificá que los asistentes tengan email o agregá uno externo.')
      setTimeout(() => setToast(''), 5000)
      setSending(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout for batched sending

    try {
      const apiUrl = '/api/send-minuta'
      console.log('Iniciando fetch a backend...', payload)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `El servidor respondió con error ${response.status}`);
      }
      
      console.log('¡Respuesta del servidor recibida exitosamente!')

      // Registrar en BDD como enviado
      const { error: dbError } = await supabase.from('event_reports').upsert({
        event_id: id,
        summary: summary,
        program,
        include_program: includeProgram,
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

        <div className="pt-4 border-t border-[var(--color-deep-green)]/10">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">
                Programa tratado
              </label>
              <p className="text-[11px] text-[var(--color-dark-gray)]/50 mt-1">
                Se precarga desde la agenda del evento. Podés corregirlo para reflejar los temas y propuestas que efectivamente se vieron.
              </p>
            </div>
            <label className="flex items-center gap-2 shrink-0 cursor-pointer text-xs font-semibold text-[var(--color-deep-green)]">
              <input type="checkbox" checked={includeProgram} onChange={e => setIncludeProgram(e.target.checked)} className="accent-[var(--color-deep-green)] w-4 h-4 rounded" />
              Incluir
            </label>
          </div>
          <textarea
            className="form-input min-h-[150px]"
            placeholder={'Ej. Introducción a la IA aplicada\n• Casos de uso administrativos\n• Propuestas y próximos pasos'}
            value={program}
            onChange={e => setProgram(e.target.value)}
            disabled={!includeProgram}
          />
          {!includeProgram && <p className="text-[10px] text-[var(--color-dark-gray)]/45 mt-2">El programa se conservará en el borrador, pero no se enviará en esta minuta.</p>}
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
            Foto del evento
          </label>
          <div className="flex gap-2">
            <input
              className="form-input flex-1"
              placeholder="Enlace directo a la imagen o subí una desde tu PC..."
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
            />
            <label className={`btn-secondary flex items-center justify-center gap-1.5 cursor-pointer px-4 text-xs font-bold shrink-0 ${uploadingField === 'photo' ? 'opacity-55 pointer-events-none' : ''}`}>
              {uploadingField === 'photo' ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Subiendo...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Subir Foto
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileUpload(e, 'photo')}
                disabled={uploadingField !== null}
              />
            </label>
          </div>
          <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-2">
            Podés pegar una dirección web de imagen o subir un archivo directamente.
          </p>
          {photoUrl && (
            <div className="relative mt-3 group">
              <img src={photoUrl} alt="Preview" className="rounded-[var(--radius-card)] max-h-48 object-cover w-full" onError={e => e.target.style.display = 'none'} />
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 transition-colors shadow-md flex items-center justify-center cursor-pointer"
                title="Quitar foto"
              >
                <span className="material-symbols-outlined text-sm leading-none">close</span>
              </button>
            </div>
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
              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-[var(--color-deep-green)]/10 mt-1">
                <input type="checkbox" checked={includeSurvey} onChange={e => setIncludeSurvey(e.target.checked)} className="accent-[var(--color-deep-green)] w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-[var(--color-deep-green)]">⭐ Incluir link a Encuesta de Satisfacción</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input type="checkbox" checked={includeAttendanceLink} onChange={e => setIncludeAttendanceLink(e.target.checked)} className="accent-[var(--color-deep-green)] w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-emerald-800">📋 Incluir link de Marcación de Asistencia (por si no pudieron marcar)</span>
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

            {/* Envío de Prueba */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 mt-4">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">mark_email_unread</span>
                Envío de Prueba Individual (Minuta)
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="form-input text-xs flex-1 bg-white"
                  placeholder="info@leandrovelasques.com.ar"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={testingMinuta}
                  className="btn-secondary !py-2 text-xs font-bold shrink-0"
                >
                  {testingMinuta ? 'Enviando prueba...' : 'Enviar Prueba'}
                </button>
              </div>
              <p className="text-[9px] text-amber-800/70">
                Se enviará una copia del diseño actual de la minuta únicamente al correo especificado.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-deep-green)]/10">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-3 block">Archivos Adjuntos</label>
          <div className="space-y-4">
            {/* Selector de Presentación del Evento */}
            <div className="p-4 bg-[var(--color-refined-gray)]/50 rounded-xl border border-[var(--color-deep-green)]/10 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-deep-green)] block flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">slideshow</span>
                Seleccionar Presentación del Evento (CRM)
              </label>
              
              <div>
                <select
                  className="form-input text-xs"
                  value={selectedPresentationId}
                  onChange={(e) => {
                    const presId = e.target.value
                    setSelectedPresentationId(presId)

                    if (!presId) {
                      setPresentationLink('')
                      setAttachedSlideInfo(null)
                      return
                    }

                    const pres = crmPresentations.find(p => String(p.id) === String(presId))
                    if (pres) {
                      const link = pres.pdf_url || `${window.location.origin}/presentacion/${pres.id}`
                      setPresentationLink(link)
                      if (pres.slides && Array.isArray(pres.slides) && pres.slides.length > 0) {
                        const sl = pres.slides[0]
                        setSelectedSlideId(sl.id || 'slide-0')
                        setAttachedSlideInfo({
                          presentationId: pres.id,
                          presentationTitle: pres.title,
                          slideId: sl.id || 'slide-0',
                          slideTitle: sl.title || 'Diapositiva 1',
                          mediaUrl: sl.mediaUrl || '',
                          ficha: sl.ficha || null,
                          notes: sl.notes || ''
                        })
                      } else {
                        setAttachedSlideInfo({
                          presentationId: pres.id,
                          presentationTitle: pres.title,
                          slideId: 'slide-0',
                          slideTitle: 'Presentación Completa',
                          mediaUrl: '',
                          ficha: null,
                          notes: ''
                        })
                      }
                    }
                  }}
                >
                  <option value="">-- Seleccionar Presentación CRM --</option>
                  {crmPresentations.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--color-dark-gray)]/50 mt-1">Al seleccionar una presentación, su enlace se vinculará automáticamente a la minuta.</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                Archivo o Enlace de la Presentación Completa (PDF)
              </label>
              <div className="flex gap-2">
                <input
                  className="form-input flex-1"
                  placeholder="Enlace de Canva/Slides o subí el archivo PDF de la presentación..."
                  value={presentationLink}
                  onChange={e => setPresentationLink(e.target.value)}
                />
                <label className={`btn-secondary flex items-center justify-center gap-1.5 cursor-pointer px-4 text-xs font-bold shrink-0 ${uploadingField === 'presentation' ? 'opacity-55 pointer-events-none' : ''}`}>
                  {uploadingField === 'presentation' ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      Subir PDF
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={e => handleFileUpload(e, 'presentation')}
                    disabled={uploadingField !== null}
                  />
                </label>
              </div>
              <p className="text-[10px] text-[var(--color-dark-gray)]/50 mt-1 font-medium">Sube o pega el enlace de la presentación completa en PDF para que los participantes puedan descargar todas las diapositivas y fichas de estudio.</p>
              {presentationLink && (
                <div className="flex items-center gap-2 mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                  <span className="material-symbols-outlined text-red-600">picture_as_pdf</span>
                  <a href={presentationLink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--color-deep-green)] hover:underline truncate max-w-md flex-1">
                    {presentationLink}
                  </a>
                  <button
                    type="button"
                    onClick={() => setPresentationLink('')}
                    className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer flex items-center justify-center"
                    title="Quitar presentación"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">
                Grabación del Evento (Video / Enlace de Grabación)
              </label>
              <div className="flex gap-2">
                <input
                  className="form-input flex-1"
                  placeholder="Enlace de YouTube, Zoom, Drive, Vimeo o subí el archivo de video..."
                  value={extraFiles}
                  onChange={e => setExtraFiles(e.target.value)}
                />
                <label className={`btn-secondary flex items-center justify-center gap-1.5 cursor-pointer px-4 text-xs font-bold shrink-0 ${uploadingField === 'extra' ? 'opacity-55 pointer-events-none' : ''}`}>
                  {uploadingField === 'extra' ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">videocam</span>
                      Subir Grabación
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/*,.mp4,.mov,.webm,.mkv"
                    className="hidden"
                    onChange={e => handleFileUpload(e, 'extra')}
                    disabled={uploadingField !== null}
                  />
                </label>
              </div>
              <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-1">Pegá el enlace de la grabación (YouTube, Zoom, Drive, Vimeo) o subí el archivo de video del evento.</p>
              {extraFiles && (
                <div className="flex items-center gap-2 mt-2 bg-blue-50/70 border border-blue-200 rounded-lg p-2.5">
                  <span className="material-symbols-outlined text-blue-600">videocam</span>
                  <a href={extraFiles} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-900 hover:underline truncate max-w-md flex-1">
                    {extraFiles}
                  </a>
                  <button
                    type="button"
                    onClick={() => setExtraFiles('')}
                    className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer flex items-center justify-center"
                    title="Quitar grabación"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              )}
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
            {client && (
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[var(--color-deep-green)]/10">
                {client.logo_url ? (
                  <img src={client.logo_url} alt={`Logo de ${client.company || client.name}`} className="w-12 h-12 object-contain rounded bg-white border border-gray-100 p-1" />
                ) : (
                  <span className="w-12 h-12 rounded bg-[var(--color-deep-green)]/8 text-[var(--color-deep-green)] flex items-center justify-center material-symbols-outlined">business</span>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Evento realizado para</p>
                  <p className="text-sm font-extrabold text-[var(--color-deep-green)]">{client.company || client.name}</p>
                </div>
              </div>
            )}
            <h2 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-1">¡Gracias por participar!</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">Resumen de: {event.title}</p>
            
            <div className="bg-gray-50 border border-gray-100 rounded-[10px] p-5 mb-8 text-sm text-gray-700">
               <p className="mb-2"><strong>Fecha:</strong> {formattedEventDate}</p>
               <p className="mb-0"><strong>Coordinador:</strong> {event.coordinator}</p>
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

            {includeProgram && program.trim() && (
              <div className="mb-8">
                <h4 className="text-[13px] font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-3 border-b-2 border-gray-100 pb-2">Programa tratado</h4>
                <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-700 bg-[var(--color-refined-gray)]/65 border border-[var(--color-deep-green)]/10 rounded-[10px] px-4 py-3">
                  {program}
                </div>
              </div>
            )}

            {Array.isArray(observations) && observations.filter(o => o && typeof o === 'string' && o.trim()).length > 0 && (
              <div className="mb-8">
                <h4 className="font-bold text-[var(--color-deep-green)] mb-3 text-sm border-b border-[var(--color-deep-green)]/10 pb-2">Observaciones y Siguientes Pasos</h4>
                <div className="space-y-4 bg-amber-50 p-5 rounded-[8px] border-l-4 border-amber-400">
                  {observations.filter(o => o && typeof o === 'string' && o.trim()).map((obs, index) => (
                    <div key={index} className={index > 0 ? "pt-4 border-t border-amber-200/50" : ""}>
                      <p className="text-[11px] uppercase font-bold text-amber-800 tracking-wider mb-1">Observación {index + 1}</p>
                      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-700">{obs}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide / Presentación Destacada preview */}
            {attachedSlideInfo ? (
              <div className="mb-8 border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">slideshow</span>
                    <h4 className="text-[13px] font-extrabold text-[var(--color-deep-green)] uppercase tracking-wider">
                      Diapositiva Destacada: {attachedSlideInfo.presentationTitle || 'Presentación'}
                    </h4>
                  </div>
                  {attachedSlideInfo.slideTitle && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      {attachedSlideInfo.slideTitle}
                    </span>
                  )}
                </div>

                {attachedSlideInfo.mediaUrl && (
                  presentationLink ? (
                    <a href={presentationLink} target="_blank" rel="noreferrer" className="block group relative overflow-hidden rounded-lg border border-gray-200 mb-4 bg-black/5 cursor-pointer" title="Hacé clic para ver la presentación completa">
                      <img
                        src={attachedSlideInfo.mediaUrl}
                        alt={attachedSlideInfo.slideTitle}
                        className="w-full h-auto max-h-80 object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-sm">
                        <span className="material-symbols-outlined text-xl">open_in_new</span>
                        Ver Presentación Completa (Todas las Diapositivas)
                      </div>
                    </a>
                  ) : (
                    <img
                      src={attachedSlideInfo.mediaUrl}
                      alt={attachedSlideInfo.slideTitle}
                      className="w-full h-auto max-h-80 object-contain rounded-lg border border-gray-200 mb-4 bg-black/5"
                    />
                  )
                )}

                {attachedSlideInfo.ficha && typeof attachedSlideInfo.ficha === 'object' && (
                  <div className="bg-white/80 p-4 rounded-lg border border-emerald-100 space-y-2 text-xs mb-3">
                    <h5 className="font-bold text-sm text-gray-800">{attachedSlideInfo.ficha.title || attachedSlideInfo.slideTitle}</h5>
                    {attachedSlideInfo.ficha.summary && (
                      <p className="text-gray-600 leading-relaxed">{attachedSlideInfo.ficha.summary}</p>
                    )}
                    {attachedSlideInfo.ficha.closingIdea && (
                      <p className="text-emerald-800 font-semibold italic pt-2 border-t border-emerald-100">
                        💡 Idea Clave: {attachedSlideInfo.ficha.closingIdea}
                      </p>
                    )}
                  </div>
                )}

                {presentationLink && (
                  <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between">
                    <span className="text-xs text-emerald-900 font-bold">📄 Presentación completa vinculada</span>
                    <a href={presentationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-deep-green)] hover:bg-[#1f4738] rounded-lg text-xs font-bold text-white transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      Ver / Descargar Presentación Completa
                    </a>
                  </div>
                )}
              </div>
            ) : presentationLink ? (
              <div className="mb-8 border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-deep-green)] text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">slideshow</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-[var(--color-deep-green)] uppercase tracking-wider">
                        Presentación Adjunta al Evento
                      </h4>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">
                        {crmPresentations.find(p => p.id === selectedPresentationId)?.title || 'Presentación / Diapositivas'}
                      </p>
                    </div>
                  </div>
                  <a href={presentationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-deep-green)] hover:bg-[#1f4738] rounded-lg text-xs font-bold text-white transition-colors shadow-sm shrink-0">
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Ver Diapositivas
                  </a>
                </div>
              </div>
            ) : null}

            {(photoUrl || presentationLink || extraFiles || attachedSlideInfo) && (
              <div className="mt-8 pt-6 border-t border-[var(--color-dark-gray)]/10">
                <h4 className="text-[13px] font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-4">Materiales y Descargas</h4>
                
                {presentationLink && (
                  <div className="mb-3">
                    <a href={presentationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-deep-green)] hover:bg-[#1f4738] rounded-[var(--radius-normal)] text-xs font-bold text-white transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      Descargar Presentación Completa (PDF)
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
                  <div className="mb-3">
                    <a href={extraFiles} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 rounded-[var(--radius-normal)] text-xs font-bold text-white transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">videocam</span>
                      🎥 Ver / Descargar Grabación del Evento
                    </a>
                  </div>
                )}
              </div>
            )}

            {includeAttendanceLink && (
              <div className="mt-8 p-4 bg-emerald-50/70 border border-emerald-200 rounded-[10px] text-center font-sans">
                <p className="font-bold text-emerald-900 text-xs mb-1">📋 ¿Estuviste presente y no pudiste marcar asistencia?</p>
                <p className="text-emerald-800 text-[11px] mb-2.5">Podés registrar tu presente directamente desde el siguiente enlace:</p>
                <span className="inline-block px-3.5 py-1.5 bg-emerald-800 rounded-[6px] text-xs font-bold text-white shadow-sm">
                  Marcar Mi Asistencia
                </span>
              </div>
            )}

            {includeSurvey && (
              <div className="mt-6 p-5 bg-amber-50/60 border border-amber-200 rounded-[10px] text-center font-sans">
                <p className="font-bold text-amber-800 text-sm mb-1">⭐ ¡Tu opinión nos importa!</p>
                <p className="text-amber-900/80 text-xs mb-3">Te invitamos a responder una breve encuesta de satisfacción sobre tu experiencia en el taller.</p>
                <span className="inline-block px-4 py-2 bg-amber-500 rounded-[6px] text-xs font-bold text-white shadow-sm">
                  Completar Encuesta de Satisfacción
                </span>
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
