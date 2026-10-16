import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { participantRows, createParticipantWorkbook } from './participantExport.js'

const registrations = [
  { id: '1', status: 'confirmed', participants: { first_name: 'María', last_name: 'Álvarez', email: 'maria@example.com', phone: '+540012345' }, survey_responses: { Acepta: false, Cantidad: 0 } },
  { registration_id: '2', status: 'confirmed', first_name: '=1+1', phone: '001234', survey_responses: { Extra: 'Sí' } },
  { id: '3', status: 'cancelled', participants: { first_name: 'Cancelado' } },
  { id: '4', status: 'confirmed', participants: { first_name: 'Ausente' } },
]
const attendance = [
  { registration_id: '1', status: 'present', marked_at: '2026-10-01T13:00:00Z' },
  { registration_id: '1', status: 'absent', marked_at: '2026-10-02T13:00:00Z' },
  { registration_id: '2', status: 'late' },
  { registration_id: '3', status: 'present' },
]

test('admin and shared rows preserve all registrations and survey values', () => {
  const rows = participantRows(registrations, attendance)
  assert.equal(rows.length, 4)
  assert.equal(rows[0]['Inscripción: Acepta'], 'No')
  assert.equal(rows[0]['Inscripción: Cantidad'], '0')
  assert.equal(rows[3].Asistencia, 'Sin marcar')
})

test('present export includes late arrivals and attendance in any session, excludes cancelled registrations', () => {
  const rows = participantRows(registrations, attendance, true)
  assert.deepEqual(rows.map(row => row.Nombre), ['María', '=1+1'])
})

test('real XLSX round trip retains Unicode, phones as text, safe formula-like names and all survey columns', async () => {
  const rows = participantRows(registrations, attendance)
  const workbook = await createParticipantWorkbook({ title: 'Taller IA' }, rows)
  const restored = new ExcelJS.Workbook()
  await restored.xlsx.load(await workbook.xlsx.writeBuffer())
  const sheet = restored.worksheets[0]
  assert.equal(sheet.rowCount, 5)
  const headers = sheet.getRow(1).values
  const cell = (row, header) => sheet.getRow(row).getCell(headers.indexOf(header)).value
  assert.equal(cell(2, 'Nombre'), 'María')
  assert.equal(cell(3, 'Nombre'), '=1+1')
  assert.equal(cell(3, 'Teléfono'), '001234')
  assert.equal(cell(2, 'Teléfono'), '+540012345')
  assert.equal(cell(3, 'Inscripción: Extra'), 'Sí')
  assert.equal(sheet.views[0].ySplit, 1)
})
