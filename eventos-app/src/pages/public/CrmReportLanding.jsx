import { Link, useParams } from 'react-router-dom'
import { getCrmReport } from '../../lib/crmReports'

function answerLabel(report) {
  if (report.answered == null) return 'Pendiente de verificación'
  return `${report.answered}/${report.reviews} contestadas (${Math.round((report.answered / report.reviews) * 100)}%)`
}

export default function CrmReportLanding() {
  const { reportId } = useParams()
  const report = getCrmReport(reportId)

  if (!report) {
    return (
      <main className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-[var(--color-deep-green)]/30">description</span>
          <h1 className="text-2xl font-extrabold mt-4">Reporte no encontrado</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-2">El enlace puede estar vencido o el reporte todavía no fue publicado.</p>
          <Link to="/admin/reportes-clientes" className="btn-primary inline-flex mt-6">Volver al administrador</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-refined-gray)]">
      <header className="bg-white border-b border-[var(--color-deep-green)]/10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://www.leandrovelasques.com.ar/logo_triskel.png" alt="Leandro Velasques" className="h-9 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <div>
              <p className="text-xs font-extrabold tracking-widest text-[var(--color-deep-green)]">LEANDRO VELASQUES</p>
              <p className="text-[11px] text-[var(--color-dark-gray)]/55">Reporte de opiniones</p>
            </div>
          </div>
          <span className="hidden sm:block text-xs font-semibold text-[var(--color-dark-gray)]/50">{report.period}</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <section className="bg-white rounded-2xl shadow-sm border border-[var(--color-deep-green)]/8 overflow-hidden mb-6">
          <div className="h-2" style={{ backgroundColor: report.accent }} />
          <div className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-dark-gray)]/45">Evolución mensual</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold mt-2" style={{ color: report.accent }}>{report.client}</h1>
            <p className="text-base text-[var(--color-dark-gray)]/65 mt-2">{report.period} · resumen estadístico y detalle completo de opiniones</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-7">
              <div className="rounded-xl bg-[var(--color-refined-gray)]/65 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/50">Opiniones registradas</p>
                <p className="text-3xl font-extrabold mt-1">{report.reviews}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-refined-gray)]/65 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/50">Respuestas contestadas</p>
                <p className="text-lg font-extrabold mt-2">{answerLabel(report)}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-refined-gray)]/65 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/50">Promedio del mes</p>
                <p className="text-3xl font-extrabold mt-1">{report.score.toFixed(2)} <span className="text-base">/ 5</span></p>
              </div>
            </div>
            {report.answered == null && (
              <p className="text-xs text-[var(--color-dark-gray)]/55 mt-4">El estado de respuestas se incorporará una vez verificado en Google Business.</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-[var(--color-deep-green)]/8 overflow-hidden">
          <div className="px-5 sm:px-7 py-4 border-b border-[var(--color-deep-green)]/8 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-lg">Reporte completo</h2>
              <p className="text-xs text-[var(--color-dark-gray)]/55 mt-1">Estadísticas, gráficos y todas las opiniones del período.</p>
            </div>
            <a href={`/crm/reporte/${report.id}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--color-deep-green)] hover:underline">Abrir en otra pestaña</a>
          </div>
          <iframe title={`Reporte completo de ${report.client} - ${report.period}`} srcDoc={report.html} className="w-full min-h-[1100px] border-0 bg-white" />
        </section>

        <footer className="text-center text-xs text-[var(--color-dark-gray)]/45 py-7">Reporte preparado por Leandro Velasques</footer>
      </div>
    </main>
  )
}
