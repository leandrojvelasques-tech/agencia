import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

const BILLING_LABELS = {
  por_clase: { label: 'Por Clase', color: 'blue' },
  frecuente: { label: 'Frecuente', color: 'orange' },
  pago_mensual: { label: 'Pago Mensual', color: 'emerald' },
}

// Helper to get initials and color for avatar
const getAvatarProps = (firstName, lastName) => {
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  const charSum = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  const hue = charSum % 360
  return {
    initials,
    style: {
      backgroundColor: `hsl(${hue}, 45%, 45%)`,
      color: '#fff'
    }
  }
}

export default function CoworkerAttendance() {
  const { token } = useParams()
  const {
    fetchClassByShareToken,
    fetchClassAttendance,
    fetchClassSession,
    saveClassAttendance,
  } = useStore()

  // Class and Session State
  const [currentClass, setCurrentClass] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceList, setAttendanceList] = useState([])
  const [sessionNotes, setSessionNotes] = useState('')

  // UI State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [successOverlay, setSuccessOverlay] = useState(false)

  // Search casual students state
  const [allActiveStudents, setAllActiveStudents] = useState([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentSearchResults, setStudentSearchResults] = useState([])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getClosestDateForDayOfWeek = (targetDayOfWeek) => {
    const today = new Date()
    const currentDay = today.getDay()
    const diff = (currentDay - targetDayOfWeek + 7) % 7
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() - diff)
    return targetDate.toISOString().split('T')[0]
  }

  const handleDateChange = (dateVal) => {
    if (currentClass) {
      const [year, month, day] = dateVal.split('-').map(Number)
      const dateObj = new Date(year, month - 1, day)
      const dateDayOfWeek = dateObj.getDay()

      if (dateDayOfWeek !== currentClass.day_of_week) {
        const scheduledDayName = DAYS_OF_WEEK.find(d => d.value === currentClass.day_of_week)?.label
        const selectedDayName = DAYS_OF_WEEK.find(d => d.value === dateDayOfWeek)?.label
        
        const confirmChange = window.confirm(
          `Esta clase está programada para los días [${scheduledDayName}].\n` +
          `Has seleccionado un día [${selectedDayName}].\n\n` +
          `¿Estás seguro de que deseas registrar la asistencia en esta fecha?`
        )
        if (!confirmChange) {
          return
        }
      }
    }
    setSelectedDate(dateVal)
  }

  // Load Class details on mount
  useEffect(() => {
    if (token) {
      loadClassData()
      loadAllActiveStudents()
    }
  }, [token])

  // Default date to closest matching day of week when class loads
  useEffect(() => {
    if (currentClass) {
      const defaultDate = getClosestDateForDayOfWeek(currentClass.day_of_week)
      setSelectedDate(defaultDate)
    }
  }, [currentClass])

  // Load attendance whenever date or class is loaded
  useEffect(() => {
    if (currentClass && selectedDate) {
      loadAttendanceData()
    }
  }, [currentClass, selectedDate])

  const loadClassData = async () => {
    setLoading(true)
    try {
      const cls = await fetchClassByShareToken(token)
      if (cls) {
        setCurrentClass(cls)
      } else {
        showToast('Clase no encontrada o token inválido', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Error al cargar datos de la clase', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load all active students for casual search
  const loadAllActiveStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('first_name', { ascending: true })
      if (!error && data) {
        setAllActiveStudents(data)
      }
    } catch (err) {
      console.error('Error loading active students:', err)
    }
  }

  const loadAttendanceData = async () => {
    if (!currentClass) return
    try {
      setLoading(true)
      // 1. Fetch class session (do not auto-create in db)
      const session = await fetchClassSession(currentClass.id, selectedDate)
      setCurrentSession(session || null)
      setSessionNotes(session?.notes || '')

      // 2. Fetch marked attendance for this session if it exists
      let markedMap = {}
      if (session) {
        const marked = await fetchClassAttendance(session.id)
        marked.forEach(a => {
          markedMap[a.student_id] = a.status
        })
      }

      // 3. Find stable students enrolled in this class
      const enrolledStudents = currentClass.class_enrollments?.map(ce => ce.students) || []

      // 4. Merge: if session exists, default unmarked to 'absent'; if new date, default to '' (unmarked)
      const defaultStatus = session ? 'absent' : ''
      const merged = enrolledStudents.map(student => {
        if (!student) return null
        return {
          student,
          status: markedMap[student.id] || defaultStatus
        }
      }).filter(Boolean)

      // Add students who are not enrolled but have attendance records for this session
      const enrolledIds = new Set(enrolledStudents.map(s => s?.id).filter(Boolean))
      const otherAttended = allActiveStudents.filter(s => markedMap[s.id] && !enrolledIds.has(s.id))
      otherAttended.forEach(student => {
        merged.push({
          student,
          status: markedMap[student.id]
        })
      })

      setAttendanceList(merged)
    } catch (err) {
      console.error(err)
      showToast('Error al cargar planilla de asistencia', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle student search
  useEffect(() => {
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase()
      const currentIds = new Set(attendanceList.map(a => a.student.id))
      const filtered = allActiveStudents.filter(s => 
        !currentIds.has(s.id) &&
        (`${s.first_name} ${s.last_name}`).toLowerCase().includes(q)
      )
      setStudentSearchResults(filtered)
    } else {
      setStudentSearchResults([])
    }
  }, [studentSearchQuery, attendanceList, allActiveStudents])

  const handleAddCasualStudent = (student) => {
    setAttendanceList(prev => [...prev, { student, status: 'present' }])
    setStudentSearchQuery('')
    setStudentSearchResults([])
    showToast(`${student.first_name} agregado a la asistencia de hoy`)
  }

  const handleUpdateStatus = (studentId, status) => {
    setAttendanceList(prev => 
      prev.map(item => item.student.id === studentId ? { ...item, status } : item)
    )
  }

  const handleSaveAttendance = async () => {
    if (!currentClass) return
    setSaving(true)
    try {
      const records = attendanceList.map(a => ({
        student_id: a.student.id,
        status: a.status || 'absent'
      }))

      const res = await saveClassAttendance(currentClass.id, selectedDate, sessionNotes, records)
      if (res.success) {
        setCurrentSession(res.session)
        setSuccessOverlay(true)
        setTimeout(() => setSuccessOverlay(false), 2500)
      } else {
        throw new Error(res.error?.message)
      }
    } catch (err) {
      console.error(err)
      showToast('Error al guardar asistencia: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !currentClass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)] p-6">
        <div className="text-center animate-pulse">
          <p className="font-heading text-lg font-bold text-[var(--color-deep-green)] tracking-widest">
            CARGANDO CLASE...
          </p>
        </div>
      </div>
    )
  }

  if (!currentClass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-refined-gray)] p-6">
        <div className="card max-w-md w-full p-8 text-center bg-white shadow-lg">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block font-light">error</span>
          <h2 className="text-xl font-bold text-[var(--color-dark-gray)]">Enlace Inválido</h2>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-2">
            El link que estás usando no pertenece a ninguna clase activa. Pide a Leandro que te comparta el enlace correcto de la clase.
          </p>
        </div>
      </div>
    )
  }

  const dayOfWeekLabel = DAYS_OF_WEEK.find(d => d.value === currentClass.day_of_week)?.label

  return (
    <div className="min-h-screen bg-[var(--color-refined-gray)] py-6 px-4 pb-20 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 z-50 px-6 py-3 rounded-premium shadow-lg border transition-all duration-300 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {successOverlay && (
        <div className="fixed inset-0 z-50 bg-[var(--color-deep-green)]/95 flex flex-col items-center justify-center text-white p-6 animate-fade-in">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20 shadow-inner scale-up-center">
            <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight">¡Planilla Guardada!</h2>
          <p className="text-sm text-white/70 mt-1.5 text-center">La asistencia ha sido registrada en el sistema.</p>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Class Header Card */}
        <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-deep-green)] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-[var(--color-deep-green)] text-lg leading-snug">
                {currentClass.name}
              </h1>
              <p className="text-xs text-[var(--color-dark-gray)]/50 font-bold uppercase tracking-wider mt-0.5">
                {dayOfWeekLabel} · {currentClass.start_time.substring(0, 5)}hs a {currentClass.end_time.substring(0, 5)}hs
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[var(--color-dark-gray)]/70">
            <span>Profesor: <strong>{currentClass.instructor}</strong></span>
            <span>Clase Recurrente</span>
          </div>
        </div>

        {/* Date Selector */}
        <div className="card p-4 bg-white border border-[var(--color-deep-green)]/5 shadow-sm">
          <label className="block text-[11px] font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-2">Fecha de la Clase</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => handleDateChange(e.target.value)}
            className="w-full text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-3 text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
          />
        </div>

        {/* Attendance Area */}
        {currentSession?.status === 'suspended' ? (
          <div className="card p-8 text-center bg-red-50/50 border border-red-200/50 flex flex-col items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-3 block font-light">pause_circle</span>
            <p className="text-base font-bold text-red-800">Clase Suspendida</p>
            <p className="text-xs text-red-700/80 mt-1.5 max-w-xs leading-relaxed">
              Leandro marcó esta clase como suspendida. No es necesario tomar asistencia hoy.
            </p>
            {sessionNotes && (
              <div className="mt-4 p-3 bg-white rounded-premium border border-red-100 w-full text-left">
                <p className="text-[10px] font-bold text-[var(--color-dark-gray)]/50 uppercase tracking-wider">Motivo:</p>
                <p className="text-xs font-semibold text-[var(--color-dark-gray)] mt-0.5">{sessionNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-5 bg-white border border-[var(--color-deep-green)]/5 shadow-md">
            <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-bold text-[var(--color-deep-green)] uppercase tracking-wider">Lista de Asistencia</h2>
            <span className="text-[10px] font-bold text-[var(--color-dark-gray)]/50 bg-[var(--color-refined-gray)] px-2 py-0.5 rounded-full">
              {attendanceList.length} Alumnos
            </span>
          </div>

          {/* Quick Add Casual Student Search */}
          <div className="relative mb-5">
            <div className="flex items-center gap-2 bg-[var(--color-refined-gray)]/60 rounded-[var(--radius-premium)] px-3.5 py-2 border border-[var(--color-deep-green)]/5">
              <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">person_add</span>
              <input
                type="text"
                placeholder="Agregar alumno no habitual..."
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-[var(--color-dark-gray)]/30 text-[var(--color-dark-gray)]"
              />
            </div>

            {studentSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-premium shadow-lg z-20 max-h-48 overflow-y-auto">
                {studentSearchResults.map(s => {
                  const avProps = getAvatarProps(s.first_name, s.last_name)
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleAddCasualStudent(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-refined-gray)] flex items-center gap-2.5 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={avProps.style}>
                          {avProps.initials}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-dark-gray)]">{s.first_name} {s.last_name}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {attendanceList.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-dark-gray)]/40 text-xs">
              <span className="material-symbols-outlined text-3xl block mb-2 font-light">group</span>
              No hay alumnos habituales asociados a esta clase.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {attendanceList.map(item => {
                const avProps = getAvatarProps(item.student.first_name, item.student.last_name)
                return (
                  <div key={item.student.id} className="py-3 flex flex-col gap-2.5">
                    {/* Student Info */}
                    <div className="flex items-center gap-2.5">
                      {item.student.photo_url ? (
                        <img src={item.student.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm" style={avProps.style}>
                          {avProps.initials}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-dark-gray)] leading-tight">
                          {item.student.first_name} {item.student.last_name}
                        </h4>
                        <span className={`text-[9px] font-bold uppercase tracking-wider text-${BILLING_LABELS[item.student.billing_type]?.color || 'gray'}-600`}>
                          {BILLING_LABELS[item.student.billing_type]?.label || item.student.billing_type}
                        </span>
                      </div>
                    </div>

                    {/* 3-State Toggle Switch Buttons */}
                    <div className="flex items-center gap-1 bg-[var(--color-refined-gray)] p-0.5 rounded-[var(--radius-premium)] w-full">
                      <button
                        onClick={() => handleUpdateStatus(item.student.id, 'present')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[var(--radius-premium)] text-[11px] font-bold transition-all ${
                          item.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-[var(--color-dark-gray)]/50 hover:text-[var(--color-dark-gray)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>Presente</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.student.id, 'late')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[var(--radius-premium)] text-[11px] font-bold transition-all ${
                          item.status === 'late'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-[var(--color-dark-gray)]/50 hover:text-[var(--color-dark-gray)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>Tarde</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.student.id, 'absent')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[var(--radius-premium)] text-[11px] font-bold transition-all ${
                          item.status === 'absent'
                            ? 'bg-red-50 text-red-500 shadow-sm border border-red-100' // or solid red
                            : 'text-[var(--color-dark-gray)]/50 hover:text-[var(--color-dark-gray)]'
                        }`}
                        // Let's use red background if absent for higher visibility on mobile
                        style={item.status === 'absent' ? { backgroundColor: '#ef4444', color: '#fff', borderColor: '#ef4444' } : {}}
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        <span>Ausente</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}

        {currentSession?.status !== 'suspended' && (
          <>
            {/* Session Notes */}
            <div className="card p-5 bg-white border border-[var(--color-deep-green)]/5 shadow-md space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-deep-green)] uppercase tracking-wider">Notas de la Clase</h3>
              <textarea
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="Anotaciones sobre lo dictado hoy en la clase..."
                rows={3}
                className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium resize-none text-xs"
              />
            </div>

            {/* Save Action Sticky Area */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <div className="max-w-md mx-auto">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving || attendanceList.length === 0}
                  className="btn-primary w-full py-3.5 text-sm font-bold flex justify-center items-center gap-2 shadow-lg"
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">save</span>
                  )}
                  Guardar Asistencia de Hoy
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
