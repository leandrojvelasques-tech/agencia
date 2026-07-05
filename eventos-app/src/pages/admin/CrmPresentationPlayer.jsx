import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function CrmPresentationPlayer({ isPublic = false }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [presentation, setPresentation] = useState(null)
  const [slides, setSlides] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isPresenterWindow = new URLSearchParams(window.location.search).get('presenter') === 'true'

  // BroadcastChannel for real-time synchronization between audience and presenter windows
  useEffect(() => {
    if (isPublic) return
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    
    const handleMessage = (e) => {
      if (!e.data) return
      
      // Sync slide index
      if (typeof e.data.index === 'number') {
        setCurrentIdx(e.data.index)
      }

      // Sync activity countdown timer
      if (e.data.countdown) {
        const { active, endTime } = e.data.countdown
        setCountdownActive(active)
        setCountdownEndTime(endTime)
        if (active && endTime) {
          const diff = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
          setCountdownSecondsLeft(diff)
          setShowTimeUp(false)
        } else {
          setCountdownSecondsLeft(0)
          setShowTimeUp(false)
        }
      }

      // Sync drawing strokes
      if (e.data.draw && canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const { type, rx, ry, color, width } = e.data.draw
        
        if (type === 'start') {
          ctx.beginPath()
          ctx.strokeStyle = color || '#ff0000'
          ctx.lineWidth = width || 4
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          const x = rx * canvas.width
          const y = ry * canvas.height
          ctx.moveTo(x, y)
          
          // Save state for undo locally
          const state = canvas.toDataURL()
          setHistory(prev => [...prev, state])
        } else if (type === 'draw') {
          const x = rx * canvas.width
          const y = ry * canvas.height
          ctx.lineTo(x, y)
          ctx.stroke()
        } else if (type === 'clear') {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          setHistory([])
        } else if (type === 'undo') {
          handleLocalUndo()
        }
      }
    }
    
    channel.addEventListener('message', handleMessage)
    
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [id])

  const updateSlideIdx = (newIdx) => {
    setCurrentIdx(newIdx)
    if (isPublic) return
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({ index: newIdx })
    channel.close()
  }

  // Presenter View State
  const [showPresenterMode, setShowPresenterMode] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [argentinaTime, setArgentinaTime] = useState('')
  const [notesTab, setNotesTab] = useState('guide') // 'guide' or 'notes'
  const [checkedItems, setCheckedItems] = useState({}) // { [itemId]: boolean }

  const toggleItemChecked = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleLinkClick = (e, itemUrl, itemId) => {
    e.stopPropagation()
    if (!itemUrl) return
    const url = itemUrl.startsWith('http') ? itemUrl : `https://${itemUrl}`
    window.open(url, '_blank', 'noopener,noreferrer')
    if (!checkedItems[itemId]) {
      setCheckedItems(prev => ({ ...prev, [itemId]: true }))
    }
  }

  useEffect(() => {
    if (!isPresenterWindow) return
    const updateTime = () => {
      const timeStr = new Date().toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      setArgentinaTime(timeStr)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [isPresenterWindow])

  // Laser Pointer State
  const [laserPointer, setLaserPointer] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Countdown Timer State for workshop activities
  const [countdownEndTime, setCountdownEndTime] = useState(null)
  const [countdownActive, setCountdownActive] = useState(false)
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState(0)
  const [showTimeUp, setShowTimeUp] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')

  useEffect(() => {
    let interval = null
    if (countdownActive && countdownEndTime) {
      setShowTimeUp(false)
      interval = setInterval(() => {
        const diff = Math.max(0, Math.ceil((countdownEndTime - Date.now()) / 1000))
        setCountdownSecondsLeft(diff)
        if (diff <= 0) {
          clearInterval(interval)
          setCountdownActive(false)
          setShowTimeUp(true)
          setTimeout(() => {
            setShowTimeUp(false)
          }, 6000)
        }
      }, 200)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [countdownActive, countdownEndTime])

  const startCountdown = (durationInSeconds) => {
    const endTime = Date.now() + durationInSeconds * 1000
    setCountdownEndTime(endTime)
    setCountdownActive(true)
    setCountdownSecondsLeft(durationInSeconds)
    setShowTimeUp(false)
    
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({ countdown: { active: true, endTime } })
    channel.close()
  }

  const stopCountdown = () => {
    setCountdownActive(false)
    setCountdownEndTime(null)
    setCountdownSecondsLeft(0)
    setShowTimeUp(false)
    
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({ countdown: { active: false, endTime: null } })
    channel.close()
  }

  // Canvas drawing state
  const [drawingMode, setDrawingMode] = useState(false)
  const [drawColor, setDrawColor] = useState('#ff0000') // Red by default
  const [lineWidth, setLineWidth] = useState(4)
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState([])

  const playerRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('crm_presentations')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        if (data) {
          setPresentation(data)
          setSlides(Array.isArray(data.slides) ? data.slides : [])
        }
      } catch (err) {
        console.error('Error loading presentation:', err)
        alert('Error al cargar la presentación.')
        navigate('/admin/crm/presentaciones')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Timer loop for presenter mode
  useEffect(() => {
    let interval = null
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [timerActive])

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.error('Error enabling fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger navigation if laser/draw are active or if drawing
      if (drawingMode && e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        handleUndo()
        return
      }
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextSlide()
          break
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault()
          prevSlide()
          break
        case 'Escape':
          if (document.fullscreenElement) {
            setIsFullscreen(false)
          } else if (!isPublic) {
            navigate(`/admin/crm/presentaciones/${id}/editar`)
          }
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'p':
        case 'P':
          if (!isPublic) {
            e.preventDefault()
            handleOpenPresenterWindow()
          }
          break
        case 'l':
        case 'L':
          if (!isPublic) {
            e.preventDefault()
            setLaserPointer(prev => !prev)
            if (drawingMode) setDrawingMode(false)
          }
          break
        case 'd':
        case 'D':
          if (!isPublic) {
            e.preventDefault()
            setDrawingMode(prev => !prev)
            if (laserPointer) setLaserPointer(false)
          }
          break
        default:
          break
      }
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [slides, currentIdx, drawingMode, laserPointer])

  const nextSlide = () => {
    if (currentIdx < slides.length - 1) {
      updateSlideIdx(currentIdx + 1)
      clearCanvas()
    }
  }

  const prevSlide = () => {
    if (currentIdx > 0) {
      updateSlideIdx(currentIdx - 1)
      clearCanvas()
    }
  }

  const handleOpenPresenterWindow = () => {
    const url = `${window.location.origin}/admin/crm/presentaciones/${id}/presentar?presenter=true`
    window.open(url, `PresenterMode_${id}`, 'width=950,height=650,resizable=yes,scrollbars=yes')
  }

  // Mouse move for laser pointer coordinate tracking
  const handleMouseMove = (e) => {
    if (!playerRef.current) return
    const rect = playerRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  // Draw overlay canvas methods
  useEffect(() => {
    if (drawingMode && canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.parentNode.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      const ctx = canvas.getContext('2d')
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [drawingMode, currentIdx])

  const startDrawing = (e) => {
    if (!drawingMode || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    ctx.strokeStyle = drawColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)

    // Save state for undo
    const state = canvas.toDataURL()
    setHistory(prev => [...prev, state])

    // Broadcast drawing start
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({
      draw: {
        type: 'start',
        rx: x / canvas.width,
        ry: y / canvas.height,
        color: drawColor,
        width: lineWidth
      }
    })
    channel.close()
  }

  const draw = (e) => {
    if (!isDrawing || !drawingMode || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    ctx.lineTo(x, y)
    ctx.stroke()

    // Broadcast drawing move
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({
      draw: {
        type: 'draw',
        rx: x / canvas.width,
        ry: y / canvas.height
      }
    })
    channel.close()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHistory([])

    // Broadcast clear
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({ draw: { type: 'clear' } })
    channel.close()
  }

  const handleLocalUndo = () => {
    if (history.length === 0 || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const prevImg = new Image()
    const newHistory = [...history]
    const lastState = newHistory.pop()
    setHistory(newHistory)
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (newHistory.length > 0) {
      prevImg.src = newHistory[newHistory.length - 1]
      prevImg.onload = () => {
        ctx.drawImage(prevImg, 0, 0)
      }
    }
  }

  const handleUndo = () => {
    handleLocalUndo()

    // Broadcast undo
    const channel = new BroadcastChannel('crm_presentation_sync_' + id)
    channel.postMessage({ draw: { type: 'undo' } })
    channel.close()
  }
  const handleSlideClick = () => {
    if (!drawingMode) {
      nextSlide()
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[#285A47] flex items-center justify-center text-white">
        <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_empty</span>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-[#285A47] flex items-center justify-center text-white p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold">Esta presentación no tiene diapositivas</h2>
          <Link to={`/admin/crm/presentaciones/${id}/editar`} className="btn-primary mt-4 inline-flex">
            Ir al editor
          </Link>
        </div>
      </div>
    )
  }

  const currentSlide = slides[currentIdx]
  const nextSlideObj = currentIdx < slides.length - 1 ? slides[currentIdx + 1] : null

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs > 0 ? `${hrs}:` : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Presenter View Render Branch
  if (isPresenterWindow) {
    return (
      <div className="fixed inset-0 bg-gray-950 text-white flex flex-col font-sans p-6 overflow-hidden select-none z-50">
        {/* Presenter Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#A8D5C1] text-2xl">co_present</span>
            <span className="font-extrabold text-sm uppercase tracking-widest text-[#A8D5C1]">Vista del Presentador</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-gray-450">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[#A8D5C1]">
              <span className="material-symbols-outlined text-sm leading-none">schedule</span>
              <span>Hora ARG: {argentinaTime}</span>
            </div>
            <span>Diapositiva {currentIdx + 1} de {slides.length}</span>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          {/* Left: Audience preview */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">Vista de la Audiencia (Click para avanzar)</span>
            <div 
              className="flex-1 bg-black rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center aspect-video relative min-h-0 cursor-pointer"
              onClick={handleSlideClick}
            >
              {currentSlide?.mediaUrl ? (
                <img src={currentSlide.mediaUrl} className="w-full h-full object-contain select-none pointer-events-none" alt="Current Slide" />
              ) : (
                <span className="text-gray-500 text-xs">Sin imagen</span>
              )}
              {/* Canvas Overlay for drawing in presenter view */}
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className={`absolute inset-0 z-30 ${drawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
              />
            </div>
            
            {/* Annotation tools in Presenter View */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDrawingMode(d => !d); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${drawingMode ? 'bg-[var(--color-deep-green)] text-white shadow-md' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
                  title="Activar Dibujo (D)"
                >
                  <span className="material-symbols-outlined text-sm leading-none">gesture</span>
                  {drawingMode ? 'Dibujo Activo' : 'Dibujar'}
                </button>
                {drawingMode && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg">
                    {['#ff0000', '#ffeb3b', '#4caf50', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-transform ${drawColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUndo}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded-lg flex items-center gap-1"
                  title="Deshacer"
                >
                  <span className="material-symbols-outlined text-xs leading-none">undo</span>
                  Deshacer
                </button>
                <button
                  onClick={clearCanvas}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-xs font-semibold text-red-300 rounded-lg flex items-center gap-1"
                  title="Borrar Lienzo"
                >
                  <span className="material-symbols-outlined text-xs leading-none">delete_sweep</span>
                  Borrar
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-1 shrink-0">
              <button
                onClick={prevSlide}
                disabled={currentIdx === 0}
                className="flex-1 py-3.5 border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
                Anterior
              </button>
              <button
                onClick={nextSlide}
                disabled={currentIdx === slides.length - 1}
                className="flex-1 py-3.5 bg-[var(--color-deep-green)] text-white hover:bg-[var(--color-deep-green)]/90 disabled:opacity-30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                Siguiente
                <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right: Notes, Timer */}
          <div className="w-[450px] flex flex-col gap-6 shrink-0 min-h-0">
            {/* Notes & Guide box */}
            <div className="flex-1 min-h-0 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col">
              <div className="flex gap-4 border-b border-white/10 mb-3 shrink-0">
                <button
                  onClick={() => setNotesTab('guide')}
                  className={`pb-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    notesTab === 'guide'
                      ? 'border-[#A8D5C1] text-[#A8D5C1]'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                  Guía de Pasos
                </button>
                <button
                  onClick={() => setNotesTab('notes')}
                  className={`pb-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    notesTab === 'notes'
                      ? 'border-[#A8D5C1] text-[#A8D5C1]'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                  Notas Generales
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {notesTab === 'guide' ? (
                  <div className="space-y-3.5">
                    {(() => {
                      const itemsToRender = slides.flatMap((slide, idx) => {
                        return [
                          {
                            id: `auto-slide-${slide.id}`,
                            type: 'diapo',
                            title: `[Diapo ${idx + 1}] Presentar: ${slide.title || 'Diapositiva ' + (idx + 1)}`,
                            details: slide.notes || (slide.mediaUrl ? 'Verificar que la audiencia vea la imagen.' : 'Diapositiva de transición.'),
                            isAuto: true,
                            slideIndex: idx
                          },
                          ...(slide.guide || []).map(g => ({ ...g, slideIndex: idx }))
                        ]
                      })
                      
                      return itemsToRender.map((item, itemGlobalIdx) => {
                        const isChecked = !!checkedItems[item.id]
                        const isCurrentSlide = item.slideIndex === currentIdx
                        
                        let badgeColor = 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        let typeText = 'General'
                        let iconName = 'description'
                        
                        if (item.type === 'diapo') {
                          badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          typeText = 'Diapo'
                          iconName = 'movie'
                        } else if (item.type === 'sitio_web') {
                          badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          typeText = 'Sitio Web'
                          iconName = 'language'
                        } else if (item.type === 'chatgpt') {
                          badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          typeText = 'ChatGPT'
                          iconName = 'smart_toy'
                        }
                        
                        return (
                          <div 
                            key={`${item.id}-${itemGlobalIdx}`} 
                            onClick={() => toggleItemChecked(item.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-start select-none ${
                              isChecked 
                                ? 'bg-white/5 border-white/10 opacity-40' 
                                : isCurrentSlide
                                  ? 'bg-white/10 border-[#A8D5C1]/50 shadow-[0_0_15px_rgba(168,213,193,0.15)] ring-1 ring-[#A8D5C1]/30'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-75'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              <span className="material-symbols-outlined text-lg">
                                {isChecked ? 'check_box' : 'check_box_outline_blank'}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${badgeColor} flex items-center gap-1`}>
                                  <span className="material-symbols-outlined text-[10px]">{iconName}</span>
                                  {typeText}
                                </span>
                                <h4 className={`text-xs font-bold leading-normal truncate ${isChecked ? 'line-through' : 'text-white'}`}>
                                  {item.title || 'Paso sin título'}
                                </h4>
                              </div>
                              {item.details && (
                                <p className={`text-[11px] leading-relaxed font-medium ${isChecked ? 'text-gray-500' : 'text-[#A8D5C1]/80'}`}>
                                  {item.details}
                                </p>
                              )}
                              {item.url && (
                                <div className="pt-1.5">
                                  <button
                                    onClick={(e) => handleLinkClick(e, item.url, item.id)}
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer border ${
                                      item.type === 'chatgpt'
                                        ? 'bg-emerald-950/45 hover:bg-emerald-900/60 border-emerald-800/40 text-emerald-300'
                                        : 'bg-cyan-950/45 hover:bg-cyan-900/60 border-cyan-800/40 text-cyan-300'
                                    }`}
                                    title={`Abrir ${item.url} en una pestaña nueva`}
                                  >
                                    <span className="material-symbols-outlined text-[11px] leading-none">open_in_new</span>
                                    {item.type === 'chatgpt' ? 'Ir a ChatGPT' : 'Abrir Sitio Web'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-line font-medium">
                    {currentSlide?.notes || 'Sin notas escritas para esta diapositiva.'}
                  </div>
                )}
              </div>
            </div>

            {/* Next Slide Preview */}
            {nextSlideObj && (
              <div className="border-t border-white/10 pt-4 shrink-0">
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block mb-2">Próxima Diapositiva</span>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                  <div className="w-20 aspect-video rounded overflow-hidden bg-black shrink-0">
                    <img src={nextSlideObj.mediaUrl} className="w-full h-full object-contain" alt="Next slide" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{nextSlideObj.title || 'Sin Título'}</h5>
                    <p className="text-[9px] text-gray-400 capitalize mt-0.5">Siguiente</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Slide Layout Rendering helper
  const renderSlideContent = (slide) => {
    const { mediaUrl } = slide

    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center aspect-video">
        {mediaUrl ? (
          <img src={mediaUrl} className="w-full h-full object-contain select-none pointer-events-none" alt="Diapositiva" />
        ) : (
          <div className="text-gray-500 text-xs font-semibold flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-gray-600">image</span>
            <span>Sin imagen de diapositiva</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#285A47] text-white flex flex-col overflow-hidden select-none select-none font-sans z-50">
      
      {/* Laser Pointer Trail layer */}
      {laserPointer && (
        <div 
          className="absolute w-8 h-8 rounded-full bg-red-600/80 pointer-events-none z-40 transition-all duration-75 blur-sm"
          style={{
            left: mousePos.x - 16,
            top: mousePos.y - 16,
            boxShadow: '0 0 16px 8px rgba(220, 38, 38, 0.9)'
          }}
        />
      )}

      {/* Main Slide frame */}
      <div 
        ref={playerRef}
        onMouseMove={handleMouseMove}
        onClick={handleSlideClick}
        className="flex-1 w-full h-full flex flex-col justify-center items-center relative cursor-pointer"
        style={{ fontSize: '1.4vw' }}
      >
        <div className="w-full aspect-video h-full max-h-[56.25vw] max-w-[177.78vh] flex flex-col justify-between relative">
          {renderSlideContent(currentSlide)}
          
          {/* Drawing Canvas Overlay aligned with slide coordinates */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`absolute inset-0 z-30 ${drawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
          />

          {/* Activity Countdown Overlay */}
          {countdownSecondsLeft > 0 && (
            <div className="absolute top-6 right-6 z-40 bg-black/85 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl animate-pulse font-mono text-3xl font-black text-yellow-400">
              <span className="material-symbols-outlined text-3xl text-yellow-400">alarm</span>
              <span>{Math.floor(countdownSecondsLeft / 60)}:{String(countdownSecondsLeft % 60).padStart(2, '0')}</span>
            </div>
          )}
          
          {/* Time Up Alert Overlay */}
          {showTimeUp && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
              <div className="bg-red-950/90 border border-red-500/40 rounded-3xl p-8 max-w-sm text-center shadow-2xl animate-bounce">
                <span className="material-symbols-outlined text-6xl text-red-400 animate-ping mb-3">alarm_on</span>
                <h3 className="text-3xl font-black text-white tracking-wide uppercase">¡Tiempo Cumplido!</h3>
                <p className="text-sm text-gray-300 mt-2">La actividad práctica ha finalizado.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOAT BAR CONTROLS (Hover to show / auto-hide) */}
      {isPublic ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-2 px-5 flex items-center gap-4 z-40 shadow-2xl transition-opacity hover:opacity-100 opacity-60 duration-300">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevSlide}
              disabled={currentIdx === 0}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30"
              title="Anterior"
            >
              <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
            </button>
            <span className="text-xs font-extrabold text-white/80 min-w-[3rem] text-center">
              {currentIdx + 1} / {slides.length}
            </span>
            <button 
              onClick={nextSlide}
              disabled={currentIdx === slides.length - 1}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30"
              title="Siguiente"
            >
              <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
            </button>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
            title="Pantalla Completa (F)"
          >
            <span className="material-symbols-outlined text-lg leading-none">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-2 px-5 flex items-center gap-4 z-40 shadow-2xl transition-opacity hover:opacity-100 opacity-20 duration-300">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevSlide}
              disabled={currentIdx === 0}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
            </button>
            <span className="text-xs font-extrabold text-white/80 min-w-[3rem] text-center">
              {currentIdx + 1} / {slides.length}
            </span>
            <button 
              onClick={nextSlide}
              disabled={currentIdx === slides.length - 1}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
            </button>
          </div>

          <div className="w-px h-5 bg-white/20" />

          {/* Laser & Annotation tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setLaserPointer(l => !l); if (drawingMode) setDrawingMode(false); }}
              className={`p-2 rounded-full transition-colors flex items-center ${laserPointer ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-white/10 text-white/70'}`}
              title="Puntero Láser (L)"
            >
              <span className="material-symbols-outlined text-lg leading-none">flare</span>
            </button>

            <button
              onClick={() => { setDrawingMode(d => !d); if (laserPointer) setLaserPointer(false); }}
              className={`p-2 rounded-full transition-colors flex items-center ${drawingMode ? 'bg-[var(--color-deep-green)] text-white shadow-lg' : 'hover:bg-white/10 text-white/70'}`}
              title="Anotaciones / Dibujo (D)"
            >
              <span className="material-symbols-outlined text-lg leading-none">gesture</span>
            </button>

            {drawingMode && (
              <div className="flex items-center gap-1 ml-1 animate-fade-in">
                {['#ff0000', '#ffeb3b', '#4caf50', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={`w-4 h-4 rounded-full border border-white/20 transition-transform ${drawColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button 
                  onClick={handleUndo}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/80"
                  title="Deshacer (Ctrl+Z)"
                >
                  <span className="material-symbols-outlined text-sm leading-none">undo</span>
                </button>
                <button 
                  onClick={clearCanvas}
                  className="p-1.5 hover:bg-white/10 rounded-full text-red-400"
                  title="Borrar lienzo"
                >
                  <span className="material-symbols-outlined text-sm leading-none">delete_sweep</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/20" />

          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenPresenterWindow}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              title="Abrir Vista Presentador (P)"
            >
              <span className="material-symbols-outlined text-lg leading-none">co_present</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              title="Pantalla Completa (F)"
            >
              <span className="material-symbols-outlined text-lg leading-none">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
            
            <button
              onClick={() => navigate(`/admin/crm/presentaciones/${id}/editar`)}
              className="p-2 hover:bg-red-500/25 hover:text-red-300 rounded-full transition-colors text-white/70"
              title="Salir de la proyección"
            >
              <span className="material-symbols-outlined text-lg leading-none">cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
