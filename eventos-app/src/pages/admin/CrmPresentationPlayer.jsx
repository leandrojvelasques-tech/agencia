import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exportPresentationToPdf } from '../../lib/pdfExport'

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'uuid-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

export default function CrmPresentationPlayer({ isPublic = false }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [presentation, setPresentation] = useState(null)
  const [slides, setSlides] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [draggedGuideIdx, setDraggedGuideIdx] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const isGuideClickNavigationRef = useRef(false)

  const [blocksList, setBlocksList] = useState([])

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
  const [checkedItems, setCheckedItems] = useState({}) // { [itemId]: boolean }
  const [selectedGuideItemId, setSelectedGuideItemId] = useState(null)

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

  const handleGuideDragStart = (e, index) => {
    setDraggedGuideIdx(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleGuideDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleGuideDrop = async (e, targetIdx) => {
    e.preventDefault()
    if (draggedGuideIdx === null || draggedGuideIdx === targetIdx) return

    const currentFlatList = slides.flatMap((slide, idx) => {
      return [
        {
          id: `auto-slide-${slide.id}`,
          type: 'diapo',
          title: `[Diapo ${idx + 1}] Presentar: ${slide.title || 'Diapositiva ' + (idx + 1)}`,
          details: slide.notes || (slide.mediaUrl ? 'Verificar que la audiencia vea la imagen.' : 'Diapositiva de transición.'),
          isAuto: true,
          slideIndex: idx,
          slideId: slide.id
        },
        ...(slide.guide || []).map(g => ({ ...g, slideIndex: idx }))
      ]
    })

    const draggedItem = currentFlatList[draggedGuideIdx]
    currentFlatList.splice(draggedGuideIdx, 1)
    currentFlatList.splice(targetIdx, 0, draggedItem)

    const newSlides = JSON.parse(JSON.stringify(slides))
    newSlides.forEach(s => s.guide = [])
    
    let currentSlideId = newSlides[0]?.id
    
    currentFlatList.forEach(item => {
      if (item.isAuto) {
        currentSlideId = item.slideId
      } else {
        const slide = newSlides.find(s => s.id === currentSlideId)
        if (slide) {
          const { slideIndex, slideId, ...cleanItem } = item
          slide.guide.push(cleanItem)
        }
      }
    })

    setSlides(newSlides)
    setDraggedGuideIdx(null)

    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error saving reordered guide', error)
      })
    }
  }

  const handleGuideDragEnd = () => {
    setDraggedGuideIdx(null)
  }

  // Sync selected guide item when slide changes
  useEffect(() => {
    if (isGuideClickNavigationRef.current) return
    if (slides[currentIdx]) {
      setSelectedGuideItemId(`auto-slide-${slides[currentIdx].id}`)
    }
  }, [currentIdx])

  // Helper to find the active selected item object
  const selectedStepItem = (() => {
    if (!selectedGuideItemId) return null
    if (selectedGuideItemId.startsWith('auto-slide-')) {
      const slideId = selectedGuideItemId.replace('auto-slide-', '')
      const slide = slides.find(s => s.id === slideId)
      return slide ? { ...slide, isAuto: true } : null
    }
    for (const slide of slides) {
      const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
      if (item) return { ...item, isAuto: false }
    }
    return null
  })()

  // Helper to find the active selected item's notes
  const selectedStepNotes = (() => {
    if (!selectedGuideItemId) return ''
    if (selectedGuideItemId.startsWith('auto-slide-')) {
      const slideId = selectedGuideItemId.replace('auto-slide-', '')
      const slide = slides.find(s => s.id === slideId)
      return slide?.notes || ''
    }
    for (const slide of slides) {
      const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
      if (item) return item.details || ''
    }
    return ''
  })()

  // Helper to find the active selected item's URL
  const selectedStepUrl = (() => {
    if (!selectedGuideItemId) return ''
    if (selectedGuideItemId.startsWith('auto-slide-')) {
      const slideId = selectedGuideItemId.replace('auto-slide-', '')
      const slide = slides.find(s => s.id === slideId)
      return slide?.url || ''
    }
    for (const slide of slides) {
      const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
      if (item) return item.url || ''
    }
    return ''
  })()

  const handleUpdateStepNotes = (newNotes) => {
    if (!selectedGuideItemId) return
    const newSlides = JSON.parse(JSON.stringify(slides))
    if (selectedGuideItemId.startsWith('auto-slide-')) {
      const slideId = selectedGuideItemId.replace('auto-slide-', '')
      const slide = newSlides.find(s => s.id === slideId)
      if (slide) slide.notes = newNotes
    } else {
      let found = false
      for (const slide of newSlides) {
        const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
        if (item) {
          item.details = newNotes
          found = true
          break
        }
      }
      if (!found) return
    }
    setSlides(newSlides)
    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error saving step notes', error)
      })
    }
  }

  const handleUpdateStepUrl = (newUrl) => {
    if (!selectedGuideItemId) return
    const newSlides = JSON.parse(JSON.stringify(slides))
    if (selectedGuideItemId.startsWith('auto-slide-')) {
      const slideId = selectedGuideItemId.replace('auto-slide-', '')
      const slide = newSlides.find(s => s.id === slideId)
      if (slide) slide.url = newUrl
    } else {
      let found = false
      for (const slide of newSlides) {
        const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
        if (item) {
          item.url = newUrl
          found = true
          break
        }
      }
      if (!found) return
    }
    setSlides(newSlides)
    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error saving step URL', error)
      })
    }
  }

  const handleDeleteGuideItem = (itemId) => {
    const newSlides = JSON.parse(JSON.stringify(slides))
    let deleted = false
    for (const slide of newSlides) {
      const lenBefore = slide.guide?.length || 0
      slide.guide = (slide.guide || []).filter(g => g.id !== itemId)
      if (slide.guide.length !== lenBefore) {
        deleted = true
        break
      }
    }
    if (!deleted) return
    setSlides(newSlides)
    if (selectedGuideItemId === itemId && slides[currentIdx]) {
      setSelectedGuideItemId(`auto-slide-${slides[currentIdx].id}`)
    }
    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error deleting guide item', error)
      })
    }
  }

  const handleAddStepInPlayer = () => {
    if (slides.length === 0) return
    const newSlides = JSON.parse(JSON.stringify(slides))
    const currentSlide = newSlides[currentIdx]
    if (!currentSlide) return

    const newStep = {
      id: generateUUID(),
      type: 'general',
      title: 'Nuevo paso',
      details: '',
      url: ''
    }

    if (!Array.isArray(currentSlide.guide)) {
      currentSlide.guide = []
    }
    
    currentSlide.guide.push(newStep)
    setSlides(newSlides)
    setSelectedGuideItemId(newStep.id)

    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error saving new step', error)
      })
    }
  }

  const handleUpdateStepTitle = (newTitle) => {
    if (!selectedGuideItemId || selectedGuideItemId.startsWith('auto-slide-')) return
    const newSlides = JSON.parse(JSON.stringify(slides))
    let found = false
    for (const slide of newSlides) {
      const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
      if (item) {
        item.title = newTitle
        found = true
        break
      }
    }
    if (!found) return
    setSlides(newSlides)
    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error saving step title', error)
      })
    }
  }

  const handleUpdateStepType = (newType) => {
    if (!selectedGuideItemId || selectedGuideItemId.startsWith('auto-slide-')) return
    const newSlides = JSON.parse(JSON.stringify(slides))
    let found = false
    for (const slide of newSlides) {
      const item = (slide.guide || []).find(g => g.id === selectedGuideItemId)
      if (item) {
        item.type = newType
        found = true
        break
      }
    }
    if (!found) return
    setSlides(newSlides)
    if (id) {
      supabase.from('crm_presentations').update({ slides: newSlides }).eq('id', id).then(({error}) => {
        if (error) console.error('Error saving step type', error)
      })
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
          const loadedSlides = Array.isArray(data.slides) ? data.slides : []
          setSlides(loadedSlides)
          if (loadedSlides.length > 0) {
            setSelectedGuideItemId(`auto-slide-${loadedSlides[0].id}`)
          }

          // Fetch event agenda if exists
          let evBlocks = []
          if (data.event_id) {
            const { data: evData, error: evError } = await supabase
              .from('events')
              .select('agenda')
              .eq('id', data.event_id)
              .single()
            if (!evError && evData && Array.isArray(evData.agenda)) {
              evBlocks = evData.agenda.flatMap(s => s.blocks || [])
            }
          }

          // Fetch template agendas if any slides reference templates
          let tempBlocks = []
          const templateIds = [...new Set(loadedSlides.map(s => s.agendaTemplateId).filter(Boolean))]
          if (templateIds.length > 0) {
            const { data: tempData, error: tempError } = await supabase
              .from('agenda_templates')
              .select('agenda')
              .in('id', templateIds)
            if (!tempError && tempData) {
              tempBlocks = tempData.flatMap(t => Array.isArray(t.agenda) ? t.agenda.flatMap(s => s.blocks || []) : [])
            }
          }

          setBlocksList([...evBlocks, ...tempBlocks])
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

  const getSlideBlockInfo = (slide) => {
    if (!slide) return { bloque: '', tema: '' }
    const block = blocksList.find(b => (b.id || b.title) === slide.blockId)
    return {
      bloque: block ? block.title : (slide.bloque || ''),
      tema: block ? (block.subtitle || '') : (slide.tema || '')
    }
  }

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
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.error('Error enabling fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // If typing in an input or textarea, ignore shortcuts
      const tagName = document.activeElement?.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return
      }

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

  const handleExportPdf = async (e) => {
    if (e) e.stopPropagation();
    if (!presentation || slides.length === 0) return
    setExportingPdf(true)
    setExportProgress('0%')
    try {
      await exportPresentationToPdf(presentation.title || 'presentacion', slides, (curr, total) => {
        setExportProgress(`${Math.round((curr / total) * 100)}%`)
      })
      alert('PDF exportado correctamente.')
    } catch (err) {
      console.error('Error al exportar PDF:', err)
      alert('Error al exportar PDF: ' + err.message)
    } finally {
      setExportingPdf(false)
      setExportProgress('')
    }
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
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800/40 px-3 py-1.5 rounded-xl text-red-300 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Exportar todas las diapositivas a PDF"
            >
              <span className={`material-symbols-outlined text-sm leading-none ${exportingPdf ? 'animate-spin' : ''}`}>
                {exportingPdf ? 'sync' : 'picture_as_pdf'}
              </span>
              <span>{exportingPdf ? `Exportando (${exportProgress})` : 'Exportar PDF'}</span>
            </button>
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
              {(() => {
                const blockInfo = getSlideBlockInfo(currentSlide)
                return (blockInfo.bloque || blockInfo.tema) && (
                  <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 select-none pointer-events-none max-w-[80%]">
                    {blockInfo.bloque && (
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A8D5C1]"></span>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#A8D5C1] truncate max-w-[120px]" title={blockInfo.bloque}>
                          {blockInfo.bloque}
                        </span>
                      </div>
                    )}
                    {blockInfo.tema && (
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg shadow-lg text-white">
                        <span className="text-[8px] font-bold tracking-wide truncate max-w-[150px]" title={blockInfo.tema}>
                          {blockInfo.tema}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}

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

          {/* Right sidebar: 2-column layout (700px wide) */}
          <div className="w-[700px] flex gap-4 shrink-0 min-h-0">
            
            {/* Column 1: Speaker Guide Checklist */}
            <div className="w-[320px] bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col min-h-0 shrink-0">
              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-3 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8D5C1] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                  Guía de Pasos
                </span>
                <button
                  onClick={handleAddStepInPlayer}
                  className="p-1 hover:bg-white/10 rounded text-[#A8D5C1] text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer border border-[#A8D5C1]/30 bg-white/5"
                  title="Agregar un nuevo paso a la diapositiva actual"
                >
                  <span className="material-symbols-outlined text-xs leading-none">add_circle</span>
                  + Paso
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
                {(() => {
                  const itemsToRender = slides.flatMap((slide, idx) => {
                    return [
                      {
                        id: `auto-slide-${slide.id}`,
                        type: 'diapo',
                        title: `[Diapo ${idx + 1}] Presentar: ${slide.title || 'Diapositiva ' + (idx + 1)}`,
                        details: slide.notes || (slide.mediaUrl ? 'Verificar que la audiencia vea la imagen.' : 'Diapositiva de transición.'),
                        isAuto: true,
                        slideIndex: idx,
                        url: slide.url
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
                        draggable
                        onDragStart={(e) => handleGuideDragStart(e, itemGlobalIdx)}
                        onDragOver={(e) => handleGuideDragOver(e, itemGlobalIdx)}
                        onDrop={(e) => handleGuideDrop(e, itemGlobalIdx)}
                        onDragEnd={handleGuideDragEnd}
                        onClick={() => {
                          isGuideClickNavigationRef.current = true
                          setSelectedGuideItemId(item.id)
                          if (typeof item.slideIndex === 'number' && item.slideIndex !== currentIdx) {
                            updateSlideIdx(item.slideIndex)
                          }
                          setTimeout(() => {
                            isGuideClickNavigationRef.current = false
                          }, 50)
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex gap-3 items-start select-none relative group ${
                          isChecked 
                            ? 'bg-white/5 border-white/10 opacity-40' 
                            : selectedGuideItemId === item.id
                              ? 'bg-white/15 border-[#A8D5C1] ring-1 ring-[#A8D5C1]/30 shadow-[0_0_15px_rgba(168,213,193,0.15)]'
                              : isCurrentSlide
                                ? 'bg-white/10 border-[#A8D5C1]/30'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-75'
                        } ${draggedGuideIdx === itemGlobalIdx ? 'opacity-20' : ''}`}
                      >
                        <div 
                          className="pt-0.5 shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItemChecked(item.id);
                          }}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isChecked ? 'check_box' : 'check_box_outline_blank'}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1 pr-6">
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
                            <p className={`text-[11px] leading-relaxed font-medium line-clamp-2 ${isChecked ? 'text-gray-500' : 'text-[#A8D5C1]/80'}`}>
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

                        {!item.isAuto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGuideItem(item.id);
                            }}
                            className="absolute right-3 top-3 p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Eliminar paso de la guía"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Column 2: Selected Step Notes & Next Slide Preview */}
            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 min-h-0">
              {/* Selected Step Notes */}
              {selectedStepItem ? (
                <div className="flex-1 flex flex-col min-h-0 gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8D5C1] flex items-center gap-1.5 shrink-0">
                    <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                    Notas del Paso Seleccionado
                  </span>
                  
                  {/* Title and Type Row (Only for Custom steps) */}
                  {!selectedStepItem.isAuto && (
                    <div className="flex gap-2 shrink-0">
                      <select
                        value={selectedStepItem.type || 'general'}
                        onChange={(e) => handleUpdateStepType(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#A8D5C1]/50 cursor-pointer font-bold"
                      >
                        <option value="diapo" className="bg-gray-900">🎬 Diapo</option>
                        <option value="sitio_web" className="bg-gray-900">🌐 Sitio Web</option>
                        <option value="chatgpt" className="bg-gray-900">🤖 ChatGPT</option>
                        <option value="general" className="bg-gray-900">📝 General</option>
                      </select>
                      
                      <input
                        type="text"
                        value={selectedStepItem.title || ''}
                        onChange={(e) => handleUpdateStepTitle(e.target.value)}
                        placeholder="Título del paso..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#A8D5C1]/50 font-bold"
                      />
                    </div>
                  )}

                  {/* Title display for Auto slide */}
                  {selectedStepItem.isAuto && (
                    <div className="text-xs font-bold text-white shrink-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      {selectedStepItem.title || 'Diapositiva ' + (currentIdx + 1)}
                    </div>
                  )}

                  {/* Optional URL Redirect Input */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
                    <span className="material-symbols-outlined text-xs text-[#A8D5C1]">link</span>
                    <input
                      type="text"
                      value={selectedStepUrl}
                      onChange={(e) => handleUpdateStepUrl(e.target.value)}
                      placeholder="Enlace / URL de redirección (opcional)..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>

                  <textarea
                    value={selectedStepNotes}
                    onChange={(e) => handleUpdateStepNotes(e.target.value)}
                    placeholder="Escribe notas o apuntes más extensos para este paso aquí..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-[#A8D5C1]/50 resize-none font-medium text-white"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-500 italic">
                  Selecciona un paso de la guía para ver o editar sus notas
                </div>
              )}

              {/* Next Slide Preview at the bottom of Column 2 */}
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
      </div>
    )
  }

  // Slide Layout Rendering helper
  const renderSlideContent = (slide) => {
    if (!slide) return null
    const { mediaUrl } = slide
    const blockInfo = getSlideBlockInfo(slide)
    const displayBloque = blockInfo.bloque
    const displayTema = blockInfo.tema

    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center aspect-video">
        {/* Bloque and Tema Overlay */}
        {(displayBloque || displayTema) && (
          <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 select-none pointer-events-none max-w-[80%]">
            {displayBloque && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8D5C1]"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A8D5C1] truncate max-w-[180px]" title={displayBloque}>
                  {displayBloque}
                </span>
              </div>
            )}
            {displayTema && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg shadow-lg text-white">
                <span className="text-[10px] font-bold tracking-wide truncate max-w-[250px]" title={displayTema}>
                  {displayTema}
                </span>
              </div>
            )}
          </div>
        )}

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

  const renderFloatingControls = () => {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-2 px-5 flex items-center gap-4 z-40 shadow-2xl transition-opacity hover:opacity-100 opacity-60 duration-300">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            disabled={currentIdx === 0}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30 flex items-center"
            title="Anterior"
          >
            <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
          </button>
          <span className="text-xs font-extrabold text-white/80 min-w-[3rem] text-center">
            {currentIdx + 1} / {slides.length}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            disabled={currentIdx === slides.length - 1}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white disabled:opacity-30 flex items-center"
            title="Siguiente"
          >
            <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
          </button>
        </div>
        <div className="w-px h-5 bg-white/20" />
        
        {/* Laser & Annotation tools */}
        {!isPublic && (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setLaserPointer(l => !l); if (drawingMode) setDrawingMode(false); }}
                className={`p-2 rounded-full transition-colors flex items-center ${laserPointer ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-white/10 text-white/70'}`}
                title="Puntero Láser (L)"
              >
                <span className="material-symbols-outlined text-lg leading-none">flare</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setDrawingMode(d => !d); if (laserPointer) setLaserPointer(false); }}
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
                    onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80"
                    title="Deshacer (Ctrl+Z)"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">undo</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearCanvas(); }}
                    className="p-1.5 hover:bg-white/10 rounded-full text-red-400"
                    title="Borrar lienzo"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">delete_sweep</span>
                  </button>
                </div>
              )}
            </div>
            <div className="w-px h-5 bg-white/20" />
          </>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); handleExportPdf(); }}
          disabled={exportingPdf}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-400 disabled:opacity-50 cursor-pointer flex items-center"
          title="Descargar diapositivas en PDF"
        >
          <span className={`material-symbols-outlined text-lg leading-none ${exportingPdf ? 'animate-spin' : ''}`}>
            {exportingPdf ? 'sync' : 'picture_as_pdf'}
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 flex items-center"
          title="Pantalla Completa (F)"
        >
          <span className="material-symbols-outlined text-lg leading-none">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
        {!isPublic && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/crm/presentaciones/${id}/editar`); }}
            className="p-2 hover:bg-red-500/25 hover:text-red-300 rounded-full transition-colors text-white/70 flex items-center"
            title="Salir de la proyección"
          >
            <span className="material-symbols-outlined text-lg leading-none">cancel</span>
          </button>
        )}
      </div>
    )
  }

  if (!isPresenterWindow) {
    if (isFullscreen) {
      // Fullscreen view (16:9 full black screen projection)
      return (
        <div className="fixed inset-0 bg-black text-white flex flex-col justify-center items-center overflow-hidden z-50 font-sans">
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

          <div 
            ref={playerRef}
            onMouseMove={handleMouseMove}
            onClick={handleSlideClick}
            className="w-full aspect-video h-full max-h-[56.25vw] max-w-[177.78vh] flex flex-col justify-between relative cursor-pointer"
            style={{ fontSize: '1.4vw' }}
          >
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

          {/* Floating Controls Bar */}
          {renderFloatingControls()}
        </div>
      )
    }

    // Default scrollable reader view (with Ficha de Contenido)
    const ficha = currentSlide?.ficha || null

    return (
      <div className="min-h-screen bg-[var(--color-refined-gray)] text-[var(--color-dark-gray)] font-sans pb-16 flex flex-col">
        {/* Sticky Reader Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {!isPublic && (
              <Link
                to={`/admin/crm/presentaciones/${id}/editar`}
                className="p-2 border border-gray-200 rounded-premium hover:bg-gray-50 text-[var(--color-dark-gray)] flex items-center"
              >
                <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
              </Link>
            )}
            <div>
              <h2 className="text-base font-extrabold text-[var(--color-deep-green)] leading-tight">{presentation?.title || 'Presentación'}</h2>
              <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider mt-0.5">
                Diapositiva {currentIdx + 1} de {slides.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-3.5 py-2 border border-red-250 hover:bg-red-50 disabled:opacity-50 text-xs font-bold text-red-700 rounded-premium flex items-center gap-1.5 transition-colors cursor-pointer flex items-center"
            >
              <span className="material-symbols-outlined text-base leading-none">
                {exportingPdf ? 'sync' : 'picture_as_pdf'}
              </span>
              <span>{exportingPdf ? 'Descargando...' : 'Descargar PDF'}</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3.5 py-2 bg-[var(--color-deep-green)] text-white hover:bg-[var(--color-deep-green)]/95 text-xs font-bold rounded-premium flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">fullscreen</span>
              <span>Proyectar</span>
            </button>
          </div>
        </div>

        {/* Slide Reader Section */}
        <div className="max-w-4xl w-full mx-auto px-4 mt-6 flex flex-col gap-6">
          {/* 16:9 Slide Player Container */}
          <div className="bg-black rounded-2xl border border-gray-200 overflow-hidden relative shadow-lg group">
            <div className="aspect-video w-full flex items-center justify-center">
              {renderSlideContent(currentSlide)}
            </div>

            {/* Navigation Overlays */}
            <button
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              disabled={currentIdx === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity z-20"
              title="Anterior"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              disabled={currentIdx === slides.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity z-20"
              title="Siguiente"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>

          {/* Slide Navigation Dots */}
          <div className="flex justify-center flex-wrap gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => updateSlideIdx(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentIdx 
                    ? 'bg-[var(--color-deep-green)] w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={`Ir a diapositiva ${idx + 1}`}
              />
            ))}
          </div>

          {/* Ficha de Contenido */}
          {ficha ? (
            <div className="card p-6 md:p-8 bg-white border border-gray-150 shadow-sm rounded-2xl space-y-6 mt-2">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-green)]/70">Ficha de estudio</span>
                <h1 className="text-2xl font-extrabold text-[var(--color-deep-green)] mt-1">{ficha.title || currentSlide?.title}</h1>
                {ficha.subtitle && (
                  <p className="text-sm font-semibold text-gray-500 mt-1">{ficha.subtitle}</p>
                )}
              </div>

              {ficha.summary && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Resumen</h3>
                  <p className="text-sm text-[var(--color-dark-gray)]/85 leading-relaxed whitespace-pre-line font-medium">
                    {ficha.summary}
                  </p>
                </div>
              )}

              {ficha.keyIdeas && ficha.keyIdeas.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Ideas Fuerza</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ficha.keyIdeas.map((idea, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border border-[var(--color-deep-green)]/8 bg-[var(--color-light-green)]/5 flex flex-col gap-2">
                        <h4 className="font-bold text-[var(--color-deep-green)] text-sm">{idea.title}</h4>
                        <p className="text-xs leading-relaxed text-[var(--color-dark-gray)]/80 font-medium whitespace-pre-line">
                          {idea.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ficha.closingIdea && (
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800/60">Idea de Cierre</h3>
                  <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">
                    “{ficha.closingIdea}”
                  </p>
                </div>
              )}

              {ficha.glossary && ficha.glossary.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Glosario Breve</h3>
                  <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/50">
                    {ficha.glossary.map((item, idx) => (
                      <div key={idx} className="p-4 flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
                        <span className="font-bold text-xs text-[var(--color-deep-green)] md:w-1/4 shrink-0 uppercase tracking-wider">{item.term}</span>
                        <p className="text-xs text-[var(--color-dark-gray)]/80 font-medium leading-relaxed md:w-3/4">
                          {item.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-xs italic">
              Esta diapositiva no contiene ficha de estudio adicional.
            </div>
          )}
        </div>
      </div>
    )
  }
}
