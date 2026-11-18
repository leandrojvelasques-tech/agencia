(() => {
  const track = document.getElementById('news-events-track');
  const controls = document.querySelector('.news-track-controls');
  if (!track || !controls) return;
  const cards = Array.from(track.children);
  const previous = controls.querySelector('[data-news-track-prev]');
  const next = controls.querySelector('[data-news-track-next]');
  const position = controls.querySelector('[data-news-track-position]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function update() {
    const left = track.scrollLeft;
    const right = left + track.clientWidth;
    const visible = cards.map((card, i) => ({ index: i + 1, start: card.offsetLeft - track.offsetLeft, end: card.offsetLeft - track.offsetLeft + card.offsetWidth })).filter(card => card.end > left + 4 && card.start < right - 4);
    previous.disabled = left < 4;
    next.disabled = right >= track.scrollWidth - 4;
    position.textContent = visible.length ? `${visible[0].index}–${visible.at(-1).index} de ${cards.length} novedades` : `${cards.length} novedades`;
    controls.hidden = track.scrollWidth <= track.clientWidth + 4;
  }
  function move(direction) {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = (cards[0]?.offsetWidth || track.clientWidth) + gap;
    track.scrollBy({ left: direction * step, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  new ResizeObserver(update).observe(track);
  update();
})();
