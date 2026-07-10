import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function CrmProposalLanding() {
  const { token } = useParams()
  const { fetchProposalByToken, updateProposal } = useStore()
  const viewTracked = useRef(false)

  // State
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorState, setErrorState] = useState(null)
  
  // Modals / Actions State
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [approveForm, setApproveForm] = useState({ name: '', email: '', cuit: '', acceptTerms: false })
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [revisionFeedback, setRevisionFeedback] = useState('')
  const [actionError, setActionError] = useState('')

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await fetchProposalByToken(token)
        if (!data) {
          setErrorState('La propuesta comercial no existe o el enlace es inválido.')
        } else {
          setProposal(data)
          // Track view only once per session
          if (!viewTracked.current && !data.viewed_at && data.status !== 'accepted') {
            viewTracked.current = true
            try {
              await supabase
                .from('crm_proposals')
                .update({ 
                  viewed_at: new Date().toISOString(),
                  status: data.status === 'sent' ? 'viewed' : data.status
                })
                .eq('id', data.id)
            } catch (e) {
              console.log('Could not track view:', e)
            }
          }
        }
      } catch (err) {
        console.error(err)
        setErrorState('Hubo un error al cargar el presupuesto.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token])

  const handleApproveSubmit = async (e) => {
    e.preventDefault()
    setActionError('')

    if (!approveForm.name || !approveForm.email || !approveForm.cuit) {
      setActionError('Por favor, completa todos los campos de confirmación.')
      return
    }
    if (!approveForm.acceptTerms) {
      setActionError('Debes aceptar los términos y condiciones.')
      return
    }

    setSubmitting(true)
    try {
      const feedback = `Aprobado digitalmente por CUIT/DNI: ${approveForm.cuit}`
      const result = await updateProposal(proposal.id, {
        status: 'accepted',
        approved_by_name: approveForm.name,
        approved_by_email: approveForm.email,
        approved_at: new Date().toISOString(),
        client_feedback: feedback
      })

      if (result.success) {
        setProposal(prev => ({
          ...prev,
          status: 'accepted',
          approved_by_name: approveForm.name,
          approved_by_email: approveForm.email,
          approved_at: new Date().toISOString(),
          client_feedback: feedback
        }))
        setShowApproveModal(false)
      } else {
        throw new Error(result.error?.message || 'Error al aprobar')
      }
    } catch (err) {
      setActionError('No se pudo procesar la aprobación: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    setActionError('')

    if (!rejectFeedback.trim()) {
      setActionError('Por favor, ingresa el motivo del rechazo.')
      return
    }

    setSubmitting(true)
    try {
      const result = await updateProposal(proposal.id, {
        status: 'rejected',
        client_feedback: rejectFeedback
      })

      if (result.success) {
        setProposal(prev => ({
          ...prev,
          status: 'rejected',
          client_feedback: rejectFeedback
        }))
        setShowRejectModal(false)
      } else {
        throw new Error(result.error?.message || 'Error al actualizar')
      }
    } catch (err) {
      setActionError('No se pudo enviar el comentario: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevisionSubmit = async (e) => {
    e.preventDefault()
    setActionError('')

    if (!revisionFeedback.trim()) {
      setActionError('Por favor, describí qué cambios necesitás.')
      return
    }

    setSubmitting(true)
    try {
      const result = await updateProposal(proposal.id, {
        status: 'revision_requested',
        client_feedback: revisionFeedback
      })

      if (result.success) {
        setProposal(prev => ({
          ...prev,
          status: 'revision_requested',
          client_feedback: revisionFeedback
        }))
        setShowRevisionModal(false)
      } else {
        throw new Error(result.error?.message || 'Error al enviar')
      }
    } catch (err) {
      setActionError('No se pudo enviar la solicitud de cambios: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isImageFile = (type) => type && type.startsWith('image/')

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)] mb-2 block animate-spin">progress_activity</span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/45">Cargando propuesta comercial...</p>
        </div>
      </div>
    )
  }

  if (errorState || !proposal) {
    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-amber-500 mb-4 block">receipt_long</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mb-2">Propuesta no disponible</h1>
          <p className="text-[var(--color-dark-gray)]/60 text-sm leading-relaxed mb-6">
            {errorState || 'El enlace que estás utilizando no es válido o ha expirado.'}
          </p>
          <a href="https://www.leandrovelasques.com.ar" className="btn-primary inline-flex justify-center w-full">Ir al sitio principal</a>
        </div>
      </div>
    )
  }

  const isPastValidity = proposal.valid_until && new Date(proposal.valid_until + 'T23:59:59') < new Date()
  const isAccepted = proposal.status === 'accepted'
  const isRejected = proposal.status === 'rejected'
  const isRevisionRequested = proposal.status === 'revision_requested'
  const canAct = !isAccepted && !isRejected && !isPastValidity

  // Default bank details if database doesn't have it
  const bankDetails = proposal.payment_details || {
    banco: 'Banco ICBC',
    nombre: 'LEANDRO JOSE VELASQUES',
    cbu: '0150846601000134863268',
    alias: 'LEANDRO.TANGO',
    cuit: '20309551665',
    cuenta: 'CA $ 00150846000113486326'
  }

  const attachments = proposal.attachments || []

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] pb-16 relative">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: #1a1a1a !important;
          }
          header, .no-print, button, .modal, footer {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .badge {
            border: 1px solid #1a1a1a !important;
            color: #1a1a1a !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="glass-nav sticky top-0 z-30 no-print">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="https://www.leandrovelasques.com.ar" target="_blank" rel="noreferrer" className="flex items-center gap-2">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Logo" className="h-7 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight">LEANDRO VELASQUES</span>
          </a>
          <button 
            onClick={() => window.print()} 
            className="btn-secondary !py-2 !px-4 !text-xs whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            Imprimir / Guardar PDF
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 lg:py-12 animate-fade-in print-container">
        
        {/* Status Alerts */}
        {isAccepted && (
          <div className="p-4 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-start gap-3 no-print">
            <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
            <div>
              <p className="text-sm font-bold">¡Propuesta comercial aceptada!</p>
              <p className="text-xs text-emerald-700/80 mt-0.5 leading-relaxed">
                Aprobado por {proposal.approved_by_name} ({proposal.approved_by_email}) el {new Date(proposal.approved_at).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs.
              </p>
            </div>
          </div>
        )}
        {isRejected && (
          <div className="p-4 mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-3 no-print">
            <span className="material-symbols-outlined text-2xl text-red-500">cancel</span>
            <div>
              <p className="text-sm font-bold">Propuesta rechazada</p>
              <p className="text-xs text-red-700/80 mt-0.5 leading-relaxed">
                Motivo: "{proposal.client_feedback}"
              </p>
            </div>
          </div>
        )}
        {isRevisionRequested && (
          <div className="p-4 mb-6 rounded-2xl border border-orange-200 bg-orange-50 text-orange-800 flex items-start gap-3 no-print">
            <span className="material-symbols-outlined text-2xl text-orange-500">rate_review</span>
            <div>
              <p className="text-sm font-bold">Cambios solicitados</p>
              <p className="text-xs text-orange-700/80 mt-0.5 leading-relaxed">
                Tu comentario fue enviado: "{proposal.client_feedback}". El proveedor lo revisará y te contactará.
              </p>
            </div>
          </div>
        )}
        {isPastValidity && !isAccepted && (
          <div className="p-4 mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 text-amber-800 flex items-start gap-3 no-print">
            <span className="material-symbols-outlined text-2xl text-amber-500">warning</span>
            <div>
              <p className="text-sm font-bold">Presupuesto vencido</p>
              <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">
                Este presupuesto venció el {new Date(proposal.valid_until).toLocaleDateString('es-AR')}. Por favor, consulta por una propuesta actualizada.
              </p>
            </div>
          </div>
        )}

        {/* Corporate Header Info */}
        <div className="card p-6 md:p-8 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--color-deep-green)]">{proposal.title}</h1>
            {proposal.subtitle && (
              <p className="text-sm md:text-base text-[var(--color-dark-gray)]/65 font-medium leading-snug">{proposal.subtitle}</p>
            )}
            <div className="flex gap-2 pt-1.5 no-print flex-wrap">
              <span className={`badge ${isAccepted ? 'badge-green' : isRejected ? 'badge-red' : isRevisionRequested ? 'badge-orange' : 'badge-yellow'}`}>
                {isAccepted ? '✓ Aprobado' : isRejected ? '✘ Rechazado' : isRevisionRequested ? '✏ Cambios solicitados' : '⏳ Pendiente de revisión'}
              </span>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-[var(--color-deep-green)]/8 pt-4 md:pt-0 md:pl-6 space-y-2 min-w-[200px]">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Fecha de emisión</p>
              <p className="text-xs font-semibold">{new Date(proposal.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            {proposal.valid_until && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Válido hasta</p>
                <p className="text-xs font-semibold text-amber-700">{new Date(proposal.valid_until).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        {proposal.description && (
          <div className="card p-6 md:p-8 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 space-y-3">
            <h2 className="text-sm font-extrabold text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xl">description</span>
              Descripción del Servicio
            </h2>
            <p className="text-xs text-[var(--color-dark-gray)]/75 font-medium leading-relaxed whitespace-pre-wrap">
              {proposal.description}
            </p>
          </div>
        )}

        {/* Attachments Gallery */}
        {attachments.length > 0 && (
          <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">collections</span>
              Material de Referencia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {attachments.map((att, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-gray-100 group cursor-pointer">
                  {isImageFile(att.type) ? (
                    <img 
                      src={att.url} 
                      alt={att.name} 
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightboxImage(att.url)}
                    />
                  ) : (
                    <a href={att.url} target="_blank" rel="noreferrer" className="block w-full h-36 flex flex-col items-center justify-center gap-1 bg-[var(--color-refined-gray)] p-2 hover:bg-[var(--color-deep-green)]/5 transition-colors">
                      <span className="material-symbols-outlined text-3xl text-[var(--color-dark-gray)]/30">
                        {att.type === 'application/pdf' ? 'picture_as_pdf' : 'insert_drive_file'}
                      </span>
                      <p className="text-[10px] font-semibold text-[var(--color-dark-gray)]/60 truncate max-w-full px-1">{att.name}</p>
                      <p className="text-[9px] text-[var(--color-deep-green)] font-bold">Click para descargar</p>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF Download Section */}
        {proposal.pdf_url && (
          <div className="card p-6 bg-[var(--color-deep-green)]/5 border border-[var(--color-deep-green)]/15 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]">picture_as_pdf</span>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--color-dark-gray)]">Propuesta Técnica Completa (Documentación)</h3>
                <p className="text-xs text-[var(--color-dark-gray)]/50 mt-0.5">Accede a las especificaciones detalladas del diagnóstico y propuesta técnica.</p>
              </div>
            </div>
            <a 
              href={proposal.pdf_url} 
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
            {(proposal.client_name || proposal.crm_clients) ? (
              <div className="space-y-1 text-xs">
                <p className="text-sm font-extrabold text-[var(--color-dark-gray)]">{proposal.client_name || proposal.crm_clients?.name}</p>
                {(proposal.client_company || proposal.crm_clients?.company) && <p className="font-semibold text-[var(--color-dark-gray)]/65">{proposal.client_company || proposal.crm_clients?.company}</p>}
                {(proposal.client_email || proposal.crm_clients?.email) && <p className="text-[var(--color-dark-gray)]/50">{proposal.client_email || proposal.crm_clients?.email}</p>}
                {(proposal.client_phone || proposal.crm_clients?.phone) && <p className="text-[var(--color-dark-gray)]/50">{proposal.client_phone || proposal.crm_clients?.phone}</p>}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-dark-gray)]/40">Cliente no especificado</p>
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
                ${(Number(proposal.total_amount) * 0.5).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-refined-gray)]/50 border border-gray-100">
              <div>
                <p className="font-bold text-[var(--color-dark-gray)]/85">Pago Final (50% restante al finalizar las etapas acordadas)</p>
                <p className="text-[10px] text-[var(--color-dark-gray)]/50 mt-0.5">Luego de la capacitación y entrega de manual de usuario correspondiente.</p>
              </div>
              <span className="font-mono font-bold text-[var(--color-dark-gray)]">
                ${(Number(proposal.total_amount) * 0.5).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[var(--color-deep-green)]/8 text-sm font-extrabold">
              <span>Total del Presupuesto Comercial:</span>
              <span className="text-lg font-extrabold text-[var(--color-deep-green)] font-mono">
                ${Number(proposal.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <div><strong>Banco:</strong> {bankDetails.banco}</div>
            <div><strong>Titular:</strong> {bankDetails.nombre}</div>
            <div><strong>CBU:</strong> <span className="font-mono font-bold text-[var(--color-dark-gray)]">{bankDetails.cbu}</span></div>
            <div><strong>Alias:</strong> <span className="font-bold text-[var(--color-deep-green)]">{bankDetails.alias}</span></div>
            <div><strong>CUIT/CUIL:</strong> <span className="font-mono">{bankDetails.cuit}</span></div>
            <div><strong>Cuenta:</strong> {bankDetails.cuenta}</div>
          </div>
        </div>

        {/* Terms and Conditions */}
        {proposal.terms_conditions && (
          <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm mb-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)] border-b border-[var(--color-deep-green)]/8 pb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">gavel</span>
              Términos Comerciales & Condiciones
            </h2>
            <p className="text-xs text-[var(--color-dark-gray)]/65 font-medium leading-relaxed whitespace-pre-wrap">
              {proposal.terms_conditions}
            </p>
          </div>
        )}

        {/* Interactive Actions */}
        {canAct && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 py-6 no-print">
            <button
              onClick={() => { setActionError(''); setRevisionFeedback(''); setShowRevisionModal(true) }}
              className="btn-secondary !py-3.5 !px-8 text-sm w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-lg">rate_review</span>
              Solicitar Cambios
            </button>
            <button
              onClick={() => { setActionError(''); setRejectFeedback(''); setShowRejectModal(true) }}
              className="btn-secondary !py-3.5 !px-8 text-sm w-full sm:w-auto !border-red-200 !text-red-600 hover:!bg-red-50"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              Rechazar
            </button>
            <button
              onClick={() => { setActionError(''); setShowApproveModal(true) }}
              className="btn-primary !py-3.5 !px-10 text-sm w-full sm:w-auto shadow-lg shadow-[var(--color-deep-green)]/20"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Aprobar Presupuesto
            </button>
          </div>
        )}

        {/* Approval PDF Signature Details */}
        {isAccepted && (
          <div className="card p-6 bg-[var(--color-light-green)]/10 border-2 border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Presupuesto Aprobado Digitalmente</p>
              <p className="text-sm font-extrabold text-[var(--color-dark-gray)]">{proposal.approved_by_name}</p>
              <p className="text-xs text-[var(--color-dark-gray)]/50">{proposal.approved_by_email}</p>
            </div>
            <div className="text-left md:text-right text-xs text-[var(--color-dark-gray)]/60">
              <p><strong>Fecha:</strong> {new Date(proposal.approved_at).toLocaleDateString('es-AR')} - {new Date(proposal.approved_at).toLocaleTimeString('es-AR')} hs</p>
              {proposal.client_feedback && <p className="mt-1"><strong>Registro:</strong> {proposal.client_feedback}</p>}
            </div>
          </div>
        )}
      </main>

      {/* APPROVAL MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in modal no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-[var(--color-deep-green)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xl">task_alt</span>
                Aprobación del Presupuesto
              </h3>
              <button onClick={() => setShowApproveModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1.5 block">Nombre del Firmante *</label>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  className="form-input text-xs"
                  value={approveForm.name}
                  onChange={e => setApproveForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1.5 block">Email corporativo *</label>
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  className="form-input text-xs"
                  value={approveForm.email}
                  onChange={e => setApproveForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1.5 block">DNI / CUIT de la Empresa *</label>
                <input
                  type="text"
                  placeholder="20-XXXXXXXX-9 o DNI"
                  className="form-input text-xs"
                  value={approveForm.cuit}
                  onChange={e => setApproveForm(p => ({ ...p, cuit: e.target.value }))}
                  required
                />
              </div>

              <div className="flex items-start gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="chk-terms"
                  checked={approveForm.acceptTerms}
                  onChange={e => setApproveForm(p => ({ ...p, acceptTerms: e.target.checked }))}
                  className="accent-[var(--color-deep-green)] rounded mt-0.5"
                  required
                />
                <label htmlFor="chk-terms" className="text-xs text-[var(--color-dark-gray)]/65 cursor-pointer leading-tight">
                  Acepto comenzar la contratación bajo los conceptos, plan de pagos y términos y condiciones detallados en este presupuesto.
                </label>
              </div>

              {actionError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{actionError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="btn-secondary !py-2 !px-4 !text-xs"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary !py-2 !px-5 !text-xs"
                  disabled={submitting}
                >
                  {submitting ? 'Procesando...' : 'Confirmar Aceptación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in modal no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-red-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xl">cancel</span>
                Rechazar Presupuesto
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1.5 block">Motivo del rechazo *</label>
                <textarea
                  placeholder="Indicá por qué rechazás esta propuesta..."
                  className="form-input text-xs min-h-[120px] leading-relaxed"
                  value={rejectFeedback}
                  onChange={e => setRejectFeedback(e.target.value)}
                  required
                />
              </div>

              {actionError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{actionError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn-secondary !py-2 !px-4 !text-xs"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary !py-2 !px-5 !text-xs bg-red-500 border-red-500 hover:bg-red-600"
                  disabled={submitting}
                >
                  {submitting ? 'Enviando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISION REQUEST MODAL */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in modal no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-orange-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xl">rate_review</span>
                Solicitar Cambios
              </h3>
              <button onClick={() => setShowRevisionModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleRevisionSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 mb-1.5 block">¿Qué cambios necesitás? *</label>
                <textarea
                  placeholder="Describí los ajustes que necesitás antes de aprobar el presupuesto. Por ejemplo: cambiar el plazo de entrega, ajustar el alcance del servicio, modificar la forma de pago..."
                  className="form-input text-xs min-h-[140px] leading-relaxed"
                  value={revisionFeedback}
                  onChange={e => setRevisionFeedback(e.target.value)}
                  required
                />
              </div>

              {actionError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{actionError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="btn-secondary !py-2 !px-4 !text-xs"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary !py-2 !px-5 !text-xs !bg-orange-500 !border-orange-500 hover:!bg-orange-600"
                  disabled={submitting}
                >
                  {submitting ? 'Enviando...' : 'Enviar Solicitud de Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <img 
            src={lightboxImage} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 mt-12 border-t border-[var(--color-deep-green)]/8 no-print">
        <div className="max-w-4xl mx-auto px-6 text-center text-[10px] text-[var(--color-dark-gray)]/40 font-medium">
          Leandro Velasques · Consultoría & Desarrollo Web · leandrovelasques.com.ar
        </div>
      </footer>
    </div>
  )
}
