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
  proposals: [],
  agendaTemplates: [],
  crmClients: [],
  students: [],
  recurringClasses: [],
  classSessions: [],
  classAttendance: [],

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
    const { attendance_mode = 'presencial', selected_date = null, ...pData } = participantData
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
        attendance_mode,
        selected_date
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
    const { registrationId, attendance_mode, selected_date, status, ...pData } = data
    const { data: updated, error } = await supabase
      .from('participants')
      .update(pData)
      .eq('id', participantId)
      .select()
      .single()

    if (!error) {
      if (registrationId && (attendance_mode || selected_date || status)) {
        const updateObj = {}
        if (attendance_mode) updateObj.attendance_mode = attendance_mode
        if (selected_date) updateObj.selected_date = selected_date
        if (status) updateObj.status = status
        await supabase
          .from('registrations')
          .update(updateObj)
          .eq('id', registrationId)
      }
      set(state => ({
        registrations: state.registrations.map(r => 
          r.participants?.id === participantId 
            ? { 
                ...r, 
                participants: updated, 
                attendance_mode: attendance_mode || r.attendance_mode,
                selected_date: selected_date || r.selected_date,
                status: status || r.status
              } 
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

    const { attendance_mode = 'presencial', selected_date = null, survey_responses = null, payment_receipt_url = null, ...pData } = participantData

    // Check capacity for chosen modality and selected date
    const maxCap = attendance_mode === 'presencial' ? event.max_capacity_presencial : event.max_capacity_virtual;
    if (maxCap !== null && maxCap !== undefined && maxCap !== '') {
      const query = supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('attendance_mode', attendance_mode)
        .neq('status', 'cancelled')
      
      if (selected_date) {
        query.eq('selected_date', selected_date)
      }

      const { count, error: countErr } = await query
      
      if (!countErr && count >= Number(maxCap)) {
        return { success: false, error: `Disculpas, los cupos para la modalidad ${attendance_mode} están agotados para la fecha seleccionada.` }
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
        selected_date,
        survey_responses,
        payment_receipt_url
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

  // CRM Clients
  fetchCrmClients: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error && data) {
      set({ crmClients: data })
    }
    set({ isLoading: false })
    return data || []
  },

  createCrmClient: async (clientData) => {
    const { data, error } = await supabase
      .from('crm_clients')
      .insert([clientData])
      .select()
      .single()
    
    if (!error && data) {
      set(state => ({ crmClients: [...state.crmClients, data].sort((a, b) => a.name.localeCompare(b.name)) }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  updateCrmClient: async (id, clientData) => {
    const { data, error } = await supabase
      .from('crm_clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      set(state => ({
        crmClients: state.crmClients.map(c => c.id === id ? data : c)
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  deleteCrmClient: async (id) => {
    const { error } = await supabase
      .from('crm_clients')
      .delete()
      .eq('id', id)
    
    if (!error) {
      set(state => ({
        crmClients: state.crmClients.filter(c => c.id !== id)
      }))
      return { success: true }
    }
    return { success: false, error }
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

  fetchCrmClients: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error) {
      set({ crmClients: data || [] })
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

  // Agenda Templates Actions
  fetchAgendaTemplates: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('agenda_templates')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error && data) {
      set({ agendaTemplates: data })
    }
    set({ isLoading: false })
    return data || []
  },

  createAgendaTemplate: async (templateData) => {
    const { data, error } = await supabase
      .from('agenda_templates')
      .insert([templateData])
      .select()
      .single()
    
    if (!error && data) {
      set(state => ({ agendaTemplates: [...state.agendaTemplates, data].sort((a, b) => a.name.localeCompare(b.name)) }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  updateAgendaTemplate: async (id, templateData) => {
    const { data, error } = await supabase
      .from('agenda_templates')
      .update(templateData)
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      set(state => ({
        agendaTemplates: state.agendaTemplates.map(t => t.id === id ? data : t)
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  deleteAgendaTemplate: async (id) => {
    const { error } = await supabase
      .from('agenda_templates')
      .delete()
      .eq('id', id)
    
    if (!error) {
      set(state => ({
        agendaTemplates: state.agendaTemplates.filter(t => t.id !== id)
      }))
      return { success: true }
    }
    return { success: false, error }
  },

  // Students Actions
  fetchStudents: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('first_name', { ascending: true })
    if (!error && data) {
      set({ students: data })
    }
    set({ isLoading: false })
    return data || []
  },

  createStudent: async (studentData, enrollmentClassIds = []) => {
    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select()
      .single()
    if (!error && data) {
      // Create enrollments
      if (enrollmentClassIds.length > 0) {
        const enrolls = enrollmentClassIds.map(classId => ({
          class_id: classId,
          student_id: data.id
        }))
        await supabase.from('class_enrollments').insert(enrolls)
      }
      // update state
      set(state => ({
        students: [...state.students, data].sort((a, b) => a.first_name.localeCompare(b.first_name))
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  updateStudent: async (id, studentData, enrollmentClassIds = null) => {
    const { data, error } = await supabase
      .from('students')
      .update(studentData)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      if (enrollmentClassIds !== null) {
        // Delete existing and insert new
        await supabase.from('class_enrollments').delete().eq('student_id', id)
        if (enrollmentClassIds.length > 0) {
          const enrolls = enrollmentClassIds.map(classId => ({
            class_id: classId,
            student_id: id
          }))
          await supabase.from('class_enrollments').insert(enrolls)
        }
      }
      set(state => ({
        students: state.students.map(s => s.id === id ? data : s)
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  deleteStudent: async (id) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
    if (!error) {
      set(state => ({
        students: state.students.filter(s => s.id !== id)
      }))
      return { success: true }
    }
    return { success: false, error }
  },

  // Recurring Classes Actions
  fetchRecurringClasses: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('recurring_classes')
      .select('*, class_enrollments(*, students(*))')
      .order('name', { ascending: true })
    if (!error && data) {
      set({ recurringClasses: data })
    }
    set({ isLoading: false })
    return data || []
  },

  createRecurringClass: async (classData) => {
    const { data, error } = await supabase
      .from('recurring_classes')
      .insert([classData])
      .select()
      .single()
    if (!error && data) {
      const formatted = { ...data, class_enrollments: [] }
      set(state => ({
        recurringClasses: [...state.recurringClasses, formatted].sort((a, b) => a.name.localeCompare(b.name))
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  updateRecurringClass: async (id, classData) => {
    const { data, error } = await supabase
      .from('recurring_classes')
      .update(classData)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      set(state => ({
        recurringClasses: state.recurringClasses.map(c => c.id === id ? { ...c, ...data } : c)
      }))
      return { success: true, data }
    }
    return { success: false, error }
  },

  deleteRecurringClass: async (id) => {
    const { error } = await supabase
      .from('recurring_classes')
      .delete()
      .eq('id', id)
    if (!error) {
      set(state => ({
        recurringClasses: state.recurringClasses.filter(c => c.id !== id)
      }))
      return { success: true }
    }
    return { success: false, error }
  },

  // Attendance Actions
  getOrCreateClassSession: async (classId, dateStr) => {
    const { data: existing, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('session_date', dateStr)
      .maybeSingle()
    
    if (existing) return existing
    
    const { data: created, error: createError } = await supabase
      .from('class_sessions')
      .insert([{ class_id: classId, session_date: dateStr }])
      .select()
      .single()
    
    if (createError) {
      console.error("Error creating session:", createError)
    }
    return created
  },

  fetchClassAttendance: async (sessionId) => {
    const { data, error } = await supabase
      .from('class_attendance')
      .select('*')
      .eq('session_id', sessionId)
    return data || []
  },

  saveClassAttendance: async (sessionId, attendanceList) => {
    const { error: delError } = await supabase
      .from('class_attendance')
      .delete()
      .eq('session_id', sessionId)
    
    if (delError) {
      console.error("Error clearing old attendance:", delError)
      return { success: false, error: delError }
    }
    
    if (attendanceList.length > 0) {
      const records = attendanceList.map(a => ({
        session_id: sessionId,
        student_id: a.student_id,
        status: a.status,
        marked_by: 'admin'
      }))
      const { error: insError } = await supabase
        .from('class_attendance')
        .insert(records)
      
      if (insError) {
        console.error("Error inserting attendance:", insError)
        return { success: false, error: insError }
      }
    }
    return { success: true }
  },

  fetchMonthlyClassReport: async (classId, year, month) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: sessions, error: sError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: true })

    if (sError) return { sessions: [], attendanceMap: {} }

    if (!sessions || sessions.length === 0) {
      return { sessions: [], attendanceMap: {} }
    }

    const sessionIds = sessions.map(s => s.id)
    const { data: attendance, error: aError } = await supabase
      .from('class_attendance')
      .select('*')
      .in('session_id', sessionIds)

    if (aError) return { sessions, attendanceMap: {} }

    const attendanceMap = {}
    attendance.forEach(att => {
      if (!attendanceMap[att.student_id]) {
        attendanceMap[att.student_id] = {}
      }
      attendanceMap[att.student_id][att.session_id] = att.status
    })

    return { sessions, attendanceMap }
  }
}))

