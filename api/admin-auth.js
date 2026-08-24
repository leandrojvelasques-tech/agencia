const https = require('https')

function verifyAdminSession(accessToken) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return Promise.resolve(false)

  return new Promise(resolve => {
    const url = new URL('/auth/v1/user', supabaseUrl)
    const request = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    }, response => {
      response.resume()
      response.on('end', () => resolve(response.statusCode === 200))
    })
    request.on('error', () => resolve(false))
    request.end()
  })
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}

module.exports = { verifyAdminSession, getBearerToken }
