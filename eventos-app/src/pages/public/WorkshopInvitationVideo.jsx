import './workshopInvitationVideo.css'

export default function WorkshopInvitationVideo({ videoSrc = '' }) {
  const poster = `${import.meta.env.BASE_URL}workshop-chatgpt-work/leandro-invitacion-biblioteca.png`

  return (
    <section className="work-landing__section workshop-invitation" aria-label="Video de invitación al taller">
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
    </section>
  )
}
