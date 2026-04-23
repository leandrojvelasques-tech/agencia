import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const Footer = () => (
  <div className="footer">
    <div className="footer-left">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '10px' }}>🌐</span>
        <span>www.leandrovelasques.com.ar</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '10px' }}>🔗</span>
        <span>linkedin.com/in/leandrojvelasques</span>
      </div>
    </div>
    <div className="footer-right">
      <img src="./logos_institucionales.png" alt="Instituciones Organizadoras" className="footer-logo" style={{ height: '35px' }} />
      <img src="./logo_triskel.png" alt="Triskel" className="footer-logo" style={{ height: '25px', opacity: 0.8 }} />
    </div>
  </div>
)

const Portada = () => (
  <div className="slide-content" style={{ padding: '0 80px', position: 'relative', height: '462px' }}>
    <div className="accent-bar" style={{ width: '12px' }} />
    
    {/* Título en la parte superior-izquierda */}
    <motion.div 
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      style={{ position: 'absolute', top: '60px', left: '80px', width: '600px', zIndex: 10 }}
    >
      <h1 style={{ fontSize: '3.2rem', fontWeight: '900', marginBottom: '0.8rem', lineHeight: '1', color: 'var(--primary-green)' }}>
        De la tarea manual <br />
        al flujo automatizado <br />
        <span style={{ color: 'var(--dark-gray)', opacity: 0.6 }}>con IA</span>
      </h1>
      <h2 style={{ fontSize: '1.2rem', opacity: 0.7, fontWeight: '500', maxWidth: '450px', lineHeight: '1.4' }}>
        Estrategias de optimización para procesos administrativos modernos
      </h2>
    </motion.div>

    {/* Firma: Anclada al PIE (Bottom) de la diapositiva */}
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      style={{ position: 'absolute', bottom: '30px', left: '80px', zIndex: 20 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid var(--primary-green)', paddingLeft: '22px' }}>
        <div style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--dark-gray)', lineHeight: '1' }}>
          Lic. Adm. Leandro Velasques (UNPSJB)
        </div>
        <div style={{ fontSize: '1rem', fontWeight: '500', opacity: 0.6 }}>
          Especialista en Inteligencia Artificial (Big School)
        </div>
        <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '4px' }}>
          MP C.P.C.E.Ch Tomo III - Folio 58 | Comodoro Rivadavia
        </div>
      </div>
    </motion.div>

    {/* Avatar: Anclado al PIE (Bottom) de la diapositiva */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
      className="avatar-container"
      style={{ width: '280px', right: '40px', bottom: '0px', zIndex: 5 }}
    >
      <img src="./leandro_avatar_3d.png" alt="Leandro Velasques" style={{ width: '100%', height: 'auto' }} />
    </motion.div>
  </div>
)

