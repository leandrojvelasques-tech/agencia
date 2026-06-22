import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'gray', icon: 'edit_note' },
  sent: { label: 'Enviado', color: 'yellow', icon: 'send' },
  accepted: { label: 'Aprobado', color: 'green', icon: 'check_circle' },
  rejected: { label: 'Rechazado', color: 'red', icon: 'cancel' },
}

export default function CrmProposalsDashboard() {
  const { proposals, fetchProposals, deleteProposal, isLoading } = useStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    fetchProposals()
  }, [])

  const handleCopyLink = (token, id) => {
    const link = `${window.location.origin}/presupuesto/${token}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id, title) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el presupuesto "${title}"?`)) {
      const result = await deleteProposal(id)
      if (!result.success) {
        alert('Error al eliminar el presupuesto: ' + (result.error?.message || 'Error desconocido'))
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
  const countSent = proposals.filter(p => p.status === 'sent').length
  const countPending = proposals.filter(p => p.status === 'draft').length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
            Gestioná y enviá propuestas comerciales interactivas a tus clientes.
          </p>
        </div>
        <Link to="/admin/crm/presupuestos/nuevo" className="btn-primary">
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Presupuesto
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Enviados</p>
          <p className="text-xl md:text-2xl font-extrabold text-amber-600 mt-1">{countSent}</p>
        </div>
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Borradores</p>
          <p className="text-xl md:text-2xl font-extrabold text-gray-500 mt-1">{countPending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 bg-white shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
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
            <option value="accepted">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
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
      ) : (
        <div className="space-y-4">
          {filtered.map((proposal, i) => {
            const statusCfg = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft
            const clientDisplayName = proposal.client_name || proposal.crm_clients?.name
            const clientDisplayCompany = proposal.client_company || proposal.crm_clients?.company
            return (
              <div 
                key={proposal.id}
                className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
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
                    {proposal.title}
                  </h3>
                  {proposal.subtitle && (
                    <p className="text-xs text-[var(--color-dark-gray)]/60 font-medium truncate mt-0.5">{proposal.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-[var(--color-deep-green)]/5 pt-4 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40">Total Presupuestado</p>
                    <p className="text-lg font-extrabold text-[var(--color-dark-gray)] mt-0.5">
                      ${Number(proposal.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/presupuesto/${proposal.share_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all"
                      title="Ver vista de cliente"
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                    </a>
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
                    <Link
                      to={`/admin/crm/presupuestos/${proposal.id}/editar`}
                      className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </Link>
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
            )
          })}
        </div>
      )}
    </div>
  )
}
