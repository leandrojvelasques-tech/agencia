
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'eventos-app/.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function listEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, event_materials(*)')
    .ilike('title', '%comodoro%')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(JSON.stringify(data, null, 2))
}

listEvents()
