import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const date = value => value ? new Date(value).toLocaleDateString('es-AR') : '—'

export default function ChangeRequestDeliveryReport() {
  const { token } = useParams()
  const [client, setClient] = useState(null)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.functions.invoke('change-requests-portal', { body: { token, action: 'load' } }).then(({ data, error: invokeError }) => {
      if (invokeError || !data?.client) setError(data?.error || 'El enlace no es válido o ya no está disponible.')
      else {
        setClient(data.client)
        setRequests((data.requests || []).filter(row => row.status === 'completed' && row.billing_status !== 'pending'))
      }
      setLoading(false)
    })
  }, [token])

  if (loading) return <div className="grid min-h-screen place-items-center bg-[var(--color-refined-gray)] font-bold text-[var(--color-deep-green)]">Cargando mejoras…</div>
  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-gray-600">{error}</div>

  return <div className="min-h-screen bg-[var(--color-refined-gray)] pb-16 text-[var(--color-dark-gray)]">
    <header className="border-b border-black/5 bg-white px-6 py-4"><div className="mx-auto flex max-w-4xl items-center gap-3"><img src="/logo_triskel.png" alt="Leandro Velasques" className="h-8 w-8 object-contain" /><div><p className="text-xs font-extrabold text-[var(--color-deep-green)]">LEANDRO VELASQUES</p><p className="text-[10px] uppercase tracking-widest text-gray-400">Mejoras incorporadas</p></div></div></header>
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[var(--color-deep-green)]/60">Resumen de trabajo</p><h1 className="mt-2 text-3xl font-extrabold text-[var(--color-deep-green)]">Mejoras incorporadas para {client.company || client.name}</h1><p className="mt-3 text-sm text-gray-600">Este resumen reúne los pedidos finalizados y las resoluciones correspondientes.</p></div>
      {!requests.length ? <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">Todavía no hay mejoras disponibles para compartir.</div> : <div className="space-y-3">{requests.map(row => { const resolution = row.client_note || 'Resolución registrada en la entrega al cliente.'; return <details key={row.id} className="group rounded-2xl border border-[var(--color-deep-green)]/10 bg-white shadow-sm"><summary className="flex cursor-pointer list-none flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--color-deep-green)] px-3 py-1 text-xs font-extrabold text-white">{row.request_code || 'Pedido'}</span><span className="text-xs text-gray-400">Iniciado {date(row.created_at)} · Finalizado {date(row.completed_at)}</span></div><h2 className="mt-2 truncate text-lg font-extrabold text-[var(--color-deep-green)]">{row.title}</h2><p className="mt-1 truncate text-sm text-gray-500">{row.description || 'Sin descripción.'}</p></div><span className="shrink-0 rounded-xl bg-[var(--color-refined-gray)] px-3 py-2 text-xs font-extrabold text-[var(--color-deep-green)] group-open:bg-[var(--color-mint)]/40">Ver detalle <span className="ml-1 inline-block transition-transform group-open:rotate-180">⌄</span></span></summary><div className="grid gap-5 border-t border-gray-100 px-5 pb-5 pt-4 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pedido original</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{row.description || 'Sin descripción.'}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-gray-400">Resolución</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{resolution}</p></div></div></details> })}</div>}
    </main>
  </div>
}
