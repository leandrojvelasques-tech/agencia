# Automatizaciones con n8n

## Índice

1. Qué es automatizar un proceso digital y qué beneficios tiene
2. Análisis previo antes de automatizar
   2.1. La automatización ¿resuelve el problema del cliente?
   2.1.1. Síntomas frecuentes que indican oportunidad de automatización
   2.2. Conocer en profundidad el proceso que se quiere automatizar
   2.3. Un stack de herramientas digitales adecuado mejora las posibilidades de que la automatización funcione
3. La pirámide de la automatización
   3.1. Primera pirámide: complejidad de la herramienta de implementación de la automatización
   3.1.1. Fórmulas y scripts en planillas de cálculo
   3.1.2. Semi-automatización con GPTs
   3.1.3. Automatización simple sin IA - n8n
   3.1.4. Automatización con IA - n8n
   3.1.5. Automatización con agente IA - n8n
   3.1.6. Automatización con múltiples agentes - n8n
   3.2. Segunda pirámide: en función de la autonomía con la que se construye la automatización
   3.2.1. Método tradicional o artesanal - nodo a nodo
   3.2.2. Construcción con apoyo de un LLM vía MCP - Claude/Antigravity elabora por mí
   3.2.3. Construcción mediante agentes
4. Casos típicos donde conviene utilizar automatizaciones
   4.1. Recepción y ordenamiento automático de documentación
   4.2. Envío automático de correos o mensajes ante determinados eventos
   4.3. Carga o actualización automática de información entre sistemas
   4.4. Clasificación o categorización automática de información
   4.5. Control periódico de novedades o cambios
   4.6. Generación de reportes o resúmenes recurrentes
   4.7. Procesamiento inicial de formularios, leads o inscripciones
   4.8. Derivación interna de tareas o pedidos
   4.9. Casos típicos en estudios contables
   4.10. Criterio general para reconocer un caso automatizable
5. n8n: introducción a la plataforma
   5.1. Qué es n8n
   5.2. Cuándo nació n8n y cuál fue su origen
   5.3. Tres formas de empezar a usar n8n
   5.4. Qué son las credenciales en n8n
   5.5. Para qué sirven las credenciales y por qué están separadas del nodo
   5.6. Criterio inicial para elegir cómo empezar
   5.7. Temas que se recorrerán a continuación
6. Ruta de trabajo: cómo empezar a usar n8n y construir flujos
   6.1. Método tradicional o artesanal
   Paso 1. Dar de alta el servicio de n8n
   Paso 2. Crear un asistente de apoyo dentro de ChatGPT
   Paso 3. Cargar credenciales en n8n
   Paso 4. Diseñar el proceso con ayuda del asistente n8n
   Paso 5. Construir el flujo nodo por nodo
   Paso 6. Probar y corregir
   Paso 7. Publicar el flujo
7. Propuesta de estructura de diapositivas para una charla de 45 a 60 minutos

## Estructura de trabajo

### 1. Qué es automatizar un proceso digital y qué beneficios tiene

Automatizar un proceso digital consiste en hacer que una secuencia de tareas, decisiones o movimientos de información se ejecute con menor intervención manual, utilizando reglas, herramientas y conexiones entre sistemas.

Dicho de manera simple, automatizar es lograr que una parte del trabajo suceda sola o con mucha menos intervención humana.

Esto puede ocurrir en distintos niveles:

- dentro de una misma herramienta, como una planilla de cálculo
- dentro de un GPT que recibe información, la procesa y devuelve una salida
- entre varias aplicaciones conectadas entre sí por un workflow

Lo importante no es solo que algo suceda más rápido, sino que suceda con una lógica definida, repetible y confiable.

#### 1.1. Qué beneficios puede aportar una automatización

Cuando está bien pensada, una automatización puede generar beneficios muy concretos.

Por ejemplo:

- ahorrar tiempo operativo
- reducir errores humanos
- evitar tareas repetitivas
- mejorar tiempos de respuesta
- dar continuidad a procesos que hoy dependen de una persona
- ordenar el movimiento de información entre herramientas
- liberar tiempo para tareas de mayor valor
- mejorar la trazabilidad de lo que ocurre

