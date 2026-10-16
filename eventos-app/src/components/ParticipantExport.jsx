import { useState } from 'react'
import { downloadParticipants } from '../lib/participantExport'
import { loadParticipantExportData } from '../lib/participantExportData'

export default function ParticipantExport({ event, registrations, onlyPresent = false, token }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const download = async () => {
    setBusy(true)
    setError('')
    try {
      const records = await loadParticipantExportData(event.id, token)
      await downloadParticipants(event, records.registrations, records.attendance, onlyPresent)
    } catch (err) {
      setError(err.message || 'No se pudo descargar el Excel. Intentá nuevamente.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="flex flex-col items-start gap-1">
    <button type="button" onClick={download} disabled={busy || !registrations.length} className="btn-secondary disabled:opacity-50" title="Descarga el listado completo del evento, sin aplicar la búsqueda">
      <span className="material-symbols-outlined text-lg">download</span>
      {busy ? 'Preparando Excel…' : onlyPresent ? 'Presentes en Excel' : 'Inscriptos en Excel'}
    </button>
    {error && <p role="alert" className="text-xs text-red-600 max-w-xs">{error}</p>}
  </div>
}
