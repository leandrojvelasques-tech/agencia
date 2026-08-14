import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'uuid-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

const sanitizeAgenda = (agenda) => {
  if (!agenda || !Array.isArray(agenda)) return []
  return agenda.map(session => ({
    ...session,
    blocks: Array.isArray(session.blocks) 
      ? session.blocks.map(block => ({
          id: block.id || generateUUID(),
          title: block.title || '',
          subtitle: block.subtitle || '',
          description: block.description || ''
        }))
      : [{ id: generateUUID(), title: 'Bloque 1', subtitle: '', description: '' }]
  }))
}

const cloneAgendaWithNewIds = (agenda) => {
  if (!Array.isArray(agenda)) return []
  return agenda.map(session => ({
    ...session,
    blocks: Array.isArray(session.blocks)
      ? session.blocks.map(block => ({ ...block, id: generateUUID() }))
      : []
  }))
}

export default function AgendaTemplatesDashboard() {
  const { agendaTemplates, fetchAgendaTemplates, createAgendaTemplate, updateAgendaTemplate, deleteAgendaTemplate, isLoading } = useStore()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    agenda: []
  })

  useEffect(() => {
    fetchAgendaTemplates()
  }, [])

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    setIsEditing(false)
    setIsCreating(false)
    setSaveError('')
  }

  const handleStartCreate = () => {
    setIsCreating(true)
    setIsEditing(false)
    setSelectedTemplate(null)
    setSaveError('')
    setForm({
      name: '',
      description: '',
      agenda: [
        {
          title: 'Clase 1',
          start_time: '18:00',
          end_time: '21:00',
          break_duration: 15,
          blocks: [{ id: generateUUID(), title: 'Bloque 1', subtitle: '', description: '' }]
        }
      ]
    })
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setIsCreating(false)
    setSaveError('')
    setForm({
      name: selectedTemplate.name,
      description: selectedTemplate.description || '',
      agenda: sanitizeAgenda(selectedTemplate.agenda || [])
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setSaveError('')
  }

  // Agenda Management Functions
  const addClass = () => {
    const classNumber = form.agenda.length + 1
    setForm(prev => ({
      ...prev,
      agenda: [
        ...prev.agenda,
        {
          title: `Clase ${classNumber}`,
          start_time: '18:00',
          end_time: '21:00',
          break_duration: 0,
          blocks: [{ id: generateUUID(), title: 'Bloque 1', subtitle: '', description: '' }]
        }
      ]
    }))
  }

  const removeClass = (classIdx) => {
    setForm(prev => ({
      ...prev,
      agenda: prev.agenda.filter((_, idx) => idx !== classIdx)
    }))
  }

  const updateClassField = (classIdx, field, value) => {
    setForm(prev => {
      const updatedAgenda = [...prev.agenda]
      updatedAgenda[classIdx] = {
        ...updatedAgenda[classIdx],
        [field]: value
      }
      return { ...prev, agenda: updatedAgenda }
    })
  }

  const addBlock = (classIdx, type = 'block') => {
    setForm(prev => {
      const updatedAgenda = [...prev.agenda]
      const blocks = updatedAgenda[classIdx].blocks || []
      const blockNumber = blocks.filter(b => !b.type || b.type === 'block').length + 1
      
      let newBlock
      if (type === 'break') {
        newBlock = { id: generateUUID(), type: 'break', duration: 15 }
      } else if (type === 'custom') {
        newBlock = { id: generateUUID(), type: 'custom', title: 'Consultas / Q&A', duration: 15, description: '' }
      } else {
        newBlock = { id: generateUUID(), type: 'block', title: `Bloque ${blockNumber}`, subtitle: '', description: '' }
      }

      updatedAgenda[classIdx].blocks = [...blocks, newBlock]
      return { ...prev, agenda: updatedAgenda }
    })
  }

  const moveBlock = (classIdx, blockIdx, direction) => {
    setForm(prev => {
      const updatedAgenda = [...prev.agenda]
      const blocks = [...updatedAgenda[classIdx].blocks]
      const targetIdx = direction === 'up' ? blockIdx - 1 : blockIdx + 1
      
      if (targetIdx >= 0 && targetIdx < blocks.length) {
        const temp = blocks[blockIdx]
        blocks[blockIdx] = blocks[targetIdx]
        blocks[targetIdx] = temp
        updatedAgenda[classIdx].blocks = blocks
      }
      
      return { ...prev, agenda: updatedAgenda }
    })
  }

  const removeBlock = (classIdx, blockIdx) => {
    setForm(prev => {
      const updatedAgenda = [...prev.agenda]
      updatedAgenda[classIdx].blocks = updatedAgenda[classIdx].blocks.filter((_, idx) => idx !== blockIdx)
      return { ...prev, agenda: updatedAgenda }
    })
  }

  const updateBlockField = (classIdx, blockIdx, field, value) => {
    setForm(prev => {
      const updatedAgenda = [...prev.agenda]
      const updatedBlocks = [...updatedAgenda[classIdx].blocks]
      updatedBlocks[blockIdx] = {
        ...updatedBlocks[blockIdx],
        [field]: value
      }
      updatedAgenda[classIdx].blocks = updatedBlocks
      return { ...prev, agenda: updatedAgenda }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError('')

    if (!form.name.trim()) {
      setSaveError('El nombre de la plantilla es requerido.')
      return
    }

    if (form.agenda.length === 0) {
      setSaveError('La plantilla debe tener al menos una clase o sesión.')
      return
    }

    const templateData = {
      name: form.name.trim(),
      description: form.description.trim(),
      agenda: sanitizeAgenda(form.agenda)
    }

    let result
    if (isCreating) {
      result = await createAgendaTemplate(templateData)
    } else {
      result = await updateAgendaTemplate(selectedTemplate.id, templateData)
    }

    if (result.success) {
      setIsCreating(false)
      setIsEditing(false)
      setSelectedTemplate(result.data)
    } else {
      setSaveError(result.error?.message || 'Error al guardar la plantilla.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro de eliminar esta plantilla de agenda?')) return

    const result = await deleteAgendaTemplate(selectedTemplate.id)
    if (result.success) {
      setSelectedTemplate(null)
    } else {
      alert('Error al eliminar la plantilla.')
    }
  }

  const handleDuplicate = async () => {
    if (!selectedTemplate) return
    setIsDuplicating(true)
    setSaveError('')

    try {
      const copiedAgenda = cloneAgendaWithNewIds(selectedTemplate.agenda)
      const result = await createAgendaTemplate({
        name: `Copia de ${selectedTemplate.name}`,
        description: selectedTemplate.description || '',
        agenda: copiedAgenda
      })

      if (result.success) {
        setSelectedTemplate(result.data)
        setForm({
          name: result.data.name,
          description: result.data.description || '',
          agenda: sanitizeAgenda(result.data.agenda || copiedAgenda)
        })
        setIsEditing(true)
      } else {
        setSaveError(result.error?.message || 'No se pudo duplicar la plantilla.')
      }
    } catch (err) {
      console.error('Error duplicating agenda template:', err)
      setSaveError('No se pudo duplicar la plantilla.')
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--color-deep-green)]/10 pb-5">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-extrabold text-[var(--color-deep-green)] tracking-tight">
            Plantillas de Agenda
          </h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-1">
            Gestione agendas predefinidas para reutilizar en sus capacitaciones y eventos recurrentes.
          </p>
        </div>
        {!isCreating && !isEditing && (
          <button
            onClick={handleStartCreate}
            className="btn-premium flex items-center gap-2 self-start md:self-auto"
            style={{
              background: 'var(--color-deep-green)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 'var(--radius-premium)',
              fontWeight: '600',
              boxShadow: 'var(--shadow-premium)',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined">add</span>
            Nueva Plantilla
          </button>
        )}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Templates List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/8 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--color-deep-green)] mb-4">Plantillas Disponibles</h2>
            
            {isLoading && agendaTemplates.length === 0 ? (
              <div className="text-center py-6 text-sm text-[var(--color-dark-gray)]/50 animate-pulse">
                Cargando plantillas...
              </div>
            ) : agendaTemplates.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--color-dark-gray)]/50">
                No hay plantillas creadas. ¡Comience creando una!
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-deep-green)]/5 max-h-[60vh] overflow-y-auto pr-1">
                {agendaTemplates.map(template => {
                  const isSelected = selectedTemplate?.id === template.id
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full text-left py-3.5 px-3 rounded-lg transition-all flex items-start gap-3 mt-1 ${
                        isSelected 
                          ? 'bg-[var(--color-deep-green)]/8 text-[var(--color-deep-green)] font-semibold border-l-4 border-[var(--color-deep-green)]' 
                          : 'hover:bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)] border-l-4 border-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined mt-0.5" style={{ color: isSelected ? 'var(--color-deep-green)' : 'inherit' }}>
                        history_edu
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{template.name}</p>
                        <p className="text-[11px] text-[var(--color-dark-gray)]/50 truncate mt-0.5">{template.description || 'Sin descripción'}</p>
                        <p className="text-[10px] text-[var(--color-deep-green)]/70 font-semibold mt-1">
                          {template.agenda?.length || 0} {template.agenda?.length === 1 ? 'Sesión/Clase' : 'Sesiones/Clases'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Details or Creation/Edition Form */}
        <div className="lg:col-span-2 space-y-6">
          {isCreating || isEditing ? (
            /* Edit / Create Form */
            <form onSubmit={handleSave} className="bg-white rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/8 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--color-deep-green)]/10 pb-4">
                <h3 className="text-lg font-bold text-[var(--color-deep-green)]">
                  {isCreating ? 'Crear Nueva Plantilla' : `Editar Plantilla: ${selectedTemplate?.name}`}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-[var(--radius-premium)] text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-[var(--color-deep-green)] rounded-[var(--radius-premium)] text-sm font-semibold hover:bg-[var(--color-deep-green)]/90 transition-colors shadow-sm cursor-pointer"
                  >
                    Guardar Plantilla
                  </button>
                </div>
              </div>

              {saveError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">
                  {saveError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/75 mb-1.5">Nombre de la Plantilla *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Taller de IA introductorio"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20 focus:border-[var(--color-deep-green)] bg-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/75 mb-1.5">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe el propósito o los temas de esta plantilla..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20 focus:border-[var(--color-deep-green)] bg-white text-sm"
                  />
                </div>
              </div>

              {/* Agenda Classes / Sessions */}
              <div className="space-y-6 pt-4 border-t border-[var(--color-deep-green)]/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-bold text-[var(--color-deep-green)]">Clases y Cronogramas</h4>
                  <button
                    type="button"
                    onClick={addClass}
                    className="text-xs font-bold text-[var(--color-deep-green)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Agregar Clase/Sesión
                  </button>
                </div>

                {form.agenda.map((cls, classIdx) => (
                  <div key={classIdx} className="bg-[var(--color-refined-gray)]/30 rounded-lg p-5 border border-[var(--color-deep-green)]/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--color-deep-green)]/5 pb-3">
                      <div className="flex-1 max-w-xs">
                        <input
                          type="text"
                          value={cls.title}
                          onChange={(e) => updateClassField(classIdx, 'title', e.target.value)}
                          placeholder="Nombre de la clase (Ej. Clase 1)"
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--color-deep-green)] font-bold text-sm text-[var(--color-deep-green)] py-0.5 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClass(classIdx)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Eliminar Clase
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--color-dark-gray)]/60 mb-1">Hora Inicio</label>
                        <input
                          type="time"
                          value={cls.start_time || ''}
                          onChange={(e) => updateClassField(classIdx, 'start_time', e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:border-[var(--color-deep-green)] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--color-dark-gray)]/60 mb-1">Hora Fin</label>
                        <input
                          type="time"
                          value={cls.end_time || ''}
                          onChange={(e) => updateClassField(classIdx, 'end_time', e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:border-[var(--color-deep-green)] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--color-dark-gray)]/60 mb-1">Minutos de Recreo</label>
                        <input
                          type="number"
                          value={cls.break_duration || 0}
                          onChange={(e) => updateClassField(classIdx, 'break_duration', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:border-[var(--color-deep-green)] text-xs"
                        />
                      </div>
                    </div>

                    {/* Blocks inside Class */}
                    <div className="space-y-3 pt-3 border-t border-[var(--color-deep-green)]/5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold uppercase text-[var(--color-deep-green)]">Bloques de Contenido</label>
                        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => addBlock(classIdx, 'block')}
                            className="text-[9px] font-bold text-[var(--color-deep-green)] hover:bg-white px-2 py-1 rounded transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[10px]">add</span> + Bloque
                          </button>
                          <button
                            type="button"
                            onClick={() => addBlock(classIdx, 'break')}
                            className="text-[9px] font-bold text-amber-700 hover:bg-white px-2 py-1 rounded transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[10px]">coffee</span> + Break
                          </button>
                          <button
                            type="button"
                            onClick={() => addBlock(classIdx, 'custom')}
                            className="text-[9px] font-bold text-indigo-700 hover:bg-white px-2 py-1 rounded transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[10px]">forum</span> + Especial
                          </button>
                        </div>
                      </div>

                      {cls.blocks?.map((block, blockIdx) => {
                        const blockType = block.type || 'block'
                        return (
                          <div 
                            key={block.id || blockIdx} 
                            className={`p-3.5 rounded-xl border space-y-2.5 shadow-sm transition-all ${
                              blockType === 'break' 
                                ? 'bg-amber-50/50 border-amber-200' 
                                : blockType === 'custom'
                                  ? 'bg-indigo-50/30 border-indigo-150'
                                  : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-1">
                                {blockType === 'break' && (
                                  <>
                                    <span className="material-symbols-outlined text-amber-700 text-sm">coffee</span>
                                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Break / Receso</span>
                                  </>
                                )}
                                {blockType === 'custom' && (
                                  <>
                                    <span className="material-symbols-outlined text-indigo-700 text-sm">forum</span>
                                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Actividad Especial</span>
                                  </>
                                )}
                                {blockType === 'block' && (
                                  <input
                                    type="text"
                                    value={block.title}
                                    onChange={(e) => updateBlockField(classIdx, blockIdx, 'title', e.target.value)}
                                    placeholder="Título del bloque (Ej. Introducción e interfaz)"
                                    className="flex-1 text-xs font-semibold text-[var(--color-dark-gray)] border-b border-transparent hover:border-gray-200 focus:border-[var(--color-deep-green)] focus:outline-none py-0.5"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Move Up */}
                                <button
                                  type="button"
                                  disabled={blockIdx === 0}
                                  onClick={() => moveBlock(classIdx, blockIdx, 'up')}
                                  className={`text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer ${blockIdx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                  title="Subir"
                                >
                                  <span className="material-symbols-outlined text-sm leading-none">arrow_upward</span>
                                </button>
                                {/* Move Down */}
                                <button
                                  type="button"
                                  disabled={blockIdx === cls.blocks.length - 1}
                                  onClick={() => moveBlock(classIdx, blockIdx, 'down')}
                                  className={`text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer ${blockIdx === cls.blocks.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                  title="Bajar"
                                >
                                  <span className="material-symbols-outlined text-sm leading-none">arrow_downward</span>
                                </button>
                                {/* Remove */}
                                <button
                                  type="button"
                                  onClick={() => removeBlock(classIdx, blockIdx)}
                                  className="text-red-400 hover:text-red-600 cursor-pointer p-0.5"
                                  title="Eliminar"
                                >
                                  <span className="material-symbols-outlined text-base leading-none">close</span>
                                </button>
                              </div>
                            </div>

                            {/* Render different fields depending on blockType */}
                            {blockType === 'break' && (
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-amber-800 uppercase">Duración (Minutos):</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={block.duration || 15}
                                  onChange={(e) => updateBlockField(classIdx, blockIdx, 'duration', parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-xs border border-amber-200 rounded bg-white text-amber-900 focus:outline-none focus:border-amber-500 font-bold"
                                />
                              </div>
                            )}

                            {blockType === 'custom' && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="col-span-2">
                                    <input
                                      type="text"
                                      value={block.title}
                                      onChange={(e) => updateBlockField(classIdx, blockIdx, 'title', e.target.value)}
                                      placeholder="Título de la actividad (Ej. Consultas / Dudas)"
                                      className="w-full p-2 text-xs border border-indigo-150 rounded bg-white text-indigo-900 focus:outline-none focus:border-indigo-500 font-semibold"
                                    />
                                  </div>
                                  <div className="col-span-1 flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={1}
                                      value={block.duration || 15}
                                      onChange={(e) => updateBlockField(classIdx, blockIdx, 'duration', parseInt(e.target.value) || 0)}
                                      className="w-full p-2 text-xs border border-indigo-150 rounded bg-white text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold"
                                      placeholder="Minutos"
                                    />
                                    <span className="text-[10px] text-indigo-800 font-bold">min</span>
                                  </div>
                                </div>
                                <textarea
                                  value={block.description || ''}
                                  onChange={(e) => updateBlockField(classIdx, blockIdx, 'description', e.target.value)}
                                  placeholder="Detalle o descripción opcional..."
                                  rows={1}
                                  className="w-full p-2 text-xs border border-indigo-100 rounded focus:outline-none focus:border-indigo-500 bg-white"
                                />
                              </div>
                            )}

                            {blockType === 'block' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={block.subtitle || ''}
                                  onChange={(e) => updateBlockField(classIdx, blockIdx, 'subtitle', e.target.value)}
                                  placeholder="Subtítulo del bloque..."
                                  className="w-full p-2 text-xs rounded border border-gray-100 focus:outline-none focus:border-[var(--color-deep-green)] bg-gray-50/50 text-gray-500 font-medium"
                                />
                                <textarea
                                  value={block.description}
                                  onChange={(e) => updateBlockField(classIdx, blockIdx, 'description', e.target.value)}
                                  placeholder="Descripción de lo que se dictará en este bloque..."
                                  rows={2}
                                  className="w-full p-2 text-xs rounded border border-gray-100 focus:outline-none focus:border-[var(--color-deep-green)] bg-gray-50/50"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </form>
          ) : selectedTemplate ? (
            /* Details View */
            <div className="bg-white rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/8 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-deep-green)]/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-deep-green)]">{selectedTemplate.name}</h3>
                  <p className="text-xs text-[var(--color-dark-gray)]/50 mt-1">
                    Creado el {new Date(selectedTemplate.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-[var(--color-refined-gray)] hover:bg-gray-200 border border-gray-300 text-sm font-semibold rounded-[var(--radius-premium)] text-[var(--color-dark-gray)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="px-4 py-2 border border-[var(--color-deep-green)]/20 bg-[var(--color-deep-green)]/5 hover:bg-[var(--color-deep-green)]/10 disabled:opacity-50 text-sm font-semibold rounded-[var(--radius-premium)] text-[var(--color-deep-green)] transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Crear una copia independiente para editar"
                  >
                    <span className={`material-symbols-outlined text-sm ${isDuplicating ? 'animate-spin' : ''}`}>{isDuplicating ? 'sync' : 'content_copy'}</span>
                    {isDuplicating ? 'Duplicando...' : 'Duplicar'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-red-200 hover:bg-red-50 text-sm font-semibold rounded-[var(--radius-premium)] text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Eliminar
                  </button>
                </div>
              </div>

              {selectedTemplate.description && (
                <div className="bg-[var(--color-refined-gray)]/40 p-4 rounded-lg border border-[var(--color-deep-green)]/5 text-sm text-[var(--color-dark-gray)]/85">
                  <p className="font-semibold text-xs text-[var(--color-deep-green)] uppercase tracking-wider mb-1">Descripción</p>
                  {selectedTemplate.description}
                </div>
              )}

              {/* Agenda Preview */}
              <div className="space-y-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-deep-green)]">Contenido de la Agenda</h4>
                
                {Array.isArray(selectedTemplate.agenda) && selectedTemplate.agenda.map((cls, classIdx) => (
                  <div key={classIdx} className="border border-[var(--color-deep-green)]/10 rounded-lg p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-150 pb-2">
                      <h5 className="font-bold text-[var(--color-deep-green)] text-sm">{cls.title}</h5>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-dark-gray)]/60">
                        {cls.start_time && cls.end_time && (
                          <span className="flex items-center gap-1 bg-[var(--color-refined-gray)] px-2 py-0.5 rounded">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {cls.start_time} - {cls.end_time}
                          </span>
                        )}
                        {cls.break_duration > 0 && (
                          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-semibold">
                            Recreo: {cls.break_duration} min
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {cls.blocks?.map((block, blockIdx) => {
                        const blockType = block.type || 'block'
                        if (blockType === 'break') {
                          return (
                            <div key={blockIdx} className="text-xs flex items-center gap-1.5 text-amber-700 bg-amber-50/50 p-1.5 rounded border border-amber-100">
                              <span className="material-symbols-outlined text-sm">coffee</span>
                              <span className="font-bold">Break / Receso ({block.duration || 15} min)</span>
                            </div>
                          )
                        }
                        if (blockType === 'custom') {
                          return (
                            <div key={blockIdx} className="text-xs p-1.5 rounded border border-indigo-100 bg-indigo-50/30 space-y-0.5 text-indigo-900">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">forum</span>
                                <span className="font-bold">{block.title} ({block.duration || 15} min)</span>
                              </div>
                              {block.description && (
                                <p className="text-[11px] text-indigo-950/80 pl-5">
                                  {block.description}
                                </p>
                              )}
                            </div>
                          )
                        }
                        return (
                          <div key={blockIdx} className="text-xs space-y-1">
                            <p className="font-bold text-[var(--color-dark-gray)] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-deep-green)]"></span>
                              {block.title}
                            </p>
                            {block.subtitle && (
                              <p className="text-[11px] text-[var(--color-dark-gray)]/50 pl-3.5 italic leading-none font-semibold">
                                {block.subtitle}
                              </p>
                            )}
                            {block.description && (
                              <p className="text-[var(--color-dark-gray)]/75 pl-3.5 leading-relaxed mt-1">
                                {block.description}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/8 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-[var(--color-deep-green)]/20 animate-bounce">
                history_edu
              </span>
              <h3 className="text-lg font-bold text-[var(--color-deep-green)] mt-4">Seleccione una Plantilla</h3>
              <p className="text-sm text-[var(--color-dark-gray)]/50 mt-1 max-w-sm mx-auto">
                Seleccione una plantilla de la lista de la izquierda para ver su cronograma o haga clic en "Nueva Plantilla" para crear una desde cero.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
