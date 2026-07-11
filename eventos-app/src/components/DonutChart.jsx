import { useState, useMemo } from 'react'

export const CHART_COLORS = [
  '#FF006E', // Vibrant Pink/Magenta
  '#8338EC', // Vibrant Purple/Violet
  '#118AB2', // Bright Ocean Blue
  '#FB5607', // Bright Orange
  '#FFD166', // Bright Gold/Yellow
  '#E63946', // Bright Red
  '#073B4C', // Dark Navy Blue
  '#4F4C4D'  // Neutral Dark Gray
]

export default function DonutChart({ data, colors = CHART_COLORS, totalLabel = 'Total' }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const chartData = useMemo(() => {
    if (!data) return []
    const entries = Object.entries(data)
    const total = entries.reduce((sum, [_, val]) => sum + val, 0)
    
    let cumulativeValue = 0
    return entries.map(([label, value], idx) => {
      const percentage = total > 0 ? (value / total) * 100 : 0
      const startValue = cumulativeValue
      cumulativeValue += value
      return {
        label,
        value,
        percentage,
        startValue,
        color: colors[idx % colors.length]
      }
    })
  }, [data, colors])

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0)
  }, [chartData])

  const radius = 35
  const strokeWidth = 70
  const circumference = 2 * Math.PI * radius // ~219.911

  // Compute spokes (separation lines) between slices
  const spokes = useMemo(() => {
    if (chartData.length <= 1) return []
    return chartData.map((item) => {
      const angleDegrees = -90 + (item.startValue / total) * 360
      const angleRadians = (angleDegrees * Math.PI) / 180
      const x2 = 80 + 75 * Math.cos(angleRadians)
      const y2 = 80 + 75 * Math.sin(angleRadians)
      return { x1: 80, y1: 80, x2, y2 }
    })
  }, [chartData, total])

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-[var(--color-dark-gray)]/40 text-xs font-semibold">
        No hay datos para mostrar
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center my-2 relative select-none w-full">
      <div className="w-40 h-40 relative">
        <svg viewBox="0 0 160 160" className="w-full h-full">
          {/* Base track circle (underlay) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          
          {/* Colored slices (solid pie via stroke) */}
          <g transform="rotate(-90 80 80)">
            {chartData.map((item, idx) => {
              const strokeLength = (item.value / total) * circumference
              const strokeOffset = circumference - strokeLength
              const cumulativeOffset = (item.startValue / total) * circumference
              const isHovered = hoveredIndex === idx
              const isAnyHovered = hoveredIndex !== null

              return (
                <circle
                  key={item.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={-cumulativeOffset}
                  className="transition-all duration-300 ease-in-out cursor-pointer origin-center"
                  style={{
                    opacity: !isAnyHovered || isHovered ? 1 : 0.45,
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}
          </g>
          
          {/* Separation lines (spokes) */}
          {spokes.map((spoke, idx) => (
            <line
              key={idx}
              x1={spoke.x1}
              y1={spoke.y1}
              x2={spoke.x2}
              y2={spoke.y2}
              stroke="#ffffff"
              strokeWidth="2.5"
              className="pointer-events-none"
            />
          ))}
        </svg>
      </div>

      {/* Hover detail box */}
      <div className="mt-3 text-center min-h-[44px] flex flex-col justify-center items-center w-full px-2">
        {hoveredIndex !== null ? (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[var(--color-dark-gray)] shadow-sm transition-all duration-200">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: chartData[hoveredIndex].color }} />
            <span className="truncate max-w-[130px]">{chartData[hoveredIndex].label}:</span>
            <span className="text-[var(--color-deep-green)] font-extrabold">{chartData[hoveredIndex].value} ({Math.round(chartData[hoveredIndex].percentage)}%)</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold text-[var(--color-dark-gray)]/45 uppercase tracking-widest">
              {totalLabel}: {total}
            </span>
            <span className="text-[9px] font-semibold text-[var(--color-dark-gray)]/30">
              Pasa el cursor para ver detalles
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