const EjemploInscripcion = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '2rem' }} className="mb-8">Ejemplo: inscripción a esta charla</h1>
    
    <div className="grid-2" style={{ marginTop: '-30px' }}>
      {/* Previamente */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card card-red"
      >
        <div style={{ color: '#e53e3e', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Previamente (Manual)
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="step-item" style={{ opacity: 0.8 }}>
            <div className="step-number">1</div>
            <span>Cliente completa Forms</span>
          </div>
          <div style={{ textAlign: 'center', color: '#ccc', lineHeight: '1' }}>↓</div>
          <div className="step-item" style={{ opacity: 0.8 }}>
            <div className="step-number">2</div>
            <span>Organizador revisa planilla</span>
          </div>
          <div style={{ textAlign: 'center', color: '#ccc', lineHeight: '1' }}>↓</div>
          <div className="step-item" style={{ opacity: 0.8 }}>
            <div className="step-number">3</div>
            <span>Organizador envía email</span>
          </div>
          <div style={{ textAlign: 'center', color: '#ccc', lineHeight: '1' }}>↓</div>
          <div className="step-item" style={{ opacity: 0.8 }}>
            <div className="step-number">4</div>
            <span>Asistente recibe el email</span>
          </div>
        </div>
      </motion.div>

      {/* Actualmente */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="card card-green"
      >
        <div style={{ color: 'var(--primary-green)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Actualmente (Automatizado)
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          <div className="automated-box" style={{ marginBottom: '15px' }}>
            <div className="badge">FLOW ⚡</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'var(--primary-green)', color: 'white', padding: '12px', borderRadius: '50%', display: 'flex', fontSize: '24px' }}>
                📄
              </div>
              <div>
                <p style={{ fontBold: 'bold', fontSize: '1.1rem', lineHeight: '1.1', fontWeight: 'bold' }}>Cliente completa formulario</p>
                <p style={{ color: 'var(--primary-green)', fontWeight: '500', fontSize: '0.9rem' }}>Inscripción instantánea</p>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px', marginTop: '10px' }}>
            <div style={{ textAlign: 'center' }}>
              <img 
                src="./QR Inscripcion.png" 
                alt="QR Inscripcion" 
                style={{ height: '130px', width: '130px', border: '5px solid white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--primary-green)', fontWeight: 'bold', marginTop: '5px' }}>¡PROBALO AHORA!</p>
            </div>
            <div style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '1rem', maxWidth: '150px', lineHeight: '1.2' }}>
              ⚡ Sin intervención humana
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
)

const QueEsAutomatizar = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '2rem' }} className="mb-8">¿Qué es automatizar?</h1>
    
    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
      <p style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: '500', textAlign: 'center' }}>
        "Diseñar un proceso para que una tarea se ejecute sola o con mínima intervención humana"
      </p>
    </div>

    <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="card card-green" style={{ textAlign: 'center', alignItems: 'center' }}
      >
        <div style={{ background: 'var(--primary-green)', color: 'white', padding: '15px', borderRadius: '50%', fontSize: '20px' }}>
          💰
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Ahorrar tiempo</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Liberar horas de tareas repetitivas</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="card card-green" style={{ textAlign: 'center', alignItems: 'center', borderColor: '#A8D5C1' }}
      >
        <div style={{ background: 'var(--light-green)', color: 'var(--primary-green)', padding: '15px', borderRadius: '50%', fontSize: '20px' }}>
          ⚡
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Reducir errores</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Eliminar el factor de estrés humano</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="card card-green" style={{ textAlign: 'center', alignItems: 'center' }}
      >
        <div style={{ background: 'var(--dark-gray)', color: 'white', padding: '15px', borderRadius: '50%', fontSize: '20px' }}>
          📈
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Escala</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Crecer sin aumentar costos fijos</p>
      </motion.div>
    </div>
  </div>
)

const PreguntaFondo = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '2rem' }}>¿Esto resuelve el problema de fondo?</h2>

    <div className="card card-green" style={{ padding: '30px' }}>
      <ul className="flex flex-col gap-4" style={{ listStyle: 'none', padding: 0, fontSize: '1.1rem' }}>
        <li>✅ ¿Por qué el cliente quiere automatizar ese proceso?</li>
        <li>✅ ¿Está claro que esto producirá una mejora real y no empeorará la situación?</li>
        <li>✅ ¿O se intenta automatizar algo secundario sin atacar la dificultad principal?</li>
      </ul>
    </div>
  </div>
)

const ConocerProceso = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1rem' }}>Conocer en profundidad el proceso actual</h2>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '6px solid var(--primary-green)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>"No se puede automatizar correctamente algo que no se entiende."</p>
      </div>
      
      <div className="grid-2" style={{ gap: '15px' }}>
        <div className="card" style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary-green)' }}>1. Entender el HOY</h3>
          <ul className="flex flex-col gap-1" style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem' }}>
            <li>• Quiénes intervienen y sus roles</li>
            <li>• Cómo circula la información</li>
            <li>• Dónde están los cuellos de botella</li>
          </ul>
        </div>
        <div className="card" style={{ background: 'var(--dark-gray)', color: 'white', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: '#4ade80' }}>2. Claridad en el OBJETIVO</h3>
          <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem' }}>
            <li style={{ fontStyle: 'italic', opacity: 0.9 }}>"Quiero que el usuario pueda autoagendarse un turno desde la web"</li>
            <li style={{ fontStyle: 'italic', opacity: 0.9 }}>"Quiero enviar un audio de WhatsApp, que se guarde en X lugar y luego ocurra Y..."</li>
          </ul>
        </div>
      </div>

      <div className="card card-green" style={{ padding: '15px' }}>
        <p style={{ fontSize: '0.9rem', margin: 0 }}>
          <strong>La precisión en el pedido es la clave:</strong> Cuanto más detallado sea el "input" y el "resultado esperado", más fácil será construir la lógica del workflow.
        </p>
      </div>
    </div>
  </div>
)

