import sys

with open("index_en.html", "r", encoding="utf-8") as f:
    html = f.read()

replacements = {
    '<html class="scroll-smooth" lang="es">': '<html class="scroll-smooth" lang="en">',
    "Automatización Real con IA": "Real AI Automation",
    "Automatización Real. Sin Humo. Multiplicá tu tiempo con IA.": "Real Automation. No gimmicks. Multiply your time with AI.",
    "Soluciones de Inteligencia Artificial que generan resultados medibles.": "Artificial Intelligence solutions that generate measurable results.",
    "Licenciado en Administración": "Business Administration Graduate",
    "Beneficios": "Benefits",
    "Servicios": "Services",
    "Metodología": "Methodology",
    "Casos": "Cases",
    "Contacto": "Contact",
    "Automatización &amp; Eficiencia Real": "Automation &amp; Real Efficiency",
    "Automatización & Eficiencia Real": "Automation & Real Efficiency",
    "Inteligencia artificial aplicada a ": "Artificial intelligence applied to ",
    "potenciar": "boost",
    " tu negocio": " your business",
    "Dejá de apagar incendios. Diseño e implemento soluciones de Inteligencia Artificial que ordenan tus procesos y generan resultados medibles desde el primer día.": "Stop putting out fires. I design and implement Artificial Intelligence solutions that organize your processes and generate measurable results from day one.",
    "Agendar una videollamada gratis": "Schedule a free video call",
    "Ver servicios": "View services",
    "Resultados que escalan tu negocio": "Results that scale your business",
    "No implementamos tecnología por moda, sino para optimizar tu rentabilidad y liberar tu potencial directivo.": "We don't implement technology for the sake of a trend, but to optimize your profitability and unlock your management potential.",
    "Vuelve a enfocarte en lo importante": "Focus on what matters again",
    "Delegá la carga operativa a sistemas inteligentes y recuperá horas para la visión estratégica de tu empresa.": "Delegate operational burden to smart systems and recover hours for your company's strategic vision.",
    "Procesos que se ejecutan solos": "Processes that run by themselves",
    "Flujos de trabajo orquestados que se ejecutan sin fricción, garantizando orden total en cada área.": "Orchestrated workflows that run frictionlessly, ensuring total order in every area.",
    "Atención impecable 24/7": "Flawless 24/7 Support",
    "Sistemas de IA que responden, califican y venden en tiempo real, sin importar la hora o el día.": "AI systems that reply, qualify, and sell in real time, regardless of the time or day.",
    "Reducción de errores humanos": "Reduction of human errors",
    "Eliminamos las fallas de carga manual y descuidos operativos mediante validaciones automáticas robustas.": "We eliminate manual data-entry failures and operational oversights through robust automated validations.",
    "Nuestra Oferta Premium": "Our Premium Offer",
    "Recomendado": "Recommended",
    "Automatización de Operaciones": "Operations Automation",
    "Diseño de ecosistemas que conectan tus apps y canales de venta en flujos autónomos de alto impacto.": "Design of ecosystems that connect your apps and sales channels into high-impact autonomous flows.",
    "Integraciones avanzadas con n8n": "Advanced API Integrations with n8n",
    "Chatbots inteligentes con WhatsApp": "Smart chatbots via WhatsApp",
    "Sincronización total de CRM/ERP": "Total CRM/ERP data synchronization",
    "Consultar Servicio": "Inquire about this service",
    "Formación Estratégica en IA": "Strategic AI Training",
    "Capacitamos a tu equipo directivo y técnico para dominar la IA generativa con propósito de negocio.": "We train your executive and tech teams to master generative AI for business purposes.",
    "Talleres de Introducción / Uso avanzado de ChatGPT": "Introductory / Advanced ChatGPT workshops",
    "Gestión de herramientas No-Code": "Management of No-Code tools",
    "Frameworks de productividad IA": "AI productivity frameworks",
    "Sitios Web de Alta Conversión": "High-Conversion Websites",
    "Desarrollamos tu presencia digital enfocada en un solo objetivo: convertir visitas en clientes premium.": "We develop your digital presence focused on a single goal: turning visitors into premium clients.",
    "Diseño UX centrado en ventas": "UX design centered on sales",
    "Optimización extrema de velocidad": "Extreme speed optimization",
    "Integración con agenda de citas, chatbots, formulario de contacto": "Integration with scheduling, chatbots and contact forms",
    "Desarrollo de Apps con Vibe-coding": "App Development via Vibe-coding",
    "Llevá tu idea a una aplicación web funcional en tiempo récord utilizando IA.": "Turn your idea into a functional web application in record time using AI.",
    "Mínimo Producto Viable rápido": "Rapid Minimum Viable Product",
    "Desarrollo ágil de la idea a producción": "Agile development from idea to production",
    "Tecnologías de vanguardia": "Cutting-edge technologies",
    "El Camino al Éxito": "The Path to Success",
    "Diagnóstico": "Diagnostic",
    "Mapeamos cuellos de botella y oportunidades de alto ROI.": "We map out bottlenecks and high ROI opportunities.",
    "Arquitectura": "Architecture",
    "Diseñamos el flujo técnico a medida de tu operación.": "We design a custom technical workflow for your operation.",
    "Desarrollo": "Development",
    "Programación y pruebas exhaustivas de cada integración.": "Programming and exhaustive testing of each integration.",
    "Implementación": "Deployment",
    "Puesta en marcha y capacitación final a tu equipo.": "Launch and final training for your team.",
    "Casos de Éxito": "Success Cases",
    "Finanzas &amp; Contabilidad": "Finance &amp; Accounting",
    "Estudio Contable Andrés Aguilar": "Andrés Aguilar Accounting Firm",
    "Automatización de: notificaciones a clientes, recordatorios de vencimientos, y elaboración de información para liquidación de sueldos, proyectando un ahorro de 50 horas de carga manual.": "Automation of: client notifications, deadline reminders, and payroll data processing, targeting 50 hours/month of manual load savings.",
    "Salud &amp; Bienestar": "Health &amp; Wellness",
    "Consultorio Dr. Emilio Velasques": "Dr. Emilio Velasques Clinic",
    "Desarrollo de CRM básico automatizado para gestionar los distintos estados del paciente, optimizando la ocupación del consultorio.": "Development of an automated basic CRM to manage different patient stages, optimizing the clinic's occupancy rate.",
    "Novedades &amp; Contenido": "News &amp; Content",
    "Canvas: La función de ChatGPT que te permite editar más rápido y ordenado": "Canvas: The ChatGPT feature that lets you edit faster and neater",
    "Ver en YouTube": "Watch on YouTube",
    "Seguime en LinkedIn": "Follow me on LinkedIn",
    "Conectemos para compartir insights sobre cómo la IA está redefiniendo la gestión empresarial y el marketing moderno.": '"Let\'s connect to share insights on how AI is redefining business management and modern marketing."',
    "Vivo en la Patagonia Argentina y trabajo como Licenciado en Administración enfocando mi visión estratégica en la intersección entre el mundo de los negocios y la Inteligencia Artificial.": "I live in the Argentine Patagonia and work as a Business Administration graduate, focusing my strategic vision on the intersection between the business world and Artificial Intelligence.",
    "Mi trabajo consiste en resolver problemas reales y palpables de las empresas en sus procesos diarios. Me dedico a conectar las herramientas que ya utilizas e implementar sistemas eficientes que optimizan recursos y ahorran horas operativas todas las semanas, permitiendo que tu negocio escale de forma ordenada.": "My job is to solve real, tangible problems that companies face in their daily processes. I connect the tools you already use and implement efficient systems that optimize resources and save operational hours every week, enabling your business to scale in an organized way.",
    "Implementaciones IA": "AI Implementations",
    "Años de trayectoria": "Years of experience",
    "Años de experiencia profesional": "Years of professional experience",
    "¿Hablamos sobre tu negocio?": "Should we talk about your business?",
    "Completá el formulario y describime tu consulta lo mejor que puedas para poder darte una respuesta adecuada.": "Fill out the form and describe your query as best as you can so I can give you an appropriate answer.",
    "Nombre Completo": "Full Name",
    "Ej: Juan Pérez": "E.g. John Doe",
    "Email Corporativo": "Corporate Email",
    "Teléfono": "Phone",
    "opcional": "optional",
    "Interés Principal": "Main Interest",
    "Automatizaciones": "Automations",
    "Implementación de Chatbots": "Chatbot Implementation",
    "Diseño Web": "Web Design",
    "Marketing Digital": "Digital Marketing",
    "Formación en IA": "AI Training",
    "Solicitud de Charlas": "Speaking Requests",
    "¿En qué podemos ayudarte?": "How can we help you?",
    "Contame un poco sobre tus desafíos actuales o el motivo de tu consulta...": "Tell me a bit about your current challenges or the reason for your contact...",
    "Enviar consulta": "Submit message",
    "Agendar Cita": "Book an Appointment",
    "MATRICULA PROFESIONAL": "PROFESSIONAL REGISTRATION",
    "Impulsando la frontera de la eficiencia empresarial mediante IA aplicada y automatización avanzada.": "Pushing the boundaries of business efficiency through applied AI and advanced automation.",
    "Secciones": "Sections",
    "Recursos": "Resources",
    "Agenda de Citas": "Booking Calendar",
    "Todos los derechos reservados.": "All rights reserved.",
    "Diseñado por Leandro Velasques": "Designed by Leandro Velasques",
    "Política de Privacidad": "Privacy Policy",
    "Términos de Servicio": "Terms of Service",
    "Enviando...": "Sending...",
    "Nueva consulta web:": "New web inquiry:",
    "Formulario Web - Leandro Velasques": "Web Form - Leandro Velasques",
    "¡Gracias! Tu consulta ha sido enviada con éxito. Te responderemos pronto.": "Thank you! Your inquiry was sent successfully. We will reply soon.",
    "Error desconocido": "Unknown error",
    "Hubo un error al enviar la consulta. Por favor, intentá nuevamente o escribime a info@leandrovelasques.com.ar": "There was an error sending the message. Please try again or reach out at info@leandrovelasques.com.ar",
}

