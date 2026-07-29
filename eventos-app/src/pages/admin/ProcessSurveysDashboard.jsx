import React, { useState, useEffect } from 'react'
import ProcessSurveyForm from '../../components/ProcessSurveyForm'

const MOCK_INITIAL_SURVEYS = [
  {
    id: 'proc-1',
    client_name: 'Dr. Carlos Martínez - Oficial de Secretaría',
    contact_email: 'cmartinez@justicia.gob.ar',
    contact_phone: '+54 9 11 4444-1234',
    company_area: 'Juzgado de Primera Instancia / Secretaría N° 2',
    process_name: 'Recepción, análisis de causa y propuesta de resolución de expedientes',
    trigger_start: 'Ingresa un expediente PDF de 40 a 80 páginas o papel remitido por mesa de entradas con escritos presentados por los letrados.',
    participating_documents: 'Expediente digital/físico, Sistema del Poder Judicial (Lex100), Modelo de resoluciones Word',
    attachments: [
      { name: 'expediente_muestra_causa_458.pdf', size: '1.4 MB', type: 'application/pdf' },
      { name: 'pantalla_carga_lex100.png', size: '850 KB', type: 'image/png' }
    ],
    involved_people: 'Mesa de Entradas, Oficial de Secretaría, Secretario y Juez / Director',
    task_detail: 'Abro el expediente, reviso los escritos ingresados, constato las partes y los plazos procesales. Extraigo las ideas principales de la petición, redacto un resumen de la novedad y elaboro un proyecto de resolución sugerido para la firma del Juez/Director.',
    cycle_time: '45 minutos por expediente',
    volume_frequency: '10 expedientes diarios / ~50 semanales',
    successful_examples: 'Expediente N° 4580 ingresado por demanda. Revisé contestación, redacté la síntesis y el proyecto de providencia sugerido en 40 minutos.',
    final_results: 'Proyecto de resolución impreso o digital listo en carpeta de despacho para revisión y firma del Juez.',
    delivery_recipient: 'Al Juez / Director a través de la carpeta de despacho digital y formato impreso.',
    status: 'Recibido',
    created_at: new Date().toISOString()
  }
]

