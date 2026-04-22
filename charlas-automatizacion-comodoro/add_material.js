const supabaseUrl = 'https://oaapnglvbkvxyydjnmun.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0'
const eventId = 'e690005e-262c-49c4-b9b5-8f9288251ab0'

async function addMaterial() {
  const response = await fetch(`${supabaseUrl}/rest/v1/event_materials`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      event_id: eventId,
      type: 'presentation',
      title: 'Diapositivas: De la tarea manual al flujo automatizado',
      url: 'https://www.leandrovelasques.com.ar/slides/comodoro/index.html'
    })
  })
  const data = await response.json()
  console.log('Result:', JSON.stringify(data, null, 2))
}

addMaterial()
