import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  events: [],
  currentEvent: null,
  registrations: [],
  participants: [],
  attendance: [],
  certificates: [],
  proposals: [],

  // Auth
  login: async (email, password) => {
    set({ isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      set({ isLoading: false })
      return { success: false, error: 'Credenciales inválidas' }
    }

    set({ user: data.user, isAuthenticated: true, isLoading: false })
    return { success: true }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false, events: [], registrations: [], participants: [], attendance: [], certificates: [] })
  },

  checkSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      set({ user: session.user, isAuthenticated: true })
      return true
    }
    return false
  },

  // Events
  fetchEvents: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
    
    if (!error) set({ events: data || [] })
    set({ isLoading: false })
  },

  fetchEventsWithStats: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('event_stats')
      .select('*')
      .order('event_date', { ascending: false })
    
    if (!error) {
      const formatted = data.map(d => ({
        ...d,
        id: d.event_id,
      }))
      set({ events: formatted })
    }
    set({ isLoading: false })
  },

  setCurrentEvent: (event) => set({ currentEvent: event }),

  getEventById: async (id) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_materials(*)')
      .eq('id', id)
      .single()
    return data
  },

  getEventBySlug: async (slug) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_materials(*)')
      .or(`slug.eq.${slug},private_link_token.eq.${slug}`)
      .single()
    return data
  },

  createEvent: async (eventData) => {
    const slug = eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        slug,
        status: 'draft',
      }])
      .select()
      .single()

    if (!error) {
      set(state => ({ events: [data, ...state.events] }))
      return { success: true, data }
    }
    console.error("Supabase Error creating event:", error)
    return { success: false, error }
  },

  updateEvent: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('events')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      set(state => ({
        events: state.events.map(e => e.id === id ? updated : e),
        currentEvent: state.currentEvent?.id === id ? updated : state.currentEvent
      }))
      return { success: true, data: updated }
    }
    console.error("Supabase Error updating event:", error)
    return { success: false, error }
  },

  deleteEvent: async (id) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (!error) {
      set(state => ({ events: state.events.filter(e => e.id !== id) }))
    }
  },

  publishEvent: async (id) => {
    const attendanceToken = 'att-' + Math.random().toString(36).substring(2, 10)
    await get().updateEvent(id, {
      status: 'published',
      attendance_link_token: attendanceToken
    })
  },

  // Registrations & Participants
  fetchEventData: async (eventId) => {
    set({ isLoading: true })
    const { data: regs, error: rErr } = await supabase
      .from('registrations')
      .select('*, participants(*)')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false })
    
    if (rErr) {
      set({ isLoading: false })
      return
    }

    const regIds = (regs || []).map(r => r.id)
    
    if (regIds.length > 0) {
      const { data: attn, error: aErr } = await supabase
        .from('attendance')
        .select('*')
        .in('registration_id', regIds)

      const { data: certs, error: cErr } = await supabase
        .from('certificates')
        .select('*')
        .in('registration_id', regIds)

      if (!aErr) set({ attendance: attn || [] })
      if (!cErr) set({ certificates: certs || [] })
    } else {
      set({ attendance: [], certificates: [] })
    }

    set({ registrations: regs || [] })
    set({ isLoading: false })
  },

  fetchRegistrationsByEvent: async (eventId) => {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, participants(*)')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false })

    if (!error) {
      const formatted = data.map(r => ({
        ...r,
        participant: r.participants
      }))
      set({ registrations: formatted })
      return formatted
    }
    return []
  },

  addParticipantManual: async (eventId, participantData) => {
    const { attendance_mode = 'presencial', ...pData } = participantData
    // 1. Check/Create Participant
    let participantId
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('email', pData.email)
      .maybeSingle()

    if (existing) {
      participantId = existing.id
      await supabase.from('participants').update(pData).eq('id', participantId)
    } else {
      const { data: novel } = await supabase
        .from('participants')
        .insert([pData])
        .select()
        .single()
      participantId = novel.id
    }

    // 2. Create Registration
    const { data: registration, error } = await supabase
      .from('registrations')
      .insert([{
        event_id: eventId,
        participant_id: participantId,
        source: 'manual',
        status: 'registered',
        attendance_mode
      }])
      .select('*, participants(*)')
      .single()

    if (!error) {
      const formatted = { ...registration, participant: registration.participants }
      set(state => ({ registrations: [formatted, ...state.registrations] }))
      return formatted
    }
    return null
  },

  updateParticipantManual: async (participantId, data) => {
    const { registrationId, attendance_mode, ...pData } = data
    const { data: updated, error } = await supabase
      .from('participants')
      .update(pData)
      .eq('id', participantId)
      .select()
      .single()

    if (!error) {
      if (attendance_mode && registrationId) {
        await supabase
          .from('registrations')
          .update({ attendance_mode })
          .eq('id', registrationId)
      }
      set(state => ({
        registrations: state.registrations.map(r => 
          r.participants?.id === participantId 
            ? { ...r, participants: updated, attendance_mode: attendance_mode || r.attendance_mode } 
            : r
        )
      }))
      return updated
    }
    return null
  },

  deleteRegistration: async (registrationId) => {
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId)

    if (!error) {
      set(state => ({
        registrations: state.registrations.filter(r => r.id !== registrationId)
      }))
      return true
    }
    return false
  },

  selfRegister: async (eventSlug, participantData) => {
    const event = await get().getEventBySlug(eventSlug)
    if (!event) return { success: false, error: 'Evento no encontrado' }
    if (!['published', 'in_progress'].includes(event.status)) return { success: false, error: 'Este evento no está disponible' }

    const { attendance_mode = 'presencial', survey_responses = null, ...pData } = participantData

    // Check capacity for chosen modality
    const maxCap = attendance_mode === 'presencial' ? event.max_capacity_presencial : event.max_capacity_virtual;
    if (maxCap !== null && maxCap !== undefined && maxCap !== '') {
      const { count, error: countErr } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('attendance_mode', attendance_mode)
        .neq('status', 'cancelled')
      
      if (!countErr && count >= Number(maxCap)) {
        return { success: false, error: `Disculpas, los cupos para la modalidad ${attendance_mode} están agotados.` }
      }
    }

    // 1. Participant
    let participantId
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('email', pData.email)
      .maybeSingle()

    if (existing) {
      participantId = existing.id
      await supabase.from('participants').update(pData).eq('id', participantId)
    } else {
      const { data: novel, error: pErr } = await supabase
        .from('participants')
        .insert([pData])
        .select()
        .single()
      if (pErr) return { success: false, error: 'Error al registrar datos' }
      participantId = novel.id
    }

    // 2. Registration
    const { data: registration, error: rErr } = await supabase
      .from('registrations')
      .insert([{
        event_id: event.id,
        participant_id: participantId,
        source: 'self_registration',
        status: 'confirmed',
        attendance_mode,
        survey_responses
      }])
      .select()
      .single()

    if (rErr) {
      if (rErr.code === '23505') return { success: false, error: 'Ya estás inscripto en este evento' }
      return { success: false, error: 'Error al procesar la inscripción' }
    }

    return { success: true, registration, participant: pData }
  },

  // Attendance
  fetchAttendanceByEvent: async (eventId) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, registrations(*, participants(*))')
      .order('marked_at', { ascending: false })
    
    // Filtro manual porque el JOIN es complejo
    const filtered = data?.filter(a => a.registrations.event_id === eventId) || []
    set({ attendance: filtered })
    return filtered
  },

  markAttendance: async (registrationId, status, markedBy = 'admin') => {
    // We first try to find if there's already an attendance record for this registration
    // This is safer than relying on upsert with null session_id
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('registration_id', registrationId)
      .maybeSingle()

    let query
    if (existing) {
      query = supabase
        .from('attendance')
        .update({
          status,
          marked_by: markedBy,
          marked_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      query = supabase
        .from('attendance')
        .insert([{
          registration_id: registrationId,
          status,
          marked_by: markedBy,
          marked_at: new Date().toISOString()
        }])
    }

    const { data, error } = await query.select().single()

    if (!error && data) {
      set(state => ({
        attendance: state.attendance.some(a => a.registration_id === registrationId)
          ? state.attendance.map(a => a.registration_id === registrationId ? data : a)
          : [data, ...state.attendance]
      }))
    }
  },

  // Certificates
  fetchCertificatesByEvent: async (eventId) => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, registrations!inner(*)')
      .eq('registrations.event_id', eventId)

    if (!error) {
      set({ certificates: data })
      return data
    }
    return []
  },

  // Stats (Using the View if possible, or manual)
  getEventStats: async (eventId) => {
    const { data, error } = await supabase
      .from('event_stats')
      .select('*')
      .eq('event_id', eventId)
      .single()
    
    if (error || !data) {
      return {
        totalRegistered: 0,
        confirmed: 0,
        present: 0,
        absent: 0,
        certificatesSent: 0,
        certificatesPending: 0
      }
    }

    return {
      totalRegistered: data.total_registered,
      confirmed: data.confirmed,
      present: data.present,
      absent: data.absent,
      certificatesSent: data.certificates_sent,
      certificatesPending: data.certificates_pending
    }
  },

  // Materials
  saveMaterials: async (eventId, materials) => {
    // Delete existing materials for this event
    await supabase.from('event_materials').delete().eq('event_id', eventId)
    
    // Insert new materials
    if (materials.length > 0) {
      const { data, error } = await supabase
        .from('event_materials')
        .insert(materials.map(m => ({ ...m, event_id: eventId })))
      return { success: !error, data, error }
    }
    return { success: true }
  },

  // Proposals / Budgets
  fetchProposals: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('crm_proposals')
      .select('*, crm_clients(*)')
      .order('created_at', { ascending: false })
    
    if (!error) {
      set({ proposals: data || [] })
    }
    set({ isLoading: false })
    return data || []
  },

  fetchProposalByToken: async (token) => {
    const { data, error } = await supabase
      .from('crm_proposals')
      .select('*, crm_clients(*)')
      .eq('share_token', token)
      .maybeSingle()
    return data
  },

  createProposal: async (proposalData) => {
    const { data, error } = await supabase
      .from('crm_proposals')
      .insert([proposalData])
      .select()
      .single()
    
    if (!error && data) {
      set(state => ({ proposals: [data, ...state.proposals] }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  updateProposal: async (id, proposalData) => {
    const { data, error } = await supabase
      .from('crm_proposals')
      .update(proposalData)
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      // Re-fetch all or update state manually with client info preserved
      set(state => ({
        proposals: state.proposals.map(p => p.id === id ? { ...p, ...data } : p)
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  deleteProposal: async (id) => {
    const { error } = await supabase
      .from('crm_proposals')
      .delete()
      .eq('id', id)
    
    if (!error) {
      set(state => ({
        proposals: state.proposals.filter(p => p.id !== id)
      }))
      return { success: true }
    }
    return { success: false, error }
  },
}))
