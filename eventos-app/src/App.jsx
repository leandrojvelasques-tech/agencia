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
import AgendaTemplatesDashboard from './pages/admin/AgendaTemplatesDashboard'
import SettingsDashboard from './pages/admin/SettingsDashboard'

// CRM Pages
import CrmDashboard from './pages/admin/CrmDashboard'
import CrmSatisfactionDashboard from './pages/admin/CrmSatisfactionDashboard'
import CrmPublicationCreate from './pages/admin/CrmPublicationCreate'
import CrmProposalsDashboard from './pages/admin/CrmProposalsDashboard'
import CrmProposalCreate from './pages/admin/CrmProposalCreate'
import CrmPresentationsDashboard from './pages/admin/CrmPresentationsDashboard'
import CrmPresentationEditor from './pages/admin/CrmPresentationEditor'
import CrmPresentationPlayer from './pages/admin/CrmPresentationPlayer'

// Public (participant) pages
import EventLanding from './pages/public/EventLanding'
import EventRegister from './pages/public/EventRegister'
import EventConfirmation from './pages/public/EventConfirmation'
import AttendanceCheck from './pages/public/AttendanceCheck'
import EventParticipantsPublic from './pages/public/EventParticipantsPublic'

// CRM Public Shared Portal
import CrmClientPortal from './pages/public/CrmClientPortal'
import CrmProposalLanding from './pages/public/CrmProposalLanding'

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
          <Route path="plantillas" element={<AgendaTemplatesDashboard />} />
          <Route path="configuracion" element={<SettingsDashboard />} />
          
          {/* CRM Private Routes */}
          <Route path="crm" element={<CrmDashboard />} />
          <Route path="crm/satisfaccion" element={<CrmSatisfactionDashboard />} />
          <Route path="crm/publicacion/nueva" element={<CrmPublicationCreate />} />
          <Route path="crm/publicacion/:id/editar" element={<CrmPublicationCreate />} />
          <Route path="crm/presupuestos" element={<CrmProposalsDashboard />} />
          <Route path="crm/presupuestos/nuevo" element={<CrmProposalCreate />} />
          <Route path="crm/presupuestos/:id/editar" element={<CrmProposalCreate />} />
          <Route path="crm/presentaciones" element={<CrmPresentationsDashboard />} />
          <Route path="crm/presentaciones/nueva" element={<CrmPresentationEditor />} />
          <Route path="crm/presentaciones/:id/editar" element={<CrmPresentationEditor />} />
          <Route path="crm/presentaciones/:id/presentar" element={<CrmPresentationPlayer />} />
        </Route>

        {/* Public Participant Routes */}
        <Route path="/evento/:slug" element={<EventLanding />} />
        <Route path="/evento/:slug/inscripcion" element={<EventRegister />} />
        <Route path="/evento/:slug/confirmacion" element={<EventConfirmation />} />
        <Route path="/evento/:slug/asistencia" element={<AttendanceCheck />} />
        <Route path="/evento/:slug/inscritos" element={<EventParticipantsPublic />} />
        <Route path="/presentacion/:id" element={<CrmPresentationPlayer isPublic={true} />} />

        {/* CRM Client Shared Route */}
        <Route path="/crm/cliente/:token/:slug?" element={<CrmClientPortal />} />
        <Route path="/presupuesto/:token" element={<CrmProposalLanding />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
