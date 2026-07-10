import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'

export default function CrmClientsDashboard() {
  const { fetchCrmClients, crmClients, deleteCrmClient, isLoading } = useStore()
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchCrmClients()
  }, [fetchCrmClients])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el cliente "${name}"?`)) {
      const result = await deleteCrmClient(id)
      if (result.success) {
        showToast('Cliente eliminado correctamente')
      } else {
        showToast('Error al eliminar: ' + (result.error?.message || ''), 'error')
      }
    }
  }

  const filtered = crmClients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.email_2?.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Directorio de Clientes</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
            Administrá todos tus clientes y empresas para usarlos rápidamente en tus presupuestos.
          </p>
        </div>
        <Link to="/admin/clientes/nuevo" className="btn-primary">
          <span className="material-symbols-outlined text-lg">person_add</span>
          Nuevo Cliente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">Total Clientes</p>
          <p className="text-xl md:text-2xl font-extrabold text-[var(--color-deep-green)] mt-1">{crmClients.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex items-center bg-white shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-[var(--color-dark-gray)]/30"
            placeholder="Buscar por nombre, empresa o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-3xl animate-spin text-[var(--color-deep-green)] mb-2 block">progress_activity</span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/55">Cargando clientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center bg-white shadow-sm border border-[var(--color-deep-green)]/5">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block">groups</span>
          <p className="text-lg font-semibold text-[var(--color-dark-gray)]/40">No se encontraron clientes</p>
          <p className="text-sm text-[var(--color-dark-gray)]/30 mt-1">Hacé click en "Nuevo Cliente" para agregar uno a tu directorio.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-deep-green)]/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-refined-gray)]/50 border-b border-[var(--color-deep-green)]/5">
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">Nombre / Contacto</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60">Empresa</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-deep-green)]/5">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-[var(--color-refined-gray)]/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-sm text-[var(--color-dark-gray)]">{client.name}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {client.email && (
                          <span className="text-xs text-[var(--color-dark-gray)]/60 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">mail</span> {client.email}
                          </span>
                        )}
                        {client.email_2 && (
                          <span className="text-xs text-[var(--color-dark-gray)]/60 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">mail</span> {client.email_2}
                          </span>
                        )}
                        {client.phone && (
                          <span className="text-xs text-[var(--color-dark-gray)]/60 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">call</span> {client.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-sm text-[var(--color-deep-green)]">{client.company || '-'}</div>
                      {client.position && (
                        <div className="text-xs text-[var(--color-dark-gray)]/50 mt-0.5">{client.position}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/clientes/${client.id}/editar`}
                          className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-lg transition-all"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
