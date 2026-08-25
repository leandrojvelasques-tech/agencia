import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { ErrorBoundary } from '../components/ErrorBoundary'

const NAV_ITEMS = [
  { to: '/admin/eventos', icon: 'event', label: 'Eventos' },
  { to: '/admin/clases', icon: 'fact_check', label: 'Clases y Asistencia' },
  { to: '/admin/crm', icon: 'dashboard_customize', label: 'CRM Contenidos' },
  { to: '/admin/presupuestos', icon: 'request_quote', label: 'Presupuestos' },
  { to: '/admin/procesos', icon: 'account_tree', label: 'Relevamiento Procesos' },
  { to: '/admin/clientes', icon: 'groups', label: 'Clientes' },
  { to: '/admin/reportes-clientes', icon: 'insights', label: 'Reportes de clientes' },
  { to: '/admin/pedidos-cambios', icon: 'assignment_turned_in', label: 'Pedidos de cambios' },
  { to: '/admin/configuracion', icon: 'settings', label: 'Configuración' },
]

export default function AdminLayout() {
  const { user, logout } = useStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-[var(--color-deep-green)]/8
        flex flex-col transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-[var(--color-deep-green)]/8">
          <a href="https://www.leandrovelasques.com.ar" target="_blank" rel="noreferrer" className="flex items-center gap-3 group">
            <img
              src="https://www.leandrovelasques.com.ar/logo_triskel.png"
              alt="Logo"
              className="h-8 w-auto"
              style={{ mixBlendMode: 'multiply' }}
            />
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-[var(--color-deep-green)] text-sm tracking-tight leading-none">
                LEANDRO VELASQUES
              </span>
              <span className="text-[10px] font-semibold text-[var(--color-dark-gray)]/60 mt-1 tracking-tight">
                Gestor de Eventos
              </span>
            </div>
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/crm'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-[var(--radius-premium)] text-sm font-semibold transition-all
                ${isActive
                  ? 'bg-[var(--color-deep-green)] text-white shadow-[var(--shadow-premium)]'
                  : 'text-[var(--color-dark-gray)] hover:bg-[var(--color-deep-green)]/6 hover:text-[var(--color-deep-green)]'
                }
              `}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-[var(--color-deep-green)]/8">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-[var(--color-deep-green)] text-white flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-dark-gray)] truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-[var(--color-dark-gray)]/50 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-[var(--color-dark-gray)]/40 hover:text-red-500 transition-colors" title="Cerrar sesión">
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass-nav px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-4 text-[var(--color-dark-gray)] hover:text-[var(--color-deep-green)] transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 animate-fade-in">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
