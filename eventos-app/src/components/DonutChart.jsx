import { useState, useMemo } from 'react'

export const CHART_COLORS = [
  '#285A47', // Deep Green (Primary)
  '#418F70', // Medium Green
  '#7DC4A6', // Light Green
  '#A8D5C1', // Pale Green
  '#C6E5D7', // Soft Sage
  '#B0C9BF', // Muted Gray-Green
  '#5F8575'  // Slate Green
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

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-[var(--color-dark-gray)]/40 text-xs font-semibold">
        No hay datos para mostrar
      </div>
    )
  }

  const radius = 50
  const strokeWidth = 12
  const strokeWidthHover = 15
  const circumference = 2 * Math.PI * radius // ~314.159

  // Truncate labels for center display
  const truncate = (str, max = 16) => {
    if (!str) return ''
    return str.length > max ? str.slice(0, max - 2) + '..' : str
  }

  return (
    <div className="flex flex-col items-center justify-center my-3 relative select-none">
      <div className="w-40 h-40 relative">
        <svg viewBox="0 0 160 160" className="w-full h-full">
          {/* Base track circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          
          {/* Colored slices */}
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
                  strokeWidth={isHovered ? strokeWidthHover : strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={-cumulativeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-in-out cursor-pointer origin-center"
                  style={{
                    opacity: !isAnyHovered || isHovered ? 1 : 0.45,
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}
          </g>
          
          {/* Center text */}
          <text
            x="80"
            y="76"
            textAnchor="middle"
            className="text-xl font-extrabold fill-[var(--color-deep-green)] transition-all duration-200"
          >
            {hoveredIndex !== null
              ? `${Math.round(chartData[hoveredIndex].percentage)}%`
              : total}
          </text>
          
          <text
            x="80"
            y="96"
            textAnchor="middle"
            className="text-[10px] font-bold fill-[var(--color-dark-gray)]/50 transition-all duration-200 uppercase tracking-wider"
          >
            {hoveredIndex !== null
              ? truncate(chartData[hoveredIndex].label)
              : totalLabel}
          </text>
        </svg>
      </div>
    </div>
  )
}