const StackHerramientas = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1.5rem' }}>Un stack de herramientas digitales adecuado</h2>

    <div className="flex flex-col gap-4">
      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '0.5rem' }}>Mi stack personal actual:</p>
      
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <motion.div whileHover={{ scale: 1.02 }} className="tool-card">
          <div className="tool-icon">
            <img src="./logo_chatgpt.jpg" alt="ChatGPT" />
          </div>
          <div>
            <div className="tool-name">ChatGPT</div>
            <div className="tool-role">Asistente de IA</div>
          </div>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="tool-card">
          <div className="tool-icon">
            <img src="./logo_n8n.png" alt="n8n" />
          </div>
          <div>
            <div className="tool-name">n8n</div>
            <div className="tool-role">Orquestación y Flujos</div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="tool-card">
          <div className="tool-icon">
            <img src="./logo_antigravity.png" alt="Antigravity" />
          </div>
          <div>
            <div className="tool-name">Antigravity</div>
            <div className="tool-role">Desarrollo de Apps</div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="tool-card"
          style={{ background: 'rgba(40, 90, 71, 0.05)', borderColor: 'var(--primary-green)' }}
        >
          <div className="tool-icon">
            <img src="./logo_openclaw.png" alt="OpenClaw" />
          </div>
          <div>
            <div className="tool-name">OpenClaw</div>
            <div className="tool-role">Agente Autónomo (Beta)</div>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
)

const PiramideAutonomia = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1.5rem' }}>Métodos para crear automatizaciones</h2>
    
    <div className="pyramid-container" style={{ marginTop: '10px', width: '100%', maxWidth: 'none' }}>
      <div className="pyramid-levels flex flex-col w-full items-center" style={{ gap: '15px' }}>
        {[
          { level: "Construcción autónoma x agentes", desc: "Autonomía 100%", color: "#e53e3e", width: '50%' },
          { level: "Construcción vía LLM - MCP", desc: "Autonomía 80%", color: "#dd6b20", width: '75%' },
          { level: "Método tradicional o artesanal", desc: "Construyo nodo a nodo", color: "#2f855a", width: '100%' }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', damping: 12 }}
            style={{ 
              width: item.width, 
              backgroundColor: item.color,
              padding: '12px 20px',
              borderRadius: '12px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minHeight: '80px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', lineHeight: '1.1' }}>{item.level}</span>
            <span style={{ fontSize: '0.95rem', opacity: 0.95, marginTop: '2px' }}>"{item.desc}"</span>
            {/* Trapezoid effect using pseudo-elements would be complex here, so we stick to width variation for now */}
          </motion.div>
        ))}
      </div>
    </div>
  </div>
)

const CuandoAutomatizar = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem' }} className="mb-1">Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1.5rem' }}>Indicadores claves de oportunidad</h2>
    
    <div className="grid-2" style={{ gap: '25px', marginTop: '5px' }}>
      <div className="flex flex-col gap-6">
        <div className="card card-green" style={{ padding: '20px 25px', minHeight: '110px' }}>
          <h3 style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Reglas Claras</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.3' }}>El proceso tiene una lógica de "Si ocurre A, entonces hacer B" constante.</p>
        </div>
        <div className="card card-green" style={{ padding: '20px 25px', minHeight: '110px' }}>
          <h3 style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Alto Volumen</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.3' }}>Tareas que se repiten decenas o cientos de veces por semana.</p>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="card card-green" style={{ padding: '20px 25px', minHeight: '110px' }}>
          <h3 style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Costo de Error</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.3' }}>Cuando el error humano es frecuente o tiene un impacto económico alto.</p>
        </div>
        <div className="card card-green" style={{ padding: '20px 25px', minHeight: '110px' }}>
          <h3 style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>ROI Positivo</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.3' }}>Cuando el beneficio (tiempo ahorrado) supera el costo de implementación.</p>
        </div>
      </div>
    </div>
  </div>
)