#### 1.2. Qué no resuelve por sí sola una automatización

También conviene aclarar algo desde el principio: automatizar no resuelve automáticamente cualquier problema.

Una automatización no reemplaza:

- un mal diagnóstico del problema
- un proceso mal diseñado
- una herramienta inadecuada
- una mala decisión de gestión

Por eso, antes de automatizar, no alcanza con saber usar una plataforma. Hace falta entender qué se quiere resolver, por qué conviene automatizarlo y bajo qué condiciones esa automatización va a aportar valor real.

### 2. Análisis previo antes de automatizar

### 2. Análisis previo antes de automatizar

Antes de hablar de plataformas, nodos, triggers o inteligencia artificial, conviene detenerse en tres criterios de análisis previo que ordenan bien esta etapa: el problema que se busca resolver, el proceso que se quiere intervenir y las herramientas con las que se va a trabajar.

#### 2.1. La automatización ¿resuelve el problema del cliente?

Antes de automatizar cualquier cosa, hace falta preguntarse si el proceso elegido es realmente el problema central del cliente y si la automatización propuesta va a resolver ese problema de fondo.

Dicho de otro modo:

- ¿por qué el cliente quiere automatizar ese proceso?
- ¿está claro que automatizar esa parte va a producir una mejora real y no empeorar la situación?
- ¿o se está intentando automatizar algo secundario, sin atacar la dificultad principal?

Este punto es clave porque muchas veces el cliente pide automatizar una tarea puntual, pero el problema verdadero está en otro lado: en la organización del trabajo, en la falta de información, en una mala definición del proceso, en demoras humanas, en la ausencia de un sistema o incluso en una decisión de gestión mal planteada.

Por eso, antes de construir una solución, conviene validar que exista una relación clara entre:

- el problema detectado

- el proceso que se quiere intervenir

- y el resultado que se espera obtener

#### Síntomas frecuentes que indican oportunidad de automatización

Existen algunas señales bastante claras de que una organización podría beneficiarse de automatizar un proceso o una parte de él.

Por ejemplo:

- pérdida de pedidos o ventas por no tener cobertura fuera del horario de atención humana
- notificaciones o recordatorios que no se envían a clientes por falta de tiempo
- personal destinado exclusivamente a copiar información de una planilla a otra
- quejas de clientes por demoras en la entrega de un producto o servicio
- falta de recursos en ventas o atención al cliente, combinada con exceso de personal abocado a tareas administrativas

Estas situaciones no prueban por sí solas que la automatización sea la única solución posible, pero sí funcionan como indicadores de que existe una oportunidad concreta de mejora.

#### 2.2. Conocer en profundidad el proceso que se quiere automatizar

No se puede automatizar correctamente algo que no se entiende.

Antes de construir una solución, hace falta saber:

- qué está ocurriendo hoy
- quiénes intervienen
- qué responsabilidades tiene cada actor
- cómo circula la información
- cómo se mueve la documentación, el material o la mercadería, según el caso
- en qué puntos aparecen demoras, errores o reprocesos
- qué partes del trabajo son repetitivas
- qué decisiones se toman y con qué criterio

Desde un punto de vista técnico, esto implica realizar un relevamiento del proceso.

Idealmente, ese relevamiento puede incluir:

- un diagrama de flujo
- una descripción paso a paso del procedimiento
- la identificación de actores y responsabilidades
- la detección de cuellos de botella o puntos de fricción
- la definición de entradas, salidas y excepciones

Este análisis previo es clave porque muchas veces el problema no está en la falta de automatización, sino en que el proceso ya era desordenado desde el inicio.

Automatizar un proceso mal definido no corrige el problema: solamente lo acelera o lo hace más opaco.

#### 2.3. Un stack de herramientas digitales adecuado mejora las posibilidades de que la automatización funcione 

Uno de los primeros requisitos es disponer de un conjunto de herramientas suficientemente amplio como para poder elegir bien.

Esto no significa tener decenas de plataformas, sino contar con un abanico mínimo que permita abordar problemas distintos con criterios distintos.

Por ejemplo, dentro de un stack profesional pueden convivir:

