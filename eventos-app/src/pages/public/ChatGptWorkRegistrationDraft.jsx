import { useState } from 'react'
import './chatGptWorkRegistrationDraft.css'

const situations = [
  { id: 'matriculado', label: 'Soy matriculado/a del CPCE Chubut', description: 'Buscá tu nombre o matrícula en el padrón.' },
  { id: 'estudiante', label: 'Soy estudiante', description: 'Contanos dónde y qué estás estudiando.' },
  { id: 'otro', label: 'Otro perfil', description: 'Profesional no matriculado u otra situación.' },
]

export default function ChatGptWorkRegistrationDraft() {
  const [situation, setSituation] = useState('matriculado')
  const [notice, setNotice] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setNotice(true)
  }

  return (
    <main className="work-registration">
      <header className="work-registration__header">
        <a href="/brochure/chatgpt-work" className="work-registration__back">← Volver al programa</a>
        <span>CHATGPT WORK · INSCRIPCIÓN</span>
      </header>

      <section className="work-registration__hero">
        <p className="work-registration__eyebrow">BORRADOR DE INSCRIPCIÓN</p>
        <h1>Reservá tu lugar<br /><em>para trabajar con agentes.</em></h1>
        <p>Completá tus datos para participar del taller. La inscripción definitiva se habilitará una vez validado este formulario.</p>
      </section>

      <section className="work-registration__content" aria-label="Formulario de inscripción">
        <aside className="work-registration__summary">
          <p>CHATGPT WORK</p>
          <h2>De 0 a 100</h2>
          <div className="work-registration__facts">
            <div><strong>2</strong><span>jornadas</span></div>
            <div><strong>4</strong><span>bloques</span></div>
            <div><strong>6 h</strong><span>estimadas</span></div>
          </div>
          <div className="work-registration__summary-note">
            <span>01</span>
            <p>Datos de contacto y situación actual.</p>
            <span>02</span>
            <p>Confirmación de tu inscripción.</p>
          </div>
        </aside>

        <form className="work-registration__form" onSubmit={handleSubmit}>
          <section className="work-registration__step">
            <div className="work-registration__step-head"><span>01</span><div><h2>Datos de contacto</h2><p>Usaremos estos datos para confirmar tu inscripción y comunicarnos con vos.</p></div></div>
            <div className="work-registration__fields">
              <label>Nombre y apellido<input name="fullName" placeholder="Como figura habitualmente" required /></label>
              <label>Email<input name="email" type="email" placeholder="nombre@email.com" required /></label>
              <label className="work-registration__field-full">Teléfono<input name="phone" type="tel" placeholder="Código de área y número" required /></label>
            </div>
          </section>

          <section className="work-registration__step">
            <div className="work-registration__step-head"><span>02</span><div><h2>Situación actual</h2><p>Elegí la opción que mejor describe tu situación hoy.</p></div></div>
            <div className="work-registration__choices">
              {situations.map(item => <label className={`work-registration__choice ${situation === item.id ? 'is-selected' : ''}`} key={item.id}>
                <input type="radio" name="situation" value={item.id} checked={situation === item.id} onChange={() => { setSituation(item.id); setNotice(false) }} />
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                <i aria-hidden="true" />
              </label>)}
            </div>

            {situation === 'matriculado' && <div className="work-registration__conditional">
              <label>Buscar en el padrón del CPCE Chubut<input name="padronSearch" placeholder="Escribí tu nombre o matrícula" /></label>
              <p>Al conectar el padrón, este campo mostrará coincidencias y completará los datos profesionales disponibles.</p>
            </div>}

            {situation === 'estudiante' && <div className="work-registration__conditional work-registration__fields">
              <label>Universidad o institución<input name="university" placeholder="Ej.: Universidad Nacional..." /></label>
              <label>Carrera<input name="career" placeholder="Ej.: Contador Público" /></label>
              <label className="work-registration__field-full">Cantidad de materias aprobadas<input name="approvedSubjects" type="number" min="0" placeholder="0" /></label>
            </div>}

            {situation === 'otro' && <div className="work-registration__conditional">
              <label>Actividad, profesión o vínculo con la temática<input name="background" placeholder="Contanos brevemente tu perfil" /></label>
            </div>}
          </section>

          <section className="work-registration__step work-registration__step--last">
            <div className="work-registration__step-head"><span>03</span><div><h2>Comentarios o consultas</h2><p>Opcional. Podés dejar una pregunta o necesidad particular sobre el taller.</p></div></div>
            <label className="work-registration__textarea">Comentarios<textarea name="comments" rows="5" placeholder="Escribí tu comentario acá" /></label>
            <label className="work-registration__consent"><input type="checkbox" required /><span>Confirmo que los datos informados son correctos y acepto ser contactado/a por información vinculada al taller.</span></label>
          </section>

          {notice && <p className="work-registration__notice" role="status">Borrador visual: este formulario todavía no guarda ni envía inscripciones.</p>}
          <button type="submit" className="work-registration__submit">Confirmar inscripción <span>→</span></button>
        </form>
      </section>
    </main>
  )
}