const CasosUso = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1.5rem' }}>Ejemplos prácticos de aplicación</h2>
    
    <div className="grid-2" style={{ gap: '30px', marginTop: '10px' }}>
      <div className="flex flex-col gap-3">
        {[
          "Recepción y ordenamiento de documentación",
          "Envío automático de correos por eventos",
          "Sincronización de info entre sistemas",
          "Clasificación automática de información"
        ].map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="step-item" 
            style={{ padding: '10px 15px', borderLeft: '4px solid var(--primary-green)' }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{item}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[
          "Control periódico de novedades o cambios",
          "Generación de reportes recurrentes",
          "Procesamiento de formularios e inscripciones",
          "Derivación interna de tareas o pedidos"
        ].map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (i + 4) * 0.1 }}
            key={i} 
            className="step-item" 
            style={{ padding: '10px 15px', borderLeft: '4px solid var(--light-green)' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
)

const QueEsN8N = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '2rem' }}>¿Qué es n8n?</h1>
    <h2 className="mb-4">El orquestador de flujos inteligente</h2>
    
    <div className="grid-2" style={{ gap: '40px', marginTop: '0px' }}>
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0 }}>
          {[
            "Plataforma visual 'low-code' open source",
            "Conectar herramientas sin integración",
            "Mover datos entre sistemas",
            "Disparar acciones automáticas",
            "Ejecutar procesos programados",
            "Incorporar IA en procesos reales",
            "Crear agentes con IA"
          ].map((text, i) => (
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="step-item" 
              style={{ padding: '6px 15px', fontSize: '0.85rem' }}
            >
              <span style={{ color: 'var(--primary-green)', fontWeight: 'bold' }}>✓</span>
              <span>{text}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="card card-green justify-center items-center" style={{ minHeight: '260px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
        <motion.img 
          src="./logo_n8n.png" 
          alt="n8n Logo" 
          style={{ width: '90px', marginBottom: '15px', zIndex: 2 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        />
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <p style={{ fontWeight: '800', color: 'var(--primary-green)', fontSize: '1.4rem', lineHeight: '1.2' }}>Potencia Técnica</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '5px' }}>Facilidad Visual</p>
        </div>
        {/* Decorative nodes background */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none' }}>
           <svg width="100%" height="100%" viewBox="0 0 200 200">
             <circle cx="40" cy="40" r="4" fill="currentColor" />
             <circle cx="160" cy="60" r="4" fill="currentColor" />
             <circle cx="100" cy="150" r="6" fill="currentColor" />
             <line x1="40" y1="40" x2="100" y2="150" stroke="currentColor" strokeWidth="1" />
             <line x1="160" y1="60" x2="100" y2="150" stroke="currentColor" strokeWidth="1" />
           </svg>
        </div>
      </div>
    </div>
  </div>
)

const ComoEmpezarN8N = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '2rem' }}>¿Cómo empezar con n8n?</h1>
    <h2 className="mb-4">Opciones de despliegue y costos mensuales</h2>
    
    <div className="grid-3" style={{ gap: '20px', marginTop: '-15px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card card-green" style={{ textAlign: 'center', alignItems: 'center', padding: '15px' }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>☁️</div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-green)' }}>n8n Cloud</h3>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Suscripción oficial</p>
        <div style={{ fontSize: '1.8rem', fontWeight: '900', margin: '15px 0' }}>USD 20<small style={{ fontSize: '0.9rem', fontWeight: '500' }}>/mes</small></div>
        <ul style={{ fontSize: '0.75rem', textAlign: 'left', paddingLeft: '15px' }}>
          <li>Sin mantenimiento</li>
          <li>Listo para usar hoy</li>
          <li>Soporte incluido</li>
        </ul>
      </motion.div>
 
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card card-green" style={{ textAlign: 'center', alignItems: 'center', border: '2px solid var(--primary-green)', padding: '15px' }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚀</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-green)' }}>n8n Autohospedado (VPS)</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hetzner / Hostinger / DigitalOcean</p>
        <div style={{ fontSize: '1.8rem', fontWeight: '900', margin: '15px 0' }}>USD 10<small style={{ fontSize: '0.9rem', fontWeight: '500' }}> aprox</small></div>
        <ul style={{ fontSize: '0.75rem', textAlign: 'left', paddingLeft: '15px' }}>
          <li>Sin límites de flujos</li>
          <li>Control total de datos</li>
          <li>Escalabilidad total</li>
        </ul>
      </motion.div>
 
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card card-green" style={{ textAlign: 'center', alignItems: 'center', padding: '15px' }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏠</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-green)' }}>n8n Autohospedado (Infra. Propia)</h3>
        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hardware o servidor local</p>
        <div style={{ fontSize: '1.8rem', fontWeight: '900', margin: '15px 0' }}>GRATIS</div>
        <ul style={{ fontSize: '0.75rem', textAlign: 'left', paddingLeft: '15px' }}>
          <li>Licencia Community $0</li>
          <li>Instalación Docker</li>
          <li>Ideal para prototipos</li>
        </ul>
      </motion.div>
    </div>
  </div>
)
 
const CostosIA = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>Costos de Inteligencia Artificial</h1>
    <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '0.8rem' }}>Modelo Pay-as-you-go (Pago por uso)</h2>
    
    <div className="grid-2" style={{ gap: '15px', gridTemplateColumns: '0.8fr 1.2fr' }}>
      <div className="flex flex-col gap-2">
        <div className="card card-green" style={{ padding: '12px', gap: '8px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--primary-green)', fontWeight: 'bold' }}>¿Cómo se cobra?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
            <div style={{ background: 'white', padding: '8px 10px', borderRadius: '8px', borderLeft: '4px solid #ccc' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Sin IA</span> ➔ <span style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '0.85rem' }}>$0 costo extra</span>
              <p style={{ fontSize: '0.7rem', opacity: 0.7, margin: 0 }}>Si el flujo solo mueve datos.</p>
            </div>
            <div style={{ background: 'white', padding: '8px 10px', borderRadius: '8px', borderLeft: '4px solid var(--primary-green)' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Con IA</span> ➔ <span style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '0.85rem' }}>Consumo Tokens</span>
              <p style={{ fontSize: '0.7rem', opacity: 0.7, margin: 0 }}>Pagás solo por lo que procesás.</p>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'var(--dark-gray)', color: 'white', padding: '10px 12px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', lineHeight: '1.3', margin: 0 }}>
            💡 "Es como la luz: si no la prendés, no pagás. Un bot promedio cuesta <strong>~USD 1/mes</strong>."
          </p>
        </div>
      </div>
      
      <div className="card card-green" style={{ padding: '12px', gap: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '5px' }}>Referencia OpenAI (GPT-5.4)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { name: "GPT-5.4 (Pro)", input: "2.50", cached: "0.25", output: "15.00", color: "#e53e3e" },
            { name: "GPT-5.4 mini", input: "0.75", cached: "0.075", output: "4.50", color: "var(--primary-green)" },
            { name: "GPT-5.4 nano", input: "0.20", cached: "0.02", output: "1.25", color: "#2f855a" }
          ].map((model, i) => (
            <div key={i} style={{ background: 'white', padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', color: model.color, marginBottom: '3px' }}>{model.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', textAlign: 'center', opacity: 0.8 }}>
                <div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Input</div>
                  <div style={{ fontWeight: 'bold' }}>${model.input}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Cached</div>
                  <div style={{ fontWeight: 'bold' }}>${model.cached}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Output</div>
                  <div style={{ fontWeight: 'bold' }}>${model.output}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(40, 90, 71, 0.08)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.68rem', lineHeight: '1.4', marginTop: '2px' }}>
          <div style={{ marginBottom: '3px' }}><strong>📥 Input:</strong> Lo que vos le enviás a la IA (tu pregunta, datos, contexto).</div>
          <div style={{ marginBottom: '3px' }}><strong>📤 Output:</strong> Lo que la IA te responde (texto generado, análisis, decisiones).</div>
          <div style={{ opacity: 0.7 }}>💡 El output es más caro porque la IA necesita <em>procesar y razonar</em> para generar cada token de respuesta.</div>
        </div>
      </div>
    </div>
  </div>
)

const RutaArtesanal = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Métodos para construir una automatización con n8n</h1>
    <h2 style={{ fontSize: '1.2rem', color: '#e53e3e', fontWeight: 'bold', marginBottom: '1.5rem' }}>Método 1: Método tradicional nodo a nodo</h2>
    
    <div className="flex flex-col gap-2">
      {[
        "1. Dar de alta n8n",
        "2. Crear un asistente de apoyo (Ej: ChatGPT)",
        "3. Cargar credenciales en n8n",
        "4. Promptear el workflow con el asistente",
        "5. Construir el flujo nodo por nodo",
        "6. Probar y corregir",
        "7. Publicar el flujo y monitorear"
      ].map((step, i) => (
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          key={i} 
          className="step-item" 
          style={{ padding: '8px 20px', opacity: 0.8 }}
        >
          <span style={{ fontWeight: 'bold', color: '#e53e3e' }}>{i + 1}</span>
          <span>{step.split('. ')[1]}</span>
        </motion.div>
      ))}
    </div>
  </div>
)

