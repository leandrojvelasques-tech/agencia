import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'

export default function CrmClientCreate() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  
  const { crmClients, createCrmClient, updateCrmClient } = useStore()
  
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    position: '',
    notes: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (isEditing) {
      const client = crmClients.find(c => c.id === id)
      if (client) {
        setFormData({
          name: client.name || '',
          company: client.company || '',
          email: client.email || '',
          phone: client.phone || '',
          position: client.position || '',
          notes: client.notes || ''
        })
      }
    }
  }, [id, isEditing, crmClients])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      showToast('El nombre es obligatorio', 'error')
      return
    }

    setIsLoading(true)
    let result
    if (isEditing) {
      result = await updateCrmClient(id, formData)
    } else {
      result = await createCrmClient(formData)
    }

    setIsLoading(false)

    if (result.success) {
      navigate('/admin/clientes')
    } else {
      showToast('Error al guardar: ' + (result.error?.message || ''), 'error')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
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
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/clientes" className="p-2 text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/5 rounded-full transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
            Completá los datos del cliente para tu directorio.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 bg-white shadow-sm border border-[var(--color-deep-green)]/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Nombre / Contacto *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              required
              className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Empresa (Opcional)</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Ej: Tech Solutions SRL"
              className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Cargo (Opcional)</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              placeholder="Ej: Gerente de Marketing"
              className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Email (Opcional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ej: juan@empresa.com"
              className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Teléfono (Opcional)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Ej: +54 9 11 1234 5678"
              className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Notas Adicionales (Interno)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Información adicional sobre el cliente..."
              rows={4}
              className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium resize-none"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Link
            to="/admin/clientes"
            className="px-6 py-3 rounded-premium text-sm font-bold text-[var(--color-dark-gray)] hover:bg-[var(--color-refined-gray)] transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">save</span>
            )}
            {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
