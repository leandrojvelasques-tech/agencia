import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function CrmProposalCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createProposal, updateProposal, getEventById } = useStore() // useStore functions

  // Local State
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(id ? true : false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    subtitle: '',
    valid_until: '',
    status: 'draft',
    terms_conditions: 'Términos y condiciones comerciales:\n- Forma de pago: 50% de anticipo y 50% al finalizar el desarrollo.\n- Validez del presupuesto: 15 días.\n- Plazo de entrega estimado: A convenir según alcance.',
    items: [{ id: `item_${Date.now()}`, concept: '', description: '', qty: 1, price: 0 }]
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
              items: proposal.items && proposal.items.length > 0
                ? proposal.items.map((it, idx) => ({ ...it, id: it.id || `item_${Date.now()}_${idx}` }))
                : [{ id: `item_${Date.now()}`, concept: '', description: '', qty: 1, price: 0 }]
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

  // Items CRUD helpers
  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: `item_${Date.now()}`, concept: '', description: '', qty: 1, price: 0 }]
    }))
  }

  const removeItem = (itemId) => {
    if (form.items.length <= 1) return
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== itemId)
    }))
  }

  const updateItem = (itemId, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === itemId) {
          const updated = { ...it, [field]: value }
          return updated
        }
        return it
      })
    }))
  }

  // Calculate totals
  const subtotal = form.items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0)

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

    const cleanedItems = form.items.map(({ id: _, ...item }) => ({
      ...item,
      qty: Number(item.qty),
      price: Number(item.price)
    }))

    const proposalData = {
      client_id: form.client_id,
      title: form.title,
      subtitle: form.subtitle || null,
      valid_until: form.valid_until || null,
      status: form.status,
      terms_conditions: form.terms_conditions || null,
      items: cleanedItems,
      total_amount: subtotal
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
    <div className="max-w-3xl mx-auto">
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
            Completa los detalles comerciales para enviar la propuesta.
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
              placeholder="Ej: Desarrollo Web y Branding para Marca"
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
              placeholder="Ej: Propuesta técnica y comercial"
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

        {/* Pricing Items Card */}
        <div className="card p-6 bg-white shadow-sm border border-[var(--color-deep-green)]/5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-deep-green)]/8 pb-2">
            <h3 className="text-sm font-bold text-[var(--color-deep-green)]">Conceptos Presupuestados</h3>
            <button
              type="button"
              onClick={addItem}
              className="btn-ghost text-xs !text-[var(--color-deep-green)] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">add</span> Agregar concepto
            </button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 rounded-[var(--radius-premium)] bg-[var(--color-refined-gray)]/40 border border-[var(--color-deep-green)]/5 space-y-3 relative group"
              >
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Quitar concepto"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}

                <div className="grid sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Concepto / Servicio *</label>
                    <input
                      type="text"
                      className="form-input !py-1.5 text-xs font-semibold"
                      placeholder="Ej: Desarrollo de Landing Page"
                      value={item.concept}
                      onChange={e => updateItem(item.id, 'concept', e.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Cant. *</label>
                    <input
                      type="number"
                      className="form-input !py-1.5 text-xs text-center"
                      value={item.qty}
                      onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                      min={1}
                      required
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Precio Unitario ($) *</label>
                    <input
                      type="number"
                      className="form-input !py-1.5 text-xs text-right font-mono"
                      placeholder="0.00"
                      value={item.price || ''}
                      onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/40 mb-1 block">Descripción del entregable (Opcional)</label>
                  <textarea
                    className="form-input !py-1.5 text-xs min-h-[50px]"
                    placeholder="Ej: Diseño de UI UX en Figma, maquetación adaptativa, SEO básico..."
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>

                <div className="text-right text-xs font-bold text-[var(--color-dark-gray)]/70">
                  Subtotal: <span className="font-mono">${(Number(item.qty || 0) * Number(item.price || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--color-deep-green)]/8 pt-4 flex justify-between items-center">
            <span className="text-sm font-extrabold text-[var(--color-dark-gray)]/75">Total General:</span>
            <span className="text-2xl font-extrabold text-[var(--color-deep-green)] font-mono">
              ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Terms and Conditions Card */}
        <div className="card p-6 bg-white shadow-sm border border-[var(--color-deep-green)]/5 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 block">Términos y Condiciones</label>
          <textarea
            className="form-input min-h-[140px] text-xs font-semibold leading-relaxed"
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