const RutaModerna = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Métodos para construir una automatización con n8n</h1>
    <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1.5rem' }}>Método 2: LLM + MCP</h2>
    
    <div className="grid-2" style={{ gap: '20px' }}>
      <div className="flex flex-col gap-2">
        {[
          "1. Dar de alta n8n",
          "2. Dar de alta LLM (Claude/Antigravity)",
          "3. Configurar proyecto en LLM",
          "4. Conectar vía MCP LLM y n8n",
          "5. Cargar 'skill' de n8n en LLM"
        ].map((step, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="step-item" 
            style={{ padding: '6px 15px', fontSize: '0.85rem' }}
          >
            <span style={{ fontWeight: 'bold', color: 'var(--primary-green)' }}>{i + 1}</span>
            <span>{step.split('. ')[1]}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[
          "6. Promptear el flujo en LLM",
          "7. Chequear el flujo generado en n8n",
          "8. Ajustar: credenciales/nombres",
          "9. Publicar workflow"
        ].map((step, i) => (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (i + 5) * 0.1 }}
            key={i} 
            className="step-item" 
            style={{ padding: '6px 15px', fontSize: '0.85rem' }}
          >
            <span style={{ fontWeight: 'bold', color: 'var(--primary-green)' }}>{i + 6}</span>
            <span>{step.split('. ')[1]}</span>
          </motion.div>
        ))}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--light-green)', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', textAlign: 'center', fontWeight: 'bold', flex: 1 }}>
             🚀 Ahorro: 70%
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <img src="./logo_claude.png" alt="Claude" style={{ height: '25px', opacity: 0.9 }} />
            <img src="./logo_antigravity_v2.png" alt="Antigravity" style={{ height: '25px', opacity: 0.9 }} />
          </div>
        </div>
      </div>
    </div>
  </div>
)

