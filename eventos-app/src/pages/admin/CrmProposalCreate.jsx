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
  const [loading, setLoading] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(id ? true : false)
  const [error, setError] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [form, setForm] = useState({
    client_name: '',
    client_company: '',
    client_email: '',
    client_phone: '',
    title: '',
    subtitle: '',
    valid_until: '',
    status: 'draft',
    terms_conditions: 'Términos y condiciones comerciales:\n- Forma de pago: 50% al momento de iniciar el proyecto y 50% luego de la capacitación y entrega de manual de usuario (al finalizar el proyecto).\n- Validez del presupuesto: 15 días.',
    pdf_url: '',
    total_amount: 0,
    payment_details: {
      banco: 'Banco ICBC',
      nombre: 'LEANDRO JOSE VELASQUES',
      cbu: '0150846601000134863268',
      alias: 'LEANDRO.TANGO',
      cuit: '20309551665',
      cuenta: 'CA $ 00150846000113486326'
    }
  })

  // Load proposal if editing
  useEffect(() => {
    async function loadData() {
      if (!id) return
      try {
        const { data: proposal, error: pErr } = await supabase
          .from('crm_proposals')
          .select('*')
          .eq('id', id)
          .single()
        
        if (pErr) throw pErr
        if (proposal) {
          setForm({
            client_name: proposal.client_name || '',
            client_company: proposal.client_company || '',
            client_email: proposal.client_email || '',
            client_phone: proposal.client_phone || '',
            title: proposal.title || '',
            subtitle: proposal.subtitle || '',
            valid_until: proposal.valid_until || '',
            status: proposal.status || 'draft',
            terms_conditions: proposal.terms_conditions || '',
            pdf_url: proposal.pdf_url || '',
            total_amount: proposal.total_amount || 0,
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

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.client_name) {
      setError('Por favor, ingresa el nombre del cliente')
      return
    }
    if (!form.title) {
      setError('El título de la propuesta es obligatorio')
      return
    }

    const proposalData = {
      client_name: form.client_name,
      client_company: form.client_company || null,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      title: form.title,
      subtitle: form.subtitle || null,
      valid_until: form.valid_until || null,
      status: form.status,
      terms_conditions: form.terms_conditions || null,
      pdf_url: form.pdf_url || null,
      items: [],
      total_amount: Number(form.total_amount || 0),
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
            Completa los detalles del presupuesto técnico adjuntando la propuesta comercial en PDF.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Details Card */}
        <div className="card p-6 space-y-4 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          
          {/* CLIENT DETAILS SECTION */}
          <div className="border-b border-[var(--color-deep-green)]/8 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">person</span>
              Datos del Cliente
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Nombre / Razón Social *</label>
                <input
                  type="text"
                  className="form-input text-xs font-semibold"
                  placeholder="Ej: Juan Pérez"
                  value={form.client_name}
                  onChange={e => update('client_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Empresa / Organización</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="Ej: Consejo Profesional"
                  value={form.client_company}
                  onChange={e => update('client_company', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Email</label>
                <input
                  type="email"
                  className="form-input text-xs"
                  placeholder="ejemplo@empresa.com"
                  value={form.client_email}
                  onChange={e => update('client_email', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-1 block">Teléfono</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="Ej: +54 9 280 123456"
                  value={form.client_phone}
                  onChange={e => update('client_phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 mb-2 block">Monto Total del Presupuesto ($) *</label>
              <input
                type="number"
                className="form-input text-sm font-mono font-bold"
                placeholder="0.00"
                value={form.total_amount || ''}
                onChange={e => update('total_amount', Number(e.target.value))}
                min={0}
                required
              />
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
              placeholder="Ej: Sistema de Gestión Documental"
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="btn-secondary !py-2.5 !px-5 text-xs whitespace-nowrap flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              Vista Preliminar
            </button>
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
        </div>
      </form>

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto backdrop-blur-sm p-4 md:p-8 animate-fade-in flex flex-col items-center">
          {/* Admin Header Banner */}
          <div className="w-full max-w-4xl mb-4 bg-[var(--color-deep-green)] text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-lg sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">visibility</span>
              <span className="text-xs font-bold uppercase tracking-wider">Vista Previa del Cliente</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="bg-white/20 hover:bg-white/35 text-white font-bold text-xs py-1.5 px-4 rounded-lg transition-all"
            >
              Cerrar Vista Previa
            </button>
          </div>

          {/* Landing Content Wrapper */}
          <div className="w-full max-w-4xl bg-[var(--color-refined-gray)] rounded-2xl overflow-hidden shadow-2xl border border-gray-100 pb-12 relative text-left">
            
            {/* Header */}
            <div className="glass-nav sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
              <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                  <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
                  <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight">LEANDRO VELASQUES</span>
                </div>
                <button 
                  type="button"
                  disabled
                  className="btn-secondary !py-2 !px-4 !text-xs whitespace-nowrap flex items-center gap-1.5 shadow-sm opacity-50 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  Imprimir / Guardar PDF
                </button>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 lg:py-12">
              {/* Status Alert */}
              <div className="p-4 mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 text-amber-800 flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-amber-500">info</span>
                <div>
                  <p className="text-sm font-bold">Borrador de Propuesta</p>
                  <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">
                    Esta es una vista preliminar en tiempo real de cómo el cliente revisará la propuesta comercial en su navegador.
                  </p>
                </div>
              </div>

              {/* Corporate Header Info */}
              <div className="card p-6 md:p-8 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--color-deep-green)]">{form.title || 'Propuesta Comercial Sin Título'}</h1>
                  {form.subtitle && (
                    <p className="text-sm md:text-base text-[var(--color-dark-gray)]/65 font-medium leading-snug">{form.subtitle}</p>
                  )}
                  <div className="flex gap-2 pt-1.5">
                    <span className="badge badge-yellow">⏳ Pendiente de revisión</span>
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-[var(--color-deep-green)]/8 pt-4 md:pt-0 md:pl-6 space-y-2 min-w-[200px]">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Fecha de emisión</p>
                    <p className="text-xs font-semibold">{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  {form.valid_until && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Válido hasta</p>
                      <p className="text-xs font-semibold text-amber-700">{new Date(form.valid_until + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Download Section */}
              {form.pdf_url && (
                <div className="card p-6 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]">picture_as_pdf</span>
                    <div>
                      <h3 className="text-sm font-extrabold text-[var(--color-dark-gray)]">Propuesta Técnica Completa (Documentación)</h3>
                      <p className="text-xs text-[var(--color-dark-gray)]/50 mt-0.5">Accede a las especificaciones detalladas del diagnóstico y propuesta técnica de 15 páginas.</p>
                    </div>
                  </div>
                  <a 
                    href={form.pdf_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-primary !py-2.5 !px-6 !text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 shadow-md shadow-[var(--color-deep-green)]/10"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Ver Propuesta PDF
                  </a>
                </div>
              )}

              {/* Client & Vendor Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">person</span>
                    Propuesta preparada para:
                  </h2>
                  {form.client_name ? (
                    <div className="space-y-1 text-xs">
                      <p className="text-sm font-extrabold text-[var(--color-dark-gray)]">{form.client_name}</p>
                      {form.client_company && <p className="font-semibold text-[var(--color-dark-gray)]/65">{form.client_company}</p>}
                      {form.client_email && <p className="text-[var(--color-dark-gray)]/50">{form.client_email}</p>}
                      {form.client_phone && <p className="text-[var(--color-dark-gray)]/50">{form.client_phone}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-dark-gray)]/40 italic">Ningún cliente especificado</p>
                  )}
                </div>

                <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">apartment</span>
                    Proveedor:
                  </h2>
                  <div className="space-y-1 text-xs">
                    <p className="text-sm font-extrabold text-[var(--color-dark-gray)]">Leandro Velasques</p>
                    <p className="font-semibold text-[var(--color-dark-gray)]/65">Consultoría & Diseño Web</p>
                    <p className="text-[var(--color-dark-gray)]/50">leandrovelasques.com.ar</p>
                    <p className="text-[var(--color-dark-gray)]/50">Trelew, Chubut, Argentina</p>
                  </div>
                </div>
              </div>

              {/* PAYMENT SCHEDULE PLAN */}
              <div className="card p-6 md:p-8 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 space-y-4">
                <h2 className="text-sm font-extrabold text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xl">payments</span>
                  Plan de Pagos de la Propuesta
                </h2>
                
                <div className="space-y-3.5 text-xs font-semibold text-[var(--color-dark-gray)]">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/10">
                    <div>
                      <p className="font-extrabold text-[var(--color-deep-green)]">Pago Inicial (50% de anticipo al comenzar el proyecto)</p>
                      <p className="text-[10px] text-[var(--color-dark-gray)]/50 mt-0.5">Se abona al momento de firmar y dar inicio a las actividades.</p>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-[var(--color-deep-green)]">
                      ${(Number(form.total_amount || 0) * 0.5).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-refined-gray)]/50 border border-gray-100">
                    <div>
                      <p className="font-bold text-[var(--color-dark-gray)]/85">Pago Final (50% restante al finalizar las etapas acordadas)</p>
                      <p className="text-[10px] text-[var(--color-dark-gray)]/50 mt-0.5">Luego de la capacitación y entrega de manual de usuario correspondiente.</p>
                    </div>
                    <span className="font-mono font-bold text-[var(--color-dark-gray)]">
                      ${(Number(form.total_amount || 0) * 0.5).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-[var(--color-deep-green)]/8 text-sm font-extrabold">
                    <span>Total del Presupuesto Comercial:</span>
                    <span className="text-lg font-extrabold text-[var(--color-deep-green)] font-mono">
                      ${Number(form.total_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* BANK TRANSFER PAYMENT DETAILS */}
              <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">account_balance</span>
                  Información para Transferencia Bancaria
                </h2>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-semibold text-[var(--color-dark-gray)]/70">
                  <div><strong>Banco:</strong> {form.payment_details.banco}</div>
                  <div><strong>Titular:</strong> {form.payment_details.nombre}</div>
                  <div><strong>CBU:</strong> <span className="font-mono font-bold text-[var(--color-dark-gray)]">{form.payment_details.cbu}</span></div>
                  <div><strong>Alias:</strong> <span className="font-bold text-[var(--color-deep-green)]">{form.payment_details.alias}</span></div>
                  <div><strong>CUIT/CUIL:</strong> <span className="font-mono">{form.payment_details.cuit}</span></div>
                  <div><strong>Cuenta:</strong> {form.payment_details.cuenta}</div>
                </div>
              </div>

              {/* Terms and Conditions */}
              {form.terms_conditions && (
                <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">gavel</span>
                    Términos Comerciales & Condiciones
                  </h2>
                  <p className="text-xs text-[var(--color-dark-gray)]/65 font-medium leading-relaxed whitespace-pre-wrap">
                    {form.terms_conditions}
                  </p>
                </div>
              )}

              {/* Simulated Client Actions */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 py-6 opacity-50 pointer-events-none">
                <button type="button" className="btn-secondary !py-3.5 !px-8 text-sm w-full sm:w-auto">
                  <span className="material-symbols-outlined text-lg">cancel</span>
                  Rechazar / Solicitar ajuste
                </button>
                <button type="button" className="btn-primary !py-3.5 !px-10 text-sm w-full sm:w-auto shadow-lg shadow-[var(--color-deep-green)]/20">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Aprobar Presupuesto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
