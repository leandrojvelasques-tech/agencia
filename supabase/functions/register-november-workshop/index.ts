import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0'
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ success: false, error: 'Método no permitido.' }), { headers, status: 405 })
  try {
    const raw = await req.text()
    if (raw.length > 20000) return new Response(JSON.stringify({ success: false, error: 'La información enviada es demasiado extensa.' }), { headers, status: 400 })
    const body = JSON.parse(raw)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data, error } = await supabase.rpc('register_november_workshop', {
      p_participant: body.participant, p_answers: body.answers, p_private: body.private_details,
    })
    if (error) {
      const message = error.code === '23505' ? 'Ya estás inscripto en este evento.'
        : error.code === 'P0001' ? error.message : 'No se pudo completar la inscripción. Revisá los datos e intentá nuevamente.'
      return new Response(JSON.stringify({ success: false, error: message }), { headers, status: 400 })
    }
    return new Response(JSON.stringify(data), { headers })
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'No se pudo procesar la inscripción. Revisá los datos e intentá nuevamente.' }), { headers, status: 400 })
  }
})
