export const REQUEST_STATES = {
  initiated: { label: 'Iniciado', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'inbox' },
  needs_info: { label: 'Requiere información', className: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'help' },
  in_progress: { label: 'En proceso', className: 'bg-blue-50 text-blue-800 border-blue-200', icon: 'engineering' },
  completed: { label: 'Finalizado', className: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'task_alt' },
  discarded: { label: 'No se realizará', className: 'bg-red-50 text-red-800 border-red-200', icon: 'block' },
}

export const BILLING_STATES = {
  pending: 'Pendiente de facturar',
  included: 'Incluido en factura',
  invoiced: 'Facturado',
  not_billable: 'No facturable',
}

export const requestState = (state) => REQUEST_STATES[state] || REQUEST_STATES.initiated