- herramientas de automatización, como n8n
- herramientas de trabajo intelectual y asistencia, como ChatGPT
- GPTs especializados para tareas puntuales
- herramientas de desarrollo de software, como plataformas de creación rápida de aplicaciones

La idea central es que no todos los problemas se resuelven de la misma manera.

A veces la mejor solución será una automatización. A veces bastará con un GPT bien diseñado. A veces el problema requerirá desarrollar software. Y en muchos casos la solución correcta combinará varias de estas cosas.

Por eso, tener un stack más amplio no es solo una cuestión técnica: es una forma de mejorar el criterio profesional.

Permite:

- entender qué opciones existen
- comparar caminos posibles
- evitar soluciones sobredimensionadas
- elegir la herramienta más adecuada para cada caso

Este punto es importante porque un error frecuente consiste en querer resolver todo con la misma herramienta.

Por ejemplo, puede ocurrir que alguien intente montar un flujo complejo en n8n para resolver un problema que en realidad podía resolverse con un GPT simple, más barato y más rápido, utilizando incluso una suscripción ya disponible.

Del mismo modo, también puede ocurrir lo contrario: querer resolver con un GPT un problema que en realidad necesita un sistema, una base estructurada o una automatización completa entre varias herramientas.

La lección es clara: antes de automatizar, conviene preguntarse cuál es la naturaleza real del problema y qué tipo de herramienta corresponde usar.

\
Ejemplo concreto de convivencia entre software y automatización

Un ejemplo muy claro es el desarrollo de una página web para tomar asistencia o inscripciones a talleres.

En ese caso, la página forma parte del software. Es la herramienta que permite:

- mostrar un formulario
- capturar los datos de los interesados
- registrar la información dentro del sitio o de una base de datos

Pero una vez que esos datos fueron capturados, puede aparecer otra necesidad: por ejemplo, enviar un mail de bienvenida a cada nuevo inscripto.

Esa segunda parte no necesariamente la resuelve el software por sí solo. Puede resolverse manualmente o puede resolverse mediante una automatización.

Por ejemplo:

- cada 30 minutos corre un flujo
- revisa si hubo nuevos inscriptos
- detecta quiénes todavía no recibieron el correo
- envía automáticamente el mail de bienvenida

En este caso, se ve con claridad que ambas cosas conviven:

- el software sirve para capturar y organizar la información
- la automatización sirve para ejecutar acciones sobre esa información sin intervención manual

Este tipo de ejemplo es especialmente útil porque muestra que, en la práctica, muchas soluciones digitales combinan una capa de software con una capa de automatización.

####

### 3. La pirámide de la automatización: ¿Que herramienta utilizar?

Una buena forma de entender el mundo de las automatizaciones es pensarlo como una pirámide o como una escala de complejidad creciente. En la base se encuentran las automatizaciones más simples, más habituales y más accesibles. A medida que uno sube, aparecen herramientas con mayor flexibilidad, mayor potencia y también mayor capacidad para conectar procesos, datos y aplicaciones distintas.

####

&#x20;

#### 3.1. Primera pirámide: complejidad de la herramienta de implementación de la automatización ( de herramientas con menos complejidad y mas económicas a más complejidad y mas costosas)

La primera pirámide sirve para mostrar la complejidad creciente de implementación.

##### 3.1.1. Fórmulas y scripts en planillas de cálculo

En la base aparecen las automatizaciones más tradicionales, que históricamente muchos administrativos, analistas y profesionales resolvieron dentro de herramientas como Excel o Google Sheets.

En este nivel encontramos, por ejemplo:

- fórmulas
- funciones
- tablas dinámicas
- macros
- scripts

Son automatizaciones muy útiles porque permiten ahorrar tiempo, reducir errores y estandarizar tareas repetitivas, pero tienen un límite importante: normalmente ocurren dentro de la misma aplicación o dentro del mismo ecosistema.

##### 3.1.2. Semi-automatización con GPTs

Un segundo escalón puede estar representado por los GPTs.

Los GPTs permiten crear una primera capa de automatización muy valiosa, especialmente para tareas que consisten en recibir cierta información, aplicar instrucciones predefinidas y devolver un resultado estructurado.

Por ejemplo, un GPT puede:

