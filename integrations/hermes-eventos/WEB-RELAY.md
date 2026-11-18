# Canal web del evento

La web conserva una cola temporal en memoria. El proceso de Hermes busca preguntas
por HTTPS y firma cada pedido con Ed25519. Solo se publica su clave pública.
La clave privada y la credencial local del perfil permanecen en el VPS.
No se abren puertos ni se unen redes Docker.

El proceso invoca exclusivamente el perfil `asistente-eventos` en su API de loopback,
con `gpt-6-luna` y `openai-codex`. Antes de trabajar comprueba configuración,
ausencia de modelos alternativos y allowlist de las cinco herramientas MCP.
La versión 0.22.7 no enumera MCP dinámicos en `/v1/toolsets`; por eso el despliegue
  requiere además verificar las herramientas efectivas del agente mediante una
consulta real del canal API. Nunca aceptar terminal, archivos o administración.

## Instalar y comprobar en Hermes

Usar `/opt/hermes/.venv/bin/python`, conservando versiones previas de los scripts.
La carpeta de destino es la misma de `eventos_mcp.py`.

1. Ejecutar las tres pruebas con `python -m unittest -v test_event_chat_worker.py`.
2. Ejecutar `event_chat_worker.py --check` con `PYTHONPATH=/opt/hermes`.
3. Ejecutar `event_chat_worker.py --init`: crea una clave de firma local con modo
   0600 e imprime únicamente el PEM público. Incorporarlo en `public-worker.json`
   de la web y desplegar antes de iniciar el proceso.
4. Iniciar en segundo plano con `nohup`, dentro del perfil y sin reiniciar el
   gateway. El bloqueo `flock` evita procesos duplicados. Redirigir salida a un
   log privado del perfil. No registrar preguntas, respuestas ni credenciales.
5. Verificar heartbeat y conversación real en la vista privada del organizador.

El canal público está habilitado del 18 al 21/11/2026 inclusive según Buenos Aires. Antes de esa
fecha solo admite pruebas del organizador autenticado en Supabase. El proceso
termina después del día del evento. El formulario funciona de forma independiente.

No hay límite económico propio, proveedor alternativo ni clave de API facturada.
Siguen aplicando los límites de la suscripción. Hay límites técnicos de longitud,
cola y concurrencia para manejar la demostración de unas 40 personas.

Una caída o reinicio del contenedor detiene el proceso; la web detecta la ausencia
del heartbeat y muestra el enlace de inscripción. No se alteran servicios comunes
para volver a iniciarlo. La cola en memoria se pierde al desplegar la web: los
visitantes pueden reintentar, sin repetir una inscripción.
