const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'uuid-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

export default function CrmPresentationsDashboard() {
  const navigate = useNavigate()
  const [presentations, setPresentations] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [exportingId, setExportingId] = useState(null)
  const [exportProgress, setExportProgress] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function loadPresentations() {
      try {
        const { data, error } = await supabase
          .from('crm_presentations')
          .select('*')
          .order('updated_at', { ascending: false })
        if (error) throw error
        setPresentations(data || [])
      } catch (err) {
        console.error('Error fetching presentations:', err)
        showToast('Error al cargar las presentaciones.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadPresentations()
  }, [])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la presentación "${title}"?`)) return
    try {
      const { error } = await supabase
        .from('crm_presentations')
        .delete()
        .eq('id', id)
      if (error) throw error
      setPresentations(prev => prev.filter(p => p.id !== id))
      showToast('Presentación eliminada correctamente.')
    } catch (err) {
      console.error('Error deleting:', err)
      showToast('Error al eliminar la presentación.', 'error')
    }
  }

  const handleExportPdf = async (presentation) => {
    try {
      setExportingId(presentation.id)
      setExportProgress('0%')
      await exportPresentationToPdf(presentation.title, presentation.slides, (curr, total) => {
        setExportProgress(`${Math.round((curr / total) * 100)}%`)
      })
      showToast('PDF exportado correctamente.')
    } catch (err) {
      console.error(err)
      showToast('Error al exportar PDF: ' + err.message, 'error')
    } finally {
      setExportingId(null)
      setExportProgress('')
    }
  }

  const handleCreateNew = async () => {
    const title = window.prompt('Ingresá el título de la nueva presentación:')
    if (!title || !title.trim()) return

    const initialSlides = [
      {
        id: generateUUID(),
        layout: 'image',
        title: 'Diapositiva 1',
        mediaUrl: '',
        notes: '',
        showFooterLogo: false
      }
    ]

    try {
      const { data, error } = await supabase
        .from('crm_presentations')
        .insert({
          title: title.trim(),
          description: 'Nueva presentación para talleres o eventos.',
          slides: initialSlides
        })
        .select()
        .single()
      if (error) throw error
      navigate(`/admin/crm/presentaciones/${data.id}/editar`)
    } catch (err) {
      console.error('Error creating presentation:', err)
      showToast('Error al crear la presentación.', 'error')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in text-[var(--color-dark-gray)]">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-premium shadow-lg border transition-all duration-300 ${
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--color-deep-green)]">Presentador de Diapositivas</h1>
          <p className="text-sm text-[var(--color-dark-gray)]/60 mt-1">
            Diseñá y proyectá presentaciones interactivas con tu marca durante los talleres y conferencias.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="btn-primary self-start md:self-center"
        >
          <span className="material-symbols-outlined text-lg">add_presentation</span>
          Nueva Presentación
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--color-deep-green)]/30 animate-pulse">
            hourglass_empty
          </span>
          <p className="text-sm font-semibold text-[var(--color-dark-gray)]/50 mt-3">
            Cargando presentaciones...
          </p>
        </div>
      ) : presentations.length === 0 ? (
        <div className="card p-12 text-center bg-white border border-gray-150 rounded-2xl flex flex-col items-center justify-center max-w-2xl mx-auto space-y-6 shadow-sm">
          <span className="material-symbols-outlined text-6xl text-[var(--color-deep-green)]/20">
            co_present
          </span>
          <div>
            <h3 className="text-lg font-bold text-[var(--color-deep-green)]">No hay presentaciones todavía</h3>
            <p className="text-xs text-[var(--color-dark-gray)]/60 mt-2 max-w-sm">
              Crea tu primera serie de diapositivas estilo PowerPoint para proyectar durante tus talleres de Inteligencia Artificial.
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Crear mi primera presentación
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presentations.map((presentation) => {
            const slideCount = Array.isArray(presentation.slides) ? presentation.slides.length : 0
            const updatedDate = new Date(presentation.updated_at).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })

            return (
              <div
                key={presentation.id}
                className="card bg-white border border-gray-150 hover:shadow-md transition-all rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-deep-green)]/5 rounded-full blur-2xl pointer-events-none translate-x-12 -translate-y-12 group-hover:bg-[var(--color-deep-green)]/10 transition-colors" />

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-[var(--color-deep-green)]/10 rounded-xl text-[var(--color-deep-green)]">
                      <span className="material-symbols-outlined text-2xl leading-none">slideshow</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Presentación</span>
                      <h3 className="font-heading text-lg font-extrabold text-[var(--color-deep-green)] line-clamp-1 mt-0.5">
                        {presentation.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-dark-gray)]/60 line-clamp-2 min-h-[2rem]">
                    {presentation.description || 'Sin descripción adicional.'}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-6 text-xs text-[var(--color-dark-gray)]/50 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">filter_frames</span>
                      {slideCount} {slideCount === 1 ? 'diapositiva' : 'diapositivas'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">edit_calendar</span>
                      {updatedDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 flex-wrap">
                  <Link
                    to={`/admin/crm/presentaciones/${presentation.id}/presentar`}
                    className="px-4 py-2 bg-[var(--color-deep-green)] hover:bg-[var(--color-deep-green)]/90 text-white text-xs font-bold rounded-premium-btn flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">play_circle</span>
                    Proyectar
                  </Link>
                  <Link
                    to={`/admin/crm/presentaciones/${presentation.id}/editar`}
                    className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[var(--color-deep-green)] rounded-premium-btn flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Editar
                  </Link>
                  <button
                    onClick={() => handleExportPdf(presentation)}
                    disabled={exportingId !== null}
                    className="px-4 py-2 border border-red-200 bg-red-50/50 hover:bg-red-50 disabled:opacity-50 text-xs font-bold text-red-700 rounded-premium-btn flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Exportar todas las diapositivas a PDF"
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {exportingId === presentation.id ? 'sync' : 'picture_as_pdf'}
                    </span>
                    {exportingId === presentation.id ? `Descargando (${exportProgress})` : 'Exportar PDF'}
                  </button>
                  <button
                    onClick={() => handleDelete(presentation.id, presentation.title)}
                    className="p-2 border border-gray-150 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-400 rounded-premium-btn transition-colors ml-auto"
                    title="Eliminar presentación"
                  >
                    <span className="material-symbols-outlined text-base leading-none">delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