export default function ProcessSurveysDashboard() {
  const [surveys, setSurveys] = useState(() => {
    const local = localStorage.getItem('lv_process_surveys')
    return local ? JSON.parse(local) : MOCK_INITIAL_SURVEYS
  })
  
  const [search, setSearch] = useState('')
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    localStorage.setItem('lv_process_surveys', JSON.stringify(surveys))
  }, [surveys])

  const publicLink = `${window.location.origin}/_app/relevamiento-proceso`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleCreateNew = (formData) => {
    const newSurvey = {
      ...formData,
      id: 'proc-' + Date.now(),
      status: 'Recibido',
      created_at: new Date().toISOString()
    }
    setSurveys([newSurvey, ...surveys])
    setIsCreating(false)
  }

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este relevamiento de proceso?')) {
      setSurveys(surveys.filter(s => s.id !== id))
      if (selectedSurvey?.id === id) setSelectedSurvey(null)
    }
  }

  const handleStatusChange = (id, newStatus) => {
    setSurveys(surveys.map(s => s.id === id ? { ...s, status: newStatus } : s))
    if (selectedSurvey?.id === id) {
      setSelectedSurvey(prev => ({ ...prev, status: newStatus }))
    }
  }

  const filteredSurveys = surveys.filter(s => 
    s.process_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.company_area?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">gavel</span>
            Módulo de Diagnóstico & IA
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">
            Relevamiento de Procesos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Revisa las descripciones de tareas recibidas del sector judicial/administrativo y comparte el enlace directo con tu cliente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl border border-emerald-600/30 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 font-semibold text-xs transition flex items-center gap-2"
            title="Copiar enlace para enviar al cliente por WhatsApp o Email"
          >
            <span className="material-symbols-outlined text-base">
              {copiedLink ? 'check_circle' : 'link'}
            </span>
            {copiedLink ? '¡Link Copiado!' : 'Copiar Link Público Cliente'}
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-deep-green)] text-white font-bold text-xs hover:opacity-95 shadow-md transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nuevo Relevamiento
          </button>
        </div>
      </div>

      {/* Modal for new manual creation */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-6 font-heading">
              Cargar Relevamiento de Proceso Manual
            </h2>
            <ProcessSurveyForm onSubmit={handleCreateNew} />
          </div>
        </div>
      )}

      {/* Main List & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Buscar por proceso, nombre o juzgado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total relevamientos: <span className="font-bold text-slate-800">{filteredSurveys.length}</span>
          </div>
        </div>

        {filteredSurveys.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">find_in_page</span>
            <p className="text-sm font-semibold">No hay relevamientos registrados</p>
            <p className="text-xs mt-1">Comparte el link público con tu cliente para comenzar a recibir descripciones de expedientes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="p-3">Proceso / Trabajo</th>
                  <th className="p-3">Solicitante / Oficina</th>
                  <th className="p-3">Demora / Volumen</th>
                  <th className="p-3">Adjuntos</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSurveys.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900 max-w-xs truncate">
                      {item.process_name}
                      <p className="text-[11px] font-normal text-slate-500 truncate mt-0.5">
                        {item.task_detail || item.trigger_start || 'Sin detalle de tarea'}
                      </p>
                    </td>

                    <td className="p-3 text-slate-700">
                      <p className="font-semibold">{item.client_name}</p>
                      <p className="text-[11px] text-slate-400">{item.company_area || 'Sin oficina'}</p>
                    </td>

                    <td className="p-3 text-slate-600">
                      <p className="font-medium text-slate-800">{item.cycle_time || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400">{item.volume_frequency || '-'}</p>
                    </td>

                    <td className="p-3">
                      {item.attachments?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                          <span className="material-symbols-outlined text-xs">attach_file</span>
                          {item.attachments.length} archivo(s)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Sin adjuntos</span>
                      )}
                    </td>

                    <td className="p-3">
                      <select
                        value={item.status || 'Recibido'}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                          item.status === 'Recibido' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          item.status === 'En Análisis IA' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          item.status === 'Propuesta Generada' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <option value="Recibido">Recibido</option>
                        <option value="En Análisis IA">En Análisis IA</option>
                        <option value="Propuesta Generada">Propuesta Generada</option>
                        <option value="Completado">Completado</option>
                      </select>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSurvey(item)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          title="Ver Ficha Completa"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
        )}
      </div>

      {/* Survey Detail Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedSurvey(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Ficha de Análisis de Proceso
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 mt-2">
                {selectedSurvey.process_name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Solicitante: <span className="font-semibold text-slate-800">{selectedSurvey.client_name}</span> {selectedSurvey.company_area ? `— ${selectedSurvey.company_area}` : ''}
              </p>
            </div>

            {/* Content Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">1. INPUTS / INSUMOS</span>
                {selectedSurvey.inputs_list?.length > 0 ? (
                  <ul className="text-xs text-slate-800 mt-1.5 space-y-1 list-disc pl-4">
                    {selectedSurvey.inputs_list.map((inp, idx) => inp.description && (
                      <li key={idx} className="font-medium">{inp.description}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-semibold text-slate-800 mt-1">{selectedSurvey.trigger_start || 'No especificado'}</p>
                )}
                <p className="text-[11px] text-slate-600 mt-2">Sistemas: {selectedSurvey.participating_documents || '-'}</p>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60">
                <span className="text-[10px] font-bold text-amber-800 uppercase">2. TAREA Y TIEMPOS</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">Demora: {selectedSurvey.cycle_time || '-'}</p>
                <p className="text-[11px] text-slate-600 mt-2">Volumen: {selectedSurvey.volume_frequency || '-'}</p>
                <p className="text-[11px] text-slate-600 mt-1">Equipo: {selectedSurvey.involved_people || '-'}</p>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/60">
                <span className="text-[10px] font-bold text-blue-800 uppercase">3. RESULTADO / SALIDA</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">{selectedSurvey.final_results || 'No especificado'}</p>
                <p className="text-[11px] text-slate-600 mt-2">Entrega a: {selectedSurvey.delivery_recipient || '-'}</p>
              </div>
            </div>

            {/* Task Detail Step-by-Step */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detalle Paso a Paso de la Tarea</h3>
              <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-line">
                {selectedSurvey.task_detail || selectedSurvey.general_description || 'Sin detalle de tarea.'}
              </p>
            </div>

            {/* Typical Example */}
            {selectedSurvey.successful_examples && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ejemplo Concreto de un Caso Típico</h3>
                <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200/80 leading-relaxed">
                  {selectedSurvey.successful_examples}
                </p>
              </div>
            )}

            {/* Attachments */}
            {selectedSurvey.attachments?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Capturas de Pantalla y Documentos Adjuntos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSurvey.attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3 truncate text-xs">
                        <span className="material-symbols-outlined text-emerald-600">file_present</span>
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{att.name}</p>
                          <p className="text-[11px] text-slate-400">{att.size}</p>
                        </div>
                      </div>
                      {att.dataUrl && (
                        <a
                          href={att.dataUrl}
                          download={att.name}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition"
                        >
                          Descargar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
