(() => {
  const heroDetail = document.querySelector('.case-hero-detail img');
  if (heroDetail) {
    heroDetail.src = 'assets/jubilarse-jubilado-nuevo.jpg';
    heroDetail.alt = 'Entrega a una persona recientemente jubilada junto al nuevo banner institucional';
    heroDetail.width = 584;
    heroDetail.height = 693;
  }
  const heroDetailFigure = document.querySelector('.case-hero-detail');
  if (heroDetailFigure && !heroDetailFigure.querySelector('.case-client-handnote')) {
    heroDetailFigure.insertAdjacentHTML('beforeend', `<span class="case-client-handnote" aria-hidden="true">foco en el cliente</span>`);
  }

  document.querySelector('.case-study-copy .text-link')?.remove();

  const logoChip = document.querySelector('.case-logo-chip');
  if (logoChip && !logoChip.querySelector('.case-brand-colors')) {
    logoChip.insertAdjacentHTML('beforeend', `<div class="case-brand-colors" aria-label="Colores de la marca"><i></i><i></i><i></i></div><span class="case-brand-handnote case-brand-handnote-logo" aria-hidden="true">logo</span><span class="case-brand-handnote case-brand-handnote-colors" aria-hidden="true">colores de marca</span>`);
  }

  const diagnosis = document.querySelector('.case-diagnosis');
  if (diagnosis) {
    const title = diagnosis.querySelector('h2');
    const copy = diagnosis.querySelector('.case-diagnosis-copy');
    if (title) title.innerHTML = 'Un punto de partida.<br><em>Dos desafíos conectados.</em>';
    if (copy) copy.innerHTML = `
      <p class="case-diagnosis-intro">La consultora necesitaba mejorar su presencia pública y, al mismo tiempo, ordenar la gestión digital de sus consultas y turnos.</p>
      <div class="case-diagnosis-areas">
        <article><span>COMUNICACIÓN Y REDES</span><ul><li>Publicaciones principalmente institucionales.</li><li>Poca visibilidad de la actividad, los servicios y las experiencias de clientes.</li><li>Sin campañas de publicidad pautada.</li><li>Sin un esquema sistemático de publicación.</li><li>Material fotográfico de base con calidad irregular.</li></ul></article>
        <article><span>SITIO Y GESTIÓN INTERNA</span><ul><li>Sin un canal web para solicitar turnos.</li><li>Presencia digital limitada para acompañar las consultas.</li><li>Agenda e historial de clientes sin centralización.</li><li>Necesidad de preparar la operación para expandirse a otras provincias.</li></ul></article>
      </div>`;
  }

  const processVisuals = [
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 11 2 2 4-4"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>`,
    `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 2v3M3 9h18M8 2v3M17 13h-6M13 17H7M7 13h.01M17 17h.01"/></svg>`,
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12"/></svg>`
  ];
  document.querySelectorAll('.case-timeline li').forEach((item, index) => {
    item.classList.add('case-process-card');
    if (!item.querySelector('.case-step-visual')) item.insertAdjacentHTML('afterbegin', `<div class="case-step-visual">${processVisuals[index]}</div>`);
  });
  const processTitles = document.querySelectorAll('.case-timeline h3');
  if (processTitles[2]) processTitles[2].textContent = 'Implementar y dar continuidad';
  if (processTitles[3]) processTitles[3].textContent = 'Acompañar, verificar y ajustar';

  document.querySelectorAll('.case-hero-detail img, .case-logo-chip img, .case-screenshot-card img, .case-calendar img, .case-team-card img, .case-channel-links img, .case-social-production img').forEach((img) => {
    img.loading = 'eager';
  });

  const workSection = document.querySelector('.case-work');
  if (workSection && !document.querySelector('.case-team')) {
    workSection.insertAdjacentHTML('beforebegin', `
      <section class="case-team section" id="equipo-proyecto" aria-labelledby="case-team-title">
        <div class="wrap">
          <div class="section-head case-team-head">
            <div>
              <p class="eyebrow">03 · EQUIPO DEL PROYECTO</p>
              <h2 id="case-team-title">Un equipo conectado <em>que sostiene el proyecto.</em></h2>
            </div>
            <p>Trabajamos conectados para cubrir la estrategia, la gestión, el diseño y la implementación de las distintas áreas del marketing digital.</p>
          </div>
          <div class="case-team-grid">
            <article class="case-team-card case-team-card-featured case-team-card-lead">
              <figure><img src="assets/leandro-perfil.jpg" alt="Lic. Leandro Velasques" width="600" height="600"></figure>
              <div class="case-team-copy"><span>Dirección y coordinación</span><h3>Leandro</h3><p>Director del proyecto</p><small class="case-team-location">Comodoro Rivadavia</small></div>
            </article>
            <article class="case-team-card case-team-card-featured">
              <figure><img src="assets/daniela.jpg" alt="Daniela Rincón" width="600" height="600"></figure>
              <div class="case-team-copy"><span>Coordinación</span><h3>Daniela</h3><p>Coordinadora del proyecto</p><small class="case-team-location">CABA</small></div>
            </article>
            <article class="case-team-card">
              <figure><img src="assets/equipo-cami-1-v2.png" alt="Cami 1" width="1072" height="1432"></figure>
              <div class="case-team-copy"><span>Gestión del proyecto</span><h3>Cami 1</h3><p>Project manager</p><small class="case-team-location">Buenos Aires</small></div>
            </article>
            <article class="case-team-card">
              <figure><img src="assets/equipo-cami-2.jpg" alt="Cami 2 realizando un relevamiento audiovisual" width="552" height="671"></figure>
              <div class="case-team-copy"><span>Producción de contenidos</span><h3>Cami 2</h3><p>Relevamiento fotográfico y videográfico</p><small class="case-team-location">Comodoro Rivadavia</small></div>
            </article>
            <article class="case-team-card">
              <figure><img src="assets/equipo-nuni-v2.png" alt="Nuni en un espacio de trabajo creativo" width="1024" height="1536"></figure>
              <div class="case-team-copy"><span>Diseño y edición</span><h3>Nuni</h3><p>Diseñadora gráfica y editora de videos</p><small class="case-team-location">Mar del Plata</small></div>
            </article>
          </div>
        </div>
      </section>`);
  }

  const workEyebrow = workSection?.querySelector('.section-head .eyebrow');
  if (workEyebrow) workEyebrow.textContent = '04 · DOS PROYECTOS EN PARALELO';
  document.querySelector('.case-planning .eyebrow')?.replaceChildren('PLANIFICACIÓN Y PRODUCCIÓN');
  document.querySelector('.screenshot-pending')?.remove();

  document.querySelector('.case-instagram-link')?.remove();

  const socialMedia = document.querySelector('.case-social-media');
  if (socialMedia && !socialMedia.querySelector('.case-instagram-bar')) {
    socialMedia.insertAdjacentHTML('afterbegin', `<div class="case-instagram-bar"><img src="assets/jubilarse-logo-oficial.jpeg" alt="" aria-hidden="true"><strong>consultorajubilarse</strong><span aria-hidden="true">•••</span></div>`);
  }

  const socialCarousel = document.querySelector('.case-social-carousel');
  if (socialCarousel && !document.querySelector('.case-video-showcase')) {
    socialCarousel.insertAdjacentHTML('afterend', `
      <div class="case-video-showcase" id="reels-proyecto">
        <div class="case-video-intro"><span>CONTENIDO AUDIOVISUAL</span><h4>Reels y piezas en movimiento.</h4><p>Dos ejemplos reproducibles dentro del caso de estudio, presentados con la lógica visual de una publicación de Instagram.</p></div>
        <div class="case-reel-carousel" data-reel-carousel role="region" aria-roledescription="carrusel" aria-label="Reels de Consultora Jubilarse">
          <button class="case-reel-control case-reel-prev" type="button" aria-label="Ver reel anterior">←</button>
          <article class="case-reel-frame">
            <div class="case-reel-profile"><img src="assets/jubilarse-logo-oficial.jpeg" alt="" aria-hidden="true"><strong>consultorajubilarse</strong><span aria-hidden="true">•••</span></div>
            <video data-reel-video controls playsinline preload="metadata" aria-label="Reel 1 de Consultora Jubilarse"><source src="assets/jubilarse-reel-01.mp4" type="video/mp4">Tu navegador no puede reproducir este video.</video>
            <div class="case-reel-meta"><span>CONTENIDO PUBLICADO</span><strong data-reel-title>Reel 01</strong><small data-reel-count aria-live="polite">1 / 2</small></div>
          </article>
          <button class="case-reel-control case-reel-next" type="button" aria-label="Ver reel siguiente">→</button>
          <div class="case-reel-dots" aria-label="Seleccionar reel"><button type="button" aria-label="Ver reel 1" aria-current="true"></button><button type="button" aria-label="Ver reel 2" aria-current="false"></button></div>
        </div>
      </div>
      <div class="case-social-production">
        <div class="case-social-production-copy"><span>FOTOGRAFÍA Y RELEVAMIENTO</span><h4>La actividad real se convierte en contenido.</h4><p>Registro del equipo, acompañamiento en momentos importantes y producción de material para sitio web, posteos, historias y campañas.</p></div>
        <figure><img src="assets/jubilarse-jubilado-nuevo.jpg" alt="Entrega a una persona recientemente jubilada" width="584" height="693"></figure>
        <figure><img src="assets/jubilarse-equipo-02.jpeg" alt="Equipo de Consultora Jubilarse" width="850" height="877"></figure>
        <figure><img src="assets/jubilarse-actividad-alfonso.jpg" alt="Entrega a un nuevo jubilado junto al equipo de Consultora Jubilarse" width="1200" height="1600"></figure>
        <figure><img src="assets/jubilarse-actividad-paincho.jpg" alt="Acompañamiento a un nuevo jubilado de Consultora Jubilarse" width="1200" height="1600"></figure>
        <figure><img src="assets/jubilarse-actividad-evento-01.jpg" alt="Actividad de la Consultora Jubilarse con su equipo y clientes" width="4284" height="5712"></figure>
      </div>`);
  }

  const reelCarousel = document.querySelector('[data-reel-carousel]');
  if (reelCarousel) {
    const reels = [
      { src: 'assets/jubilarse-reel-01.mp4', title: 'Reel 01' },
      { src: 'assets/jubilarse-reel-02.mp4', title: 'Reel 02' }
    ];
    const video = reelCarousel.querySelector('[data-reel-video]');
    const title = reelCarousel.querySelector('[data-reel-title]');
    const count = reelCarousel.querySelector('[data-reel-count]');
    const dots = [...reelCarousel.querySelectorAll('.case-reel-dots button')];
    let reelIndex = 0;
    const showReel = (nextIndex) => {
      reelIndex = (nextIndex + reels.length) % reels.length;
      const reel = reels[reelIndex];
      video.pause();
      video.src = reel.src;
      video.setAttribute('aria-label', `${reel.title} de Consultora Jubilarse`);
      video.load();
      title.textContent = reel.title;
      count.textContent = `${reelIndex + 1} / ${reels.length}`;
      dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === reelIndex)));
    };
    reelCarousel.querySelector('.case-reel-prev').addEventListener('click', () => showReel(reelIndex - 1));
    reelCarousel.querySelector('.case-reel-next').addEventListener('click', () => showReel(reelIndex + 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => showReel(index)));
  }

  const screenshotGrid = document.querySelector('.case-screenshot-grid');
  if (screenshotGrid && !document.querySelector('.case-screenshot-nav')) {
    const existingCards = [...screenshotGrid.querySelectorAll('.case-screenshot-card')];
    if (existingCards.length === 4) {
      const publicTurnCard = existingCards[2].cloneNode(true);
      existingCards[3].before(publicTurnCard);
    }
    const screenshotSources = [
      { src: 'assets/jubilarse-web-home-v2.jpg', alt: 'Nueva portada del sitio web de Consultora Jubilarse' },
      { src: 'assets/jubilarse-agenda-v2.jpg', alt: 'Vista vertical de la agenda semanal del back office' },
      { src: 'assets/jubilarse-galeria-jubilados.jpg', alt: 'Galería de personas jubiladas publicada en el sitio web' },
      { src: 'assets/jubilarse-turno-publico.jpg', alt: 'Formulario público para solicitar un turno' },
      { src: 'assets/jubilarse-backoffice-turno.jpg', alt: 'Formulario para crear un nuevo evento en el back office' }
    ];
    const screenshotContent = [
      { kicker: 'FRONT OFFICE', title: 'Una portada más clara', description: 'Presentación directa de los servicios, la experiencia y las principales vías de contacto de la consultora.' },
      { kicker: 'BACK OFFICE', title: 'Agenda centralizada', description: 'Organización semanal de turnos, profesionales y consultas desde un único espacio de gestión.' },
      { kicker: 'FRONT OFFICE', title: 'Galería de jubilados', description: 'Un espacio para mostrar historias reales y hacer visible el acompañamiento brindado a cada cliente.' },
      { kicker: 'FRONT OFFICE', title: 'Solicitud de turnos', description: 'Un recorrido guiado para recibir los datos de contacto y organizar cada nueva consulta.' },
      { kicker: 'INTERIOR DEL SISTEMA', title: 'Configuración de un nuevo evento', description: 'Carga de datos, modalidad, profesional, tipo de consulta e importe desde el back office.' }
    ];
    screenshotGrid.querySelectorAll('.case-screenshot-card').forEach((card, index) => {
      const image = card.querySelector('img');
      const caption = card.querySelector('figcaption');
      const source = screenshotSources[index];
      if (image && source) {
        image.src = source.src;
        image.alt = source.alt;
        image.removeAttribute('width');
        image.removeAttribute('height');
      }
      if (image && !card.querySelector('.case-browser-media')) {
        const media = document.createElement('div');
        media.className = 'case-browser-media';
        image.before(media);
        media.insertAdjacentHTML('beforeend', `<div class="case-browser-bar" aria-hidden="true"><i></i><i></i><i></i><span>www.consultorajubilarse.com.ar</span></div>`);
        media.append(image);
      }
      const content = screenshotContent[index];
      if (caption && content) caption.innerHTML = `<span>${content.kicker}</span><strong>${content.title}</strong><small>${content.description}</small>`;
    });
    screenshotGrid.id = 'pantallas-proyecto';
    screenshotGrid.insertAdjacentHTML('beforebegin', `<div class="case-screenshot-nav"><div><span>RECORRIDO VISUAL</span></div></div>`);
    document.querySelectorAll('.case-screenshot-nav strong').forEach((label) => label.remove());
    const screenshotShell = document.createElement('div');
    screenshotShell.className = 'case-screenshot-shell';
    screenshotGrid.before(screenshotShell);
    screenshotShell.append(screenshotGrid);
    screenshotShell.insertAdjacentHTML('beforeend', `<div class="case-screenshot-controls"><button type="button" data-screenshot-prev aria-label="Ver captura anterior">←</button><button type="button" data-screenshot-next aria-label="Ver captura siguiente">→</button></div>`);
    const moveScreenshots = (direction) => {
      const firstCard = screenshotGrid.querySelector('.case-screenshot-card');
      const gap = Number.parseFloat(getComputedStyle(screenshotGrid).columnGap) || 0;
      const step = firstCard ? firstCard.getBoundingClientRect().width + gap : screenshotGrid.clientWidth;
      screenshotGrid.scrollBy({ left: step * direction, behavior: 'smooth' });
    };
    document.querySelector('[data-screenshot-prev]').addEventListener('click', () => moveScreenshots(-1));
    document.querySelector('[data-screenshot-next]').addEventListener('click', () => moveScreenshots(1));
  }

  document.querySelectorAll('.case-photography, .case-evidence').forEach((section) => section.remove());
  const channelsSection = document.querySelector('.case-channels');
  if (channelsSection && !document.querySelector('.case-results')) {
    channelsSection.insertAdjacentHTML('beforebegin', `
      <section class="case-results section" id="resultados" aria-labelledby="case-results-title">
        <div class="wrap">
          <div class="section-head">
            <div>
              <p class="eyebrow">05 · RESULTADOS LOGRADOS</p>
              <h2 id="case-results-title">Números para leer <em>cómo evoluciona el proyecto.</em></h2>
            </div>
            <p>Una primera lectura de los últimos 90 días de Meta y de los datos acumulados desde el lanzamiento del sitio.</p>
          </div>
          <div class="case-results-platforms">
            <article class="case-results-platform case-results-instagram">
              <div class="case-results-platform-head"><span>INSTAGRAM</span><strong>Últimos 90 días</strong></div>
              <div class="case-metric-grid">
                <div><span>Incremento de seguidores</span><strong>101</strong><small>+124,4 %</small></div>
                <div><span>Visitas al perfil</span><strong>521</strong><small>+108,4 %</small></div>
                <div><span>Interacciones</span><strong>862</strong><small>+207,9 %</small></div>
                <div><span>Visualizaciones</span><strong>51.284</strong><small>Parte del total mostrado por Meta</small></div>
              </div>
            </article>
            <article class="case-results-platform case-results-facebook">
              <div class="case-results-platform-head"><span>FACEBOOK</span><strong>Últimos 90 días</strong></div>
              <div class="case-metric-grid">
                <div><span>Incremento de seguidores</span><strong>52</strong><small>+188,9 %</small></div>
                <div><span>Visitas</span><strong>1.400</strong><small>+43 %</small></div>
                <div><span>Interacciones</span><strong>468</strong><small>+64,8 %</small></div>
                <div><span>Visualizaciones</span><strong>42.900</strong><small>+56,6 %</small></div>
              </div>
            </article>
          </div>
          <div class="case-results-web">
            <div><span>GOOGLE SEARCH CONSOLE</span><strong>Desde el lanzamiento del sitio</strong></div>
            <div class="case-web-metrics"><div><span>Clics totales</span><strong>40</strong></div><div><span>Impresiones</span><strong>720</strong></div><div><span>CTR medio</span><strong>5,6 %</strong></div></div>
          </div>
          <p class="case-results-source">Meta Business Suite · 11 jun 2026 — 8 sep 2026. Google Search Console · dato acumulado informado para la maqueta.</p>
        </div>
      </section>`);
  }

  const channelPreviews = [
    ['assets/jubilarse-web-home.jpg', 'Vista previa del sitio web de Consultora Jubilarse'],
    ['assets/jubilarse-instagram-profile.jpg', 'Vista previa del perfil de Instagram de Consultora Jubilarse'],
    ['assets/jubilarse-post-jubilados.jpg', 'Vista previa de contenidos de Facebook de Consultora Jubilarse']
  ];
  document.querySelectorAll('.case-channel-links a').forEach((link, index) => {
    if (!link.querySelector('img')) link.insertAdjacentHTML('afterbegin', `<figure><div class="case-channel-window" aria-hidden="true"><i></i><i></i><i></i></div><img src="${channelPreviews[index][0]}" alt="${channelPreviews[index][1]}"></figure>`);
    const label = link.querySelector('span');
    if (index === 1 && label && !label.querySelector('svg')) label.insertAdjacentHTML('afterbegin', `<svg class="case-social-mark case-social-mark-instagram" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="instagram-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ffb000"/><stop offset=".48" stop-color="#ed2146"/><stop offset="1" stop-color="#833ab4"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="url(#instagram-gradient)" stroke-width="2.2"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="url(#instagram-gradient)" stroke-width="2.2"/><circle cx="17.4" cy="6.7" r="1.15" fill="#d62976"/></svg>`);
    if (index === 2 && label && !label.querySelector('svg')) label.insertAdjacentHTML('afterbegin', `<svg class="case-social-mark case-social-mark-facebook" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877f2"/><path fill="#fff" d="M13.5 20v-7h2.4l.35-2.75H13.5V8.5c0-.8.23-1.34 1.4-1.34h1.5V4.7c-.26-.04-1.15-.11-2.18-.11-2.16 0-3.64 1.32-3.64 3.74v1.92H8.15V13h2.43v7h2.92Z"/></svg>`);
  });

  document.querySelectorAll('img[src^="assets/"]').forEach((img) => {
    img.loading = 'eager';
  });

  const carousel = document.querySelector('[data-case-carousel]');
  if (!carousel) return;

  const items = [
    { src: 'assets/jubilarse-post-julio-01.jpg', alt: 'Posteo de Consultora Jubilarse sobre planificación jubilatoria', width: 1080, height: 1080, kicker: 'POSTEO · JULIO', title: 'Planificación jubilatoria', description: 'Una pieza seleccionada del trabajo de contenidos para redes sociales.' },
    { src: 'assets/jubilarse-post-julio-02.jpg', alt: 'Posteo de Consultora Jubilarse sobre planificación', width: 1080, height: 1080, kicker: 'POSTEO · SERVICIO', title: 'Información que orienta', description: 'Contenido educativo para explicar servicios con claridad.' },
    { src: 'assets/jubilarse-post-agosto-01.jpg', alt: 'Carrusel de Consultora Jubilarse', width: 1080, height: 1080, kicker: 'CARRUSEL · INFORMACIÓN', title: 'Una idea, varios pasos', description: 'Formato secuencial para acompañar una explicación de principio a fin.' },
    { src: 'assets/jubilarse-post-agosto-02.jpg', alt: 'Carrusel de Consultora Jubilarse sobre una experiencia', width: 1080, height: 1080, kicker: 'CARRUSEL · EXPERIENCIA', title: 'La experiencia también comunica', description: 'Una pieza que acerca el trabajo de la consultora a su comunidad.' },
    { src: 'assets/jubilarse-historia-01.jpg', alt: 'Historia de Instagram de Consultora Jubilarse', width: 1080, height: 1920, story: true, kicker: 'HISTORIA · PRESENTACIÓN', title: 'Abrir la conversación', description: 'Formato vertical para presentar una idea desde el primer contacto.' },
    { src: 'assets/jubilarse-historia-02.jpg', alt: 'Historia de Instagram de Consultora Jubilarse', width: 1080, height: 1920, story: true, kicker: 'HISTORIA · ORIENTACIÓN', title: 'Acompañar una decisión', description: 'Una historia pensada para llevar una pregunta hacia un próximo paso.' },
    { src: 'assets/jubilarse-historia-servicios.jpg', alt: 'Historia de Instagram de Consultora Jubilarse sobre sus servicios', width: 493, height: 877, story: true, kicker: 'HISTORIA · SERVICIOS', title: 'Explicar qué hacemos', description: 'Una pieza breve para hacer visible la propuesta de la consultora.' },
    { src: 'assets/jubilarse-post-jubilados.jpg', alt: 'Posteo de Consultora Jubilarse con personas jubiladas', width: 1080, height: 1080, kicker: 'POSTEO · COMUNIDAD', title: 'Poner a las personas en el centro', description: 'Contenido que conecta la comunicación con historias y vínculos reales.' }
  ];

  const image = carousel.querySelector('[data-carousel-image]');
  const reel = carousel.querySelector('[data-carousel-reel]');
  const kicker = carousel.querySelector('[data-carousel-kicker]');
  const title = carousel.querySelector('[data-carousel-title]');
  const description = carousel.querySelector('[data-carousel-description]');
  const count = carousel.querySelector('[data-carousel-count]');
  const dots = carousel.querySelector('[data-carousel-dots]');
  const link = carousel.querySelector('[data-carousel-link]');
  const previous = carousel.querySelector('[data-carousel-prev]');
  const next = carousel.querySelector('[data-carousel-next]');
  let current = 0;

  const show = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    const isReel = Boolean(item.reel);

    image.hidden = isReel;
    reel.hidden = !isReel;
    if (!isReel) {
      image.src = item.src;
      image.alt = item.alt;
      image.width = item.width;
      image.height = item.height;
      image.classList.toggle('is-story', Boolean(item.story));
    }

    kicker.textContent = item.kicker;
    title.textContent = item.title;
    description.textContent = item.description;
    count.textContent = `${current + 1} / ${items.length}`;
    link.hidden = !item.href;
    if (item.href) link.href = item.href;

    [...dots.children].forEach((dot, dotIndex) => {
      const selected = dotIndex === current;
      dot.setAttribute('aria-selected', String(selected));
      dot.tabIndex = selected ? 0 : -1;
    });
  };

  items.forEach((item, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'case-carousel-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Ver contenido ${index + 1}: ${item.kicker.toLowerCase()}`);
    dot.addEventListener('click', () => show(index));
    dots.append(dot);
  });

  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + 1);
    }
  });

  show(0);
})();
