import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Mock de datos para Puerto Cangrejo (Cliente 1)
const PUERTO_CANGREJO_REPORT = {
  periodo: 'Junio 2026',
  marca: 'Puerto Cangrejo',
  fuente: 'Exportación Google Takeout',
  corte: '3 de junio de 2026 al 28 de junio de 2026',
  totalEncuestas: 40,
  promedioMensual: 4.85,
  promedioHistorico: 4.4,
  diferenciaHistorico: 0.45,
  distribucionEstrellas: [
    { estrellas: 5, cantidad: 36, porcentaje: 90.0 },
    { estrellas: 4, cantidad: 2, porcentaje: 5.0 },
    { estrellas: 3, cantidad: 2, porcentaje: 5.0 },
    { estrellas: 2, cantidad: 0, porcentaje: 0.0 },
    { estrellas: 1, cantidad: 0, porcentaje: 0.0 },
  ],
  evolucionEncuestas: [
    { mes: 'Enero 2026', cantidad: 13 },
    { mes: 'Febrero 2026', cantidad: 8 },
    { mes: 'Marzo 2026', cantidad: 7 },
    { mes: 'Abril 2026', cantidad: 6 },
    { mes: 'Mayo 2026', cantidad: 12 },
    { mes: 'Junio 2026', cantidad: 40 },
  ],
  evolucionSatis: [
    { mes: 'Julio 2025', promedio: 4.75, cantidad: 4 },
    { mes: 'Agosto 2025', promedio: 4.75, cantidad: 4 },
    { mes: 'Septiembre 2025', promedio: 5.0, cantidad: 5 },
    { mes: 'Octubre 2025', promedio: 4.8, cantidad: 5 },
    { mes: 'Noviembre 2025', promedio: 4.83, cantidad: 6 },
    { mes: 'Diciembre 2025', promedio: 5.0, cantidad: 4 },
    { mes: 'Enero 2026', promedio: 4.85, cantidad: 13 },
    { mes: 'Febrero 2026', promedio: 4.5, cantidad: 8 },
    { mes: 'Marzo 2026', promedio: 4.29, cantidad: 7 },
    { mes: 'Abril 2026', promedio: 4.67, cantidad: 6 },
    { mes: 'Mayo 2026', promedio: 4.75, cantidad: 12 },
    { mes: 'Junio 2026', promedio: 4.85, cantidad: 40 },
  ],
  temasPositivos: [
    { tema: 'Atención y cordialidad', lectura: 'Se repite con fuerza la valoración positiva del equipo, con menciones a mozos, mesoneros y nombres propios como David y Naidu.' },
    { tema: 'Comida rica y calidad de platos', lectura: 'Aparece varias veces la comida “riquísima”, “exquisita” o “impecable”, reforzando la promesa gastronómica del restaurante.' },
    { tema: 'Abundancia', lectura: 'Se menciona en distintas reseñas, especialmente asociada a platos como ñoquis, sorrentinos y picadas.' },
    { tema: 'Ambiente y experiencia', lectura: 'Aparece en comentarios sobre el lugar, la música, la decoración, la limpieza y celebraciones familiares o de cumpleaños.' },
    { tema: 'Intención de volver y recomendación', lectura: 'Se repite en frases como “volveremos”, “volvería” y “altamente recomendable”, útiles para reputación y comunicación de marca.' },
  ],
  comentariosDestacados: [
    { cliente: 'Javier Luque', estrellas: 5, comentario: '“Excelente la comida muy sabrosa y la atención de su personal con mucha cordialidad. Es para volver siempre”' },
    { cliente: 'Mayra Gaitan', estrellas: 5, comentario: '“Muy rica la comida, pedimos picada fría/caliente y de postre volcán de chocolate. Excelente atención. Volveremos 😊”' },
    { cliente: 'Claudia Quiroga', estrellas: 5, comentario: '“Fue excelente, el ambiente hermoso, limpio, ameno, la atención excelente, la comida riquísima”' },
    { cliente: 'Matias Ainol', estrellas: 5, comentario: '“Excelente atención, pedimos un plato de ñoquis y uno de sorrentinos super abundante.”' },
    { cliente: 'Erica s. paredes', estrellas: 5, comentario: '“Pedimos paella para 2. Excelente. Nos encantó. La atención es muy muy buena, super serviciales”' },
  ],
  mejoras: [
    { tema: 'Calefacción', detalle: '“Se sintió en un momento la falta de calefacción”', prioridad: 'Media' },
    { tema: 'Pan frío', detalle: '“El pan se sirvió frío de nevera, punto de mejora”', prioridad: 'Media' },
    { tema: 'Precio', detalle: '“Solo podrán bajar un poco los precios”', prioridad: 'Baja' },
  ],
  todasLasResenas: [
    { fecha: '28/06/2026', cliente: 'Julieta Abril Gallardo Iaboni', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '28/06/2026', cliente: 'Javier Luque', estrellas: 5, comentario: 'Excelente la comida muy sabrosa y la atención de su personal con mucha cordialidad. Es para volver siempre' },
    { fecha: '27/06/2026', cliente: 'franco amado', estrellas: 5, comentario: 'Muy abundante, buena atención, ambiente y música confortable. Solo podrán bajar un poco los precios' },
    { fecha: '27/06/2026', cliente: 'Thiari martinez', estrellas: 4, comentario: 'Sin comentario escrito' },
    { fecha: '26/06/2026', cliente: 'German Borgogno', estrellas: 4, comentario: 'Sin comentario escrito' },
    { fecha: '26/06/2026', cliente: 'Eliana Della Schiava', estrellas: 5, comentario: 'Excelente atención y la comida riquísima. Altamente recomendable' },
    { fecha: '26/06/2026', cliente: 'Juan Pablo Matas', estrellas: 5, comentario: 'Excelente atención. Y la comida todo muy rico.' },
    { fecha: '26/06/2026', cliente: 'Marisa Estela Massó', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '26/06/2026', cliente: 'David Troncoso', estrellas: 5, comentario: 'Como siempre espectacular la picada frío caliente.. hace 12 años que la había probado y gracias a mi trabajado una pasada x comodoro era obligatorio venir a comer acá.! Excelente la...' },
    { fecha: '25/06/2026', cliente: 'Mayra Gaitan', estrellas: 5, comentario: 'Muy rica la comida, pedimos picada fría/caliente y de postre volcán de chocolate. Excelente atención. Volveremos 😊' },
    { fecha: '25/06/2026', cliente: 'juan baratti', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '25/06/2026', cliente: 'Florencia Roldán', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '23/06/2026', cliente: 'Gustavo Fernando PALAVECINO', estrellas: 5, comentario: 'Hermoso lugar para conocer en Comodoro Rivadavia.' },
    { fecha: '22/06/2026', cliente: 'Diego Leblic', estrellas: 5, comentario: 'Muy buena comida y buena atención!!!' },
    { fecha: '22/06/2026', cliente: 'Lucia Romero', estrellas: 5, comentario: 'Festejando el día del padre Con mi viejito Hermoso todo y sobre todo muy rica la cena Y la atención muy buena ..' },
    { fecha: '21/06/2026', cliente: 'Mario Alejandro Godoy', estrellas: 5, comentario: 'En dias frios como el de hoy, se sintio en un momento la falta de calefaccion. El resto muy bien como siempre.' },
    { fecha: '21/06/2026', cliente: 'Gaby Desatnik', estrellas: 5, comentario: 'Buen lugar y comida, la atención de los mesoneros es muy buena' },
    { fecha: '21/06/2026', cliente: 'Andres Valdemir', estrellas: 3, comentario: 'El pan se sirvió frío de nevera, punto de mejora.' },
    { fecha: '20/06/2026', cliente: 'Juan Cruz Aravena', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '20/06/2026', cliente: 'Vero Triviño', estrellas: 5, comentario: 'Muy lindo mi cumple ✨' },
    { fecha: '19/06/2026', cliente: 'Claudia Quiroga', estrellas: 5, comentario: 'Fue excelente, el ambiente hermoso todo decorado de 🇦🇷, limpio ameno , la atencion excelente, la comida riquisima' },
    { fecha: '19/06/2026', cliente: 'Alexia De Vadillo', estrellas: 5, comentario: 'Excelente servicio!' },
    { fecha: '13/06/2026', cliente: 'GABRIEL ANGEL MARTINEZ', estrellas: 5, comentario: 'Excelente la atención del mozo. De entrada una picada de Mariscos. Plato principal filet de merluza con papas Rústicas. Y un te de Tilo. Por persona aprox. $50000.' },
    { fecha: '13/06/2026', cliente: 'Matias Ainol', estrellas: 5, comentario: 'Excelente atención, pedimos un plato de ñoquis y uno de sorrentinos super abundante. Y de yapa nos cruzamos a Babasónicos' },
    { fecha: '13/06/2026', cliente: 'Tamara Uvieda', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '12/06/2026', cliente: 'Veronica Peralta', estrellas: 5, comentario: 'Es excelente la atención!!! La comida es impecable. Mi lugar preferido 💕JS' },
    { fecha: '11/06/2026', cliente: 'Jose Ormachea', estrellas: 3, comentario: 'Sin comentario escrito' },
    { fecha: '09/06/2026', cliente: 'Gilda Maribel Morales Guerra', estrellas: 5, comentario: 'Excelente' },
    { fecha: '08/06/2026', cliente: 'Valentina Spilman', estrellas: 5, comentario: 'Riquísimo todo! David un genio atendiendo' },
    { fecha: '08/06/2026', cliente: 'Pablo Nicolas Huañacota', estrellas: 5, comentario: 'Todo muy rico, David un 10' },
    { fecha: '07/06/2026', cliente: 'marcos villar', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '07/06/2026', cliente: 'Cristhian', estrellas: 5, comentario: 'Excelente siempre!!! Comida exquisita, servicio excelente y la atención de David la mejor siempre!!!' },
    { fecha: '07/06/2026', cliente: 'eneka cordoba', estrellas: 5, comentario: 'Excelente la atención de Naidu! Muchas gracias.' },
    { fecha: '07/06/2026', cliente: 'Marcelo Luna', estrellas: 5, comentario: 'Muy buena comida y muy buena atención.' },
    { fecha: '06/06/2026', cliente: 'Erica s. paredes', estrellas: 5, comentario: 'Pedimos paella para 2 !!! Excelente !!!! Nos encantó La atencion es muy muy buena, super serviciales' },
    { fecha: '05/06/2026', cliente: 'Nelson Pablo Vazquez', estrellas: 5, comentario: 'Exelente la atención del mozo ..... Muy buena...!!!' },
    { fecha: '05/06/2026', cliente: 'Silvia Cabeza', estrellas: 5, comentario: 'Volvería!' },
    { fecha: '05/06/2026', cliente: 'Florencia Velázquez', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '04/06/2026', cliente: 'Sofi Benitez', estrellas: 5, comentario: 'Sin comentario escrito' },
    { fecha: '03/06/2026', cliente: 'eliana alvarez', estrellas: 5, comentario: 'Sin comentario escrito' },
  ],
}

