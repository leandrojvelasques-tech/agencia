import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from './store/useStore'

// Admin pages
import AdminLogin from './pages/admin/Login'
import AdminLayout from './layouts/AdminLayout'
import EventsDashboard from './pages/admin/EventsDashboard'
import EventCreate from './pages/admin/EventCreate'
import EventDetail from './pages/admin/EventDetail'
import EventParticipants from './pages/admin/EventParticipants'
import EventAttendance from './pages/admin/EventAttendance'
import EventMinuta from './pages/admin/EventMinuta'

// Public (participant) pages
import EventLanding from './pages/public/EventLanding'
import EventRegister from './pages/public/EventRegister'
import EventConfirmation from './pages/public/EventConfirmation'
import AttendanceCheck from './pages/public/AttendanceCheck'

function ProtectedRoute({ children }) {
  const isAuthenticated = useStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  const { checkSession } = useStore()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    checkSession().finally(() => setCheckingAuth(false))
  }, [])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)]">
        <div className="text-center animate-fade-in">
          <p className="font-heading text-lg font-bold text-[var(--color-deep-green)] tracking-widest animate-pulse">
            CARGANDO...
          </p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="eventos" replace />} />
          <Route path="eventos" element={<EventsDashboard />} />
          <Route path="eventos/nuevo" element={<EventCreate />} />
          <Route path="eventos/:id" element={<EventDetail />} />
          <Route path="eventos/:id/editar" element={<EventCreate />} />
          <Route path="eventos/:id/participantes" element={<EventParticipants />} />
          <Route path="eventos/:id/asistencia" element={<EventAttendance />} />
          <Route path="eventos/:id/minuta" element={<EventMinuta />} />
        </Route>

        {/* Public Participant Routes */}
        <Route path="/evento/:slug" element={<EventLanding />} />
        <Route path="/evento/:slug/inscripcion" element={<EventRegister />} />
        <Route path="/evento/:slug/confirmacion" element={<EventConfirmation />} />
        <Route path="/evento/:slug/asistencia" element={<AttendanceCheck />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