for es_text, en_text in replacements.items():
    html = html.replace(es_text, en_text)

# We also need to invert the routing logic from EN to ES detection!
routing_es = """<script>
    (function() {
      const savedLang = localStorage.getItem('preferredLang');
      if (savedLang === 'en') {
        window.location.href = 'index_en.html';
      } else if (!savedLang) {
        const userLang = navigator.language || navigator.userLanguage;
        if (userLang.toLowerCase().startsWith('en')) {
          localStorage.setItem('preferredLang', 'en');
          window.location.href = 'index_en.html';
        }
      }
    })();
  </script>"""

routing_en = """<script>
    (function() {
      const savedLang = localStorage.getItem('preferredLang');
      if (savedLang === 'es') {
        window.location.href = 'index.html';
      }
    })();
  </script>"""
html = html.replace(routing_es, routing_en)

# Invert Nav active classes
nav_es = '''<div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border-l border-deep-green/20 pl-6 ml-2">
             <a href="index.html" onclick="localStorage.setItem('preferredLang', 'es');" class="text-deep-green font-bold">ES</a>
             <span class="text-dark-gray/30">|</span>
             <a href="index_en.html" onclick="localStorage.setItem('preferredLang', 'en');" class="text-dark-gray/60 hover:text-deep-green transition-colors">EN</a>
          </div>'''
