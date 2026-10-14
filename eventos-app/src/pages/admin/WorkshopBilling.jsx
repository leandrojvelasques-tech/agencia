import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const csvCell = value => {
  const text = String(value ?? '')
  const safe = /^[=+@-]/.test(text) ? "'" + text : text
  return '"' + safe.replaceAll('"', '""') + '"'
}

export default function WorkshopBilling() {
  const { id } = useParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    let active = true
    supabase.from('workshop_registration_private')
      .select('*, registrations(registered_at,status,participants(first_name,last_name,email,phone))')
      .eq('event_id', id).order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) setError('No se pudieron cargar los datos de facturación.')
        else setRows(data || [])
        setLoading(false)
      })
    return () => { active = false }
  }, [id])
  const visible = useMemo(() => rows.filter(row => {
    if (filter === 'invoice' && !row.invoice_requested) return false
    if (filter === 'newsletter' && !row.newsletter_opt_in) return false
    const person = row.registrations?.participants || {}
    const text = [row.dni, row.invoice_cuit, row.invoice_name, person.first_name, person.last_name, person.email].join(' ').toLowerCase()
    return text.includes(search.trim().toLowerCase())
  }), [rows, search, filter])
  const exportCsv = () => {
    const columns = ['Nombre','Apellido','Email','Teléfono','DNI','Solicita factura C','CUIT factura','Nombre o razón social','Datos adicionales','Acepta novedades','Fecha de consentimiento','Texto aceptado','Estado inscripción']
    const data = visible.map(row => {
      const person = row.registrations?.participants || {}
      return [person.first_name,person.last_name,person.email,person.phone,row.dni,row.invoice_requested?'Sí':'No',
        row.invoice_cuit,row.invoice_name,row.invoice_notes,row.newsletter_opt_in?'Sí':'No',
        row.newsletter_consented_at,row.newsletter_consent_text,row.registrations?.status]
    })
    const csv = '\uFEFF' + [columns, ...data].map(row => row.map(csvCell).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `workshop-contactos-facturacion-${id}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="space-y-6">
    <Link to={`/admin/eventos/${id}`} className="text-sm font-bold text-[var(--color-deep-green)]">← Volver al evento</Link>
    <div><h1 className="text-2xl font-extrabold">Datos y facturación</h1><p className="text-sm text-gray-600 mt-2">Identificación de inscriptos, solicitudes de factura C y autorización para recibir novedades.</p></div>
    <div className="card p-5 flex flex-wrap gap-4 items-end">
      <label className="flex-1 min-w-48 text-sm font-bold">Buscar por DNI, CUIT, nombre o email<input className="form-input mt-2" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label className="text-sm font-bold">Mostrar<select className="form-input mt-2" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos</option><option value="invoice">Solicitan factura C</option><option value="newsletter">Aceptan recibir novedades</option></select></label>
      <button className="btn-primary" onClick={exportCsv} disabled={loading || Boolean(error) || !visible.length}>Exportar CSV</button>
    </div>
    {loading ? <p>Cargando datos…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : <>
      <p className="text-sm text-gray-600">{visible.length} registros · {rows.filter(row=>row.invoice_requested).length} solicitan factura C · {rows.filter(row=>row.newsletter_opt_in).length} aceptan novedades</p>
      {!rows.length && <p className="card p-6 text-sm">Los datos de DNI, facturación y novedades se guardarán para las nuevas inscripciones. Las anteriores no tienen estos datos cargados.</p>}
      {rows.length > 0 && <div className="card overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-4">Inscripto</th><th className="p-4">DNI</th><th className="p-4">Factura C</th><th className="p-4">Novedades</th></tr></thead><tbody>{visible.map(row=>{
        const person=row.registrations?.participants || {}
        return <tr key={row.registration_id} className="border-b align-top"><td className="p-4"><strong>{person.first_name} {person.last_name}</strong><p>{person.email}</p><p className="text-gray-500">{person.phone}</p></td><td className="p-4">{row.dni}</td><td className="p-4">{row.invoice_requested ? <><strong>{row.invoice_name}</strong><p>CUIT: {row.invoice_cuit}</p>{row.invoice_notes && <p className="whitespace-pre-line mt-2 text-gray-600">{row.invoice_notes}</p>}</> : 'No solicitada'}</td><td className="p-4">{row.newsletter_opt_in ? <><strong>Sí</strong><p className="text-xs text-gray-500 mt-1">{new Date(row.newsletter_consented_at).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</p></> : 'No'}</td></tr>
      })}</tbody></table></div>}
      {rows.length > 0 && !visible.length && <p className="text-sm">No hay registros para este filtro.</p>}
    </>}
  </div>
}
