import React, { useState } from 'react'
import ProcessSurveyForm from '../../components/ProcessSurveyForm'

export default function ProcessSurveyPublic() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState(null)

  const handleSubmit = (formData) => {
    const existing = JSON.parse(localStorage.getItem('lv_process_surveys') || '[]')
    const newSurvey = {
      ...formData,
      id: 'proc-' + Date.now(),
      status: 'Recibido',
      created_at: new Date().toISOString()
    }
    localStorage.setItem('lv_process_surveys', JSON.stringify([newSurvey, ...existing]))
    
    setSubmittedData(newSurvey)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://www.leandrovelasques.com.ar/logo_triskel.png"
              alt="Logo"
              className="h-8 w-auto"
            />
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight leading-none">
                LEANDRO VELASQUES
              </span>
              <span className="text-[10px] font-semibold text-slate-400 mt-1">
                Consultoría en Inteligencia Artificial & Optimización de Procesos
              </span>
            </div>
          </div>

          <a
            href="https://www.leandrovelasques.com.ar"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
          >
            Sitio Web ↗
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {submitted ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center space-y-6 animate-fade-in my-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
                ¡Relevamiento Enviado con Éxito!
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Muchas gracias por detallar tu trabajo sobre <strong className="text-slate-900">{submittedData?.process_name}</strong>. Analizaremos tu información para evaluar exactamente en qué etapas la Inteligencia Artificial puede ayudarte a resumir, redactar y agilizar tus tareas.
              </p>
            </div>

            <div className="bg-emerald-50/60 p-6 rounded-2xl border border-emerald-200/60 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-900 font-bold">
                <span>Resumen del Envío</span>
                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[10px]">
                  Recibido
                </span>
              </div>
              <p><strong className="text-slate-700">Solicitante:</strong> {submittedData?.client_name}</p>
              <p><strong className="text-slate-700">Proceso:</strong> {submittedData?.process_name}</p>
              <p><strong className="text-slate-700">Archivos / Prints adjuntos:</strong> {submittedData?.attachments?.length || 0} archivo(s)</p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Enviar otro relevamiento de proceso
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900">
                Guía de Relevamiento de Procesos y Tareas
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Describe paso a paso el trabajo que realizas con tus expedientes o documentos. Te acompañamos con ejemplos sencillos para identificar dónde aplicar herramientas de IA.
              </p>
            </div>

            <ProcessSurveyForm onSubmit={handleSubmit} isPublic={true} />
          </div>
        )}
      </main>
    </div>
  )
}