const RutaAgente = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Métodos para construir una automatización con n8n</h1>
    <h2 style={{ fontSize: '1.2rem', color: 'var(--dark-gray)', fontWeight: 'bold', marginBottom: '1rem' }}>Método 3: A través de un agente → Open Claw</h2>
    
    <div className="grid-2" style={{ gap: '40px', marginTop: '10px' }}>
      <div className="flex flex-col gap-2">
        {[
          "1. Dar de alta n8n y LLM",
          "2. Dar de alta Open Claw en un VPS",
          "3. Solicitar el desarrollo del workflow",
          "4. Dormir una siesta 😴",
          "5. Chequear que esté funcionando"
        ].map((step, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            key={i} 
            className="step-item" 
            style={{ 
              padding: '10px 20px', 
              fontSize: '1rem', 
              background: i === 3 ? 'var(--light-green)' : 'white',
              border: i === 3 ? '2px solid var(--primary-green)' : '1px solid rgba(0,0,0,0.05)'
            }}
          >
            <span style={{ fontWeight: 'bold' }}>{i + 1}</span>
            <span>{step.split('. ')[1]}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: 'spring' }}
          style={{ position: 'relative' }}
        >
          <img src="./logo_openclaw_text.png" alt="Open Claw" style={{ width: '280px', height: 'auto', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }} />
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ position: 'absolute', top: '-20px', right: '-20px', background: 'var(--primary-green)', color: 'white', padding: '8px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            ¡Autónomo!
          </motion.div>
        </motion.div>
      </div>
    </div>
  </div>
)
const MuchasGracias = () => (
  <div className="slide-content justify-center items-center" style={{ textAlign: 'center' }}>
    <div className="accent-bar" />
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      style={{ width: '100%' }}
    >
      <h1 style={{ fontSize: '4.5rem', fontWeight: '900', color: 'var(--primary-green)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>¡Muchas Gracias!</h1>
      <h2 style={{ fontSize: '2.2rem', opacity: 0.4, fontWeight: '300', marginBottom: '3rem' }}>¿Qué procesos vamos a automatizar hoy?</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '60px' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '20px 40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--dark-gray)' }}>Lic. Leandro Velasques</div>
          <div style={{ fontSize: '1rem', color: 'var(--primary-green)', fontWeight: '600', marginTop: '5px' }}>www.leandrovelasques.com.ar</div>
        </div>
      </div>

      <div style={{ marginTop: '40px', opacity: 0.5, fontSize: '0.9rem' }}>
        Encontrame en LinkedIn como <span style={{ fontWeight: 'bold' }}>leandrojvelasques</span>
      </div>
    </motion.div>
  </div>
)

