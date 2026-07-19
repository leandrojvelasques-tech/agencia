import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

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

export default function ClassesDashboard() {
  const {
    students,
    recurringClasses,
    isLoading,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    fetchRecurringClasses,
    createRecurringClass,
    updateRecurringClass,
    deleteRecurringClass,
    getOrCreateClassSession,
    fetchClassAttendance,
    saveClassAttendance,
    fetchMonthlyClassReport
  } = useStore()

  // Tab State
  const [activeTab, setActiveTab] = useState('attendance') // 'attendance' | 'students' | 'classes' | 'reports'

  // Common State
  const [toast, setToast] = useState(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Modals
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    photo_url: '',
    start_date: new Date().toISOString().split('T')[0],
    billing_type: 'pago_mensual',
    status: 'active'
  })
  const [studentEnrolledClasses, setStudentEnrolledClasses] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  // Class Form State
  const [classForm, setClassForm] = useState({
    name: '',
    day_of_week: 5,
    start_time: '20:00',
    end_time: '21:30',
    instructor: 'Leandro Velasques',
    status: 'active'
  })

  // Attendance Tab State
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceList, setAttendanceList] = useState([]) // Array of { student, status: 'present'|'absent'|'late' }
  const [sessionNotes, setSessionNotes] = useState('')
  const [currentSession, setCurrentSession] = useState(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentSearchResults, setStudentSearchResults] = useState([])

  // Reports Tab State
  const [reportClassId, setReportClassId] = useState('')
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState({ sessions: [], attendanceMap: {} })
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Alumnos Search/Filters State
  const [studentSearch, setStudentSearch] = useState('')
  const [studentBillingFilter, setStudentBillingFilter] = useState('all')

  // Notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load Initial Data
  useEffect(() => {
    fetchStudents()
    fetchRecurringClasses().then((classes) => {
      if (classes.length > 0) {
        setSelectedClassId(classes[0].id)
        setReportClassId(classes[0].id)
      }
    })
  }, [])

  // ---------------------------------------------------
  // ATTENDANCE TAB LOGIC
  // ---------------------------------------------------
  useEffect(() => {
    if (selectedClassId && selectedDate) {
      loadAttendanceData()
    }
  }, [selectedClassId, selectedDate, recurringClasses])

  const loadAttendanceData = async () => {
    try {
      setIsActionLoading(true)
      // 1. Get or create session
      const session = await getOrCreateClassSession(selectedClassId, selectedDate)
      setCurrentSession(session)
      setSessionNotes(session?.notes || '')

      // 2. Fetch marked attendance for this session
      let markedMap = {}
      if (session) {
        const marked = await fetchClassAttendance(session.id)
        marked.forEach(a => {
          markedMap[a.student_id] = a.status
        })
      }

      // 3. Find stable students enrolled in this class
      const currentClass = recurringClasses.find(c => c.id === selectedClassId)
      const enrolledStudents = currentClass?.class_enrollments?.map(ce => ce.students) || []

      // 4. Merge: if already marked, use status; if not, check if student is enrolled (default: present)
      const merged = enrolledStudents.map(student => {
        if (!student) return null
        return {
          student,
          status: markedMap[student.id] || 'present'
        }
      }).filter(Boolean)

      // Add students who are not enrolled but have attendance records for this session
      const enrolledIds = new Set(enrolledStudents.map(s => s?.id).filter(Boolean))
      
      // We look for other students who are present in markedMap but not in enrolled list
      const otherAttended = students.filter(s => markedMap[s.id] && !enrolledIds.has(s.id))
      otherAttended.forEach(student => {
        merged.push({
          student,
          status: markedMap[student.id]
        })
      })

      setAttendanceList(merged)
    } catch (err) {
      console.error(err)
      showToast('Error al cargar asistencia', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle student search in Attendance tab
  useEffect(() => {
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase()
      const currentIds = new Set(attendanceList.map(a => a.student.id))
      const filtered = students.filter(s => 
        s.status === 'active' &&
        !currentIds.has(s.id) &&
        (`${s.first_name} ${s.last_name}`).toLowerCase().includes(q)
      )
      setStudentSearchResults(filtered)
    } else {
      setStudentSearchResults([])
    }
  }, [studentSearchQuery, attendanceList, students])

  const handleAddCasualStudent = (student) => {
    setAttendanceList(prev => [...prev, { student, status: 'present' }])
    setStudentSearchQuery('')
    setStudentSearchResults([])
    showToast(`${student.first_name} agregado a la clase de hoy`)
  }

  const handleUpdateStatus = (studentId, status) => {
    setAttendanceList(prev => 
      prev.map(item => item.student.id === studentId ? { ...item, status } : item)
    )
  }

  const handleSaveAttendance = async () => {
    if (!currentSession) return
    setIsActionLoading(true)
    try {
      // 1. Update session notes if changed
      if (sessionNotes !== currentSession.notes) {
        await supabase
          .from('class_sessions')
          .update({ notes: sessionNotes })
          .eq('id', currentSession.id)
      }

      // 2. Save attendance records
      const records = attendanceList.map(a => ({
        student_id: a.student.id,
        status: a.status
      }))

      const res = await saveClassAttendance(currentSession.id, records)
      if (res.success) {
        showToast('Asistencia guardada correctamente')
        fetchRecurringClasses() // reload classes to refresh enrollments
      } else {
        throw new Error(res.error?.message)
      }
    } catch (err) {
      console.error(err)
      showToast('Error al guardar asistencia: ' + err.message, 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // ---------------------------------------------------
  // STUDENTS CRUD LOGIC
  // ---------------------------------------------------
  const handleOpenStudentModal = (student = null) => {
    if (student) {
      setEditingStudent(student)
      setStudentForm({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        photo_url: student.photo_url || '',
        start_date: student.start_date || new Date().toISOString().split('T')[0],
        billing_type: student.billing_type || 'pago_mensual',
        status: student.status || 'active'
      })
      const enrolled = []
      recurringClasses.forEach(c => {
        const isEnrolled = c.class_enrollments?.some(ce => ce.student_id === student.id)
        if (isEnrolled) enrolled.push(c.id)
      })
      setStudentEnrolledClasses(enrolled)
      setPhotoPreview(student.photo_url || null)
    } else {
      setEditingStudent(null)
      setStudentForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        photo_url: '',
        start_date: new Date().toISOString().split('T')[0],
        billing_type: 'pago_mensual',
        status: 'active'
      })
      setStudentEnrolledClasses([])
      setPhotoPreview(null)
    }
    setPhotoFile(null)
    setStudentModalOpen(true)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleStudentSubmit = async (e) => {
    e.preventDefault()
    if (!studentForm.first_name || !studentForm.last_name) {
      showToast('Nombre y Apellido son obligatorios', 'error')
      return
    }

    setIsActionLoading(true)
    try {
      let finalPhotoUrl = studentForm.photo_url

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `student_photos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('proposals')
          .upload(filePath, photoFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('proposals')
          .getPublicUrl(filePath)
          
        finalPhotoUrl = publicUrlData.publicUrl
      }

      const finalData = { ...studentForm, photo_url: finalPhotoUrl }

      let res
      if (editingStudent) {
        res = await updateStudent(editingStudent.id, finalData, studentEnrolledClasses)
      } else {
        res = await createStudent(finalData, studentEnrolledClasses)
      }

      if (res.success) {
        showToast(editingStudent ? 'Alumno actualizado' : 'Alumno creado')
        setStudentModalOpen(false)
        fetchRecurringClasses()
      } else {
        throw new Error(res.error?.message)
      }
    } catch (err) {
      console.error(err)
      showToast('Error al guardar alumno: ' + err.message, 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteStudent = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar a este alumno? Se perderán también sus registros de asistencia.')) {
      try {
        const res = await deleteStudent(id)
        if (res.success) {
          showToast('Alumno eliminado')
          fetchRecurringClasses()
        } else {
          throw new Error(res.error?.message)
        }
      } catch (err) {
        console.error(err)
        showToast('Error al eliminar alumno: ' + err.message, 'error')
      }
    }
  }

  // ---------------------------------------------------
  // CLASSES CRUD LOGIC
  // ---------------------------------------------------
  const handleOpenClassModal = (cls = null) => {
    if (cls) {
      setEditingClass(cls)
      setClassForm({
        name: cls.name || '',
        day_of_week: cls.day_of_week ?? 5,
        start_time: cls.start_time?.substring(0, 5) || '20:00',
        end_time: cls.end_time?.substring(0, 5) || '21:30',
        instructor: cls.instructor || 'Leandro Velasques',
        status: cls.status || 'active'
      })
    } else {
      setEditingClass(null)
      setClassForm({
        name: '',
        day_of_week: 5,
        start_time: '20:00',
        end_time: '21:30',
        instructor: 'Leandro Velasques',
        status: 'active'
      })
    }
    setClassModalOpen(true)
  }

  const handleClassSubmit = async (e) => {
    e.preventDefault()
    if (!classForm.name) {
      showToast('El nombre de la clase es obligatorio', 'error')
      return
    }

    setIsActionLoading(true)
    try {
      let res
      if (editingClass) {
        res = await updateRecurringClass(editingClass.id, classForm)
      } else {
        res = await createRecurringClass(classForm)
      }

      if (res.success) {
        showToast(editingClass ? 'Clase actualizada' : 'Clase creada')
        setClassModalOpen(false)
        fetchRecurringClasses()
      } else {
        throw new Error(res.error?.message)
      }
    } catch (err) {
      console.error(err)
      showToast('Error al guardar clase: ' + err.message, 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteClass = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta clase recurrente? Esto borrará todas las sesiones y asistencias vinculadas.')) {
      try {
        const res = await deleteRecurringClass(id)
        if (res.success) {
          showToast('Clase eliminada')
        } else {
          throw new Error(res.error?.message)
        }
      } catch (err) {
        console.error(err)
        showToast('Error al eliminar clase: ' + err.message, 'error')
      }
    }
  }

  // ---------------------------------------------------
  // REPORTS LOGIC
  // ---------------------------------------------------
  const handleGenerateReport = async () => {
    if (!reportClassId) {
      showToast('Selecciona una clase para el reporte', 'error')
      return
    }

    setIsGeneratingReport(true)
    try {
      const data = await fetchMonthlyClassReport(reportClassId, reportYear, reportMonth)
      setReportData(data)
      showToast('Reporte generado correctamente')
    } catch (err) {
      console.error(err)
      showToast('Error al generar reporte', 'error')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleExportCSV = () => {
    const { sessions, attendanceMap } = reportData
    if (sessions.length === 0) return

    const currentClass = recurringClasses.find(c => c.id === reportClassId)
    const selectedMonthLabel = MONTHS.find(m => m.value === reportMonth)?.label

    let csvContent = `Reporte de Asistencia - ${currentClass?.name} - ${selectedMonthLabel} ${reportYear}\n`
    csvContent += `Alumno;Tipo Pago;` + sessions.map(s => s.session_date).join(';') + ';Total Asistencias\n'

    const studentsToReport = students.filter(student => {
      const isEnrolled = currentClass?.class_enrollments?.some(ce => ce.student_id === student.id)
      const hasAttendance = sessions.some(s => attendanceMap[student.id]?.[s.id])
      return isEnrolled || hasAttendance
    })

    studentsToReport.forEach(student => {
      let row = `${student.first_name} ${student.last_name};${BILLING_LABELS[student.billing_type]?.label || student.billing_type};`
      let attendancesCount = 0
      
      sessions.forEach(s => {
        const status = attendanceMap[student.id]?.[s.id]
        if (status === 'present') {
          row += 'Presente;'
          attendancesCount++
        } else if (status === 'late') {
          row += 'Tarde;'
          attendancesCount++
        } else if (status === 'absent') {
          row += 'Ausente;'
        } else {
          row += '-;'
        }
      })

      row += `${attendancesCount}/${sessions.length}\n`
      csvContent += row
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_asistencia_${currentClass?.name.replace(/[^a-zA-Z0-9]/g, '_')}_${reportMonth}_${reportYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopySummary = () => {
    const { sessions, attendanceMap } = reportData
    if (sessions.length === 0) return

    const currentClass = recurringClasses.find(c => c.id === reportClassId)
    const selectedMonthLabel = MONTHS.find(m => m.value === reportMonth)?.label

    let text = `📊 *REPORTE DE ASISTENCIA - ${currentClass?.name.toUpperCase()}*\n📅 Período: ${selectedMonthLabel} ${reportYear}\n🏫 Clases Dictadas: ${sessions.length}\n\n`

    const currentClassEnrollments = currentClass?.class_enrollments || []
    const studentsToReport = students.filter(student => {
      const isEnrolled = currentClassEnrollments.some(ce => ce.student_id === student.id)
      const hasAttendance = sessions.some(s => attendanceMap[student.id]?.[s.id])
      return isEnrolled || hasAttendance
    })

    text += `*DETALLE DE ASISTENCIAS POR ALUMNO:*\n`
    studentsToReport.forEach(student => {
      let attendancesCount = 0
      sessions.forEach(s => {
        const status = attendanceMap[student.id]?.[s.id]
        if (status === 'present' || status === 'late') attendancesCount++
      })
      const paymentMode = BILLING_LABELS[student.billing_type]?.label || student.billing_type
      text += `- ${student.first_name} ${student.last_name} (${paymentMode}): *${attendancesCount}* asistencias de ${sessions.length}\n`
    })

    navigator.clipboard.writeText(text).then(() => {
      showToast('Resumen copiado al portapapeles')
    }).catch(err => {
      console.error('Could not copy text: ', err)
      showToast('Error al copiar resumen', 'error')
    })
  }

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
    const matchSearch = fullName.includes(studentSearch.toLowerCase()) || (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase()))
    const matchBilling = studentBillingFilter === 'all' || s.billing_type === studentBillingFilter
    return matchSearch && matchBilling
  })

  const reportStats = () => {
    const { sessions, attendanceMap } = reportData
    if (sessions.length === 0) return { totalSessions: 0, averageAttendance: 0, totalStudents: 0 }

    const uniqueStudents = new Set(Object.keys(attendanceMap))
    let totalPresencePoints = 0

    sessions.forEach(s => {
      let sessionPresent = 0
      Object.keys(attendanceMap).forEach(studentId => {
        const status = attendanceMap[studentId]?.[s.id]
        if (status === 'present' || status === 'late') {
          sessionPresent++
        }
      })
      totalPresencePoints += sessionPresent
    })

    return {
      totalSessions: sessions.length,
      averageAttendance: (totalPresencePoints / sessions.length).toFixed(1),
      totalStudents: uniqueStudents.size
    }
  }

  const stats = reportStats()

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-premium shadow-lg border transition-all duration-300 animate-fade-in ${
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Clases y Asistencia</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 font-medium mt-1">
            Gestión de alumnos, clases de tango recurrentes y planillas de asistencia.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'students' && (
            <button onClick={() => handleOpenStudentModal()} className="btn-primary">
              <span className="material-symbols-outlined text-lg">add</span>
              Nuevo Alumno
            </button>
          )}
          {activeTab === 'classes' && (
            <button onClick={() => handleOpenClassModal()} className="btn-primary">
              <span className="material-symbols-outlined text-lg">add</span>
              Nueva Clase
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-b border-[var(--color-deep-green)]/8 mb-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">fact_check</span>
          Tomar Asistencia
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">groups</span>
          Directorio de Alumnos
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">description</span>
          Reportes y Estadísticas
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'border-[var(--color-deep-green)] text-[var(--color-deep-green)]'
              : 'border-transparent text-[var(--color-dark-gray)]/40 hover:text-[var(--color-dark-gray)]/70'
          }`}
        >
          <span className="material-symbols-outlined text-lg">calendar_month</span>
          Clases Recurrentes
        </button>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="card p-5 bg-white border border-[var(--color-deep-green)]/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-2">Clase Recurrente</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-3 text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                >
                  <option value="" disabled>Selecciona una clase</option>
                  {recurringClasses.filter(c => c.status === 'active').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({DAYS_OF_WEEK.find(d => d.value === c.day_of_week)?.label} {c.start_time.substring(0, 5)}hs)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-2">Fecha de la Clase</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-3 text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadAttendanceData}
                  disabled={isLoading || isActionLoading || !selectedClassId}
                  className="btn-secondary w-full py-3 h-[45px] text-sm"
                >
                  <span className="material-symbols-outlined text-lg">sync</span>
                  Recargar
                </button>
              </div>
            </div>
          </div>

          {!selectedClassId ? (
            <div className="card p-12 text-center bg-white border border-[var(--color-deep-green)]/5">
              <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block font-light">school</span>
              <p className="text-lg font-semibold text-[var(--color-dark-gray)]/45">No hay clase seleccionada</p>
              <p className="text-sm text-[var(--color-dark-gray)]/30 mt-1">Configura primero tus clases recurrentes en la pestaña de Clases.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-[var(--color-deep-green)]">Lista de Asistencia</h2>
                    <span className="text-xs font-bold text-[var(--color-dark-gray)]/50 bg-[var(--color-refined-gray)] px-3 py-1 rounded-full">
                      {attendanceList.length} Alumnos
                    </span>
                  </div>

                  <div className="relative mb-6">
                    <div className="flex items-center gap-2 bg-[var(--color-refined-gray)]/60 rounded-[var(--radius-premium)] px-4 py-2 border border-[var(--color-deep-green)]/5">
                      <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">person_add</span>
                      <input
                        type="text"
                        placeholder="Agregar alumno no habitual a esta clase..."
                        value={studentSearchQuery}
                        onChange={e => setStudentSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[var(--color-dark-gray)]/30 text-[var(--color-dark-gray)]"
                      />
                    </div>

                    {studentSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-premium shadow-lg z-20 max-h-60 overflow-y-auto">
                        {studentSearchResults.map(s => {
                          const avProps = getAvatarProps(s.first_name, s.last_name)
                          return (
                            <button
                              key={s.id}
                              onClick={() => handleAddCasualStudent(s)}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--color-refined-gray)] flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0"
                            >
                              {s.photo_url ? (
                                <img src={s.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={avProps.style}>
                                  {avProps.initials}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-[var(--color-dark-gray)]">{s.first_name} {s.last_name}</p>
                                <p className="text-[11px] text-[var(--color-dark-gray)]/50">{BILLING_LABELS[s.billing_type]?.label || s.billing_type}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {attendanceList.length === 0 ? (
                    <div className="py-12 text-center text-[var(--color-dark-gray)]/40">
                      <span className="material-symbols-outlined text-4xl block mb-2 font-light">group</span>
                      No hay alumnos habituales anotados a esta clase.<br/>
                      <span className="text-xs text-[var(--color-dark-gray)]/30">Agrégalos en el Directorio o usa el buscador de arriba.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {attendanceList.map(item => {
                        const avProps = getAvatarProps(item.student.first_name, item.student.last_name)
                        return (
                          <div key={item.student.id} className="py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {item.student.photo_url ? (
                                <img src={item.student.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm" style={avProps.style}>
                                  {avProps.initials}
                                </div>
                              )}
                              <div>
                                <h4 className="text-sm font-bold text-[var(--color-dark-gray)] leading-snug">
                                  {item.student.first_name} {item.student.last_name}
                                </h4>
                                <span className={`text-[10px] font-bold uppercase tracking-wider text-${BILLING_LABELS[item.student.billing_type]?.color || 'gray'}-600`}>
                                  {BILLING_LABELS[item.student.billing_type]?.label || item.student.billing_type}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 bg-[var(--color-refined-gray)] p-1 rounded-[var(--radius-premium)]">
                              <button
                                onClick={() => handleUpdateStatus(item.student.id, 'present')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-premium)] text-xs font-bold transition-all ${
                                  item.status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-[var(--color-dark-gray)]/50 hover:text-[var(--color-dark-gray)]'
                                }`}
                                title="Presente"
                              >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                <span className="hidden sm:inline">Presente</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(item.student.id, 'late')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-premium)] text-xs font-bold transition-all ${
                                  item.status === 'late'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-[var(--color-dark-gray)]/50 hover:text-[var(--color-dark-gray)]'
                                }`}
                                title="Tarde"
                              >
                                <span className="material-symbols-outlined text-[15px]">schedule</span>
                                <span className="hidden sm:inline">Tarde</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(item.student.id, 'absent')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-premium)] text-xs font-bold transition-all ${
                                  item.status === 'absent'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-[var(--color-dark-gray)]/50 hover:text-[var(--color-dark-gray)]'
                                }`}
                                title="Ausente"
                              >
                                <span className="material-symbols-outlined text-[15px]">cancel</span>
                                <span className="hidden sm:inline">Ausente</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="card p-6 bg-white border border-[var(--color-deep-green)]/5 flex flex-col h-full justify-between">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-[var(--color-deep-green)]">Notas de la Clase</h3>
                    <textarea
                      value={sessionNotes}
                      onChange={e => setSessionNotes(e.target.value)}
                      placeholder="Escribe comentarios de la clase (ej: giros, postura, ritmo, etc.). Opcional..."
                      rows={5}
                      className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-3 text-[var(--color-dark-gray)] placeholder:text-[var(--color-dark-gray)]/30 focus:ring-2 focus:ring-[var(--color-deep-green)]/20 outline-none transition-all font-medium resize-none text-sm"
                    />
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={handleSaveAttendance}
                      disabled={isActionLoading || attendanceList.length === 0}
                      className="btn-primary w-full py-4 text-sm font-bold flex justify-center items-center gap-2"
                    >
                      {isActionLoading ? (
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-lg">save</span>
                      )}
                      Guardar Planilla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="card p-4 bg-white border border-[var(--color-deep-green)]/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-[var(--color-refined-gray)]/50 rounded-premium px-3 py-2 flex-1 min-w-[240px]">
              <span className="material-symbols-outlined text-lg text-[var(--color-dark-gray)]/40">search</span>
              <input
                type="text"
                placeholder="Buscar alumno por nombre o email..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[var(--color-dark-gray)]/30 text-[var(--color-dark-gray)] font-medium"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={studentBillingFilter}
                onChange={e => setStudentBillingFilter(e.target.value)}
                className="text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-2 text-[var(--color-dark-gray)] outline-none cursor-pointer"
              >
                <option value="all">Todas las tarifas</option>
                <option value="pago_mensual">Pago Mensual</option>
                <option value="por_clase">Por Clase</option>
                <option value="frecuente">Frecuente</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[var(--color-deep-green)] font-bold animate-pulse">Cargando alumnos...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="card p-12 text-center bg-white">
              <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block font-light">group</span>
              <p className="text-lg font-semibold text-[var(--color-dark-gray)]/45">No se encontraron alumnos</p>
              <button onClick={() => handleOpenStudentModal()} className="btn-primary mt-4">
                <span className="material-symbols-outlined text-lg">add</span>
                Agregar tu primer alumno
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map(student => {
                const avProps = getAvatarProps(student.first_name, student.last_name)
                const billingCfg = BILLING_LABELS[student.billing_type] || { label: student.billing_type, color: 'gray' }
                
                const enrolled = recurringClasses.filter(c => 
                  c.class_enrollments?.some(ce => ce.student_id === student.id)
                )

                return (
                  <div key={student.id} className="card p-6 bg-white border border-[var(--color-deep-green)]/5 flex flex-col justify-between group relative overflow-hidden transition-all duration-300">
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        {student.photo_url ? (
                          <img src={student.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-sm" style={avProps.style}>
                            {avProps.initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-extrabold text-[var(--color-deep-green)] text-base truncate leading-snug">
                            {student.first_name} {student.last_name}
                          </h3>
                          <span className={`badge badge-${billingCfg.color} mt-1.5`}>
                            {billingCfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 text-xs font-semibold text-[var(--color-dark-gray)]/75">
                        {student.phone && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[var(--color-dark-gray)]/45">phone</span>
                            <span>{student.phone}</span>
                          </div>
                        )}
                        {student.email && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[var(--color-dark-gray)]/45">mail</span>
                            <span className="truncate">{student.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[var(--color-dark-gray)]/45">calendar_today</span>
                          <span>Ingreso: {student.start_date}</span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-dark-gray)]/40 block mb-1">Clases Habituales</span>
                          {enrolled.length === 0 ? (
                            <span className="text-[11px] text-[var(--color-dark-gray)]/40 italic">Ninguna clase vinculada</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {enrolled.map(c => (
                                <span key={c.id} className="bg-[var(--color-refined-gray)] text-[var(--color-deep-green)] font-bold text-[10px] px-2 py-0.5 rounded-[var(--radius-premium)]">
                                  {c.name.split(' ')[0]} {DAYS_OF_WEEK.find(d => d.value === c.day_of_week)?.label.substring(0,3)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => handleOpenStudentModal(student)}
                        className="p-1.5 rounded-full hover:bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)]/50 hover:text-[var(--color-deep-green)] transition-all"
                        title="Editar alumno"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-1.5 rounded-full hover:bg-red-50 text-[var(--color-dark-gray)]/50 hover:text-red-500 transition-all"
                        title="Eliminar alumno"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="card p-5 bg-white border border-[var(--color-deep-green)]/5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-2">Clase Recurrente</label>
                <select
                  value={reportClassId}
                  onChange={e => setReportClassId(e.target.value)}
                  className="w-full text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-3 text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                >
                  <option value="" disabled>Selecciona una clase</option>
                  {recurringClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({DAYS_OF_WEEK.find(d => d.value === c.day_of_week)?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider mb-2">Mes</label>
                <select
                  value={reportMonth}
                  onChange={e => setReportMonth(Number(e.target.value))}
                  className="w-full text-sm font-semibold bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-3 py-3 text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport || !reportClassId}
                  className="btn-primary w-full py-3 h-[45px] text-sm"
                >
                  {isGeneratingReport ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">analytics</span>
                  )}
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>

          {reportData.sessions.length === 0 ? (
            <div className="card p-12 text-center bg-white border border-[var(--color-deep-green)]/5">
              <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block font-light">table_chart</span>
              <p className="text-lg font-semibold text-[var(--color-dark-gray)]/45">No hay reporte generado</p>
              <p className="text-sm text-[var(--color-dark-gray)]/30 mt-1">Selecciona una clase y haz clic en "Generar Reporte" para ver la asistencia del mes.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-5 bg-white flex items-center justify-between border border-[var(--color-deep-green)]/5">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--color-dark-gray)]/50 uppercase tracking-wider block">Clases Dictadas</span>
                    <span className="text-3xl font-black text-[var(--color-deep-green)] mt-1 block">{stats.totalSessions}</span>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)]/20">calendar_month</span>
                </div>

                <div className="card p-5 bg-white flex items-center justify-between border border-[var(--color-deep-green)]/5">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--color-dark-gray)]/50 uppercase tracking-wider block">Asistencia Promedio</span>
                    <span className="text-3xl font-black text-[var(--color-deep-green)] mt-1 block">{stats.averageAttendance} <span className="text-sm text-[var(--color-dark-gray)]/50 font-normal">alumnos/clase</span></span>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)]/20">trending_up</span>
                </div>

                <div className="card p-5 bg-white flex items-center justify-between border border-[var(--color-deep-green)]/5">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--color-dark-gray)]/50 uppercase tracking-wider block">Alumnos Activos</span>
                    <span className="text-3xl font-black text-[var(--color-deep-green)] mt-1 block">{stats.totalStudents}</span>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-[var(--color-deep-green)]/20">groups</span>
                </div>
              </div>

              <div className="card bg-white border border-[var(--color-deep-green)]/5 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h2 className="text-lg font-bold text-[var(--color-deep-green)]">Matriz de Asistencia Mensual</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopySummary}
                      className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 border border-[var(--color-deep-green)]"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      Copiar Resumen Secretaria
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      Exportar Excel (CSV)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-refined-gray)]/45">
                        <th className="px-6 py-4 text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider border-b border-gray-100">Alumno</th>
                        <th className="px-6 py-4 text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider border-b border-gray-100">Plan</th>
                        {reportData.sessions.map(s => {
                          const dateObj = new Date(s.session_date + 'T12:00:00')
                          const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
                          return (
                            <th key={s.id} className="px-4 py-4 text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider border-b border-gray-100 text-center min-w-[70px]">
                              {formattedDate}
                            </th>
                          )
                        })}
                        <th className="px-6 py-4 text-xs font-bold text-[var(--color-dark-gray)]/60 uppercase tracking-wider border-b border-gray-100 text-center min-w-[90px]">Total Asist.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.filter(student => {
                        const currentClass = recurringClasses.find(c => c.id === reportClassId)
                        const isEnrolled = currentClass?.class_enrollments?.some(ce => ce.student_id === student.id)
                        const hasAttendance = reportData.sessions.some(s => reportData.attendanceMap[student.id]?.[s.id])
                        return isEnrolled || hasAttendance
                      }).map(student => {
                        let presentCount = 0
                        return (
                          <tr key={student.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-3.5 text-sm font-bold text-[var(--color-dark-gray)]">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-6 py-3.5 text-xs font-semibold text-[var(--color-dark-gray)]/60">
                              {BILLING_LABELS[student.billing_type]?.label || student.billing_type}
                            </td>
                            {reportData.sessions.map(s => {
                              const status = reportData.attendanceMap[student.id]?.[s.id]
                              let cellIcon = '-'
                              let cellClass = 'text-gray-300'

                              if (status === 'present') {
                                cellIcon = 'P'
                                cellClass = 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-xs'
                                presentCount++
                              } else if (status === 'late') {
                                cellIcon = 'T'
                                cellClass = 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-xs'
                                presentCount++
                              } else if (status === 'absent') {
                                cellIcon = 'A'
                                cellClass = 'text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full text-xs'
                              }

                              return (
                                <td key={s.id} className="px-4 py-3.5 text-center">
                                  <span className={cellClass}>{cellIcon}</span>
                                </td>
                              )
                            })}
                            <td className="px-6 py-3.5 text-center text-sm font-black text-[var(--color-deep-green)]">
                              {presentCount} / {reportData.sessions.length}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-6">
          {recurringClasses.length === 0 ? (
            <div className="card p-12 text-center bg-white border border-[var(--color-deep-green)]/5">
              <span className="material-symbols-outlined text-5xl text-[var(--color-dark-gray)]/20 mb-4 block font-light">calendar_today</span>
              <p className="text-lg font-semibold text-[var(--color-dark-gray)]/45">No hay clases configuradas</p>
              <button onClick={() => handleOpenClassModal()} className="btn-primary mt-4">
                <span className="material-symbols-outlined text-lg">add</span>
                Crear tu primera clase
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recurringClasses.map(cls => (
                <div key={cls.id} className="card p-6 bg-white border border-[var(--color-deep-green)]/5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-heading font-extrabold text-[var(--color-deep-green)] text-lg">
                        {cls.name}
                      </h3>
                      <span className={`badge ${cls.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {cls.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 text-sm font-semibold text-[var(--color-dark-gray)]/75">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-dark-gray)]/45">calendar_today</span>
                        <span>Día: {DAYS_OF_WEEK.find(d => d.value === cls.day_of_week)?.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-dark-gray)]/45">schedule</span>
                        <span>Horario: {cls.start_time.substring(0, 5)} a {cls.end_time.substring(0, 5)} hs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-dark-gray)]/45">person</span>
                        <span>Profesor: {cls.instructor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-dark-gray)]/45">group</span>
                        <span>Alumnos Registrados: {cls.class_enrollments?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => handleOpenClassModal(cls)}
                      className="p-1.5 rounded-full hover:bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)]/50 hover:text-[var(--color-deep-green)] transition-all"
                      title="Editar clase"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 text-[var(--color-dark-gray)]/50 hover:text-red-500 transition-all"
                      title="Eliminar clase"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {studentModalOpen && (
        <div className="modal-overlay">
          <div className="bg-white rounded-premium max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-fade-in">
            <h2 className="text-xl font-extrabold text-[var(--color-deep-green)] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">person</span>
              {editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}
            </h2>

            <form onSubmit={handleStudentSubmit} className="space-y-6">
              <div className="flex flex-col items-center sm:items-start">
                <label className="block text-sm font-bold text-[var(--color-dark-gray)] mb-3">Foto del Alumno (Opcional)</label>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full border border-dashed border-[var(--color-deep-green)]/30 flex items-center justify-center bg-[var(--color-refined-gray)] overflow-hidden transition-all hover:border-[var(--color-deep-green)]">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-[var(--color-dark-gray)]/30">add_a_photo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-xs font-semibold text-[var(--color-dark-gray)]/60 hover:text-[var(--color-deep-green)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.first_name}
                    onChange={e => setStudentForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Ej: Juan"
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.last_name}
                    onChange={e => setStudentForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Ej: Pérez"
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    value={studentForm.phone}
                    onChange={e => setStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ej: +54 9 11 12345678"
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Email</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={e => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ej: juan.perez@email.com"
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Fecha de Ingreso</label>
                  <input
                    type="date"
                    value={studentForm.start_date}
                    onChange={e => setStudentForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Tipo de Tarifa / Pago</label>
                  <select
                    value={studentForm.billing_type}
                    onChange={e => setStudentForm(prev => ({ ...prev, billing_type: e.target.value }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  >
                    <option value="pago_mensual">Pago Mensual</option>
                    <option value="por_clase">Por Clase</option>
                    <option value="frecuente">Frecuente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Estado del Alumno</label>
                  <select
                    value={studentForm.status}
                    onChange={e => setStudentForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Clases a las que asiste habitualmente</label>
                {recurringClasses.length === 0 ? (
                  <p className="text-xs text-[var(--color-dark-gray)]/40 italic">Primero debes crear clases recurrentes</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {recurringClasses.map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--color-dark-gray)]/80 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentEnrolledClasses.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setStudentEnrolledClasses(prev => [...prev, c.id])
                            } else {
                              setStudentEnrolledClasses(prev => prev.filter(id => id !== c.id))
                            }
                          }}
                          className="rounded text-[var(--color-deep-green)] focus:ring-[var(--color-deep-green)]"
                        />
                        <span>{c.name} ({DAYS_OF_WEEK.find(d => d.value === c.day_of_week)?.label})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-6 py-2.5 rounded-premium text-sm font-bold text-[var(--color-dark-gray)] hover:bg-[var(--color-refined-gray)] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="btn-primary py-2.5 px-6"
                >
                  {isActionLoading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">save</span>
                  )}
                  {editingStudent ? 'Guardar Cambios' : 'Crear Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {classModalOpen && (
        <div className="modal-overlay">
          <div className="bg-white rounded-premium max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-fade-in">
            <h2 className="text-xl font-extrabold text-[var(--color-deep-green)] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">calendar_today</span>
              {editingClass ? 'Editar Clase Recurrente' : 'Nueva Clase Recurrente'}
            </h2>

            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Nombre de la Clase *</label>
                <input
                  type="text"
                  required
                  value={classForm.name}
                  onChange={e => setClassForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Clase de Tango - Viernes Principiantes"
                  className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Día de la Semana</label>
                  <select
                    value={classForm.day_of_week}
                    onChange={e => setClassForm(prev => ({ ...prev, day_of_week: Number(e.target.value) }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Profesor / Instructor</label>
                  <input
                    type="text"
                    value={classForm.instructor}
                    onChange={e => setClassForm(prev => ({ ...prev, instructor: e.target.value }))}
                    placeholder="Ej: Leandro Velasques"
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Hora de Inicio</label>
                  <input
                    type="time"
                    required
                    value={classForm.start_time}
                    onChange={e => setClassForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Hora de Fin</label>
                  <input
                    type="time"
                    required
                    value={classForm.end_time}
                    onChange={e => setClassForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-sm font-bold text-[var(--color-dark-gray)]">Estado de la Clase</label>
                  <select
                    value={classForm.status}
                    onChange={e => setClassForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-[var(--color-refined-gray)] border-none rounded-[var(--radius-premium)] px-4 py-2.5 text-sm text-[var(--color-dark-gray)] outline-none cursor-pointer focus:ring-2 focus:ring-[var(--color-deep-green)]/20"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="px-6 py-2.5 rounded-premium text-sm font-bold text-[var(--color-dark-gray)] hover:bg-[var(--color-refined-gray)] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="btn-primary py-2.5 px-6"
                >
                  {isActionLoading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">save</span>
                  )}
                  {editingClass ? 'Guardar Cambios' : 'Crear Clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
