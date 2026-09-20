(() => {
  document.querySelectorAll('[data-project-carousel]').forEach((carousel) => {
    const slides = [...carousel.querySelectorAll('.office-slide')];
    const dots = carousel.querySelector('[data-dots]');
    const count = carousel.querySelector('[data-count]');
    let current = 0;

    const show = (next) => {
      current = (next + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        const active = index === current;
        slide.hidden = !active;
        slide.classList.toggle('is-active', active);
      });
      [...dots.children].forEach((dot, index) => {
        const active = index === current;
        dot.setAttribute('aria-current', String(active));
        dot.tabIndex = active ? 0 : -1;
      });
      count.textContent = `${current + 1} / ${slides.length}`;
    };

    slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ver captura ${index + 1}`);
      dot.addEventListener('click', () => show(index));
      dots.append(dot);
    });

    carousel.querySelector('[data-prev]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-next]').addEventListener('click', () => show(current + 1));
    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(current - 1);
      if (event.key === 'ArrowRight') show(current + 1);
    });
    show(0);
  });
})();
