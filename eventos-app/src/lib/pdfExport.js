import { jsPDF } from 'jspdf'

/**
 * Loads an image from a URL and returns an Image object.
 * Sets crossOrigin to anonymous to allow reading pixels in Canvas.
 */
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Draws a slide image to fit a 2048x1152 canvas (contain) and returns a JPEG data URL.
 * Using high resolution (2048x1152) and JPEG at 0.88 quality keeps text/details sharp
 * while reducing the file size to 1/20th compared to PNG, staying well under the 50MB limit.
 */
const drawImageSlide = (img) => {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1152
  const ctx = canvas.getContext('2d')
  
  // Fill background with black
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 2048, 1152)
  
  const imgRatio = img.width / img.height
  const canvasRatio = 2048 / 1152
  let drawWidth = 2048
  let drawHeight = 1152
  let offsetX = 0
  let offsetY = 0
  
  if (imgRatio > canvasRatio) {
    drawHeight = 2048 / imgRatio
    offsetY = (1152 - drawHeight) / 2
  } else {
    drawWidth = 1152 * imgRatio
    offsetX = (2048 - drawWidth) / 2
  }
  
  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
  return canvas.toDataURL('image/jpeg', 0.88)
}

/**
 * Draws a premium high-resolution text/placeholder slide and returns a JPEG data URL.
 */
const drawPlaceholderSlide = (slide, index, total) => {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1152
  const ctx = canvas.getContext('2d')
  
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 2048, 1152)
  grad.addColorStop(0, '#285A47')
  grad.addColorStop(1, '#1b3e31')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 2048, 1152)
  
  // Subtle decorative circles
  ctx.strokeStyle = 'rgba(168, 213, 193, 0.08)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(2048, 0, 700, 0, 2 * Math.PI)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.arc(0, 1152, 400, 0, 2 * Math.PI)
  ctx.stroke()

  // Slide index
  ctx.fillStyle = 'rgba(168, 213, 193, 0.4)'
  ctx.font = 'bold 44px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${index + 1} / ${total}`, 1888, 100)

  // Slide Title (centered, wrapped)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 88px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  const words = (slide.title || `Diapositiva ${index + 1}`).split(' ')
  let line = ''
  const lines = []
  const maxWidth = 1600
  const lineHeight = 110
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line)
      line = words[n] + ' '
    } else {
      line = testLine
    }
  }
  lines.push(line)
  
  const startY = 576 - ((lines.length - 1) * lineHeight) / 2
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i].trim(), 1024, startY + i * lineHeight)
  }
  
  // Footer branding
  ctx.fillStyle = 'rgba(168, 213, 193, 0.7)'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('PORTER AI • Academia de Automatización', 160, 1052)
  
  return canvas.toDataURL('image/jpeg', 0.88)
}

/**
 * Main export function
 * @param {string} title Presentation title
 * @param {Array} slides List of slide objects
 * @param {Function} onProgress Optional callback(current, total)
 */
export async function exportPresentationToPdf(title, slides, onProgress = null) {
  if (!slides || slides.length === 0) {
    throw new Error('La presentación no contiene diapositivas.')
  }
  
  const total = slides.length
  
  // Pre-load all slides (fetch images or prepare placeholders)
  const slideImages = []
  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total)
    const slide = slides[i]
    try {
      if (slide.mediaUrl) {
        const img = await loadImage(slide.mediaUrl)
        const dataUrl = drawImageSlide(img)
        slideImages.push(dataUrl)
      } else {
        slideImages.push(drawPlaceholderSlide(slide, i, total))
      }
    } catch (err) {
      console.warn(`Error rendering slide ${i + 1}, using placeholder:`, err)
      slideImages.push(drawPlaceholderSlide(slide, i, total))
    }
  }
  
  // Generate PDF using jsPDF in high resolution
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [2048, 1152]
  })
  
  // Add each slide to the PDF
  slideImages.forEach((dataUrl, index) => {
    if (index > 0) {
      doc.addPage()
    }
    // Set active page to current page
    doc.setPage(index + 1)
    // Add JPEG image stretching across the full high-res page with FAST compression
    doc.addImage(dataUrl, 'JPEG', 0, 0, 2048, 1152, undefined, 'FAST')
  })
  
  // Sanitize title for filename
  const safeTitle = (title || 'presentacion')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with hyphen
    .replace(/(^-|-$)/g, '')         // trim leading/trailing hyphens
    
  const filename = `diapositivas-${safeTitle || 'presentacion'}.pdf`
  doc.save(filename)
}
