
const supabaseUrl = 'https://oaapnglvbkvxyydjnmun.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0'

async function listAllMaterials() {
  const response = await fetch(`${supabaseUrl}/rest/v1/event_materials?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  })
  const data = await response.json()
  console.log('All Materials:', JSON.stringify(data, null, 2))
}

listAllMaterials()
