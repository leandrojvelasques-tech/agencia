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
 * Utility to draw rounded rectangles on 2D context.
 */
const drawRoundRect = (ctx, x, y, width, height, radius) => {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}

/**
 * Utility to fill and stroke a rounded rectangle.
 */
const fillAndStrokeRoundRect = (ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) => {
  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, x, y, width, height, radius)
  if (fillStyle) {
    ctx.fillStyle = fillStyle
    ctx.fill()
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Wraps text into lines based on canvas measureText.
 */
function wrapText(ctx, text, maxWidth) {
  if (!text) return []
  const stringText = String(text)
  const paragraphs = stringText.split('\n')
  const lines = []
  
  for (const para of paragraphs) {
    if (para.trim() === '') {
      lines.push('')
      continue
    }
    const words = para.split(' ')
    let currentLine = ''
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
  }
  return lines
}

/**
 * Draws Bloque and Tema badges on top-left of slide.
 */
const drawBloqueTemaBadgesOnSlide = (ctx, startX, startY, bloque, tema) => {
  if (!bloque && !tema) return
  let currentX = startX
  const height = 36
  const paddingX = 16

  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  if (bloque) {
    ctx.font = 'bold 15px sans-serif'
    const textWidth = ctx.measureText(bloque.toUpperCase()).width
    const bgWidth = textWidth + paddingX * 2 + 16

    fillAndStrokeRoundRect(ctx, currentX, startY, bgWidth, height, 8, 'rgba(0, 0, 0, 0.65)', 'rgba(255, 255, 255, 0.2)', 1.5)

    ctx.fillStyle = '#A8D5C1'
    ctx.beginPath()
    ctx.arc(currentX + paddingX + 2, startY + height / 2, 5, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = '#A8D5C1'
    ctx.fillText(bloque.toUpperCase(), currentX + paddingX + 14, startY + height / 2)

    currentX += bgWidth + 12
  }

  if (tema) {
    ctx.font = 'bold 15px sans-serif'
    const textWidth = ctx.measureText(tema).width
    const bgWidth = textWidth + paddingX * 2

    fillAndStrokeRoundRect(ctx, currentX, startY, bgWidth, height, 8, 'rgba(0, 0, 0, 0.65)', 'rgba(255, 255, 255, 0.2)', 1.5)

    ctx.fillStyle = '#ffffff'
    ctx.fillText(tema, currentX + paddingX, startY + height / 2)
  }

  ctx.restore()
}

/**
 * Draws slide index badge on top-right of slide.
 */
const drawSlideIndexBadge = (ctx, rightX, startY, index, total) => {
  ctx.save()
  ctx.font = 'bold 15px sans-serif'
  const text = `${index} / ${total}`
  const textWidth = ctx.measureText(text).width
  const bgWidth = textWidth + 24
  const height = 34
  const startX = rightX - bgWidth

  fillAndStrokeRoundRect(ctx, startX, startY, bgWidth, height, 8, 'rgba(0, 0, 0, 0.65)', 'rgba(255, 255, 255, 0.2)', 1.5)

  ctx.fillStyle = '#A8D5C1'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, startX + bgWidth / 2, startY + height / 2)
  ctx.restore()
}

/**
 * Draws the slide container (1500x844) onto canvas.
 */
const drawSlideBox = (ctx, img, slide, x, y, width, height, index, total) => {
  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, x, y, width, height, 20)
  ctx.clip()

  if (img) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(x, y, width, height)

    const imgRatio = img.width / img.height
    const canvasRatio = width / height
    let drawW = width
    let drawH = height
    let offX = x
    let offY = y

    if (imgRatio > canvasRatio) {
      drawH = width / imgRatio
      offY = y + (height - drawH) / 2
    } else {
      drawW = height * imgRatio
      offX = x + (width - drawW) / 2
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, offX, offY, drawW, drawH)
  } else {
    // Gradient placeholder
    const grad = ctx.createLinearGradient(x, y, x + width, y + height)
    grad.addColorStop(0, '#285A47')
    grad.addColorStop(1, '#1b3e31')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, width, height)

    ctx.strokeStyle = 'rgba(168, 213, 193, 0.08)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(x + width, y, 500, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y + height, 300, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 56px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const titleText = slide?.title || `Diapositiva ${index + 1}`
    const lines = wrapText(ctx, titleText, width - 200)
    const lineHeight = 72
    const startCenterY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i].trim(), x + width / 2, startCenterY + i * lineHeight)
    }
  }

  // Draw badges and counter inside slide frame
  drawBloqueTemaBadgesOnSlide(ctx, x + 24, y + 24, slide?.bloque, slide?.tema)
  drawSlideIndexBadge(ctx, x + width - 24, y + 24, index + 1, total)

  ctx.restore()

  // Border frame around slide
  fillAndStrokeRoundRect(ctx, x, y, width, height, 20, null, 'rgba(0,0,0,0.12)', 2)
}