- leer un documento
- interpretar una consigna
- clasificar información
- resumir contenido
- extraer datos
- devolver una salida con un formato determinado

Esto ya representa un salto importante respecto de una automatización básica en una planilla, porque permite trabajar con lenguaje natural, instrucciones complejas y criterios de análisis mucho más flexibles.

Sin embargo, en la mayoría de los casos sigue requiriendo intervención manual para iniciarse: alguien tiene que entrar, cargar el documento, escribir el pedido o aportar la información de entrada.

##### 3.1.3. Automatización simple sin IA - n8n

Cuando una organización necesita vincular herramientas diferentes, que pertenecen a empresas distintas y que cumplen funciones distintas, aparece un nivel superior de automatización.

Ahí es donde entran plataformas como n8n o Make.

En un primer escalón dentro de este nivel aparecen las automatizaciones simples.

Son flujos en los que no interviene la inteligencia artificial. El recorrido está definido de antemano y, si las condiciones de entrada son las mismas, el resultado esperado también será el mismo.

Es decir, son automatizaciones deterministas.

##### 3.1.4. Automatización con IA - n8n 

Un nivel superior aparece cuando dentro del flujo incorporamos inteligencia artificial.

Por ejemplo, cuando una automatización incluye un nodo de OpenAI u otro modelo capaz de:

- clasificar texto
- resumir información
- redactar una respuesta
- extraer datos de un documento
- analizar el contenido de un mensaje

En este caso, la automatización ya no es completamente determinista. El flujo general puede seguir estando diseñado por nosotros, pero una parte de la resolución depende de un modelo que interpreta contexto y genera una salida que puede variar.

##### 3.1.5. Automatización con agente IA - n8n

Más arriba aparece un nivel todavía más avanzado: los flujos agentivos.

En este caso, ya no solo usamos IA para producir un texto o clasificar información, sino que le delegamos una parte de la toma de decisiones dentro del proceso.

El sistema puede decidir, según el contexto:

- qué herramienta usar
- en qué orden ejecutar acciones
- qué información consultar antes de responder
- qué camino seguir dentro del flujo

##### 3.1.6. Automatización con múltiples agentes - n8n

Por encima de eso puede pensarse un nivel aún más complejo: sistemas compuestos por múltiples agentes o por agentes con subagentes especializados.

En ese esquema, un agente principal coordina el trabajo y deriva tareas específicas a otros agentes que cumplen roles distintos.

Por ejemplo:

- un agente recibe el pedido general
- otro agente analiza documentación
- otro consulta sistemas externos
- otro redacta la respuesta final

#### 3.2. Segunda pirámide: en función de la autonomía con la que se construye la automatización (menos autonomía - más autonomía)

Además de la complejidad de implementación, también puede pensarse una segunda pirámide en función del nivel de autonomía con el que se construye la automatización.

Acá la pregunta ya no es qué tan complejo es el flujo final, sino cuánto trabajo artesanal realiza la persona y cuánta autonomía se delega durante la construcción del workflow.

##### 3.2.1. Método tradicional o artesanal - nodo a nodo

En el primer escalón aparece la construcción manual, nodo por nodo.

Este enfoque implica:

- definir el trigger manualmente
- elegir cada nodo
- configurar cada conexión
- probar cada tramo
- corregir errores de forma directa

Es el camino con menor autonomía externa, pero también el mejor para aprender cómo funciona realmente un workflow.

##### 3.2.2. Construcción con apoyo de un LLM vía MCP - Claude/Antigravity elabora por mí.

En un segundo escalón aparece la construcción apoyada por un LLM conectado vía MCP.

En este caso, herramientas como Claude, Antigravity u otras plataformas conectadas por MCP pueden ayudar a:

- interpretar el proceso que se quiere automatizar
- sugerir la estructura del flujo
- generar nodos o configuraciones
- acelerar la construcción inicial
- utilizar "skills" específicas diseñadas para n8n para mejorar  el diseño.

Acá ya existe más autonomía en la construcción, porque parte del diseño se apoya en una inteligencia externa que propone soluciones y acelera el armado.

##### 3.2.3. Construcción mediante agentes

