import './NovemberWorkshopConfirmation.css'

const sessions = [
  { label: 'Jornada 1', date: '11 NOV', time: '14 a 17hs', duration: '3 horas' },
  { label: 'Jornada 2', date: '12 NOV', time: '14 a 17hs', duration: '3 horas' },
  { label: 'Consultas', date: '13 NOV', time: '14 a 15hs', duration: '1 hora' },
]

export default function NovemberWorkshopConfirmation({ event }) {
  return (
    <div className="november-confirmation">
      <main className="november-confirmation__content">
        <p className="november-confirmation__eyebrow">ChatGPT Work · Noviembre 2026</p>
        <div className="november-confirmation__status">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          Inscripción recibida
        </div>
        <h1>Muchas gracias<br />por inscribirte.</h1>
        <p className="november-confirmation__intro">
          Recibimos tus datos y comprobantes. Nos alegra que te sumes al workshop.
        </p>
        <section className="november-confirmation__event" aria-labelledby="november-event-title">
          <p className="november-confirmation__eyebrow">Tu nuevo entorno de trabajo</p>
          <h2 id="november-event-title">ChatGPT Work: de 0 a 100</h2>
          <p className="november-confirmation__details">Online · 3 jornadas · 7 horas en total</p>
          <div className="november-confirmation__sessions">
            {sessions.map(session => (
              <div className="november-confirmation__session" key={session.date}>
                <span>{session.label}</span>
                <strong>{session.date}</strong>
                <p>{session.time} · {session.duration}</p>
              </div>
            ))}
          </div>
          <p className="november-confirmation__details">
            Horarios de Argentina · Noviembre de 2026<br />
            Dictado por Lic. Leandro Velasques
          </p>
        </section>
        <section className="november-confirmation__next" aria-labelledby="november-next-title">
          <h3 id="november-next-title">Nos vemos en el workshop</h3>
          <p>
            48 horas antes del inicio del workshop te enviaremos un recordatorio
            con el enlace de acceso para que puedas conectarte.
          </p>
          <p className="november-confirmation__note">
            Revisá también la carpeta de spam o correo no deseado.
          </p>
        </section>
        <nav className="november-confirmation__actions" aria-label="Después de inscribirte">
          <a className="november-confirmation__button" href={`/evento/${event.slug}`}>
            Volver al programa <span aria-hidden="true">→</span>
          </a>
          <a className="november-confirmation__link" href="https://www.leandrovelasques.com.ar">
            Ir al sitio web
          </a>
        </nav>
        <footer>Lic. Leandro Velasques · leandrovelasques.com.ar</footer>
      </main>
    </div>
  )
}