/**
 * Renders or measures Ficha de Estudio content.
 */
function renderFichaContent(ctx, slide, ficha, startX, startY, contentWidth, isMeasureOnly = false) {
  let currentY = startY

  const drawTextLine = (text, x, y, font, color, align = 'left', baseline = 'top') => {
    if (!isMeasureOnly) {
      ctx.save()
      ctx.font = font
      ctx.fillStyle = color
      ctx.textAlign = align
      ctx.textBaseline = baseline
      ctx.fillText(text, x, y)
      ctx.restore()
    }
  }

  // 1. Badge Pill "FICHA DE ESTUDIO"
  const badgeText = "FICHA DE ESTUDIO"
  ctx.font = 'bold 13px sans-serif'
  const badgeW = ctx.measureText(badgeText).width + 24
  const badgeH = 28

  if (!isMeasureOnly) {
    fillAndStrokeRoundRect(ctx, startX, currentY, badgeW, badgeH, 6, '#e6f4ef', '#a8d5c1', 1)
    drawTextLine(badgeText, startX + 12, currentY + 7, 'bold 13px sans-serif', '#1b3e31')
  }
  currentY += badgeH + 14

  // 2. Title
  const titleText = ficha?.title || slide?.title || 'Diapositiva'
  ctx.font = 'bold 32px sans-serif'
  const titleLines = wrapText(ctx, titleText, contentWidth)
  const titleLineH = 40
  for (let i = 0; i < titleLines.length; i++) {
    drawTextLine(titleLines[i], startX, currentY + i * titleLineH, 'bold 32px sans-serif', '#1b3e31')
  }
  currentY += titleLines.length * titleLineH + 4

  // 3. Subtitle
  if (ficha?.subtitle) {
    ctx.font = '600 20px sans-serif'
    const subLines = wrapText(ctx, ficha.subtitle, contentWidth)
    const subLineH = 28
    for (let i = 0; i < subLines.length; i++) {
      drawTextLine(subLines[i], startX, currentY + i * subLineH, '600 20px sans-serif', '#6b7280')
    }
    currentY += subLines.length * subLineH + 8
  }

  // 4. Divider Line
  currentY += 8
  if (!isMeasureOnly) {
    ctx.save()
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(startX, currentY)
    ctx.lineTo(startX + contentWidth, currentY)
    ctx.stroke()
    ctx.restore()
  }
  currentY += 20

  const hasFichaContent = ficha && (ficha.summary || (ficha.keyIdeas && ficha.keyIdeas.length > 0) || ficha.closingIdea || (ficha.glossary && ficha.glossary.length > 0))

  if (hasFichaContent) {
    // Resumen
    if (ficha.summary) {
      drawTextLine('RESUMEN', startX, currentY, 'bold 14px sans-serif', '#9ca3af')
      currentY += 22

      ctx.font = '500 19px sans-serif'
      const sumLines = wrapText(ctx, ficha.summary, contentWidth)
      const sumLineH = 28
      for (let i = 0; i < sumLines.length; i++) {
        drawTextLine(sumLines[i], startX, currentY + i * sumLineH, '500 19px sans-serif', '#374151')
      }
      currentY += sumLines.length * sumLineH + 24
    }

    // Ideas Fuerza
    if (ficha.keyIdeas && ficha.keyIdeas.length > 0) {
      drawTextLine('IDEAS FUERZA', startX, currentY, 'bold 14px sans-serif', '#9ca3af')
      currentY += 24

      const keyIdeas = ficha.keyIdeas
      const useTwoCols = contentWidth >= 1000 && keyIdeas.length > 1

      if (useTwoCols) {
        const gap = 20
        const colW = (contentWidth - gap) / 2

        for (let i = 0; i < keyIdeas.length; i += 2) {
          const idea1 = keyIdeas[i]
          const idea2 = keyIdeas[i + 1]

          ctx.font = 'bold 18px sans-serif'
          const t1Lines = wrapText(ctx, idea1.title, colW - 36)
          ctx.font = '500 16px sans-serif'
          const d1Lines = wrapText(ctx, idea1.description, colW - 36)
          const h1 = 18 * 2 + t1Lines.length * 24 + 8 + d1Lines.length * 24

          let h2 = 0
          let t2Lines = []
          let d2Lines = []
          if (idea2) {
            ctx.font = 'bold 18px sans-serif'
            t2Lines = wrapText(ctx, idea2.title, colW - 36)
            ctx.font = '500 16px sans-serif'
            d2Lines = wrapText(ctx, idea2.description, colW - 36)
            h2 = 18 * 2 + t2Lines.length * 24 + 8 + d2Lines.length * 24
          }

          const rowH = Math.max(h1, h2)

          if (!isMeasureOnly) {
            fillAndStrokeRoundRect(ctx, startX, currentY, colW, rowH, 14, '#f0fdf4', '#dcfce7', 1.5)
            let innerY1 = currentY + 18
            for (let l = 0; l < t1Lines.length; l++) {
              drawTextLine(t1Lines[l], startX + 18, innerY1 + l * 24, 'bold 18px sans-serif', '#166534')
            }
            innerY1 += t1Lines.length * 24 + 6
            for (let l = 0; l < d1Lines.length; l++) {
              drawTextLine(d1Lines[l], startX + 18, innerY1 + l * 24, '500 16px sans-serif', '#374151')
            }

            if (idea2) {
              const x2 = startX + colW + gap
              fillAndStrokeRoundRect(ctx, x2, currentY, colW, rowH, 14, '#f0fdf4', '#dcfce7', 1.5)
              let innerY2 = currentY + 18
              for (let l = 0; l < t2Lines.length; l++) {
                drawTextLine(t2Lines[l], x2 + 18, innerY2 + l * 24, 'bold 18px sans-serif', '#166534')
              }
              innerY2 += t2Lines.length * 24 + 6
              for (let l = 0; l < d2Lines.length; l++) {
                drawTextLine(d2Lines[l], x2 + 18, innerY2 + l * 24, '500 16px sans-serif', '#374151')
              }
            }
          }

          currentY += rowH + 16
        }
        currentY += 8
      } else {
        for (let i = 0; i < keyIdeas.length; i++) {
          const idea = keyIdeas[i]
          ctx.font = 'bold 18px sans-serif'
          const tLines = wrapText(ctx, idea.title, contentWidth - 36)
          ctx.font = '500 16px sans-serif'
          const dLines = wrapText(ctx, idea.description, contentWidth - 36)
          const cardH = 18 * 2 + tLines.length * 24 + 6 + dLines.length * 24

          if (!isMeasureOnly) {
            fillAndStrokeRoundRect(ctx, startX, currentY, contentWidth, cardH, 14, '#f0fdf4', '#dcfce7', 1.5)
            let innerY = currentY + 18
            for (let l = 0; l < tLines.length; l++) {
              drawTextLine(tLines[l], startX + 18, innerY + l * 24, 'bold 18px sans-serif', '#166534')
            }
            innerY += tLines.length * 24 + 6
            for (let l = 0; l < dLines.length; l++) {
              drawTextLine(dLines[l], startX + 18, innerY + l * 24, '500 16px sans-serif', '#374151')
            }
          }
          currentY += cardH + 14
        }
        currentY += 10
      }
    }

    // Idea de Cierre
    if (ficha.closingIdea) {
      drawTextLine('IDEA DE CIERRE', startX, currentY, 'bold 14px sans-serif', '#047857')
      currentY += 22

      ctx.font = 'italic bold 20px sans-serif'
      const quoteText = `“${ficha.closingIdea}”`
      const qLines = wrapText(ctx, quoteText, contentWidth - 40)
      const qLineH = 28
      const cardH = 20 * 2 + qLines.length * qLineH

      if (!isMeasureOnly) {
        fillAndStrokeRoundRect(ctx, startX, currentY, contentWidth, cardH, 14, '#ecfdf5', '#a7f3d0', 1.5)
        let innerY = currentY + 20
        for (let l = 0; l < qLines.length; l++) {
          drawTextLine(qLines[l], startX + 20, innerY + l * qLineH, 'italic bold 20px sans-serif', '#064e3b')
        }
      }
      currentY += cardH + 24
    }

    // Glosario Breve
    if (ficha.glossary && ficha.glossary.length > 0) {
      drawTextLine('GLOSARIO BREVE', startX, currentY, 'bold 14px sans-serif', '#9ca3af')
      currentY += 24

      const glossary = ficha.glossary
      const termW = 280
      const defW = contentWidth - termW - 48

      let totalGlosH = 0
      const itemHeights = []

      for (let i = 0; i < glossary.length; i++) {
        const g = glossary[i]
        ctx.font = 'bold 16px sans-serif'
        const termLines = wrapText(ctx, g.term, termW - 16)
        ctx.font = '500 16px sans-serif'
        const defLines = wrapText(ctx, g.definition, defW)

        const termH = termLines.length * 24
        const defH = defLines.length * 24
        const itemH = Math.max(termH, defH) + 24
        itemHeights.push({ itemH, termLines, defLines })
        totalGlosH += itemH
      }

      if (!isMeasureOnly) {
        fillAndStrokeRoundRect(ctx, startX, currentY, contentWidth, totalGlosH, 14, '#f9fafb', '#e5e7eb', 1.5)
        let innerY = currentY

        for (let i = 0; i < glossary.length; i++) {
          const { itemH, termLines, defLines } = itemHeights[i]

          if (i > 0) {
            ctx.save()
            ctx.strokeStyle = '#f3f4f6'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(startX + 16, innerY)
            ctx.lineTo(startX + contentWidth - 16, innerY)
            ctx.stroke()
            ctx.restore()
          }

          let tY = innerY + 12
          for (let l = 0; l < termLines.length; l++) {
            drawTextLine(termLines[l], startX + 16, tY + l * 24, 'bold 16px sans-serif', '#1b3e31')
          }

          let dY = innerY + 12
          for (let l = 0; l < defLines.length; l++) {
            drawTextLine(defLines[l], startX + 16 + termW, dY + l * 24, '500 16px sans-serif', '#4b5563')
          }

          innerY += itemH
        }
      }
      currentY += totalGlosH + 24
    }

  } else if (slide?.notes || (slide?.guide && slide.guide.length > 0)) {
    if (slide.notes) {
      drawTextLine('NOTAS DE LA DIAPOSITIVA', startX, currentY, 'bold 14px sans-serif', '#9ca3af')
      currentY += 22

      ctx.font = '500 18px sans-serif'
      const nLines = wrapText(ctx, slide.notes, contentWidth)
      const nLineH = 26
      for (let i = 0; i < nLines.length; i++) {
        drawTextLine(nLines[i], startX, currentY + i * nLineH, '500 18px sans-serif', '#374151')
      }
      currentY += nLines.length * nLineH + 24
    }
  } else {
    drawTextLine('Esta diapositiva no contiene ficha de estudio adicional.', startX, currentY + 10, 'italic 17px sans-serif', '#9ca3af')
    currentY += 50
  }

  return currentY - startY
}