nav_en = '''<div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border-l border-deep-green/20 pl-6 ml-2">
             <a href="index.html" onclick="localStorage.setItem('preferredLang', 'es');" class="text-dark-gray/60 hover:text-deep-green transition-colors">ES</a>
             <span class="text-dark-gray/30">|</span>
             <a href="index_en.html" onclick="localStorage.setItem('preferredLang', 'en');" class="text-deep-green font-bold">EN</a>
          </div>'''
html = html.replace(nav_es, nav_en)

mobile_nav_es = '''<div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mr-2">
                <a href="index.html" onclick="localStorage.setItem('preferredLang', 'es');" class="text-deep-green font-bold">ES</a>
                <span class="text-dark-gray/30">|</span>
                <a href="index_en.html" onclick="localStorage.setItem('preferredLang', 'en');" class="text-dark-gray/60 hover:text-deep-green transition-colors">EN</a>
            </div>'''
mobile_nav_en = '''<div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mr-2">
                <a href="index.html" onclick="localStorage.setItem('preferredLang', 'es');" class="text-dark-gray/60 hover:text-deep-green transition-colors">ES</a>
                <span class="text-dark-gray/30">|</span>
                <a href="index_en.html" onclick="localStorage.setItem('preferredLang', 'en');" class="text-deep-green font-bold">EN</a>
            </div>'''
html = html.replace(mobile_nav_es, mobile_nav_en)

with open("index_en.html", "w", encoding="utf-8") as f:
    f.write(html)
