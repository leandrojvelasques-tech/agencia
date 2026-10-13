function getPublicSupabaseConfig(env = process.env) {
  return {
    supabaseUrl: env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://oaapnglvbkvxyydjnmun.supabase.co',
    supabaseKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXBuZ2x2Ymt2eHl5ZGpubXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjg3MDAsImV4cCI6MjA5MTcwNDcwMH0.Q0H0K1dKT77gawhU-YfkqmpAnDqgzq0i8etoY9bLM_0',
  };
}

module.exports = { getPublicSupabaseConfig };
