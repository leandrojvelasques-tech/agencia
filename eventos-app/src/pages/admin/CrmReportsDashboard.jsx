import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CRM_REPORTS, REPORT_CLIENTS, REPORT_PERIODS } from '../../lib/crmReports'

function answerLabel(report) {
  if (report.answered == null) return 'Pendiente de verificación'
  return `${report.answered}/${report.reviews} contestadas`
}

export default function CrmReportsDashboard() {
  const [clientFilter, setClientFilter] = useState('Todos los clientes')
  const [periodFilter, setPeriodFilter] = useState('Todos los períodos')
  const [toast, setToast] = useState('')

  const filteredReports = useMemo(() => CRM_REPORTS.filter(report => (
    (clientFilter === 'Todos los clientes' || report.client === clientFilter) &&
    (periodFilter === 'Todos los períodos' || report.period === periodFilter)
  )), [clientFilter, periodFilter])

  const copyLink = async report => {
    const url = `${window.location.origin}/crm/reporte/${report.id}`
    try {
      await navigator.clipboard.writeText(url)
      setToast(`Enlace de ${report.client} copiado.`)
      window.setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('No se pudo copiar el enlace. Podés abrirlo y copiarlo desde el navegador.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--color-deep-green)] text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold" role="status">
          {toast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-deep-green)]/60 mb-2">CRM · Clientes</p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Reportes de clientes</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-2 max-w-2xl">
            Consultá la evolución mensual de las opiniones, compartí cada reporte y mantené separados los resultados de cada marca.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-dark-gray)]/55">
          <span className="material-symbols-outlined text-lg">public</span>
          Cada reporte tiene una dirección pública independiente.
        </div>
      </div>

      <div className="card bg-white p-5 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/55 mb-2">Cliente</span>
            <select className="w-full rounded-xl border border-[var(--color-deep-green)]/10 px-4 py-3 text-sm font-semibold bg-white" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              <option>Todos los clientes</option>
              {REPORT_CLIENTS.map(client => <option key={client}>{client}</option>)}
            </select>
          </label>
          <label className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/55 mb-2">Período</span>
            <select className="w-full rounded-xl border border-[var(--color-deep-green)]/10 px-4 py-3 text-sm font-semibold bg-white" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
              <option>Todos los períodos</option>
              {REPORT_PERIODS.map(period => <option key={period}>{period}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {filteredReports.map(report => (
          <article key={report.id} className="bg-white rounded-2xl border border-[var(--color-deep-green)]/8 shadow-sm overflow-hidden">
            <div className="h-2" style={{ backgroundColor: report.accent }} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/45">{report.period}</p>
                  <h2 className="text-2xl font-extrabold mt-1" style={{ color: report.accent }}>{report.client}</h2>
                </div>
                <span className="material-symbols-outlined text-3xl" style={{ color: report.accent }}>analytics</span>
              </div>

              <p className="text-sm text-[var(--color-dark-gray)]/65 leading-relaxed mb-5">{report.summary}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="rounded-xl bg-[var(--color-refined-gray)]/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-dark-gray)]/45">Opiniones</p>
                  <p className="text-xl font-extrabold mt-1">{report.reviews}</p>
                </div>
                <div className="rounded-xl bg-[var(--color-refined-gray)]/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-dark-gray)]/45">Promedio</p>
                  <p className="text-xl font-extrabold mt-1">{report.score.toFixed(2)} <span className="text-sm">/ 5</span></p>
                </div>
                <div className="rounded-xl bg-[var(--color-refined-gray)]/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-dark-gray)]/45">Positivas</p>
                  <p className="text-xl font-extrabold mt-1">{report.positiveRate}%</p>
                </div>
                <div className="rounded-xl bg-[var(--color-refined-gray)]/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-dark-gray)]/45">Respuestas</p>
                  <p className="text-sm font-extrabold mt-2 leading-tight">{answerLabel(report)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={`/crm/reporte/${report.id}`} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">visibility</span> Ver reporte
                </Link>
                <button type="button" onClick={() => copyLink(report)} className="px-4 py-2.5 rounded-xl border border-[var(--color-deep-green)]/15 text-[var(--color-deep-green)] text-sm font-bold hover:bg-[var(--color-deep-green)]/5 transition-colors inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">content_copy</span> Copiar enlace
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-[var(--color-deep-green)]/8">
          <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20">search_off</span>
          <p className="font-bold mt-3">No hay reportes para esos filtros.</p>
        </div>
      )}
    </div>
  )
}