const FrustracionAdministrativa = () => (
  <div className="slide-content justify-center items-center" style={{ textAlign: 'center' }}>
    <div className="accent-bar" />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#e53e3e', marginBottom: '0.5rem' }}>La frustración de cualquier administrativo</h1>
      <h2 style={{ fontSize: '1.5rem', opacity: 0.7, marginBottom: '2rem' }}>"Copiar y pegar información en celdas todo el día"</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <motion.img 
          initial={{ rotate: -5, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          whileHover={{ scale: 1.05, rotate: 2 }}
          src="./avatar leandro enojado 1.png" 
          alt="Avatar frustrado" 
          style={{ height: '350px', objectFit: 'contain' }}
        />
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 }}
          style={{ 
            position: 'absolute', 
            top: '40px', 
            right: '-120px', 
            background: 'white', 
            padding: '15px 25px', 
            borderRadius: '20px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            fontWeight: 'bold',
            color: '#e53e3e',
            fontSize: '1.2rem',
            border: '2px solid #e53e3e'
          }}
        >
          ¡Basta de esto! 😤
        </motion.div>
      </div>
    </motion.div>
  </div>
)

const CambioParadigma = () => (
  <div className="slide-content justify-center">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '2.2rem', marginBottom: '0.8rem', textAlign: 'center' }}>Hay un cambio de paradigma</h1>
    
    <div className="flex flex-col gap-4 items-center">
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'center', maxWidth: '900px' }}>
        <motion.img 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          src="./avatar leandro pensando sin fondo.png" 
          alt="Avatar Leandro Pensando" 
          style={{ height: '120px', objectFit: 'contain' }}
        />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card" 
          style={{ 
            background: 'var(--dark-gray)', 
            color: 'white', 
            padding: '20px 25px', 
            borderLeft: '8px solid #e53e3e',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '1.25rem', lineHeight: '1.4', fontWeight: '500', margin: 0 }}>
            Hoy <strong>no hace falta saber de programación</strong> para programar una automatización ni para desarrollar software.
          </p>
        </motion.div>
      </div>

      <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-green)', margin: '5px 0' }}>
        Lo que realmente hace falta es:
      </p>

      <div className="grid-3" style={{ gap: '20px', width: '100%', marginTop: '-5px' }}>
        {[
          { icon: '🎨', title: 'Creatividad', desc: 'Para imaginar nuevas soluciones' },
          { icon: '🧩', title: 'Comprender', desc: 'El problema y el proceso de fondo' },
          { icon: '✍️', title: 'Saber Redactar', desc: 'Prompts claros y precisos' }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + (i * 0.1) }}
            className="card card-green" 
            style={{ textAlign: 'center', padding: '12px' }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{item.icon}</div>
            <h3 style={{ fontWeight: 'bold', color: 'var(--primary-green)', fontSize: '1rem' }}>{item.title}</h3>
            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
)

