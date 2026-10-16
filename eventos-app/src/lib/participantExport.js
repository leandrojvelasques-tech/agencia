const text = value => value == null ? '' : typeof value === 'boolean' ? (value ? 'Sí' : 'No') : typeof value === 'object' ? JSON.stringify(value) : String(value)

export const isPresent = status => status === 'present' || status === 'late'

export function participantRows(registrations, attendance = [], onlyPresent = false) {
  const byRegistration = new Map()
  for (const entry of attendance) {
    const previous = byRegistration.get(entry.registration_id)
    if (!previous || (isPresent(entry.status) && !isPresent(previous.status)) ||
      (isPresent(entry.status) === isPresent(previous.status) && (entry.marked_at || '') > (previous.marked_at || ''))) {
      byRegistration.set(entry.registration_id, entry)
    }
  }
  return registrations.flatMap(reg => {
    const person = reg.participants || reg
    const att = byRegistration.get(reg.registration_id || reg.id)
    if (onlyPresent && (reg.status === 'cancelled' || !isPresent(att?.status))) return []
    const responses = reg.survey_responses || {}
    return [{
      Nombre: text(person.first_name), Apellido: text(person.last_name),
      Email: text(person.email), Teléfono: text(person.phone),
      'Estado de inscripción': ({ confirmed: 'Confirmado', pending: 'Pendiente', cancelled: 'Cancelado' })[reg.status] || text(reg.status),
      Modalidad: text(reg.attendance_mode), 'Fecha elegida': text(reg.selected_date),
      'Fecha de inscripción': localDate(reg.registered_at),
      Asistencia: ({ present: 'Presente', late: 'Llegada tarde', absent: 'Ausente' })[att?.status] || 'Sin marcar',
      'Fecha de asistencia': localDate(att?.marked_at),
      ...Object.fromEntries(Object.entries(responses).map(([key, value]) => [`Inscripción: ${key}`, text(value)])),
    }]
  })
}

function localDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return ''
  return new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })
}

export async function createParticipantWorkbook(event, rows, onlyPresent = false) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(onlyPresent ? 'Presentes' : 'Inscriptos')
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))]
  sheet.columns = ['Evento', ...keys].map(key => ({ header: key, key, width: key === 'Email' || key === 'Evento' ? 42 : 25 }))
  rows.forEach(row => sheet.addRow({ Evento: text(event.title), ...row }))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: keys.length + 1 } }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF285A47' } }
  return workbook
}

export async function downloadParticipants(event, registrations, attendance, onlyPresent = false) {
  const rows = participantRows(registrations, attendance, onlyPresent)
  if (!rows.length) throw new Error(onlyPresent ? 'No hay presentes registrados para descargar.' : 'No hay inscriptos para descargar.')
  const workbook = await createParticipantWorkbook(event, rows, onlyPresent)
  const buffer = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${onlyPresent ? 'presentes' : 'inscriptos'}_${(event.slug || 'evento').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