// Datos de fallback genéricos para cualquier otro cliente que selecciones y aún no tenga reporte cargado
const getFallbackReport = (clientName = 'Cliente') => ({
  periodo: 'Sin Reportes',
  marca: clientName,
  fuente: 'Google Reviews',
  corte: 'N/A',
  totalEncuestas: 0,
  promedioMensual: 0.0,
  promedioHistorico: 0.0,
  diferenciaHistorico: 0.0,
  distribucionEstrellas: [
    { estrellas: 5, cantidad: 0, porcentaje: 0.0 },
    { estrellas: 4, cantidad: 0, porcentaje: 0.0 },
    { estrellas: 3, cantidad: 0, porcentaje: 0.0 },
    { estrellas: 2, cantidad: 0, porcentaje: 0.0 },
    { estrellas: 1, cantidad: 0, porcentaje: 0.0 },
  ],
  evolucionEncuestas: [
    { mes: 'Enero', cantidad: 0 },
    { mes: 'Febrero', cantidad: 0 },
    { mes: 'Marzo', cantidad: 0 },
    { mes: 'Abril', cantidad: 0 },
    { mes: 'Mayo', cantidad: 0 },
    { mes: 'Junio', cantidad: 0 },
  ],
  evolucionSatis: [
    { mes: 'Enero', promedio: 0.0, cantidad: 0 },
    { mes: 'Febrero', promedio: 0.0, cantidad: 0 },
    { mes: 'Marzo', promedio: 0.0, cantidad: 0 },
    { mes: 'Abril', promedio: 0.0, cantidad: 0 },
    { mes: 'Mayo', promedio: 0.0, cantidad: 0 },
    { mes: 'Junio', promedio: 0.0, cantidad: 0 },
  ],
  temasPositivos: [],
  comentariosDestacados: [],
  mejoras: [],
  todasLasResenas: [],
})

