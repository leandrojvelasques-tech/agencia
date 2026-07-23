import React, { useState } from 'react'

export default function ProcessSurveyForm({ onSubmit, isPublic = false, initialData = null, isSaving = false }) {
  const [formData, setFormData] = useState(initialData || {
    client_name: '',
    contact_email: '',
    contact_phone: '',
    company_area: '',
    process_name: '',
    trigger_start: '',
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

  const [dragActive, setDragActive] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      alert('Por favor completa al menos tu nombre y el nombre del proceso o trabajo a analizar.')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Visual Guide with Plain Language and Judicial Examples */}
      <div className="bg-gradient-to-br from-slate-900 via-[var(--color-deep-green)] to-[#0d382e] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <span className="material-symbols-outlined text-lg">gavel</span>
            Guía Paso a Paso para Describir tu Trabajo
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading">
            ¿Cómo nos ayudas a entender tu proceso diario?
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            No necesitas usar palabras técnicas. Queremos entender en detalle qué tareas realizas con los expedientes o documentos para saber exactamente dónde la **Inteligencia Artificial** puede ayudarte a resumir, redactar o agilizar tu trabajo.
          </p>

          {/* 3 Simple Cards with Legal/Admin Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-800 pt-2">
            {/* Step 1: Input */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-md border-t-4 border-emerald-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                    1. Lo que recibes
                  </span>
                  <span className="material-symbols-outlined text-emerald-600">description</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mb-1">DOCUMENTO O AVISO</h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Ej: Un expediente en PDF o papel de 40 páginas, una cédula de notificación o un escrito presentado por las partes.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">attach_file</span> Puedes subir capturas o fotos
              </div>
            </div>

            {/* Step 2: Task */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-md border-t-4 border-amber-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                    2. Lo que haces
                  </span>
                  <span className="material-symbols-outlined text-amber-600">psychology</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mb-1">ANÁLISIS Y LECTURA</h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Ej: Lees el expediente, identificas la causa, analizas antecedentes y redactas un resumen o borrador de propuesta.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-amber-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">schedule</span> Indica tiempo por expediente
              </div>
            </div>

            {/* Step 3: Output */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-md border-t-4 border-blue-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                    3. Lo que entregas
                  </span>
                  <span className="material-symbols-outlined text-blue-600">task_alt</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mb-1">RESULTADO FINAL</h3>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Ej: Proyecto de resolución sugerido para el Director/Juez, resumen de causa cargado en el sistema o dictamen final.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-blue-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">send</span> Especifica a quién se entrega
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Office & Process Basics */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Identificación del Área y del Trabajo</h3>
            <p className="text-xs text-slate-500">¿Quién responde este formulario y qué tarea analizamos?</p>
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
              placeholder="Ej: Dr. Carlos Martínez"
              value={formData.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Juzgado, Secretaría u Oficina
            </label>
            <input
              type="text"
              placeholder="Ej: Juzgado de Primera Instancia / Secretaría N° 2"
              value={formData.company_area}
              onChange={(e) => handleChange('company_area', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email de Contacto
            </label>
            <input
              type="email"
              placeholder="ejemplo@justicia.gob.ar"
              value={formData.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
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
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre del Trabajo o Proceso a Analizar <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Recepción de expediente, análisis de la causa y redacción del borrador de resolución"
            value={formData.process_name}
            onChange={(e) => handleChange('process_name', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
      </div>

      {/* SECTION 2: Document / Input */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
            2
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Documentación o Información que Recibes (Entrada)</h3>
            <p className="text-xs text-slate-500">¿Qué archivo, escrito o aviso da inicio a tu trabajo?</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ¿Qué documento o notificación recibes para empezar?
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Ejemplo: <em>"Recibo un expediente en papel o PDF remitido por mesa de entradas con los escritos de las partes"</em> o <em>"Recibo un pedido del Director solicitando informe sobre una causa"</em>.
          </p>
          <textarea
            rows={3}
            placeholder="Describe exactamente qué recibes o dónde te llega el aviso para comenzar a trabajar en este caso..."
            value={formData.trigger_start}
            onChange={(e) => handleChange('trigger_start', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Sistemas o Planillas que utilizas
          </label>
          <input
            type="text"
            placeholder="Ej: Sistema informático del Poder Judicial (Lex100 / Auguste), carpeta compartida, planilla Excel de control"
            value={formData.participating_documents}
            onChange={(e) => handleChange('participating_documents', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>

        {/* Upload Screenshots / Docs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subir Capturas de Pantalla o Ejemplos del Documento / Sistema
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Puedes adjuntar capturas de pantalla (prints) de las pantallas del sistema por donde ingresa el caso o fotos de un expediente de muestra.
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
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">cloud_upload</span>
              </div>
              <span className="text-sm font-semibold text-slate-700">
                Haz clic o arrastra capturas de pantalla / documentos aquí
              </span>
              <span className="text-xs text-slate-400">
                Imágenes (JPG, PNG), expedientes PDF o documentos Word.
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
                      onClick={() => handleRemoveAttachment(idx)}
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

      {/* SECTION 3: Step-by-Step Task Detail & Execution */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
            3
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Detalle Paso a Paso de tu Trabajo (La Tarea)</h3>
            <p className="text-xs text-slate-500">¿Qué lectura, análisis o redacción realizas tú personalmente?</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descripción Detallada del Acto o Análisis que Realizas <span className="text-rose-500">*</span>
          </label>

          {/* Practical Examples Callout Box */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 mb-3 text-xs text-slate-700 space-y-2">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">lightbulb</span>
              Ejemplos prácticos para guiarte en este punto:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              <li>
                <strong>Ejemplo A (Lectura y Carga de Síntesis):</strong> <em>"Tomo el expediente recibido, identifico a las partes (actor y demandado), leo las últimas 15 páginas para comprender el reclamo, redacto una síntesis del estado actual y la cargo con la descripción en el sistema interno."</em>
              </li>
              <li>
                <strong>Ejemplo B (Sugerencia de Acción al Director/Juez):</strong> <em>"Reviso el expediente completo, constato si se cumplieron los plazos de notificación, hago un resumen de novedades y redacto una nota sugiriéndole al Director o Juez qué resolución dictaminar."</em>
              </li>
            </ul>
          </div>

          <textarea
            rows={5}
            required
            placeholder="Escribe paso a paso qué haces desde que abres el expediente o documento hasta que terminas de trabajarlo (qué lees, qué buscas, qué interpretas y qué redactas)..."
            value={formData.task_detail}
            onChange={(e) => handleChange('task_detail', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Personas o Roles Involucrados
          </label>
          <input
            type="text"
            placeholder="Ej: Mesa de Entradas (recepción), Oficial de Secretaría (revisión), Jefe de Despacho / Director (firma)"
            value={formData.involved_people}
            onChange={(e) => handleChange('involved_people', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiempo / Demora Aproximada por Expediente o Caso
            </label>
            <input
              type="text"
              placeholder="Ej: 30 a 45 minutos por expediente"
              value={formData.cycle_time}
              onChange={(e) => handleChange('cycle_time', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cantidad / Volumen Habitual
            </label>
            <input
              type="text"
              placeholder="Ej: 8 expedientes por día / 40 a la semana"
              value={formData.volume_frequency}
              onChange={(e) => handleChange('volume_frequency', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ejemplo Concreto de un Caso Típico Habitual
          </label>
          <textarea
            rows={3}
            placeholder="Cuenta brevemente un caso real típico que hayas resuelto recientemente (ej: 'Ingresó expediente N° 4580, revisé la contestación de demanda, redacté el borrador sugerido y en 40 minutos se lo presenté al Juez')."
            value={formData.successful_examples}
            onChange={(e) => handleChange('successful_examples', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          />
        </div>
      </div>

      {/* SECTION 4: Output / Final Delivery */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
            4
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">Resultado Final y Entrega (Salida)</h3>
            <p className="text-xs text-slate-500">¿Qué producto final entregas y a quién se lo envías?</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ¿Cuál es el Resultado Final que Generas?
          </label>
          <textarea
            rows={3}
            placeholder="Ej: Proyecto de resolución o dictamen impreso/digital listo para la firma del Director o Juez, o la síntesis guardada en el sistema de gestión."
            value={formData.final_results}
            onChange={(e) => handleChange('final_results', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ¿A quién se lo entregas y por qué medio?
          </label>
          <input
            type="text"
            placeholder="Ej: Al Director o Juez por el sistema informático interno y copia física en carpeta de despacho"
            value={formData.delivery_recipient}
            onChange={(e) => handleChange('delivery_recipient', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observaciones o Comentarios Adicionales
          </label>
          <textarea
            rows={2}
            placeholder="Cualquier aclaración extra que consideres importante para la evaluación..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
              Guardando Relevamiento...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">send</span>
              Enviar Relevamiento de Proceso
            </>
          )}
        </button>
      </div>
    </form>
  )
}