En el nivel superior aparece la construcción mediante agentes como OpenClaw.

Acá conviene hacer una aclaración importante: el agente no reemplaza al LLM. Más bien funciona como una capa agentiva que puede conectarse con modelos, herramientas y canales para operar de manera mucho más autónoma.

Por eso, conceptualmente, esta opción puede describirse así:

- el agente no sustituye al modelo
- el agente se apoya en uno o más LLMs
- el agente orquesta herramientas, contexto y acciones
- el agente puede conectarse y operar LLMs de forma autónoma dentro de una arquitectura más amplia

En síntesis, esta segunda pirámide permite mostrar tres formas distintas de construir automatizaciones: de manera artesanal, con apoyo de un LLM o delegando mucho más en un agente.

### 4. Casos típicos donde conviene utilizar automatizaciones

Después del marco conceptual, resulta útil identificar en qué situaciones concretas una automatización aporta valor real.

La pregunta práctica sería: ¿qué tipo de tareas o procesos suelen justificar una automatización?

En general, conviene pensar en automatización cuando se combinan una o varias de estas características:

- tareas repetitivas
- pasos que se repiten siempre de la misma manera
- movimiento frecuente de información entre herramientas
- controles periódicos que hoy se hacen manualmente
- generación recurrente de avisos, recordatorios o respuestas
- necesidad de reducir errores humanos
- necesidad de ahorrar tiempo operativo

A continuación, se listan algunos casos típicos de uso.

#### 4.1. Recepción y ordenamiento automático de documentación

Caso típico: una organización recibe documentación por distintos canales y necesita ordenarla sin depender de que alguien la descargue, la renombre y la archive manualmente.

Ejemplo:

- llegan comprobantes por mail
- la automatización identifica el tipo de archivo
- extrae ciertos datos básicos
- lo guarda en la carpeta correcta
- deja registro de recepción

Este tipo de caso es muy común cuando el problema principal no es el análisis, sino el orden y la trazabilidad documental.

#### 4.2. Envío automático de correos o mensajes ante determinados eventos

Caso típico: cada vez que ocurre algo, alguien tiene que avisar manualmente a otra persona.

Ejemplo:

- un cliente completa un formulario
- se envía automáticamente un mail de bienvenida
- se notifica al responsable interno
- se registra la fecha de contacto

También puede aplicarse a:

- recordatorios a clientes de vencimientos de impuestos del mes: "Sr. Cliente, le recordamos que la próxima semana tiene los siguientes vencimientos...." 
- mensajes de seguimiento: "Le recordamos que aun tiene pendiente el pago de honorarios del mes..."

#### 4.3. Carga o actualización automática de información entre sistemas

Caso típico: una misma información se carga dos o tres veces en distintas plataformas.

Ejemplo:

- se completa un formulario
- los datos pasan automáticamente a una planilla
- luego se copian a un CRM
- y se genera una tarea para seguimiento

Este tipo de automatización evita la duplicación de trabajo y reduce errores por transcripción manual.

#### 4.4. Clasificación o categorización automática de información

Caso típico: llegan muchas consultas de clientes a una casilla general y hay una persona encargada de leer mensajes, movimientos o documentos y clasificarlos uno por uno.&#x20;

En estudios contables, esto puede aplicarse a:

- clasificación de comprobantes
- identificación de impuestos o períodos
- categorización de movimientos bancarios
- separación de consultas por tipo de servicio

#### 4.5. Control periódico de novedades o cambios

Caso típico: alguien revisa todos los días o cada cierto tiempo si hubo una novedad en una página, una base de datos, una carpeta o una casilla de correo.

Ejemplo:

- cada 30 minutos se revisa una fuente de datos
- si aparece una novedad, se dispara una acción
- si no aparece nada, no sucede nada

Este tipo de automatización es especialmente útil cuando hoy existe una tarea de control repetitiva que no agrega valor intelectual, pero consume tiempo.

#### 4.6. Generación de reportes o resúmenes recurrentes

Caso típico: todos los días, semanas o meses alguien arma el mismo resumen consolidando información que proviene de varias fuentes.

Ejemplo:

