import React, { useState } from 'react'

export default function ProcessSurveyForm({ onSubmit, isPublic = false, initialData = null, isSaving = false }) {
  const [formData, setFormData] = useState(initialData || {
    client_name: '',
    contact_email: '',
    contact_phone: '',
    company_area: '',
    process_name: '',
    inputs_list: [
      { id: Date.now(), title: '', description: '' }
    ],
    participating_documents: '',
    attachments: [],
    involved_people: '',
    task_detail: '',
    cycle_time: '',
    volume_frequency: '',
    successful_examples: '',
    final_results: '',
    delivery_recipient: '',
    notes: ''
  })

  // State to control active expanded card section
  const [activeStepCard, setActiveStepCard] = useState('input')
  const [dragActive, setDragActive] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Input List Management (Multiple Dynamic Inputs with Title & Description)
  const handleAddInputItem = (initialTitle = '', initialDesc = '') => {
    setFormData(prev => ({
      ...prev,
      inputs_list: [
        ...prev.inputs_list,
        { id: Date.now() + Math.random(), title: initialTitle, description: initialDesc }
      ]
    }))
  }

  const handleUpdateInputItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      inputs_list: prev.inputs_list.map(item => item.id === id ? { ...item, [field]: value } : item)
    }))
  }

  const handleRemoveInputItem = (id) => {
    if (formData.inputs_list.length <= 1) {
      setFormData(prev => ({
        ...prev,
        inputs_list: [{ id: Date.now(), title: '', description: '' }]
      }))
      return
    }
    setFormData(prev => ({
      ...prev,
      inputs_list: prev.inputs_list.filter(item => item.id !== id)
    }))
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (uploadEvent) => {
        const fileObj = {
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type,
          dataUrl: uploadEvent.target.result
        }
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, fileObj]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.process_name || !formData.client_name) {
      alert('Por favor completa al menos tu nombre y el nombre del trabajo o proceso a analizar.')
      return
    }
    onSubmit(formData)
  }

  // Pure Reference Examples Guide Box (Not clickable buttons)
  const REFERENCE_EXAMPLES = [
    {
      icon: 'picture_as_pdf',
      name: 'PDF de la causa',
      description: 'Archivo que contiene toda la información de la causa.'
    },
    {
      icon: 'mail',
      name: 'Solicitud del cliente por mail',
      description: 'El cliente envía un mail a la casilla de correo X Y Z solicitando la realización del servicio Z.'
    },
    {
      icon: 'chat',
      name: 'WhatsApp con solicitud de nuevo pedido',
      description: 'WhatsApp del sector X solicitando el envío de X unidades del producto Y para fecha Z.'
    }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-[var(--color-deep-green)] to-[#0d382e] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <span className="material-symbols-outlined text-lg">assignment</span>
            Formulario para descripción de tareas
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading">
            Guía de Relevamiento de Insumos y Procesos
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Haz clic en las tarjetas de abajo para abrir las secciones descriptivas. Queremos entender qué datos o documentos necesitas (inputs), qué haces con ellos y qué producto entregas.
          </p>

          {/* 3 Step Interactive Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-800 pt-2">
            {/* Step 1 Card: INPUT */}
            <div
              onClick={() => setActiveStepCard('input')}
              className={`p-4 rounded-2xl shadow-md border-t-4 transition cursor-pointer flex flex-col justify-between ${
                activeStepCard === 'input'
                  ? 'bg-white ring-2 ring-emerald-500 border-t-emerald-600 scale-[1.02]'
                  : 'bg-white/90 hover:bg-white border-t-emerald-500 opacity-90 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                    Paso 1: INPUT
                  </span>
                  <span className="material-symbols-outlined text-emerald-600">input</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mb-1">
                  ¿Qué se requiere para efectuar la tarea?
                </h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Describí cuáles son los insumos, documentos, información o materiales necesarios.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-700 flex items-center justify-between">
                <span>{activeStepCard === 'input' ? '▼ Editando Insumos' : '▶ Clic para desplegar'}</span>
                <span className="material-symbols-outlined text-sm">touch_app</span>
              </div>
            </div>

            {/* Step 2 Card: PROCESO / TAREA */}
            <div
              onClick={() => setActiveStepCard('process')}
              className={`p-4 rounded-2xl shadow-md border-t-4 transition cursor-pointer flex flex-col justify-between ${
                activeStepCard === 'process'
                  ? 'bg-white ring-2 ring-amber-500 border-t-amber-600 scale-[1.02]'
                  : 'bg-white/90 hover:bg-white border-t-amber-500 opacity-90 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                    Paso 2: TAREA
                  </span>
                  <span className="material-symbols-outlined text-amber-600">psychology</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mb-1">
                  ¿Qué análisis o acción realizas?
                </h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Detalle paso a paso del trabajo manual, lectura, interpretación o redacción.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-amber-700 flex items-center justify-between">
                <span>{activeStepCard === 'process' ? '▼ Editando Tarea' : '▶ Clic para desplegar'}</span>
                <span className="material-symbols-outlined text-sm">touch_app</span>
              </div>
            </div>

            {/* Step 3 Card: OUTPUT */}
            <div
              onClick={() => setActiveStepCard('output')}
              className={`p-4 rounded-2xl shadow-md border-t-4 transition cursor-pointer flex flex-col justify-between ${
                activeStepCard === 'output'
                  ? 'bg-white ring-2 ring-blue-500 border-t-blue-600 scale-[1.02]'
                  : 'bg-white/90 hover:bg-white border-t-blue-500 opacity-90 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                    Paso 3: OUTPUT
                  </span>
                  <span className="material-symbols-outlined text-blue-600">task_alt</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mb-1">
                  ¿Qué resultado final entregas?
                </h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Dictamen, informe, propuesta de resolución o carga en el sistema.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-blue-700 flex items-center justify-between">
                <span>{activeStepCard === 'output' ? '▼ Editando Salida' : '▶ Clic para desplegar'}</span>
                <span className="material-symbols-outlined text-sm">touch_app</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Personal & Office Basics */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
            👤
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Datos Generales</h3>
            <p className="text-xs text-slate-500">Identificación del responsable y nombre de la tarea a describir.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tu Nombre y Apellido <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Pérez"
              value={formData.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Área, Juzgado u Oficina
            </label>
            <input
              type="text"
              placeholder="Ej: Secretaría Civil N° 2 / Área de Administración"
              value={formData.company_area}
              onChange={(e) => handleChange('company_area', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email de Contacto
            </label>
            <input
              type="email"
              placeholder="contacto@empresa.com"
              value={formData.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono / WhatsApp
            </label>
            <input
              type="text"
              placeholder="+54 9 11 1234-5678"
              value={formData.contact_phone}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre de la Tarea a Describir <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Recepción, análisis y resumen de expedientes / solicitud de clientes"
            value={formData.process_name}
            onChange={(e) => handleChange('process_name', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
        </div>
      </div>

      {/* SECTION 2: INPUT (Descriptive Card 1 - Dynamic Inputs List) */}
      <div
        id="section-input"
        className={`bg-white p-6 sm:p-8 rounded-2xl shadow-sm border transition-all duration-300 space-y-6 ${
          activeStepCard === 'input' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                INPUT: ¿Qué se requiere para efectuar la tarea?
              </h3>
              <p className="text-xs text-slate-600">
                Describí cuáles son los insumos, documentos, información, o materiales que se necesitan para hacer la tarea.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStepCard(activeStepCard === 'input' ? '' : 'input')}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition"
          >
            {activeStepCard === 'input' ? 'Plegar' : 'Desplegar'}
          </button>
        </div>

        {/* Dynamic Inputs Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Listado de Inputs / Insumos Necesarios
            </label>
            <span className="text-[11px] text-slate-500">
              Puedes agregar varios insumos indicando su Nombre y Descripción.
            </span>
          </div>

          {/* Reference Guide Box in Grey (Passive visual reference only) */}
          <div className="bg-slate-100/90 border border-slate-300/80 p-4 sm:p-5 rounded-2xl space-y-3 text-slate-700">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <span className="material-symbols-outlined text-base text-slate-500">help_outline</span>
              Ejemplos de referencia para definir un Input
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Utiliza esta guía como modelo para entender cómo nombrar y redactar la descripción de tus insumos:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {REFERENCE_EXAMPLES.map((ex, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <span className="material-symbols-outlined text-emerald-600 text-sm">{ex.icon}</span>
                    <span className="truncate">{ex.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    <strong className="text-slate-700 font-semibold">Descripción:</strong> {ex.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic User Input Items List */}
          <div className="space-y-4 pt-2">
            {formData.inputs_list.map((item, index) => (
              <div key={item.id} className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    Input / Insumo N° {index + 1}
                  </span>
                  {formData.inputs_list.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInputItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 transition"
                      title="Eliminar este input"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Quitar
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre del Input / Insumo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: PDF de la causa / Solicitud por mail / WhatsApp del sector X"
                      value={item.title || ''}
                      onChange={(e) => handleUpdateInputItem(item.id, 'title', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Descripción del Input / Insumo
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Describe qué contiene este insumo y de qué casilla, sistema o persona proviene..."
                      value={item.description || ''}
                      onChange={(e) => handleUpdateInputItem(item.id, 'description', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Input Item Button */}
          <button
            type="button"
            onClick={() => handleAddInputItem('', '')}
            className="w-full py-3 px-4 border-2 border-dashed border-emerald-400/80 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            + Agregar otro Input / Insumo
          </button>
        </div>

        {/* Participating Systems / Documents */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Sistemas, Plataformas o Planillas utilizadas
          </label>
          <input
            type="text"
            placeholder="Ej: Sistema judicial (Lex100 / Auguste), Correo Outlook, WhatsApp Web, Excel de seguimiento"
            value={formData.participating_documents}
            onChange={(e) => handleChange('participating_documents', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
        </div>

        {/* File Attachments Dropzone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adjuntar Muestras de Archivos o Capturas de Pantalla (Prints)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Puedes adjuntar capturas de pantalla de los sistemas por donde recibes los datos o ejemplos de archivos PDF/Word de entrada.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              if (e.dataTransfer.files) handleFileUpload({ target: { files: e.dataTransfer.files } })
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
              dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">cloud_upload</span>
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Haz clic o arrastra capturas de pantalla / documentos aquí
              </span>
              <span className="text-[11px] text-slate-400">
                Imágenes (JPG, PNG), expedientes PDF o planillas Excel.
              </span>
            </label>
          </div>

          {/* Uploaded items preview list */}
          {formData.attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Archivos Adjuntos ({formData.attachments.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-100/80 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 truncate">
                      {file.type?.startsWith('image/') ? (
                        <img src={file.dataUrl} alt={file.name} className="w-10 h-10 object-cover rounded-lg border border-slate-300" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          DOC
                        </div>
                      )}
                      <div className="truncate text-xs">
                        <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                        <p className="text-slate-500 text-[11px]">{file.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: TAREA / PROCESO (Step-by-step detail) */}
      <div
        id="section-process"
        className={`bg-white p-6 sm:p-8 rounded-2xl shadow-sm border transition-all duration-300 space-y-6 ${
          activeStepCard === 'process' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                TAREA / PROCESO: ¿Qué análisis o acción realizas?
              </h3>
              <p className="text-xs text-slate-600">
                Detalle paso a paso del trabajo manual, lectura, interpretación o redacción.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStepCard(activeStepCard === 'process' ? '' : 'process')}
            className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition"
          >
            {activeStepCard === 'process' ? 'Plegar' : 'Desplegar'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descripción Detallada del Trabajo Manual o Análisis que Realizas <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            required
            placeholder="Escribe paso a paso qué haces desde que recibes el insumo/documento hasta completar la tarea (qué lees, qué buscas, qué interpretas y qué redactas)..."
            value={formData.task_detail}
            onChange={(e) => handleChange('task_detail', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Personas o Roles Involucrados
          </label>
          <input
            type="text"
            placeholder="Ej: Mesa de Entradas, Oficial de Secretaría, Jefe de Despacho / Director"
            value={formData.involved_people}
            onChange={(e) => handleChange('involved_people', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiempo / Demora Aproximada por Caso
            </label>
            <input
              type="text"
              placeholder="Ej: 30 a 45 minutos por expediente o trámite"
              value={formData.cycle_time}
              onChange={(e) => handleChange('cycle_time', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cantidad / Volumen Habitual
            </label>
            <input
              type="text"
              placeholder="Ej: 10 expedientes al día / 50 a la semana"
              value={formData.volume_frequency}
              onChange={(e) => handleChange('volume_frequency', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ejemplo Concreto de un Caso Típico Habitual
          </label>
          <textarea
            rows={3}
            placeholder="Cuenta brevemente un caso real resuelto recientemente (ej: 'Ingresó la causa N° 4580 por email, revisé la documentación, redacté el borrador sugerido y en 40 minutos se lo entregué al Director')."
            value={formData.successful_examples}
            onChange={(e) => handleChange('successful_examples', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
          />
        </div>
      </div>

      {/* SECTION 4: OUTPUT (Result deliverable) */}
      <div
        id="section-output"
        className={`bg-white p-6 sm:p-8 rounded-2xl shadow-sm border transition-all duration-300 space-y-6 ${
          activeStepCard === 'output' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                OUTPUT: ¿Qué resultado final entregas?
              </h3>
              <p className="text-xs text-slate-600">
                Dictamen, informe, propuesta de resolución o carga en el sistema.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStepCard(activeStepCard === 'output' ? '' : 'output')}
            className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
          >
            {activeStepCard === 'output' ? 'Plegar' : 'Desplegar'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ¿Cuál es el Resultado Final que Generas?
          </label>
          <textarea
            rows={3}
            placeholder="Ej: Proyecto de resolución o dictamen impreso/digital listo para la firma del Director o Juez, o la síntesis guardada en el sistema."
            value={formData.final_results}
            onChange={(e) => handleChange('final_results', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ¿A quién se lo entregas y por qué medio?
          </label>
          <input
            type="text"
            placeholder="Ej: Al Director o Juez por el sistema informático interno y copia impresa en despacho"
            value={formData.delivery_recipient}
            onChange={(e) => handleChange('delivery_recipient', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observaciones o Comentarios Adicionales
          </label>
          <textarea
            rows={2}
            placeholder="Cualquier comentario extra que consideres útil..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3.5 rounded-xl bg-[var(--color-deep-green)] text-white font-bold hover:opacity-95 shadow-lg transition flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Guardando Descripción...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">send</span>
              Enviar Formulario de Descripción de Tarea
            </>
          )}
        </button>
      </div>
    </form>
  )
}
