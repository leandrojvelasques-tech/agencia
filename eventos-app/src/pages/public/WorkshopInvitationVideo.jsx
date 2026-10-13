import './workshopInvitationVideo.css'

export default function WorkshopInvitationVideo({ videoSrc = '' }) {
  const poster = `${import.meta.env.BASE_URL}workshop-chatgpt-work/leandro-camisa-blanca-adaptada.png`

  return (
    <section className="work-landing__section workshop-invitation" aria-labelledby="workshop-invitation-title">
      <figure className="workshop-invitation__media">
        {videoSrc ? (
          <video controls preload="metadata" poster={poster} src={videoSrc} aria-label="Invitación de Leandro Velasques al taller ChatGPT Work de noviembre" />
        ) : (
          <div className="workshop-invitation__poster">
            <img src={poster} alt="Leandro Velasques. Espacio reservado para su video de invitación al taller." loading="lazy" />
            <span className="workshop-invitation__pending">Próximamente</span>
            <span className="workshop-invitation__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z" /></svg></span>
            <div className="workshop-invitation__caption"><strong>Una invitación de Leandro</strong><span>Video de presentación · 1 minuto</span></div>
          </div>
        )}
      </figure>
      <div className="workshop-invitation__copy">
        <p className="work-landing__eyebrow">TE INVITO A PARTICIPAR</p>
        <h2 id="workshop-invitation-title">Te cuento de qué se trata esta edición.</h2>
        <p>Vamos a recorrer ChatGPT Work, aplicarlo a un caso integrador y dedicar una jornada a tus consultas.</p>
        <p>Podés empezar desde cero o traer lo que ya venís trabajando. La idea es que te lleves una forma de usar estas herramientas en tu trabajo.</p>
        {!videoSrc && <p className="workshop-invitation__note">En breve vas a poder ver acá mi invitación y un resumen del taller.</p>}
        <a href="#programa">Conocer las tres jornadas <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  )
}
