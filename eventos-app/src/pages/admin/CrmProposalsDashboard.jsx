import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note' },
  sent: { label: 'Enviado', color: 'yellow', icon: 'send' },
  viewed: { label: 'Visto por Cliente', color: 'blue', icon: 'visibility' },
  accepted: { label: 'Aprobado', color: 'green', icon: 'check_circle' },
  revision_requested: { label: 'Cambios Solicitados', color: 'orange', icon: 'rate_review' },
  rejected: { label: 'Rechazado', color: 'red', icon: 'cancel' },
}

export default function CrmProposalsDashboard() {
  const { proposals, fetchProposals, deleteProposal, updateProposal, isLoading } = useStore()
  const [viewMode, setViewMode] = useState('kanban')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [copiedId, setCopiedId] = useState(null)
  const [sendingEmailId, setSendingEmailId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchProposals()
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
    setTimeout(() => {
      e.target.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50')
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-[var(--color-refined-gray)]')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-[var(--color-refined-gray)]')
  }

  const handleDrop = async (e, newStatus) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-[var(--color-refined-gray)]')
    const proposalId = e.dataTransfer.getData('text/plain')
    
    const proposal = proposals.find(p => p.id === proposalId)
    if (proposal && proposal.status !== newStatus) {
      // Optimistic update could be done, but we'll await the server response
      const result = await updateProposal(proposalId, { status: newStatus })
      if (!result.success) {
        showToast('Error al actualizar estado: ' + (result.error?.message || ''), 'error')
      } else {
        showToast(`Presupuesto movido a ${STATUS_CONFIG[newStatus].label}`)
        fetchProposals()
      }
    }
  }

  const handleCopyLink = (token, id) => {
    const link = `${window.location.origin}/presupuesto/${token}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    showToast('¡Enlace copiado al portapapeles!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyWhatsApp = (proposal) => {
    const link = `${window.location.origin}/presupuesto/${proposal.share_token}`
    const clientName = proposal.client_name || 'cliente'
    const text = `Hola ${clientName}, te envío la propuesta comercial "${proposal.title}". Podés revisarla, aprobarla o dejarnos tus comentarios desde este enlace:\n\n${link}\n\nQuedo a disposición para cualquier consulta. ¡Saludos!`
    const whatsappUrl = proposal.client_phone
      ? `https://wa.me/${proposal.client_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleSendEmail = async (proposal) => {
    if (!proposal.client_email) {
      showToast('Este presupuesto no tiene email del cliente configurado.', 'error')
      return
    }
    setSendingEmailId(proposal.id)
    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          to: proposal.client_email,
          clientName: proposal.client_name,
          title: proposal.title,
          subtitle: proposal.subtitle,
          totalAmount: proposal.total_amount,
          shareToken: proposal.share_token,
          validUntil: proposal.valid_until,
        })
      })
      const result = await res.json()
      if (res.ok) {
        showToast('¡Email enviado exitosamente!')
        // Update status to sent if still draft
        if (proposal.status === 'draft') {
          const { updateProposal } = useStore.getState()
          await updateProposal(proposal.id, { status: 'sent' })
          fetchProposals()
        }
      } else {
        throw new Error(result.error || 'Error al enviar')
      }
    } catch (err) {
      showToast('Error al enviar email: ' + err.message, 'error')
    } finally {
      setSendingEmailId(null)
    }
  }

  const handleDelete = async (id, title) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el presupuesto "${title}"?`)) {
      const result = await deleteProposal(id)
      if (!result.success) {
        showToast('Error al eliminar: ' + (result.error?.message || 'Error desconocido'), 'error')
      } else {
        showToast('Presupuesto eliminado correctamente.')
      }
    }
  }

  const filtered = (proposals || [])
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.subtitle?.toLowerCase().includes(q) ||
        (p.client_name && p.client_name.toLowerCase().includes(q)) ||
        (p.client_company && p.client_company.toLowerCase().includes(q)) ||
        p.crm_clients?.name?.toLowerCase().includes(q) ||
        p.crm_clients?.company?.toLowerCase().includes(q)
      )
    })

  // Summary stats
  const totalAmount = proposals.reduce((sum, p) => sum + (p.status === 'accepted' ? Number(p.total_amount) : 0), 0)
  const countAccepted = proposals.filter(p => p.status === 'accepted').length
  const countSent = proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length
  const countPending = proposals.filter(p => p.status === 'draft').length
  const countRevision = proposals.filter(p => p.status === 'revision_requested').length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-premium shadow-lg border transition-all duration-300 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
            Creá, enviá y hacé seguimiento de presupuestos cortos para trabajos de consultoría.
          </p>
        </div>
        <Link to="/admin/presupuestos/nuevo" className="btn-primary">
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Presupuesto
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Total Aprobado</p>
          <p className="text-xl md:text-2xl font-extrabold text-[var(--color-deep-green)] mt-1">
            ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Aprobados</p>
          <p className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-1">{countAccepted}</p>
        </div>
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Enviados / Vistos</p>
          <p className="text-xl md:text-2xl font-extrabold text-amber-600 mt-1">{countSent}</p>
        </div>
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Con Cambios</p>
          <p className="text-xl md:text-2xl font-extrabold text-orange-600 mt-1">{countRevision}</p>
        </div>
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Borradores</p>
          <p className="text-xl md:text-2xl font-extrabold text-gray-500 mt-1">{countPending}</p>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-3 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-1">
            <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30"
            placeholder="Buscar por cliente, título o empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-2 text-[var(--color-dark-gray)] outline-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="sent">Enviado</option>
            <option value="viewed">Visto por Cliente</option>
            <option value="revision_requested">Cambios Solicitados</option>
            <option value="accepted">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-[var(--color-refined-gray)] p-1 rounded-lg ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md flex items-center transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[var(--color-deep-green)]' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vista de Lista"
          >
            <span className="material-symbols-outlined text-sm">view_list</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-md flex items-center transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-[var(--color-deep-green)]' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vista Tablero Kanban"
          >
            <span className="material-symbols-outlined text-sm">view_column</span>
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-3xl animate-spin text-[var(--color-deep-green)] mb-2 block">progress_activity</span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/55">Cargando presupuestos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">receipt_long</span>
          <p className="text-lg font-semibold text-[var(--color-dark-gray)]/40">No se encontraron presupuestos</p>
          <p className="text-sm text-[var(--color-dark-gray)]/30 mt-1">Hacé click en "Nuevo Presupuesto" para crear una propuesta comercial.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
          {Object.entries(STATUS_CONFIG).map(([statusKey, statusCfg]) => {
            const colProposals = filtered.filter(p => p.status === statusKey)
            return (
              <div 
                key={statusKey}
                className="flex-shrink-0 w-[320px] flex flex-col snap-start"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, statusKey)}
              >
                {/* Column Header */}
                <div className="mb-3 pb-2 border-b border-gray-200 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`status-dot status-dot-${statusCfg.color}`} />
                    <h3 className="font-extrabold text-xs text-[var(--color-dark-gray)] uppercase tracking-wider">
                      {statusCfg.label}
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {colProposals.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 min-h-[200px] rounded-xl transition-colors duration-200 py-2">
                  {colProposals.map(proposal => {
                    const clientDisplayName = proposal.client_name || proposal.crm_clients?.name
                    const clientDisplayCompany = proposal.client_company || proposal.crm_clients?.company
                    
                    return (
                      <div
                        key={proposal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, proposal.id)}
                        onDragEnd={handleDragEnd}
                        className="bg-white p-4 rounded-xl border border-[var(--color-deep-green)]/10 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing mb-3 transition-shadow relative group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-sm text-[var(--color-deep-green)] leading-tight">
                            {proposal.proposal_number ? <span className="opacity-60 font-semibold mr-1">#{proposal.proposal_number.toString().padStart(4, '0')}</span> : null}
                            {proposal.title}
                          </h4>
                          <Link to={`/admin/presupuestos/${proposal.id}/editar`} className="text-gray-400 hover:text-[var(--color-deep-green)] transition-colors">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </Link>
                        </div>
                        
                        {clientDisplayName && (
                          <p className="text-[11px] text-[var(--color-dark-gray)]/70 font-semibold mb-3 truncate">
                            👤 {clientDisplayName} {clientDisplayCompany ? `(${clientDisplayCompany})` : ''}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <p className="text-xs font-extrabold text-[var(--color-dark-gray)]">
                            ${Number(proposal.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopyWhatsApp(proposal)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md transition-colors" title="WhatsApp">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                            <button onClick={() => handleCopyLink(proposal.share_token, proposal.id)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md transition-colors relative" title="Copiar Enlace">
                              <span className="material-symbols-outlined text-[15px]">share</span>
                              {copiedId === proposal.id && (
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                  ¡Cop!
                                </span>
                              )}
                            </button>
                            <a href={`/presupuesto/${proposal.share_token}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md transition-colors" title="Vista Pública">
                              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {colProposals.length === 0 && (
                    <div className="h-full flex items-center justify-center p-4 opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center border-2 border-dashed border-gray-200 rounded-lg w-full py-4">
                        Soltar aquí
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((proposal) => {
            const statusCfg = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft
            const clientDisplayName = proposal.client_name || proposal.crm_clients?.name
            const clientDisplayCompany = proposal.client_company || proposal.crm_clients?.company
            const hasBeenViewed = !!proposal.viewed_at
            return (
              <div 
                key={proposal.id}
                className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`badge badge-${statusCfg.color}`}>
                        <span className={`status-dot status-dot-${statusCfg.color}`} />
                        {statusCfg.label}
                      </span>
                      {clientDisplayName && (
                        <span className="badge badge-gray text-xs font-semibold">
                          👤 {clientDisplayName} {clientDisplayCompany ? `(${clientDisplayCompany})` : ''}
                        </span>
                      )}
                      {proposal.valid_until && (
                        <span className="text-[11px] text-[var(--color-dark-gray)]/50 font-bold">
                          Vence: {new Date(proposal.valid_until).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-[var(--color-deep-green)] truncate">
                      {proposal.proposal_number ? <span className="opacity-60 font-semibold mr-1.5">#{proposal.proposal_number.toString().padStart(4, '0')}</span> : null}
                      {proposal.title}
                    </h3>
                    {proposal.subtitle && (
                      <p className="text-xs text-[var(--color-dark-gray)]/60 font-medium truncate mt-0.5">{proposal.subtitle}</p>
                    )}

                    {/* Tracking indicators */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-widest">
                      {hasBeenViewed && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <span className="material-symbols-outlined text-xs">visibility</span>
                          Visto {new Date(proposal.viewed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {proposal.status === 'sent' && !hasBeenViewed && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <span className="material-symbols-outlined text-xs">schedule_send</span>
                          Pendiente de lectura
                        </span>
                      )}
                      {proposal.approved_at && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          Aprobado {new Date(proposal.approved_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {proposal.client_feedback && proposal.status === 'revision_requested' && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <span className="material-symbols-outlined text-xs">chat</span>
                          Tiene comentarios
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-[var(--color-deep-green)]/5 pt-4 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Total Presupuestado</p>
                      <p className="text-lg font-extrabold text-[var(--color-dark-gray)] mt-0.5">
                        ${Number(proposal.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp */}
                      <button
                        onClick={() => handleCopyWhatsApp(proposal)}
                        className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Enviar por WhatsApp"
                      >
                        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </button>
                      {/* Email */}
                      <button
                        onClick={() => handleSendEmail(proposal)}
                        disabled={sendingEmailId === proposal.id}
                        className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all disabled:opacity-50"
                        title="Enviar por Email"
                      >
                        <span className="material-symbols-outlined text-lg">{sendingEmailId === proposal.id ? 'progress_activity' : 'mail'}</span>
                      </button>
                      {/* Copy link */}
                      <button
                        onClick={() => handleCopyLink(proposal.share_token, proposal.id)}
                        className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all relative"
                        title="Copiar enlace público"
                      >
                        {copiedId === proposal.id ? (
                          <span className="text-[10px] font-extrabold text-[var(--color-deep-green)] bg-[var(--color-deep-green)]/8 px-1.5 py-0.5 rounded border border-[var(--color-deep-green)]/20 absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap animate-fade-in">
                            ¡Copiado!
                          </span>
                        ) : null}
                        <span className="material-symbols-outlined text-lg">share</span>
                      </button>
                      {/* View public */}
                      <a
                        href={`/presupuesto/${proposal.share_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all"
                        title="Ver vista de cliente"
                      >
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                      </a>
                      {/* Edit */}
                      <Link
                        to={`/admin/presupuestos/${proposal.id}/editar`}
                        className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </Link>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(proposal.id, proposal.title)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client feedback expansion */}
                {proposal.client_feedback && (proposal.status === 'revision_requested' || proposal.status === 'rejected') && (
                  <div className={`mt-4 p-3 rounded-xl border text-xs font-medium leading-relaxed ${
                    proposal.status === 'revision_requested'
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-1 opacity-60">
                      {proposal.status === 'revision_requested' ? 'Comentarios del cliente:' : 'Motivo del rechazo:'}
                    </p>
                    <p className="whitespace-pre-wrap">{proposal.client_feedback}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