- tomar datos de distintas planillas o sistemas
- consolidarlos
- ordenar la información
- generar un resumen
- enviarlo automáticamente a los responsables

Esto puede servir para:

- reportes de gestión
- control de tareas pendientes
- novedades de clientes
- seguimiento de cobranzas o vencimientos

#### 4.7. Procesamiento inicial de formularios, leads o inscripciones

Caso típico: se recibe información de interesados y después hay que ordenarla, responderla o derivarla.

Ejemplo:

- una persona se inscribe a un evento
- sus datos se guardan automáticamente
- se valida si ya existía un registro previo
- se le envía un mensaje de bienvenida
- se notifica a los organizadores

Es un caso frecuente porque combina captura de datos, orden y comunicación posterior.

#### 4.8. Derivación interna de tareas o pedidos

Caso típico: una consulta o pedido entra por un canal general y alguien tiene que decidir manualmente a quién corresponde derivarlo.

Ejemplo:

- entra un pedido por WhatsApp, mail o formulario
- se identifica el tipo de requerimiento
- se asigna al sector o responsable correspondiente
- se deja constancia del estado inicial

Esto mejora mucho los tiempos de respuesta y evita pérdidas de información.

####

####

### 5. n8n: introducción a la plataforma

A partir de este punto, el foco ya pasa de la idea general de automatización a una plataforma concreta: n8n.

La intención no es solo mostrar cómo se usa, sino también entender qué lugar ocupa dentro del ecosistema de herramientas, por qué se volvió relevante y cómo pensar su adopción de manera práctica.

#### 5.1. Qué es n8n

n8n es una plataforma de automatización de workflows que permite conectar aplicaciones, datos y servicios para que distintas tareas se ejecuten de manera automática dentro de un mismo proceso.

Trabaja mediante flujos visuales compuestos por nodos. Cada nodo cumple una función específica: recibir información, transformarla, consultar un sistema externo, aplicar una condición o ejecutar una acción.

Dicho de manera simple, n8n sirve para diseñar procesos automáticos entre herramientas distintas. Por ejemplo, puede recibir datos desde un formulario, procesarlos, guardarlos en una base o planilla, enviar un correo y generar una notificación, todo dentro del mismo workflow.

Una de sus grandes fortalezas es que combina una interfaz visual de tipo low-code con la posibilidad de profundizar técnicamente cuando hace falta. Esto permite empezar de manera visual, pero también incorporar expresiones, JavaScript, APIs y lógica más compleja.

Por eso n8n resulta especialmente útil cuando no alcanza con automatizar una sola tarea aislada, sino que hace falta integrar varios sistemas en un proceso completo.

Si hubiera que resumirlo en una frase breve, podría decirse así:

**n8n es una plataforma para diseñar y ejecutar automatizaciones entre distintas herramientas, con una lógica visual, flexible y extensible.**

####

####

#### 5.3. Tres formas de empezar a usar n8n

A la hora de comenzar, una de las primeras decisiones importantes es dónde va a correr la plataforma.

En términos simples, pueden pensarse tres caminos iniciales:

##### a. n8n Cloud por suscripción

Es la opción más simple para empezar.

La infraestructura la administra n8n, por lo que el usuario puede concentrarse en construir flujos sin ocuparse del servidor, las actualizaciones, el uptime o la seguridad de base.

Suele ser la alternativa más conveniente para quienes:

- quieren empezar rápido
- no tienen experiencia administrando servidores
- priorizan la facilidad de uso
- no necesitan todavía requisitos especiales de infraestructura o compliance

##### b. n8n autohospedado en un VPS

En este caso, n8n se instala en un servidor virtual privado, por ejemplo en Hostinger, DigitalOcean, Hetzner o similares.

Esta opción da más control sobre la instancia, la configuración y los costos, pero también implica hacerse cargo de:

- la instalación
- las actualizaciones
- la seguridad
- los backups
- el monitoreo
- la disponibilidad del servicio

Es una opción habitual para consultores, agencias o usuarios técnicos que quieren administrar su propio entorno.

##### c. n8n autohospedado en infraestructura propia o servidor propio

Acá la lógica es parecida a la del VPS, pero en lugar de correr en un proveedor externo, la plataforma corre sobre infraestructura propia, local o corporativa.

