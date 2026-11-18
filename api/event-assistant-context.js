const { loadEventAssistantContext } = require('../lib/eventAssistantContext');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Solo consulta del evento público.' });
  }
  try {
    const context = await loadEventAssistantContext();
    if (!context) return res.status(404).json({ error: 'Evento no disponible públicamente.' });
    return res.status(200).json(context);
  } catch {
    return res.status(503).json({ error: 'No pudimos consultar la información actual del evento. Intentá nuevamente.' });
  }
};
