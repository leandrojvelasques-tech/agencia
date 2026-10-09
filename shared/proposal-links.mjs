export function getProposalPath(proposal) {
  const slug = (proposal.title || 'presupuesto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'presupuesto'
  return `/presupuesto/${slug}/${encodeURIComponent(proposal.share_token)}`
}