Esta opción puede tener sentido cuando existen requisitos específicos de:

- control interno de datos
- privacidad
- integración con infraestructura existente
- políticas corporativas
- acceso a red local o sistemas internos

A cambio, exige todavía más responsabilidad técnica y operativa.

#### 5.4. Qué son las credenciales en n8n

Uno de los conceptos más importantes dentro de n8n es el de credenciales.

Las credenciales son los datos de autenticación que permiten que un nodo se conecte correctamente con un servicio externo.

Por ejemplo, cuando n8n necesita conectarse con:

- Gmail
- Google Sheets
- Telegram
- OpenAI
- un CRM
- una API externa

necesita alguna forma de demostrar que tiene permiso para operar sobre esa cuenta o ese servicio.

Ahí entran las credenciales.

Pueden tomar distintas formas, según la herramienta:

- usuario y contraseña
- API key
- OAuth2
- token de acceso
- service account
- autenticación básica o por headers

Su función no es decorativa ni secundaria: son el mecanismo que permite que una automatización pueda interactuar realmente con otras plataformas.

#### 5.5. Para qué sirven las credenciales y por qué están separadas del nodo

n8n gestiona las credenciales por separado de los nodos por una razón muy práctica.

Si la autenticación estuviera escrita manualmente dentro de cada nodo, sería mucho más difícil:

- reutilizar conexiones
- mantener la seguridad
- actualizar accesos
- cambiar permisos
- evitar errores de configuración repetidos

Al separarlas, n8n permite que una misma credencial pueda reutilizarse en distintos workflows o en distintos nodos compatibles.

Además, esto ayuda a ordenar mejor la construcción de automatizaciones y a centralizar el acceso a servicios externos.

Dicho de forma simple:

- el nodo define qué acción quiero hacer
- la credencial define con qué cuenta o con qué permiso voy a hacerlo

#### 5.6. Criterio inicial para elegir cómo empezar

No existe una única forma correcta de empezar con n8n. La mejor elección depende del contexto.

En general:

- si lo que se busca es aprender rápido y empezar sin fricción, conviene cloud
- si se necesita más control técnico o una estructura propia, puede convenir un VPS
- si existen requisitos fuertes de infraestructura, seguridad o integración interna, puede justificarse un despliegue sobre servidor propio

La decisión correcta no depende solo del precio, sino también del nivel técnico disponible, el tiempo de administración que se está dispuesto a asumir y la criticidad de los procesos que van a correr allí.

#### 5.7. Temas que se recorrerán a continuación

A partir de este punto, los siguientes temas naturales para profundizar son:

- qué es un workflow
- qué es un nodo
- qué tipos de trigger existen
- cómo se prueba un flujo
- cómo se publica o activa una automatización
- cómo se conectan servicios externos
- qué cuidados tener con credenciales, errores y mantenimiento

---

### 6. Ruta de trabajo: cómo empezar a usar n8n y construir flujos

A continuación se propone una ruta de trabajo práctica para quienes quieren empezar a usar n8n desde cero. La idea no es solo llegar a construir automatizaciones, sino entender qué se está haciendo en cada etapa.

Para fines de taller, el camino recomendado será el método tradicional o artesanal, porque permite comprender la lógica del proceso, el rol de cada nodo y la forma en que se construye un workflow desde cero.

#### 6.1. Método tradicional o artesanal

##### Paso 1. Dar de alta el servicio de n8n

El primer paso consiste en definir dónde va a correr n8n.

Las alternativas más comunes son:

- usar n8n Cloud por suscripción
- instalarlo en un VPS
- instalarlo localmente en la propia PC para hacer pruebas

Como material de apoyo inicial, pueden utilizarse estos recursos:

