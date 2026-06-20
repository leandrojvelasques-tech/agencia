// CRM Territories Configuration
// You can easily modify descriptions and colors here.
// Colors are mapped to Tailwind classes for background, border, text, and hover states.

export const TERRITORIOS = [
  {
    id: 'PROMOCIONES',
    label: 'PROMOCIONES',
    desc: 'Promoción de eventos, platos, menúes, etc.',
    color: {
      bg: 'bg-black',
      border: 'border-black',
      text: 'text-white',
      hoverBg: 'hover:bg-neutral-900',
      hoverBorder: 'hover:border-black',
      badge: 'bg-black text-white border-black',
      dot: 'bg-yellow-300'
    }
  },
  {
    id: 'GASTRONOMIA',
    label: 'GASTRONOMIA',
    desc: 'Platos estrella, nuevas incorporaciones, menú del día, producto fresco y mariscos en detalle.',
    color: {
      bg: 'bg-[#EAB308]', // Gold/Yellow from Gastronomia
      border: 'border-[#CA8A04]',
      text: 'text-white',
      hoverBg: 'hover:bg-[#CA8A04]',
      hoverBorder: 'hover:border-[#CA8A04]',
      badge: 'bg-[#EAB308] text-white border-[#CA8A04]',
      dot: 'bg-white'
    }
  },
  {
    id: 'EXPERIENCIA EN SALON',
    label: 'EXPERIENCIA EN SALON',
    desc: 'Clientes contentos disfrutando, el equipo en acción, mesas compartidas, mozos sirviendo/destapando vino/llevando comida.',
    color: {
      bg: 'bg-[#2cb5c5]', // Teal/Cyan from Experiencia en Salon
      border: 'border-[#228e9b]',
      text: 'text-white',
      hoverBg: 'hover:bg-[#228e9b]',
      hoverBorder: 'hover:border-[#228e9b]',
      badge: 'bg-[#2cb5c5] text-white border-[#228e9b]',
      dot: 'bg-white'
    }
  },
  {
    id: 'COCINA/BACKSTAGE',
    label: 'COCINA/BACKSTAGE',
    desc: 'Preparación de pastas, parrilla encendida, mariscos frescos. El proceso que genera confianza.',
    color: {
      bg: 'bg-[#d904cc]', // Magenta/Fuchsia from Cocina/Backstage
      border: 'border-[#ad03a3]',
      text: 'text-white',
      hoverBg: 'hover:bg-[#ad03a3]',
      hoverBorder: 'hover:border-[#ad03a3]',
      badge: 'bg-[#d904cc] text-white border-[#ad03a3]',
      dot: 'bg-white'
    }
  },
  {
    id: 'COMUNIDAD / INSTITUCIONAL',
    label: 'COMUNIDAD / INSTITUCIONAL',
    desc: 'Eventos o fechas especiales: Mundial, 14 de Febrero, día del padre, día del amigo, día de la mujer.',
    color: {
      bg: 'bg-[#0033cc]', // Royal Blue from Comunidad / Institucional
      border: 'border-[#002288]',
      text: 'text-white',
      hoverBg: 'hover:bg-[#002288]',
      hoverBorder: 'hover:border-[#002288]',
      badge: 'bg-[#0033cc] text-white border-[#002288]',
      dot: 'bg-white'
    }
  }
];

// Helper to get configuration by territory ID
export const getTerritorioConfig = (id) => {
  if (!id) return getFallbackConfig();
  const normalizedId = id.toUpperCase().trim();
  const found = TERRITORIOS.find(t => t.id === normalizedId);
  return found || getFallbackConfig(id);
};

// Fallback config when territory doesn't match or is empty
const getFallbackConfig = (customName = '') => {
  return {
    id: customName || 'OTRO',
    label: customName || 'OTRO',
    desc: 'Publicación sin territorio específico asignado.',
    color: {
      bg: 'bg-gray-150',
      border: 'border-gray-300',
      text: 'text-gray-800',
      hoverBg: 'hover:bg-gray-200',
      hoverBorder: 'hover:border-gray-400',
      badge: 'bg-gray-150 text-gray-800 border-gray-300',
      dot: 'bg-gray-400'
    }
  };
};
