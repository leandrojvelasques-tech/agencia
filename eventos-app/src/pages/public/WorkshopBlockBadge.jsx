import './workshopBlockBadge.css'

export default function WorkshopBlockBadge({ number }) {
  return <span className={`workshop-block-badge workshop-block-badge--${number}`}>Bloque {number}</span>
}