- Tutorial de Juan Pe Navarro, donde explica el uso de n8n a través de VPS y presenta distintas alternativas de implementación:
  [https://www.youtube.com/watch?v=hEAl6X1v1ME](https://www.youtube.com/watch?v=hEAl6X1v1ME)

- Tutorial de Melina Blanco, donde muestra cómo instalar n8n gratis en la PC:
  [https://www.youtube.com/watch?v=xvmisOm9Wmk](https://www.youtube.com/watch?v=xvmisOm9Wmk)

El objetivo de esta etapa es contar con una instancia funcional de n8n para comenzar a practicar.

##### Paso 2. Crear un asistente de apoyo dentro de ChatGPT

Una vez que n8n ya está disponible, conviene construir un asistente especializado que acompañe el aprendizaje y ayude a diseñar flujos.

La propuesta es crear un proyecto o asistente denominado, por ejemplo:

- Asistente n8n
- Asistente para la generación de flujos n8n

Luego:

- cargar las instrucciones del archivo [https://docs.google.com/document/d/1n0wO7d5zO6byYNvaAZ9G6CrbqZ8PCgz5yXAJ5oaYPR4/edit?usp=drive\_link](https://docs.google.com/document/d/1n0wO7d5zO6byYNvaAZ9G6CrbqZ8PCgz5yXAJ5oaYPR4/edit?usp=drive_link)
- cargar como fuentes la documentación e instructivos sobre el uso de n8n [https://drive.google.com/drive/folders/1DU-x7djkzzt\_-59m\_ZPk22gwcznZg3Be?usp=drive\_link](https://drive.google.com/drive/folders/1DU-x7djkzzt_-59m_ZPk22gwcznZg3Be?usp=drive_link)

La idea de este asistente no es reemplazar la práctica, sino servir como apoyo para:

- pensar la lógica del flujo
- resolver dudas sobre nodos
- identificar errores
- sugerir estructuras posibles
- traducir procesos reales a workflows concretos

##### Paso 3. Cargar credenciales en n8n

Antes de construir automatizaciones útiles, hace falta vincular las aplicaciones con las que se va a trabajar.

Por eso, una etapa clave es cargar credenciales dentro de n8n.

Conviene empezar por las integraciones más habituales:

- Telegram
- Google, especialmente Gmail, Google Sheets y Google Drive
- OpenAI

Tutorial credenciales Google:

- Largo: JOSEMA FERNANDEZ: [https://www.youtube.com/watch?v=HGScbcgY57w](https://www.youtube.com/watch?v=HGScbcgY57w)
- Corto: VICTOR PEREZ: [https://www.youtube.com/watch?v=H6Xkc9cfdrE](https://www.youtube.com/watch?v=H6Xkc9cfdrE)

En el caso de OpenAI, hay que contemplar que para usar la API hace falta tener saldo o un mínimo de crédito cargado de 5 dólares.

El objetivo de esta etapa es dejar preparada la infraestructura básica para poder construir flujos reales sin trabarse después por temas de acceso.

##### Paso 4. Diseñar el proceso con ayuda del asistente n8n

Con n8n funcionando y las credenciales cargadas, recién ahí conviene volver al asistente de apoyo para describir el proceso que se quiere automatizar.

En esta instancia, el foco debe estar en:

- explicar el proceso real
- identificar el punto de inicio
- definir qué herramientas intervienen
- describir qué debería pasar en cada etapa
- pensar excepciones o errores posibles

La recomendación metodológica es importante: aunque después el flujo pueda generarse más rápido, al principio conviene construirlo entendiendo la lógica global y desarmándolo en partes.

##### Paso 5. Construir el flujo nodo por nodo

Una vez definida la visión general del proceso, conviene construir el workflow paso a paso.

Es decir:

- comenzar por el trigger
- agregar el siguiente nodo
- probar qué dato entra y qué dato sale
- validar cada conexión
- avanzar recién cuando el tramo anterior funciona

Este enfoque es muy valioso porque permite entender realmente el flujo. Y si más adelante algo falla, resulta mucho más fácil corregirlo.

La idea no es solo hacer que funcione, sino saber por qué funciona.

##### Paso 6. Probar y corregir

Antes de dejar un flujo corriendo en automático, conviene hacer pruebas controladas.

En esta etapa se debería:

- verificar que el trigger se active correctamente
- revisar si los datos llegan con la estructura esperada
- confirmar que cada nodo hace lo que corresponde
- detectar errores de credenciales, formato o lógica
- validar la salida final

##### Paso 7. Publicar el flujo

Recién cuando se publica se activa la automatización.

###

