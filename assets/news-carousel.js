(() => {
  document.querySelectorAll('.news-carousel').forEach(carousel => {
    const slides = Array.from(carousel.querySelectorAll('.news-slide'));
    const controls = carousel.querySelector('.news-carousel-controls');
    const counter = carousel.querySelector('[data-news-counter]');
    if (slides.length < 2 || !controls || !counter) return;

    let current = 0;
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, position) => { slide.hidden = position !== current; });
      counter.textContent = `${current + 1} / ${slides.length}`;
    }

    carousel.querySelector('[data-news-prev]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-news-next]').addEventListener('click', () => show(current + 1));
    carousel.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    });

    let pointerStart = null;
    carousel.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || event.target.closest('button')) return;
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    carousel.addEventListener('pointerup', event => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
    });
    carousel.addEventListener('pointercancel', () => { pointerStart = null; });
    controls.hidden = false;
    show(0);
  });
})();
