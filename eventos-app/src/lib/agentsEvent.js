export const AGENTS_EVENT_SLUG = 'agentes-de-inteligencia-artificial-en-ciencias-economicas-2026'
export const EVENT_PROFESSIONS = ['Contador/a público/a', 'Licenciado/a en Administración', 'Licenciado/a en Economía', 'Actuario/a', 'Otra profesión de Ciencias Económicas']

export function validateEventRegistration(values) {
  const errors = {}
  if (!values.first_name?.trim()) errors.first_name = 'Ingresá tu nombre.'
  if (!values.last_name?.trim()) errors.last_name = 'Ingresá tu apellido.'
  if (!EVENT_PROFESSIONS.includes(values.profession)) errors.profession = 'Seleccioná tu profesión.'
  if (values.profession === EVENT_PROFESSIONS.at(-1) && !values.other_profession?.trim()) errors.other_profession = 'Indicanos cuál es tu profesión.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email?.trim() || '')) errors.email = 'Ingresá un correo electrónico válido.'
  return errors
}
