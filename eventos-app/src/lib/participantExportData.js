import { supabase } from './supabase'

// Read every page so exports are not limited by the API's default row limit.
export async function loadParticipantExportData(eventId, token) {
  const registrations = []
  for (let offset = 0; ; offset += 500) {
    const query = token
      ? supabase.rpc('get_participants_by_token', { event_token: token }).order('registered_at', { ascending: false }).order('registration_id')
      : supabase.from('registrations').select('*, participants(*)').eq('event_id', eventId).order('registered_at', { ascending: false }).order('id')
    const { data, error } = await query.range(offset, offset + 499)
    if (error) throw new Error('No se pudieron cargar los inscriptos. Intentá nuevamente.')
    registrations.push(...(data || []))
    if (!data || data.length < 500) break
  }
  const attendance = []
  for (let start = 0; start < registrations.length; start += 200) {
    const ids = registrations.slice(start, start + 200).map(reg => reg.registration_id || reg.id)
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('attendance')
        .select('id, registration_id, status, marked_at').in('registration_id', ids)
        .order('id').range(offset, offset + 499)
      if (error) throw new Error('No se pudo consultar la asistencia. Intentá nuevamente.')
      attendance.push(...(data || []))
      if (!data || data.length < 500) break
    }
  }
  return { registrations, attendance }
}
