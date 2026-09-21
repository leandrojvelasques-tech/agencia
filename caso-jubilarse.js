(() => {
  const carousel = document.querySelector("[data-case-carousel]");
  if (!carousel) return;
  const items = [
    {
      src: "assets/jubilarse-post-julio-01.jpg",
      alt: "Posteo sobre planificación jubilatoria",
      kicker: "POSTEO · INFORMACIÓN",
      title: "Planificación jubilatoria",
      description:
        "Contenido para explicar un tema previsional de forma clara.",
    },
    {
      src: "assets/jubilarse-post-julio-02.jpg",
      alt: "Posteo informativo de Consultora Jubilarse",
      kicker: "POSTEO · SERVICIO",
      title: "Información que orienta",
      description: "Una pieza de servicio que acompaña consultas frecuentes.",
    },
    {
      src: "assets/jubilarse-post-agosto-01.jpg",
      alt: "Carrusel informativo de Consultora Jubilarse",
      kicker: "CARRUSEL · INFORMACIÓN",
      title: "Una idea, varios pasos",
      description:
        "Una explicación ordenada para recorrer un tema de principio a fin.",
    },
    {
      src: "assets/jubilarse-post-agosto-02.jpg",
      alt: "Carrusel de experiencia de Consultora Jubilarse",
      kicker: "CARRUSEL · EXPERIENCIA",
      title: "La experiencia también comunica",
      description: "Contenido que acerca el trabajo real de la consultora.",
    },
    {
      src: "assets/jubilarse-historia-01.jpg",
      alt: "Historia de Instagram de Consultora Jubilarse",
      story: true,
      kicker: "HISTORIA · PRESENTACIÓN",
      title: "Abrir la conversación",
      description:
        "Un formato breve para presentar una idea desde el primer contacto.",
    },
    {
      src: "assets/jubilarse-historia-02.jpg",
      alt: "Historia de orientación de Consultora Jubilarse",
      story: true,
      kicker: "HISTORIA · ORIENTACIÓN",
      title: "Acompañar una decisión",
      description:
        "Una historia pensada para llevar una pregunta hacia el próximo paso.",
    },
    {
      src: "assets/jubilarse-historia-servicios.jpg",
      alt: "Historia sobre servicios de Consultora Jubilarse",
      story: true,
      kicker: "HISTORIA · SERVICIOS",
      title: "Explicar qué hacemos",
      description:
        "Una pieza vertical para presentar la propuesta de la consultora.",
    },
    {
      src: "assets/jubilarse-post-jubilados.jpg",
      alt: "Posteo con personas jubiladas",
      kicker: "POSTEO · COMUNIDAD",
      title: "Poner a las personas en el centro",
      description:
        "Historias reales que conectan el servicio con su comunidad.",
    },
  ];
  const image = carousel.querySelector("[data-carousel-image]");
  const kicker = carousel.querySelector("[data-carousel-kicker]");
  const title = carousel.querySelector("[data-carousel-title]");
  const description = carousel.querySelector("[data-carousel-description]");
  const count = carousel.querySelector("[data-carousel-count]");
  const dots = carousel.querySelector("[data-carousel-dots]");
  let current = 0;
  const show = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    image.src = item.src;
    image.alt = item.alt;
    image.classList.toggle("is-story", Boolean(item.story));
    kicker.textContent = item.kicker;
    title.textContent = item.title;
    description.textContent = item.description;
    count.textContent = `${current + 1} / ${items.length}`;
    [...dots.children].forEach((dot, dotIndex) => {
      const selected = dotIndex === current;
      dot.setAttribute("aria-selected", String(selected));
      dot.tabIndex = selected ? 0 : -1;
    });
  };
  items.forEach((item, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "case-carousel-dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Ver contenido ${index + 1}`);
    dot.addEventListener("click", () => show(index));
    dots.append(dot);
  });
  carousel
    .querySelector("[data-carousel-prev]")
    .addEventListener("click", () => show(current - 1));
  carousel
    .querySelector("[data-carousel-next]")
    .addEventListener("click", () => show(current + 1));
  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });
  show(0);
})();

function setupCaseTeam(){
  const team=document.querySelector('.marketing-case-team');
  if(!team||team.querySelector('.case-team-support'))return;
  const support=document.createElement('div');
  support.className='case-team-support';
  const members=[
    {src:'assets/equipo-nuni-v2.png',alt:'Integrante del equipo de contenidos',label:'CONTENIDOS Y PIEZAS',title:'Producción de contenidos',description:'Desarrollo de piezas y contenidos para sostener la comunicación.'},
    {src:'assets/equipo-camila-maqueta.png',alt:'Integrante del equipo de diseño',label:'DISEÑO Y EDICIÓN',title:'Diseño visual',description:'Diseño y edición de materiales para distintos formatos.'},
    {src:'assets/equipo-cami-1-v2.png',alt:'Integrante del equipo audiovisual',label:'FOTOGRAFÍA Y VIDEO',title:'Producción audiovisual',description:'Registro y producción audiovisual a partir del trabajo real.'}
  ];
  members.forEach(member=>{
    const card=document.createElement('article');
    card.className='case-team-card case-team-support-card';
    card.innerHTML=`<figure><img src="${member.src}" alt="${member.alt}" loading="lazy" width="1152" height="1536"></figure><div class="case-team-copy"><span>${member.label}</span><h3>${member.title}</h3><p>${member.description}</p></div>`;
    support.append(card);
  });
  team.append(support);
}
setupCaseTeam();
