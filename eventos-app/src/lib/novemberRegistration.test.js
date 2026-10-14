import test from 'node:test'
import assert from 'node:assert/strict'
import { validateWorkshopPrivateDetails } from './novemberRegistration.js'

const details = { dni: '11111111', invoice_requested: false, newsletter_opt_in: false }
const baseCuit = '2011111111'
const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
const checkDigit = (11 - weights.reduce((sum, weight, i) => sum + Number(baseCuit[i]) * weight, 0) % 11) % 11
const validCuit = baseCuit + checkDigit

test('DNI is required even without an invoice or marketing consent', () => {
  assert.match(validateWorkshopPrivateDetails({ ...details, dni: '' }), /DNI/)
  assert.equal(validateWorkshopPrivateDetails(details), '')
})
test('invoice data is only required when an invoice is requested', () => {
  assert.equal(validateWorkshopPrivateDetails({ ...details, invoice_cuit: 'incorrecto' }), '')
  assert.match(validateWorkshopPrivateDetails({ ...details, invoice_requested: true }), /CUIT/)
  assert.match(validateWorkshopPrivateDetails({ ...details, invoice_requested: true, invoice_cuit: validCuit }), /razón social/)
})
test('a CUIT with eleven digits but an incorrect check digit is rejected', () => {
  const wrongCuit = baseCuit + ((checkDigit + 1) % 10)
  assert.match(validateWorkshopPrivateDetails({ ...details, invoice_requested: true, invoice_cuit: wrongCuit, invoice_name: 'Prueba' }), /CUIT/)
  assert.equal(validateWorkshopPrivateDetails({ ...details, invoice_requested: true, invoice_cuit: validCuit, invoice_name: 'Prueba' }), '')
})
