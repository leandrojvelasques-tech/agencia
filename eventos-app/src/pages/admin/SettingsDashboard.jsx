import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function SettingsDashboard() {
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('welcome')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('templates') // 'templates' | 'logs'
  const [error, setError] = useState('')
  const [expandedLogId, setExpandedLogId] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch templates and logs
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Fetch email templates
        const { data: temp, error: tempErr } = await supabase
          .from('email_templates')
          .select('*')
        if (tempErr) throw tempErr
        setTemplates(temp || [])
        
        // Select the default one
        const welcomeTemp = temp?.find(t => t.id === 'welcome')
        if (welcomeTemp) {
          setSubject(welcomeTemp.subject)
          setBody(welcomeTemp.body)
        }

        // Fetch logs
        const { data: lData, error: lErr } = await supabase
          .from('email_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (lErr) throw lErr
        setLogs(lData || [])
      } catch (err) {
        console.error('Error cargando datos de configuración:', err)
        setError('Error al cargar la información.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle template selection change
  const handleTemplateChange = (id) => {
    setSelectedTemplateId(id)
    const temp = templates.find(t => t.id === id)
    if (temp) {
      setSubject(temp.subject)
      setBody(temp.body)
      setSaveSuccess(false)
      setError('')
    }
  }

  // Save template modifications
  const handleSaveTemplate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaveSuccess(false)

    try {
      const { data, error: upErr } = await supabase
        .from('email_templates')
        .update({
          subject,
          body,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTemplateId)
        .select()
        .single()

      if (upErr) throw upErr

      setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? data : t))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err) {
      console.error('Error guardando la plantilla:', err)
      setError('No se pudo guardar la plantilla. Verifica tus permisos.')
    } finally {
      setSaving(false)
    }
  }

  const getPreviewHtml = () => {
    const mockPlaceholders = {
      '{{nombre}}': 'Juan',
      '{{apellido}}': 'Pérez',
      '{{evento}}': 'Taller de IA para Ciencias Económicas',
      '{{fecha}}': '2026-07-21',
      '{{horario}}': '18:00',
      '{{modalidad}}': 'Virtual (Online)',
      '{{coordinador}}': 'Leandro Velasques',
      '{{duracion}}': '2 horas',
      '{{agenda}}': `<div style="font-family: sans-serif; border-left: 3px solid #0b5e3a; padding-left: 15px; margin: 15px 0;">
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 5px 0; color: #0b5e3a; font-size: 16px;">Módulo 1: Introducción a la IA <span style="font-size: 12px; color: #666; font-weight: normal;">(18:00 - 19:30 hs)</span></h4>
          <div style="margin-left: 15px; border-left: 1px solid #ddd; padding-left: 10px;">
            <div style="margin-bottom: 10px;">
              <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #0b5e3a;">CONCEPTOS CLAVE</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; color: #444; line-height: 1.4;">Cómo aplicar la IA en tareas cotidianas de contabilidad y administración.</p>
            </div>
          </div>
        </div>
      </div>`,
      '{{link_inscripcion}}': '#',
      '{{link_evento}}': '#',
      '{{link_reunion}}': '#',
      '{{link_acceso}}': '#'
    }

    let resolvedBody = body || ''
    for (const [key, value] of Object.entries(mockPlaceholders)) {
      resolvedBody = resolvedBody.replaceAll(key, value)
    }

    const isHtml = resolvedBody.trim().startsWith('<') || resolvedBody.includes('<div') || resolvedBody.includes('<table') || resolvedBody.includes('<html')
    return isHtml ? resolvedBody : resolvedBody.replace(/\n/g, '<br>')
  }

  // Refrescar logs
  const handleRefreshLogs = async () => {
    try {
      const { data, error: lErr } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (lErr) throw lErr
      setLogs(data || [])
    } catch (err) {
      console.error('Error al actualizar logs:', err)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-[var(--color-dark-gray)]/40 font-medium animate-pulse">Cargando configuración...</p>
      </div>
    )
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  // Placeholders list
  const placeholders = [
    { tag: '{{nombre}}', desc: 'Nombre del inscripto' },
    { tag: '{{apellido}}', desc: 'Apellido del inscripto' },
    { tag: '{{evento}}', desc: 'Título oficial del evento' },
    { tag: '{{fecha}}', desc: 'Fecha de asistencia' },
    { tag: '{{horario}}', desc: 'Hora de inicio del evento' },
    { tag: '{{modalidad}}', desc: 'Modalidad de asistencia (Presencial / Virtual)' },
    { tag: '{{coordinador}}', desc: 'Coordinador del evento' },
    { tag: '{{duracion}}', desc: 'Duración del evento' },
    { tag: '{{agenda}}', desc: 'Agenda o programa del evento (formateado en HTML)' },
    { tag: '{{link_inscripcion}}', desc: 'Enlace a la landing page del evento (alias: {{link_evento}})' },
    { tag: '{{link_reunion}}', desc: 'Enlace de acceso a la reunión virtual (alias: {{link_acceso}})' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Configuración del Sistema</h1>
        <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">
          Administra las notificaciones de correo electrónico automáticas y revisa el historial de envíos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[var(--color-deep-green)]/8 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">mail</span>
          Plantillas de Correo
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">history</span>
          Historial de Envíos
        </button>
      </div>

      {/* Tab: Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Template Editor */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6">
              <h2 className="text-base font-bold mb-4 text-[var(--color-deep-green)] flex items-center gap-2">
                <span className="material-symbols-outlined">edit_note</span>
                Editar Plantilla
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-6 bg-[var(--color-refined-gray)]/40 p-1 rounded-xl border border-[var(--color-deep-green)]/5">
                <button
                  type="button"
                  onClick={() => handleTemplateChange('welcome')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTemplateId === 'welcome'
                      ? 'bg-[var(--color-deep-green)] text-white shadow-sm'
                      : 'text-[var(--color-dark-gray)]/65 hover:bg-white/50'
                  }`}
                >
                  Bienvenida (Inscripto)
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('cancellation')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTemplateId === 'cancellation'
                      ? 'bg-[var(--color-deep-green)] text-white shadow-sm'
                      : 'text-[var(--color-dark-gray)]/65 hover:bg-white/50'
                  }`}
                >
                  Cancelación
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('reminder_48h')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTemplateId === 'reminder_48h'
                      ? 'bg-[var(--color-deep-green)] text-white shadow-sm'
                      : 'text-[var(--color-dark-gray)]/65 hover:bg-white/50'
                  }`}
                >
                  Recordatorio (48hs)
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('reminder_24h')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTemplateId === 'reminder_24h'
                      ? 'bg-[var(--color-deep-green)] text-white shadow-sm'
                      : 'text-[var(--color-dark-gray)]/65 hover:bg-white/50'
                  }`}
                >
                  Recordatorio (24hs)
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('reminder_same_day')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTemplateId === 'reminder_same_day'
                      ? 'bg-[var(--color-deep-green)] text-white shadow-sm'
                      : 'text-[var(--color-dark-gray)]/65 hover:bg-white/50'
                  }`}
                >
                  Recordatorio (Mismo Día)
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg animate-fade-in flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{error}</span>
                  </div>
                )}
                {saveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg animate-fade-in flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Plantilla guardada con éxito en Supabase.</span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1.5 block">
                    Asunto del Correo (Subject)
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input text-sm"
                    placeholder="Asunto"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1.5 block">
                    Cuerpo del Mensaje
                  </label>
                  <p className="text-[10px] text-[var(--color-dark-gray)]/45 mb-2 leading-relaxed">
                    Escribe el cuerpo en texto plano. Los saltos de línea se transformarán automáticamente en saltos HTML al enviarse.
                  </p>
                  <textarea
                    required
                    className="form-input text-sm min-h-[300px] leading-relaxed font-sans"
                    placeholder="Escribe el mensaje aquí..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="btn-secondary !px-4 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    Vista Previa
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary !px-6 cursor-pointer"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Placeholders Info Panel */}
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="text-base font-bold mb-3 text-[var(--color-deep-green)] flex items-center gap-2 border-b border-[var(--color-deep-green)]/10 pb-2">
                <span className="material-symbols-outlined">code</span>
                Tags Disponibles
              </h2>
              <p className="text-[11px] text-[var(--color-dark-gray)]/60 leading-relaxed mb-4">
                Puedes copiar e insertar estas etiquetas dinámicas en el Asunto o Cuerpo del mensaje. Se reemplazarán automáticamente con la información del inscripto y del evento puntual.
              </p>
              <div className="space-y-3">
                {placeholders.map(p => (
                  <div key={p.tag} className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--color-refined-gray)]/30 border border-[var(--color-deep-green)]/5">
                    <span className="font-mono text-xs font-bold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 px-2 py-0.5 rounded self-start">
                      {p.tag}
                    </span>
                    <span className="text-[10px] text-[var(--color-dark-gray)]/70 font-medium pl-1">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15">
              <h3 className="text-xs font-bold text-[var(--color-deep-green)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                ¿Cómo funciona?
              </h3>
              <p className="text-[11px] text-[var(--color-dark-gray)]/75 leading-relaxed">
                Cuando una persona se inscribe, la app llama a una función serverless que consulta la base de datos de Supabase, obtiene esta plantilla, reemplaza las variables y envía el correo. También notifica a los coordinadores cargados en el evento con la información del participante.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider">Historial Reciente</p>
              <p className="text-[10px] text-[var(--color-dark-gray)]/45">Visualiza el estado de los últimos 100 correos electrónicos procesados por el servidor.</p>
            </div>
            <button onClick={handleRefreshLogs} className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1 cursor-pointer">
              <span className="material-symbols-outlined text-xs">refresh</span> Actualizar
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Destinatario</th>
                    <th>Tipo</th>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th className="text-center">Contenido</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-[var(--color-dark-gray)]/30 font-medium">
                        No se registran envíos de correos electrónicos en el historial.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const isExpanded = expandedLogId === log.id
                      const date = new Date(log.created_at)
                      const formattedDate = format(date, "d MMM yyyy, HH:mm 'hs'", { locale: es })
                      
                      let badgeClass = 'bg-gray-100 text-gray-800'
                      let statusText = 'Pendiente'
                      if (log.status === 'sent') {
                        badgeClass = 'bg-green-50 text-green-800 border-green-200'
                        statusText = 'Enviado'
                      } else if (log.status === 'failed') {
                        badgeClass = 'bg-red-50 text-red-800 border-red-200'
                        statusText = 'Fallido'
                      } else if (log.status === 'simulated') {
                        badgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
                        statusText = 'Simulado'
                      }

                      // Friendly type name
                      let typeLabel = log.type
                      if (log.type === 'welcome') typeLabel = 'Bienvenida (Inscripto)'
                      else if (log.type === 'cancellation') typeLabel = 'Cancelación (Inscripto)'
                      else if (log.type === 'reminder_24h') typeLabel = 'Recordatorio (24hs)'
                      else if (log.type === 'reminder_same_day') typeLabel = 'Recordatorio (Mismo Día)'
                      else if (log.type === 'coordinator_welcome') typeLabel = 'Notificación (Coordinador)'
                      else if (log.type === 'coordinator_cancellation') typeLabel = 'Notificación Cancelación'
                      else if (log.type === 'coordinator_reminder_24h') typeLabel = 'Recordatorio 24hs (Coordinador)'
                      else if (log.type === 'coordinator_reminder_same_day') typeLabel = 'Recordatorio Mismo Día (Coordinador)'

                      return (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/20">
                          <td className="text-xs text-[var(--color-dark-gray)]/80 whitespace-nowrap">{formattedDate}</td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[var(--color-dark-gray)]">{log.recipient_name || '—'}</span>
                              <span className="text-[10px] text-[var(--color-dark-gray)]/50">{log.recipient_email}</span>
                            </div>
                          </td>
                          <td className="text-xs font-semibold text-[var(--color-dark-gray)]/75">{typeLabel}</td>
                          <td className="text-xs text-[var(--color-dark-gray)] truncate max-w-[200px]" title={log.subject}>
                            {log.subject}
                          </td>
                          <td>
                            <div className="flex flex-col gap-0.5">
                              <span className={`badge ${badgeClass} text-[10px] py-0.5`}>
                                {statusText}
                              </span>
                              {log.error_message && (
                                <span className="text-[9px] text-red-500 font-medium max-w-[150px] break-words">
                                  {log.error_message}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="btn-ghost !p-1.5 text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/6"
                              title="Ver detalles"
                            >
                              <span className="material-symbols-outlined text-lg">
                                {isExpanded ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expanded View Modal/Box */}
          {expandedLogId && (() => {
            const log = logs.find(l => l.id === expandedLogId)
            if (!log) return null
            return (
              <div className="card p-6 border border-[var(--color-deep-green)]/15 bg-[var(--color-light-green)]/5 animate-fade-in space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--color-deep-green)]/10 pb-2">
                  <h3 className="text-sm font-bold text-[var(--color-deep-green)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base font-bold">mail</span>
                    Detalles del Correo Enviado
                  </h3>
                  <button onClick={() => setExpandedLogId(null)} className="text-[var(--color-dark-gray)]/40 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[var(--color-dark-gray)]/50 uppercase text-[9px] tracking-wider block">Destinatario</span>
                    <span className="text-[var(--color-dark-gray)]">{log.recipient_name || '—'} ({log.recipient_email})</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-dark-gray)]/50 uppercase text-[9px] tracking-wider block">Asunto (Subject)</span>
                    <span className="text-[var(--color-dark-gray)]">{log.subject}</span>
                  </div>
                </div>

                <div className="border border-[var(--color-deep-green)]/10 rounded-xl bg-white p-4 max-h-[300px] overflow-y-auto">
                  <span className="text-[var(--color-dark-gray)]/40 uppercase text-[9px] tracking-wider mb-2 block border-b pb-1 font-bold">Contenido del Correo</span>
                  <div
                    className="text-xs leading-relaxed text-[var(--color-dark-gray)]/85"
                    dangerouslySetInnerHTML={{ __html: log.body }}
                  />
                </div>
              </div>
            )
          })()}
        </div>
      )}
      {/* Email Preview Modal */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="card p-6 w-full max-w-2xl h-[85vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[var(--color-deep-green)]/10 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--color-deep-green)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined">visibility</span>
                  Vista Previa del Correo
                </h3>
                <p className="text-[10px] text-[var(--color-dark-gray)]/60 font-semibold mt-0.5">
                  Asunto: {subject.replaceAll('{{evento}}', 'Taller de IA...')}
                </p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-[var(--color-dark-gray)]/40 hover:text-red-500 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            
            <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
              <iframe
                title="Email Preview"
                srcDoc={getPreviewHtml()}
                className="w-full h-full border-none bg-white"
              />
            </div>
            
            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
              <button onClick={() => setShowPreview(false)} className="btn-primary !px-6 cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
