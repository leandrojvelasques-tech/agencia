(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clients = [...document.querySelectorAll('[data-social-client]')];
  const clientChoices = [...document.querySelectorAll('[data-client-choice]')];
  clientChoices.forEach((choice) => choice.addEventListener('click', () => {
    clients.forEach((client) => {
      const active = client.id === choice.dataset.clientChoice;
      client.classList.toggle('is-active-client', active);
      if (!active) client.querySelectorAll('video').forEach((video) => video.pause());
    });
    clientChoices.forEach((button) => button.setAttribute('aria-pressed', String(button === choice)));
  }));
  document.querySelectorAll('[data-social-client]').forEach((client) => {
    const tabs = [...client.querySelectorAll('[data-social-format]')];
    const panels = [...client.querySelectorAll('[data-social-panel]')];
    const previous = client.querySelector('[data-social-prev]');
    const next = client.querySelector('[data-social-next]');
    const count = client.querySelector('[data-social-count]');
    const states = panels.map((panel) => ({
      panel, track: panel.querySelector('[data-social-track]'),
      cards: [...panel.querySelectorAll('.social-slide')], active: 0,
    }));
    let selected = 0;
    let frame;

    function update() {
      const state = states[selected];
      if (!state.track.clientWidth) return;
      state.active = Math.max(0, Math.min(state.cards.length - 1,
        Math.round(state.track.scrollLeft / state.track.clientWidth)));
      count.textContent = `${state.active + 1} / ${state.cards.length}`;
      count.setAttribute('aria-label', `${tabs[selected].textContent}: ${state.active + 1} de ${state.cards.length}`);
      previous.disabled = state.active === 0;
      next.disabled = state.active === state.cards.length - 1;
      const trackId = state.track.id;
      previous.setAttribute('aria-controls', trackId);
      next.setAttribute('aria-controls', trackId);
      state.cards.forEach((card, index) => {
        if (index !== state.active) card.querySelector('video')?.pause();
      });
    }

    function select(index) {
      if (index === selected) return;
      client.querySelectorAll('video').forEach((video) => video.pause());
      selected = index;
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      const state = states[index];
      // Hidden panels have no dimensions. Restore their position after unhiding.
      state.track.scrollTo({left: state.active * state.track.clientWidth, behavior: 'instant'});
      update();
    }

    function move(direction) {
      const state = states[selected];
      const index = Math.max(0, Math.min(state.cards.length - 1, state.active + direction));
      state.track.scrollTo({left: index * state.track.clientWidth,
        behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', (event) => {
        let destination;
        if (event.key === 'ArrowLeft') destination = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'ArrowRight') destination = (index + 1) % tabs.length;
        else if (event.key === 'Home') destination = 0;
        else if (event.key === 'End') destination = tabs.length - 1;
        else return;
        event.preventDefault();
        select(destination);
        tabs[destination].focus();
      });
    });
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    states.forEach((state, index) => {
      state.track.id = `${state.panel.id}-track`;
      state.track.addEventListener('scroll', () => {
        if (index !== selected) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
      }, {passive: true});
      state.track.addEventListener('keydown', (event) => {
        if (event.target !== state.track) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      });
    });
    new ResizeObserver(() => {
      const state = states[selected];
      state.track.scrollTo({left: state.active * state.track.clientWidth, behavior: 'instant'});
      update();
    }).observe(client);
    update();
  });

  const videos = [...document.querySelectorAll('[data-social-client] video')];
  videos.forEach((video) => video.addEventListener('play', () => {
    videos.forEach((other) => { if (other !== video) other.pause(); });
  }));
  const visibility = new IntersectionObserver((entries) => {
    entries.forEach(({target, isIntersecting}) => { if (!isIntersecting) target.pause(); });
  }, {threshold: 0.45});
  videos.forEach((video) => visibility.observe(video));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach((video) => video.pause());
  });
})();
