import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import '../index.css'
import AgentsEventPage from '../pages/public/AgentsEventPage'
import AdminLayout from '../layouts/AdminLayout'
import EventsDashboard from '../pages/admin/EventsDashboard'
import { useStore } from '../store/useStore'
import { AGENTS_EVENT_SLUG } from '../lib/agentsEvent'

const event = { id: 'd9962e70-4b7a-44be-b6f3-20151c810bdb', slug: AGENTS_EVENT_SLUG, title: 'Agentes de inteligencia artificial en ciencias económicas', type: 'charla', status: 'draft', event_date: '2026-11-21', start_time: '14:30', duration_minutes: 40, organizer: 'Comisión de Jóvenes Profesionales · CPCE Chubut', coordinator: 'Lic. Leandro Velasques', location: 'Comodoro Rivadavia', registrations_open: false, is_public: false, total_registered: 0 }
const events = [event,
  { id: 'preview-oa', title: 'Introducción a la inteligencia artificial', organizer: 'Oficina Anticorrupción del Chubut', event_date: '2026-11-12', start_time: '10:00', status: 'completed', type: 'taller', total_registered: 24, present: 22, is_public: false },
  { id: 'preview-workshop', title: 'ChatGPT Work: de 0 a 100 · Noviembre 2026', organizer: 'Lic. Leandro Velasques', event_date: '2026-11-11', start_time: '14:00', status: 'cancelled', type: 'taller', total_registered: 0, is_public: false },
  { id: 'preview-cpce', title: 'ChatGPT Work: de 0 a 100', organizer: 'CPCE Chubut', event_date: '2026-09-24', start_time: '14:00', status: 'completed', type: 'taller', total_registered: 31, present: 28, is_public: true },
  { id: 'preview-ethics', title: 'Los nuevos desafíos éticos de la IA', organizer: 'Facultad de Ciencias Económicas', event_date: '2026-05-27', start_time: '20:00', status: 'completed', type: 'charla', total_registered: 48, present: 39, is_public: true },
]
useStore.setState({ events, user: { name: 'Lic. Leandro Velasques', email: 'Vista previa de diseño' }, isLoading: false, fetchEventsWithStats: async () => {}, agendaTemplates: [], fetchAgendaTemplates: async () => {}, crmPresentations: [], fetchCrmPresentations: async () => {} })
const view = new URLSearchParams(window.location.search).get('view') || 'landing'
const toolbar = <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '10px 24px', background: '#091d47', color: '#fff', fontSize: 12 }} aria-label="Vistas de la propuesta"><strong>Propuesta para revisar</strong><a href="/preview.html?view=landing">Página del evento</a><a href="/preview.html?view=registration">Formulario</a><a href="/preview.html?view=dashboard">Gestor de eventos</a><a href="http://localhost:4181/#novedades">Novedades</a></nav>
createRoot(document.getElementById('root')).render(<BrowserRouter>{toolbar}{view === 'dashboard' ? <><div className="ae-preview-banner">Vista previa del gestor · Los números de los eventos anteriores son ejemplos de diseño.</div><Routes><Route element={<AdminLayout />}><Route path="*" element={<EventsDashboard />} /></Route></Routes></> : <AgentsEventPage event={event} registration={view === 'registration'} preview />}</BrowserRouter>)