/**
 * Creates canvas for slide + ficha of a single page and returns { dataUrl, width, height }
 */
const renderSlideWithFichaPage = (slide, img, index, total) => {
  const contentWidth = 1420
  const startX = 90
  const startY = 964

  // Measure content height first
  const dummyCanvas = document.createElement('canvas')
  dummyCanvas.width = 1600
  dummyCanvas.height = 3500
  const dummyCtx = dummyCanvas.getContext('2d')
  const fichaContentH = renderFichaContent(dummyCtx, slide, slide?.ficha, startX, startY, contentWidth, true)

  const fichaCardH = fichaContentH + 80
  const pageContentBottom = 924 + fichaCardH
  const pageHeight = Math.max(2121, pageContentBottom + 70)

  // Real canvas creation
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = pageHeight
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#f4f6f8'
  ctx.fillRect(0, 0, 1600, pageHeight)

  // 1. Draw Slide Box
  drawSlideBox(ctx, img, slide, 50, 50, 1500, 844, index, total)

  // 2. Draw Ficha Card Box
  fillAndStrokeRoundRect(ctx, 50, 924, 1500, fichaCardH, 24, '#ffffff', '#e5e7eb', 2)

  // 3. Draw Ficha Content
  renderFichaContent(ctx, slide, slide?.ficha, startX, startY, contentWidth, false)

  // 4. Draw Footer
  ctx.save()
  ctx.font = 'bold 15px sans-serif'
  ctx.fillStyle = '#9ca3af'

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('PORTER AI • Academia de Automatización', 50, pageHeight - 35)

  ctx.textAlign = 'right'
  ctx.fillText(`Diapositiva ${index + 1} de ${total}`, 1550, pageHeight - 35)
  ctx.restore()

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.88),
    width: 1600,
    height: pageHeight
  }
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
  const pageDataList = []

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total)
    const slide = slides[i]
    let img = null

    if (slide.mediaUrl) {
      try {
        img = await loadImage(slide.mediaUrl)
      } catch (err) {
        console.warn(`Error al cargar imagen de la diapositiva ${i + 1}, se usará la tarjeta con texto:`, err)
      }
    }

    const pageData = renderSlideWithFichaPage(slide, img, i, total)
    pageDataList.push(pageData)
  }

  const firstPage = pageDataList[0]
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [firstPage.width, firstPage.height]
  })

  pageDataList.forEach((page, index) => {
    if (index > 0) {
      doc.addPage([page.width, page.height], 'portrait')
    }
    doc.setPage(index + 1)
    doc.addImage(page.dataUrl, 'JPEG', 0, 0, page.width, page.height, undefined, 'FAST')
  })

  const safeTitle = (title || 'presentacion')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const filename = `presentacion-ficha-${safeTitle || 'estudio'}.pdf`
  doc.save(filename)
}

