import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function CrmProposalCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createProposal, updateProposal } = useStore()
  const fileInputRef = useRef(null)

  // Local State
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(id ? true : false)
  const [error, setError] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    subtitle: '',
    valid_until: '',
    status: 'draft',
    terms_conditions: 'Términos y condiciones comerciales:\n- Forma de pago: 50% al momento de iniciar el proyecto y 50% luego de la capacitación y entrega de manual de usuario (al finalizar cada etapa).\n- Validez del presupuesto: 15 días.',
    pdf_url: '',
    items: [{ 
      id: `stage_${Date.now()}`, 
      title: 'ETAPA 1: Sistema de gestión documental', 
      amount: 0, 
      activities: [{ id: `act_${Date.now()}`, code: '1.1', name: '', description: '' }] 
    }],
    payment_details: {
      banco: 'Banco ICBC',
      nombre: 'LEANDRO JOSE VELASQUES',
      cbu: '0150846601000134863268',
      alias: 'LEANDRO.TANGO',
      cuit: '20309551665',
      cuenta: 'CA $ 00150846000113486326'
    }
  })

  // Load clients and proposal if editing
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch clients
        const { data: clientsData, error: cErr } = await supabase
          .from('crm_clients')
          .select('id, name, company')
          .order('name')
        
        if (cErr) throw cErr
        setClients(clientsData || [])

        // Fetch proposal if editing
        if (id) {
          const { data: proposal, error: pErr } = await supabase
            .from('crm_proposals')
            .select('*')
            .eq('id', id)
            .single()
          
          if (pErr) throw pErr
          if (proposal) {
            setForm({
              client_id: proposal.client_id || '',
              title: proposal.title || '',
              subtitle: proposal.subtitle || '',
              valid_until: proposal.valid_until || '',
              status: proposal.status || 'draft',
              terms_conditions: proposal.terms_conditions || '',
              pdf_url: proposal.pdf_url || '',
              items: proposal.items && proposal.items.length > 0
                ? proposal.items.map((stage, idx) => ({
                    ...stage,
                    id: stage.id || `stage_${Date.now()}_${idx}`,
                    activities: stage.activities
                      ? stage.activities.map((act, aIdx) => ({ ...act, id: act.id || `act_${Date.now()}_${idx}_${aIdx}` }))
                      : [{ id: `act_${Date.now()}`, code: `${idx + 1}.1`, name: '', description: '' }]
                  }))
                : [{ 
                    id: `stage_${Date.now()}`, 
                    title: 'ETAPA 1: Sistema de gestión documental', 
                    amount: 0, 
                    activities: [{ id: `act_${Date.now()}`, code: '1.1', name: '', description: '' }] 
                  }],
              payment_details: proposal.payment_details || {
                banco: 'Banco ICBC',
                nombre: 'LEANDRO JOSE VELASQUES',
                cbu: '0150846601000134863268',
                alias: 'LEANDRO.TANGO',
                cuit: '20309551665',
                cuenta: 'CA $ 00150846000113486326'
              }
            })
          }
        }
      } catch (err) {
        console.error(err)
        setError('Error al cargar la información: ' + err.message)
      } finally {
        setLoadingEvent(false)
      }
    }
    loadData()
  }, [id])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  
  const updatePaymentDetails = (field, value) => {
    setForm(prev => ({
      ...prev,
      payment_details: {
        ...prev.payment_details,
        [field]: value
      }
    }))
  }

  const handlePdfUpload = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setUploadError('Solo se permiten archivos PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo no puede superar los 10 MB')
      return
    }
    setUploadError('')
    setUploadingPdf(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `proposal-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('proposals')
        .upload(fileName, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('proposals').getPublicUrl(fileName)
      update('pdf_url', publicUrl)
    } catch (err) {
      setUploadError('Error al subir el PDF: ' + (err.message || err))
    } finally {
      setUploadingPdf(false)
    }
  }

  // Stages CRUD
  const addStage = () => {
    const nextStageNum = form.items.length + 1
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        id: `stage_${Date.now()}`,
        title: `ETAPA ${nextStageNum}: `,
        amount: 0,
        activities: [{ id: `act_${Date.now()}`, code: `${nextStageNum}.1`, name: '', description: '' }]
      }]
    }))
  }

  const removeStage = (stageId) => {
    if (form.items.length <= 1) return
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(st => st.id !== stageId)
    }))
  }

  const updateStage = (stageId, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(st => st.id === stageId ? { ...st, [field]: value } : st)
    }))
  }

  // Activities CRUD
  const addActivity = (stageId) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(st => {
        if (st.id === stageId) {
          const nextActNum = st.activities.length + 1
          const stageIndex = prev.items.findIndex(s => s.id === stageId) + 1
          return {
            ...st,
            activities: [...st.activities, {
              id: `act_${Date.now()}`,
              code: `${stageIndex}.${nextActNum}`,
              name: '',
              description: ''
            }]
          }
        }
        return st
      })
    }))
  }

  const removeActivity = (stageId, actId) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(st => {
        if (st.id === stageId) {
          if (st.activities.length <= 1) return st
          return {
            ...st,
            activities: st.activities.filter(act => act.id !== actId)
          }
        }
        return st
      })
    }))
  }

  const updateActivity = (stageId, actId, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(st => {
        if (st.id === stageId) {
          return {
            ...st,
            activities: st.activities.map(act => act.id === actId ? { ...act, [field]: value } : act)
          }
        }
        return st
      })
    }))
  }

  // Calculate total sum of stages
  const totalAmount = form.items.reduce((sum, stage) => sum + Number(stage.amount || 0), 0)

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.client_id) {
      setError('Por favor, selecciona un cliente')
      return
    }
    if (!form.title) {
      setError('El título de la propuesta es obligatorio')
      return
    }

    // Clean stages and activities IDs for database JSON storage
    const cleanedStages = form.items.map(({ id: _, activities, ...stage }) => ({
      ...stage,
      amount: Number(stage.amount),
      activities: activities.map(({ id: __, ...act }) => act)
    }))

    const proposalData = {
      client_id: form.client_id,
      title: form.title,
      subtitle: form.subtitle || null,
      valid_until: form.valid_until || null,
      status: form.status,
      terms_conditions: form.terms_conditions || null,
      pdf_url: form.pdf_url || null,
      items: cleanedStages,
      total_amount: totalAmount,
      payment_details: form.payment_details
    }

    setLoading(true)
    try {
      if (id) {
        const result = await updateProposal(id, proposalData)
        if (!result.success) throw new Error(result.error?.message || 'Error al actualizar')
      } else {
        const result = await createProposal(proposalData)
        if (!result.success) throw new Error(result.error?.message || 'Error al crear')
      }
      navigate('/admin/crm/presupuestos')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingEvent) {
    return (
      <div className="py-12 text-center">
        <span className="material-symbols-outlined text-3xl animate-spin text-[var(--color-deep-green)] mb-2 block">progress_activity</span>
        <p className="text-sm font-semibold text-[var(--color-dark-gray)]/55">Cargando formulario...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/crm/presupuestos" className="p-2 hover:bg-[var(--color-deep-green)]/5 rounded-lg text-[var(--color-dark-gray)] transition-all">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {id ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">
            Completa los detalles de las etapas de desarrollo y plan de actividades.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Details Card */}
        <div className="card p-6 space-y-4 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Cliente *</label>
              <select
                className="form-input text-sm"
                value={form.client_id}
                onChange={e => update('client_id', e.target.value)}
                required
              >
                <option value="">Selecciona un cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Validez hasta</label>
              <input
                type="date"
                className="form-input text-sm"
                value={form.valid_until}
                onChange={e => update('valid_until', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Título de la Propuesta *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Sistema de Gestión Documental para el Consejo"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Subtítulo (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Propuesta de consultoría y desarrollo tecnológico"
              value={form.subtitle}
              onChange={e => update('subtitle', e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Estado</label>
            <div className="flex gap-3">
              {[
                { value: 'draft', label: 'Borrador' },
                { value: 'sent', label: 'Enviado' },
                { value: 'accepted', label: 'Aprobado' },
                { value: 'rejected', label: 'Rechazado' }
              ].map(st => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => update('status', st.value)}
                  className={`flex-1 py-2.5 rounded-[var(--radius-premium)] text-xs font-bold border-2 transition-all ${
                    form.status === st.value
                      ? 'border-[var(--color-deep-green)] bg-[var(--color-deep-green)]/5 text-[var(--color-deep-green)]'
                      : 'border-[var(--color-deep-green)]/10 text-[var(--color-dark-gray)] hover:bg-[var(--color-refined-gray)]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PDF Uploader Card */}
        <div className="card p-6 bg-white shadow-sm border border-[var(--color-deep-green)]/5 space-y-4">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">Documento de la Propuesta Técnica Detallada (PDF)</label>
          
          {form.pdf_url ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-deep-green)]/20 bg-[var(--color-deep-green)]/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-deep-green)]">picture_as_pdf</span>
                <a href={form.pdf_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--color-deep-green)] hover:underline truncate max-w-md">
                  Ver Propuesta PDF cargada
                </a>
              </div>
              <button
                type="button"
                onClick={() => update('pdf_url', '')}
                className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center"
                title="Eliminar PDF"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,application/pdf"
                onChange={e => { const f = e.target.files[0]; if (f) handlePdfUpload(f) }}
              />
              <div
                onClick={() => !uploadingPdf && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[var(--radius-premium)] p-6 text-center cursor-pointer transition-all hover:border-[var(--color-deep-green)]/40 hover:bg-[var(--color-deep-green)]/2 ${
                  uploadingPdf ? 'border-[var(--color-deep-green)]/35 opacity-70' : 'border-[var(--color-deep-green)]/15'
                }`}
              >
                <span className="material-symbols-outlined text-3xl text-[var(--color-dark-gray)]/20 mb-2 block">upload_file</span>
                <p className="text-xs font-bold text-[var(--color-dark-gray)]/60">
                  {uploadingPdf ? 'Subiendo PDF...' : 'Subir archivo PDF de la propuesta técnica (15 págs.)'}
                </p>
                <p className="text-[10px] text-[var(--color-dark-gray)]/40 mt-1">Límite de tamaño: 10MB</p>
              </div>
            </div>
          )}
          {uploadError && (
            <p className="text-xs font-bold text-red-500">{uploadError}</p>
          )}
        </div>

        {/* PROJECT STAGES & ACTIVITIES DYNAMIC SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-deep-green)]/10 pb-2">
            <h2 className="text-sm font-extrabold text-[var(--color-deep-green)] uppercase tracking-wider">Etapas y Actividades</h2>
            <button
              type="button"
              onClick={addStage}
              className="btn-ghost text-xs !text-[var(--color-deep-green)] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">add_box</span> Agregar nueva etapa
            </button>
          </div>

          {form.items.map((stage, sIdx) => (
            <div 
              key={stage.id} 
              className="card p-6 bg-white shadow-sm border border-[var(--color-deep-green)]/5 space-y-4 relative group"
            >
              {form.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStage(stage.id)}
                  className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Eliminar Etapa Completa"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              )}

              {/* Stage Header Info */}
              <div className="grid sm:grid-cols-12 gap-4 border-b border-[var(--color-deep-green)]/5 pb-4">
                <div className="sm:col-span-8">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Nombre de la Etapa *</label>
                  <input
                    type="text"
                    className="form-input !py-1.5 text-xs font-bold text-[var(--color-deep-green)]"
                    placeholder={`Ej: ETAPA ${sIdx + 1}: Sistema de gestión de resoluciones`}
                    value={stage.title}
                    onChange={e => updateStage(stage.id, 'title', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Presupuesto Etapa ($) *</label>
                  <input
                    type="number"
                    className="form-input !py-1.5 text-xs text-right font-mono font-bold"
                    placeholder="0.00"
                    value={stage.amount || ''}
                    onChange={e => updateStage(stage.id, 'amount', Number(e.target.value))}
                    min={0}
                    required
                  />
                </div>
              </div>

              {/* Stage Activities Nested List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Tabla de actividades de la Etapa</span>
                  <button
                    type="button"
                    onClick={() => addActivity(stage.id)}
                    className="btn-ghost !p-1 text-[11px] !text-[var(--color-deep-green)] flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Añadir actividad
                  </button>
                </div>

                <div className="space-y-2.5">
                  {stage.activities.map((act) => (
                    <div 
                      key={act.id} 
                      className="grid sm:grid-cols-12 gap-2.5 p-3 rounded-lg bg-[var(--color-refined-gray)]/30 border border-gray-100 relative group/act"
                    >
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          className="form-input !py-1 text-xs text-center font-bold"
                          placeholder="Cod (e.g. 1.1)"
                          value={act.code}
                          onChange={e => updateActivity(stage.id, act.id, 'code', e.target.value)}
                          required
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          className="form-input !py-1 text-xs font-semibold"
                          placeholder="Nombre de la actividad"
                          value={act.name}
                          onChange={e => updateActivity(stage.id, act.id, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          className="form-input !py-1 text-xs"
                          placeholder="Breve descripción de tareas"
                          value={act.description}
                          onChange={e => updateActivity(stage.id, act.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-center">
                        {stage.activities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeActivity(stage.id, act.id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                            title="Quitar Actividad"
                          >
                            <span className="material-symbols-outlined text-base">remove_circle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Subtotal General */}
          <div className="card p-6 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15 flex justify-between items-center">
            <span className="text-sm font-extrabold text-[var(--color-dark-gray)]/75">Suma Total del Presupuesto (Todas las etapas):</span>
            <span className="text-2xl font-extrabold text-[var(--color-deep-green)] font-mono">
              ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* BANK TRANSFER PAYMENT DETAILS CARD */}
        <div className="card p-6 bg-white shadow-sm border border-[var(--color-deep-green)]/5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">account_balance</span>
            Datos para la Transferencia Bancaria
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Banco *</label>
              <input
                type="text"
                className="form-input !py-1.5"
                value={form.payment_details.banco}
                onChange={e => updatePaymentDetails('banco', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Titular de la cuenta *</label>
              <input
                type="text"
                className="form-input !py-1.5"
                value={form.payment_details.nombre}
                onChange={e => updatePaymentDetails('nombre', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">CBU *</label>
              <input
                type="text"
                className="form-input !py-1.5 font-mono"
                value={form.payment_details.cbu}
                onChange={e => updatePaymentDetails('cbu', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Alias *</label>
              <input
                type="text"
                className="form-input !py-1.5"
                value={form.payment_details.alias}
                onChange={e => updatePaymentDetails('alias', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">CUIT/CUIL *</label>
              <input
                type="text"
                className="form-input !py-1.5 font-mono"
                value={form.payment_details.cuit}
                onChange={e => updatePaymentDetails('cuit', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1 block">Número de Cuenta *</label>
              <input
                type="text"
                className="form-input !py-1.5"
                value={form.payment_details.cuenta}
                onChange={e => updatePaymentDetails('cuenta', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Terms and Conditions Card */}
        <div className="card p-6 bg-white shadow-sm border border-[var(--color-deep-green)]/5 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">Términos y Condiciones Comerciales</label>
          <textarea
            className="form-input min-h-[120px] text-xs font-semibold leading-relaxed"
            placeholder="Condiciones del presupuesto comercial..."
            value={form.terms_conditions}
            onChange={e => update('terms_conditions', e.target.value)}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 font-semibold rounded-xl text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-between items-center">
          <Link to="/admin/crm/presupuestos" className="btn-ghost">
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                {id ? 'Guardar Cambios' : 'Crear Presupuesto'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