const PiramideComplejidad = () => (
  <div className="slide-content">
    <div className="accent-bar" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Análisis previo antes de automatizar</h1>
    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '1rem' }}>Complejidad de implementación</h2>
    
    <div className="pyramid-container" style={{ marginTop: '5px', width: '100%', maxWidth: 'none' }}>
      <div className="pyramid-levels flex flex-col w-full items-center" style={{ gap: '12px' }}>
        {[
          { level: "Agente IA (n8n)", desc: "Autonomía total y toma de decisiones", color: "#e53e3e", width: '40%' },
          { level: "IA + n8n", desc: "Procesamiento inteligente de datos", color: "#dd6b20", width: '55%' },
          { level: "n8n (Simple)", desc: "Flujos lógicos tradicionales", color: "#d69e2e", width: '70%' },
          { level: "GPTs", desc: "Semi-automatización asistida", color: "#38a169", width: '85%' },
          { level: "Fórmulas y Scripts", desc: "Planillas de cálculo (Excel/Sheets)", color: "#2f855a", width: '100%' }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: 'spring' }}
            style={{ 
              width: item.width, 
              backgroundColor: item.color,
              padding: '10px 15px',
              borderRadius: '10px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
              minHeight: '55px',
              textAlign: 'center'
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', lineHeight: '1.1' }}>{item.level}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.95, lineHeight: '1.1' }}>{item.desc}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
)

function App() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    <Portada key="portada" />,
    <FrustracionAdministrativa key="frustracion" />,
    <CambioParadigma key="paradigma" />,
    <EjemploInscripcion key="ejemplo" />,
    <QueEsAutomatizar key="que-es" />,
    <PreguntaFondo key="fondo" />,
    <ConocerProceso key="proceso" />,
    <StackHerramientas key="stack" />,
    <PiramideComplejidad key="piramide-complejidad" />,
    <PiramideAutonomia key="piramide-autonomia" />,
    <CuandoAutomatizar key="cuando" />,
    <CasosUso key="casos-uso" />,
    <QueEsN8N key="n8n" />,
    <ComoEmpezarN8N key="como-empezar" />,
    <CostosIA key="costos-ia" />,
    <RutaArtesanal key="ruta-artesanal" />,
    <RutaModerna key="ruta-moderna" />,
    <RutaAgente key="ruta-agente" />,
    <MuchasGracias key="muchas-gracias" />
  ]

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide()
      if (e.key === 'ArrowLeft') prevSlide()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slides.length])

  return (
    <div className="slide-canvas">
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }} />
      </div>
      
      <div className="slide-number">
        {currentSlide + 1} / {slides.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="flex-1 relative"
        >
          {slides[currentSlide]}
        </motion.div>
      </AnimatePresence>
      <Footer />
      
      <div className="nav-container">
        <button onClick={prevSlide} className="nav-button">←</button>
        <button onClick={nextSlide} className="nav-button">→</button>
      </div>

      {/* Slide Indicators (Dots) */}
      <div style={{ 
        position: 'absolute', 
        bottom: '15px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        display: 'flex', 
        gap: '6px',
        zIndex: 200 
      }}>
        {slides.map((_, i) => (
          <div 
            key={i}
            onClick={() => setCurrentSlide(i)}
            style={{ 
              width: currentSlide === i ? '20px' : '6px', 
              height: '6px', 
              borderRadius: '3px', 
              background: currentSlide === i ? 'var(--primary-green)' : 'rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default App
