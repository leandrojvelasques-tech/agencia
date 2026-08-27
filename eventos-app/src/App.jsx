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
import EventSatisfaction from './pages/admin/EventSatisfaction'
import EventReport from './pages/admin/EventReport'
import AgendaTemplatesDashboard from './pages/admin/AgendaTemplatesDashboard'
import SettingsDashboard from './pages/admin/SettingsDashboard'
import ClassesDashboard from './pages/admin/ClassesDashboard.jsx'
import ProcessSurveysDashboard from './pages/admin/ProcessSurveysDashboard'

// CRM Pages
import CrmDashboard from './pages/admin/CrmDashboard'
import CrmSatisfactionDashboard from './pages/admin/CrmSatisfactionDashboard'
import CrmPublicationCreate from './pages/admin/CrmPublicationCreate'
import CrmClientsDashboard from './pages/admin/CrmClientsDashboard'
import CrmReportsDashboard from './pages/admin/CrmReportsDashboard'
import CrmClientCreate from './pages/admin/CrmClientCreate'
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
import ChatGptWorkBrochure from './pages/public/ChatGptWorkBrochure'
import EventFeedback from './pages/public/EventFeedback'

// CRM Public Shared Portal
import CrmClientPortal from './pages/public/CrmClientPortal'
import CrmProposalLanding from './pages/public/CrmProposalLanding'
import GmpObrasProposal from './pages/public/GmpObrasProposal'
import CoworkerAttendance from './pages/public/CoworkerAttendance'
import ProcessSurveyPublic from './pages/public/ProcessSurveyPublic'

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
          <Route path="eventos/:id/satisfaccion" element={<EventSatisfaction />} />
          <Route path="eventos/:id/reporte" element={<EventReport />} />
          <Route path="plantillas" element={<AgendaTemplatesDashboard />} />
          <Route path="configuracion" element={<SettingsDashboard />} />
          <Route path="clases" element={<ClassesDashboard />} />
          
          {/* CRM Private Routes */}
          <Route path="crm" element={<CrmDashboard />} />
          <Route path="crm/publicacion/nueva" element={<CrmPublicationCreate />} />
          <Route path="crm/publicacion/:id/editar" element={<CrmPublicationCreate />} />
          <Route path="crm/presentaciones" element={<CrmPresentationsDashboard />} />
          <Route path="crm/presentaciones/nueva" element={<CrmPresentationEditor />} />
          <Route path="crm/presentaciones/:id/editar" element={<CrmPresentationEditor />} />
          <Route path="crm/presentaciones/:id/presentar" element={<CrmPresentationPlayer />} />

          {/* Clientes */}
          <Route path="clientes" element={<CrmClientsDashboard />} />
          <Route path="clientes/nuevo" element={<CrmClientCreate />} />
          <Route path="clientes/:id/editar" element={<CrmClientCreate />} />
          <Route path="reportes-clientes" element={<CrmReportsDashboard />} />

          {/* Presupuestos (Back Office) */}
          <Route path="presupuestos" element={<CrmProposalsDashboard />} />
          <Route path="presupuestos/nuevo" element={<CrmProposalCreate />} />
          <Route path="presupuestos/:id/editar" element={<CrmProposalCreate />} />

          {/* Relevamiento de Procesos (IA & Optimización) */}
          <Route path="procesos" element={<ProcessSurveysDashboard />} />
        </Route>

        {/* Public Participant Routes */}
        <Route path="/evento/:slug" element={<EventLanding />} />
        <Route path="/evento/:slug/inscripcion" element={<EventRegister />} />
        <Route path="/evento/:slug/confirmacion" element={<EventConfirmation />} />
        <Route path="/evento/:slug/asistencia" element={<AttendanceCheck />} />
        <Route path="/asistencia/:slug" element={<AttendanceCheck />} />
        <Route path="/evento/:slug/inscritos" element={<EventParticipantsPublic />} />
        <Route path="/brochure/chatgpt-work" element={<ChatGptWorkBrochure />} />
        <Route path="/evento/:slug/reporte" element={<EventReport isPublic={true} />} />
        <Route path="/encuesta/:slug" element={<EventFeedback />} />
        <Route path="/presentacion/:id" element={<CrmPresentationPlayer isPublic={true} />} />

        {/* CRM Client Shared Route */}
        <Route path="/crm/cliente/:token/:slug?" element={<CrmClientPortal />} />
        <Route path="/presupuesto/2026-09-gmp-obras-v01" element={<GmpObrasProposal />} />
        <Route path="/presupuesto/:token" element={<CrmProposalLanding />} />
        <Route path="/clase/:token/asistencia" element={<CoworkerAttendance />} />

        {/* Relevamiento de Procesos Public Route */}
        <Route path="/relevamiento-proceso" element={<ProcessSurveyPublic />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