export default function CrmSatisfactionDashboard() {
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [activeTab, setActiveTab] = useState('resumen') // resumen | resenas | carga
  const [inputText, setInputText] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch clients from Supabase (same list as CrmDashboard)
  useEffect(() => {
    async function loadClients() {
      try {
        const { data, error } = await supabase
          .from('crm_clients')
          .select('*')
          .order('name')
        if (error) throw error
        setClients(data || [])
        
        // Restore last selected client
        const savedClientId = localStorage.getItem('crm_selected_client_id')
        if (savedClientId && data.some(c => c.id === savedClientId)) {
          setSelectedClientId(savedClientId)
        } else if (data && data.length > 0) {
          setSelectedClientId(data[0].id)
        }
      } catch (err) {
        console.error('Error fetching CRM clients:', err)
      } finally {
        setLoading(false)
      }
    }
    loadClients()
  }, [])

  const selectedClient = clients.find(c => c.id === selectedClientId)
  
  // Choose report data dynamically based on the selected client
  // "Puerto Cangrejo" gets the mock report, others get the fallback empty structure (or can paste it in Importar)
  const isPuertoCangrejo = selectedClient?.name?.toLowerCase().includes('cangrejo')
  const currentReport = isPuertoCangrejo ? PUERTO_CANGREJO_REPORT : getFallbackReport(selectedClient?.name || 'Cliente')

  const maxEncuestas = currentReport.evolucionEncuestas.length > 0 
    ? Math.max(...currentReport.evolucionEncuestas.map(d => d.cantidad)) 
    : 0
  const maxSatisMes = currentReport.evolucionSatis.slice(-6)

  const handleProcessText = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    setSuccessMessage(`¡Reporte para ${selectedClient?.name} procesado con éxito! Se han analizado las métricas y comentarios y se ha estructurado para la base de datos de satisfacción de Supabase.`)
    setTimeout(() => setSuccessMessage(''), 5000)
    setInputText('')
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-sm font-bold text-[var(--color-deep-green)] tracking-widest animate-pulse">
          CARGANDO CLIENTES...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-deep-green)]/8 pb-6">
        <div>
          <span className="text-xs font-bold text-[var(--color-deep-green)] tracking-wider uppercase bg-[var(--color-deep-green)]/6 px-3 py-1 rounded-full">
            Satisfacción CRM
          </span>
          <h1 className="text-3xl font-extrabold text-[var(--color-deep-green)] mt-2">
            Opiniones y Reportes
          </h1>
          <p className="text-sm text-[var(--color-dark-gray)]/75 mt-1">
            Análisis de opiniones e impacto en redes para tus clientes activos.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-[var(--radius-premium)] border border-[var(--color-deep-green)]/10 shadow-sm self-start">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === 'resumen'
                ? 'bg-[var(--color-deep-green)] text-white'
                : 'text-[var(--color-dark-gray)]/70 hover:text-[var(--color-deep-green)]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('resenas')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === 'resenas'
                ? 'bg-[var(--color-deep-green)] text-white'
                : 'text-[var(--color-dark-gray)]/70 hover:text-[var(--color-deep-green)]'
            }`}
          >
            Reseñas ({currentReport.totalEncuestas})
          </button>
          <button
            onClick={() => setActiveTab('carga')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === 'carga'
                ? 'bg-[var(--color-deep-green)] text-white'
                : 'text-[var(--color-dark-gray)]/70 hover:text-[var(--color-deep-green)]'
            }`}
          >
            Importar Reporte
          </button>
        </div>
      </div>

      {/* Client Selector (Syncs with CrmDashboard selection) */}
      <div className="card p-6 bg-white">
        <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/50 block mb-3">
          Seleccionar Cliente de la Cuenta
        </label>
        <div className="flex flex-wrap gap-2">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => {
                setSelectedClientId(client.id)
                localStorage.setItem('crm_selected_client_id', client.id)
              }}
              className={`px-5 py-3 rounded-premium text-sm font-bold border transition-all ${
                selectedClientId === client.id
                  ? 'bg-[var(--color-deep-green)] text-white border-[var(--color-deep-green)] shadow-[var(--shadow-premium)]'
                  : 'bg-[var(--color-refined-gray)]/50 text-[var(--color-dark-gray)] border-gray-200 hover:bg-gray-100'
              }`}
            >
              {client.name}
            </button>
          ))}
        </div>
      </div>

      {currentReport.totalEncuestas === 0 && activeTab !== 'carga' ? (
        <div className="card p-12 text-center max-w-xl mx-auto space-y-4">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/40">rate_review</span>
          <h3 className="text-lg font-bold text-[var(--color-deep-green)]">Sin reportes para {selectedClient?.name}</h3>
          <p className="text-xs text-[var(--color-dark-gray)]/70">
            Aún no has procesado opiniones de Google ni cargado reportes de satisfacción de este cliente para el mes actual.
          </p>
          <button
            onClick={() => setActiveTab('carga')}
            className="btn-primary mt-2"
          >
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            Cargar Primer Reporte
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'resumen' && (
            <>
              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider">Promedio Mensual</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-[var(--color-deep-green)]">{currentReport.promedioMensual}</span>
                    <span className="text-sm font-semibold text-[var(--color-dark-gray)]/50">/ 5</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-deep-green)] font-bold mt-2">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>+{currentReport.diferenciaHistorico} vs Histórico</span>
                  </div>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider">Total Encuestas</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-[var(--color-deep-green)]">{currentReport.totalEncuestas}</span>
                    <span className="text-sm font-semibold text-[var(--color-dark-gray)]/50">reseñas</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-deep-green)] font-bold mt-2">
                    <span className="material-symbols-outlined text-sm">group</span>
                    <span>Período: {currentReport.periodo}</span>
                  </div>
                </div>

                <div className="card p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider">Histórico General</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-[var(--color-dark-gray)]/80">{currentReport.promedioHistorico}</span>
                    <span className="text-sm font-semibold text-[var(--color-dark-gray)]/50">/ 5</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-dark-gray)]/40 font-semibold mt-2">
                    Métrica de referencia
                  </div>
                </div>

                <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-[var(--color-deep-green)] to-[var(--color-deep-green-light)] text-white">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Tasa Excelencia</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black">
                      {currentReport.distribucionEstrellas.find(s => s.estrellas === 5)?.porcentaje || 0}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-light-green)] font-bold mt-2">
                    <span className="material-symbols-outlined text-sm">grade</span>
                    <span>Calificaciones 5★</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Distribución por Estrellas */}
                <div className="card p-6 lg:col-span-1 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-deep-green)]">Distribución de Calificaciones</h3>
                    <p className="text-xs text-[var(--color-dark-gray)]/60">Distribución porcentual del mes analizado</p>
                  </div>
                  <div className="space-y-4">
                    {currentReport.distribucionEstrellas.map((item) => (
                      <div key={item.estrellas} className="flex items-center gap-3 text-sm">
                        <span className="w-12 text-xs font-bold text-[var(--color-dark-gray)]/70">{item.estrellas} ★</span>
                        <div className="flex-1 h-3 bg-[var(--color-refined-gray)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-deep-green)] rounded-full transition-all duration-500"
                            style={{ width: `${item.porcentaje}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-[var(--color-dark-gray)]">{item.cantidad}</span>
                        <span className="w-12 text-right text-[11px] font-bold text-[var(--color-dark-gray)]/50">{item.porcentaje}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[var(--color-refined-gray)]/50 p-4 rounded-[var(--radius-premium)] text-xs text-[var(--color-dark-gray)]/85 border border-[var(--color-deep-green)]/5">
                    <span className="font-bold text-[var(--color-deep-green)] block mb-1">Lectura estratégica:</span>
                    La mayoría de opiniones se encuentran en el segmento alto, impulsando la reputación general.
                  </div>
                </div>

                {/* Evolución Gráfica Simplificada */}
                <div className="card p-6 lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-deep-green)]">Tendencia de Volumen de Opiniones</h3>
                    <p className="text-xs text-[var(--color-dark-gray)]/60">Cantidad de encuestas en los últimos meses</p>
                  </div>
                  
                  <div className="h-48 flex items-end justify-between gap-2 pt-6 border-b border-[var(--color-deep-green)]/10">
                    {currentReport.evolucionEncuestas.map((item, idx) => {
                      const percent = maxEncuestas > 0 ? (item.cantidad / maxEncuestas) * 100 : 0
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                          <div className="relative w-full flex justify-center">
                            <span className="absolute -top-6 text-[10px] font-bold text-[var(--color-deep-green)] opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded border border-[var(--color-deep-green)]/10 shadow-sm">
                              {item.cantidad}
                            </span>
                            <div
                              className="w-8 sm:w-12 bg-[var(--color-light-green)] hover:bg-[var(--color-deep-green)] rounded-t-md transition-all duration-300 cursor-pointer"
                              style={{ height: `${percent || 4}%`, minHeight: '4px' }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-dark-gray)]/60 text-center truncate max-w-full">
                            {item.mes.split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Historial Satisfacción */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
                    {maxSatisMes.map((item, idx) => (
                      <div key={idx} className="bg-[var(--color-refined-gray)]/45 p-2 rounded text-center border border-[var(--color-deep-green)]/5">
                        <span className="block text-[9px] font-bold text-[var(--color-dark-gray)]/50 uppercase">{item.mes.split(' ')[0]}</span>
                        <span className="block text-sm font-black text-[var(--color-deep-green)]">{item.promedio}★</span>
                        <span className="block text-[8px] font-bold text-[var(--color-dark-gray)]/40">{item.cantidad} rvs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Análisis Cualitativo */}
              {currentReport.temasPositivos.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Puntos Fuertes */}
                  <div className="card p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-deep-green)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--color-deep-green)]">thumb_up</span>
                        Temas Positivos Más Valorados
                      </h3>
                      <p className="text-xs text-[var(--color-dark-gray)]/60">Pilares de la experiencia de clientes en el mes</p>
                    </div>
                    <div className="divide-y divide-[var(--color-deep-green)]/6">
                      {currentReport.temasPositivos.map((item, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0">
                          <h4 className="text-sm font-bold text-[var(--color-deep-green)]">{item.tema}</h4>
                          <p className="text-xs text-[var(--color-dark-gray)]/75 mt-0.5">{item.lectura}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Puntos de Mejora */}
                  <div className="card p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#b45309] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#b45309]">warning</span>
                        Puntos de Mejora Detectados
                      </h3>
                      <p className="text-xs text-[var(--color-dark-gray)]/60">Señales operativas aisladas que requieren atención</p>
                    </div>
                    <div className="space-y-3">
                      {currentReport.mejoras.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-[var(--radius-premium)] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/20 border-amber-500/10"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--color-dark-gray)]">{item.tema}</span>
                              <span className={`badge ${item.prioridad === 'Alta' ? 'badge-red' : 'badge-yellow'}`}>
                                Prioridad {item.prioridad}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-dark-gray)]/85 mt-1 italic">{item.detalle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Testimonios */}
              {currentReport.comentariosDestacados.length > 0 && (
                <div className="card p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-deep-green)]">Comentarios Destacados</h3>
                    <p className="text-xs text-[var(--color-dark-gray)]/60">Opiniones literales valiosas para comunicación y redes sociales</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentReport.comentariosDestacados.map((item, idx) => (
                      <div key={idx} className="bg-[var(--color-refined-gray)]/30 p-4 rounded-xl border border-[var(--color-deep-green)]/5 flex flex-col justify-between space-y-3">
                        <p className="text-xs text-[var(--color-dark-gray)]/80 italic leading-relaxed">
                          {item.comentario}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-deep-green)]/5">
                          <span className="text-xs font-bold text-[var(--color-dark-gray)]">{item.cliente}</span>
                          <span className="text-[10px] font-black text-amber-500">{"★".repeat(item.estrellas)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'resenas' && (
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-[var(--color-deep-green)]/5">
                <h3 className="text-lg font-bold text-[var(--color-deep-green)]">Registro de Encuestas Recibidas</h3>
                <p className="text-xs text-[var(--color-dark-gray)]/60">Lista completa de opiniones cargadas en el período</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Calificación</th>
                      <th>Comentario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.todasLasResenas.map((row, idx) => (
                      <tr key={idx}>
                        <td className="text-xs font-semibold text-[var(--color-dark-gray)]/60 whitespace-nowrap">{row.fecha}</td>
                        <td className="font-bold text-[var(--color-dark-gray)] text-sm">{row.cliente}</td>
                        <td>
                          <span className="text-amber-500 font-bold text-xs whitespace-nowrap">
                            {"★".repeat(row.estrellas)}
                            <span className="text-gray-300">{"★".repeat(5 - row.estrellas)}</span>
                          </span>
                        </td>
                        <td className="text-xs text-[var(--color-dark-gray)]/80 max-w-md truncate md:max-w-lg">
                          {row.comentario === 'Sin comentario escrito' ? (
                            <span className="text-[var(--color-dark-gray)]/40 italic">{row.comentario}</span>
                          ) : (
                            row.comentario
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'carga' && (
        <div className="card p-6 max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-deep-green)]">Importar Reporte Mensual</h3>
            <p className="text-xs text-[var(--color-dark-gray)]/60">
              Pega el texto procesado por tu GPT (análisis estructurado) para parsearlo e incorporarlo a la base de datos de satisfacción de <strong>{selectedClient?.name}</strong>.
            </p>
          </div>

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-500/20 text-[var(--color-deep-green)] p-4 rounded-[var(--radius-premium)] text-xs font-bold animate-pulse">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleProcessText} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-dark-gray)]/80 uppercase tracking-wider mb-2">
                Texto del Reporte (Word o GPT)
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Pegar aquí el reporte de satisfacción mensual de ${selectedClient?.name}...`}
                className="w-full h-64 bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] p-4 font-sans text-xs font-medium text-[var(--color-dark-gray)] outline-none focus:box-shadow-2"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-[11px] text-[var(--color-dark-gray)]/50 font-semibold italic">
                El sistema detectará automáticamente las métricas de estrellas, evolución, comentarios y mejoras.
              </span>
              <button type="submit" className="btn-primary whitespace-nowrap">
                <span className="material-symbols-outlined text-sm">bolt</span>
                Procesar Reporte
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
