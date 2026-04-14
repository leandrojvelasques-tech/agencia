import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login, isLoading } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.success) {
      navigate('/admin/eventos')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[var(--color-light-green)]/15 rounded-full blur-[120px] -z-0" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[var(--color-deep-green)]/8 rounded-full blur-[120px] -z-0" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <a href="https://www.leandrovelasques.com.ar" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 group">
            <img
              src="https://www.leandrovelasques.com.ar/logo_triskel.png"
              alt="Logo"
              className="h-10 w-auto"
              style={{ mixBlendMode: 'multiply' }}
            />
            <div className="flex flex-col text-left">
              <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-lg tracking-tight leading-none">
                LEANDRO VELASQUES
              </span>
              <span className="font-heading text-xs font-semibold text-[var(--color-deep-green)]/70 mt-1 tracking-tight">
                Licenciado en Administración
              </span>
            </div>
          </a>
        </div>

        {/* Login Card */}
        <div className="card p-8 lg:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight mb-2">Gestor de Eventos</h1>
            <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium">
              Ingresá tus credenciales para acceder al panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 ml-1">
                Email
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@leandrovelasques.com.ar"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-dark-gray)]/60 ml-1">
                Contraseña
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-[var(--radius-premium)] animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-4 text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-[var(--color-light-green)]/15 rounded-[var(--radius-premium)] text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-deep-green)]/60 mb-1">
              Credenciales de prueba
            </p>
            <p className="text-xs text-[var(--color-dark-gray)]/70 font-medium">
              admin@leandrovelasques.com.ar / admin123
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-dark-gray)]/40 mt-6 font-medium">
          © 2026 Leandro Velasques · Módulo privado
        </p>
      </div>
    </div>
  )
}
