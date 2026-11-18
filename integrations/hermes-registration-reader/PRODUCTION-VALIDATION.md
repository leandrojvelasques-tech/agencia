# Publicación y conexión privada — 18/11/2026

API publicada mediante GitHub → VPS Hostinger → Dokploy. El código web activo
corresponde al commit `e2eff10669c53b38916a85416bd2acfb7f9dee2f`, publicado en
la rama productiva existente `codex/hostinger-dokploy-files`. Dokploy completó
el build y se recargó la aplicación después de guardar sus variables con el
editor nativo. Las referencias previas a variables del proyecto se conservaron.

La migración `event_registration_reader` se aplicó al proyecto correcto tras
verificar únicamente la estructura necesaria de las tablas. No se cambiaron
inscripciones ni participantes. La credencial se generó dentro del entorno
privado, quedó habilitada y vence el **18/12/2026 a las 23:59:59 UTC**. Se puede
revocar antes desde la tabla privada. No se incluyó el secreto en Git, comandos,
capturas ni este informe.

## Conexión a Hermes

El adaptador nativo y el cliente del commit `a8ea531` están instalados en
`/opt/data/integrations/cpce-registration-reader/`, dentro de `hermes-agent`.
La credencial está en `/opt/data/secrets/cpce-registration-reader/credential.env`,
con modo `0600`; las carpetas nuevas tienen modo `0700`. Los archivos de ejecución
y la credencial pertenecen al usuario real de Hermes, UID/GID `10000:10000`.
No se modificaron propietarios ni permisos de archivos ajenos a esta integración.

La configuración del perfil principal conserva las conexiones previas y agrega:

```yaml
mcp_servers:
  cpce-registration-reader:
    command: /opt/hermes/.venv/bin/python
    args:
      - /opt/data/integrations/cpce-registration-reader/registration_mcp.py
    env:
      HERMES_HOME: /opt/data
    enabled: true
    timeout: 30
    tools:
      include:
        - get_cpce_registration_total
        - get_cpce_registration_changes
      resources: false
      prompts: false
```

El toolset `mcp-cpce-registration-reader` se agregó a las listas privadas de CLI
y Telegram. El canal API conserva su resolución predeterminada de conexiones
habilitadas. La herramienta se ejecuta por stdio, sin puertos nuevos. El modelo
y proveedor existentes no se modificaron. El perfil `asistente-eventos` conserva
su configuración y sus cinco herramientas públicas; no recibe esta credencial.

La prueba de conexión desde el panel MCP del perfil `default` reconoce exactamente
las dos herramientas. La prueba de protocolo se ejecutó también como el usuario
real del servicio, no solamente como root, y consultó la API pública con éxito.

## Verificación

- 32 pruebas Node aprobadas en la implementación local.
- 5 pruebas Python aprobadas, incluida la denegación del adaptador al perfil público.
- Protocolo MCP real: dos herramientas de lectura y rechazo de una herramienta
  de escritura inexistente.
- Consulta autenticada de total desde Hermes: **1 inscripción** al corte de prueba.
- Consulta de novedades con intervalo histórico vacío: éxito, lista vacía y total cero.
- Descubrimiento nativo de Hermes: herramientas registradas con los nombres
  `mcp__cpce_registration_reader__get_cpce_registration_total` y
  `mcp__cpce_registration_reader__get_cpce_registration_changes`.
- Consulta real en lenguaje natural dentro del perfil `default`: Hermes respondió
  «Total: 1 inscripción», con corte `18/11/2026, 14:33:52 UTC`. El consumidor puede
  necesitar `tool_search` para descubrir las herramientas diferidas del catálogo;
  no se debe prohibir esa búsqueda en las instrucciones de uso.
- La misma consulta por la ruta API principal habitual también respondió
  «Total: 1 inscripción», con corte `18/11/2026, 14:34:46 UTC`.
- Endpoint público sin credencial: HTTP 401, `credential_required`.
- Contexto público y estado del chat: HTTP 200 y respuestas sin caché.

Las pruebas operativas de datos consultaron el total y un intervalo vacío. No se
copiaron nombres, correos ni fichas de participantes a archivos o capturas.

## Uso

En una sesión privada de Hermes se podrá pedir, por ejemplo:

- «¿Cuántas inscripciones hay al evento del 21/11?»
- «Consultá las inscripciones nuevas del evento desde ayer».

La API mantiene la definición actual del panel: el total incluye canceladas y
no excluye pruebas sin una regla aprobada. Para novedades, convertir horas a UTC,
seguir `next_cursor` y aplicar los reintentos documentados en `README.md`.

## Reversión

Deshabilitar primero la credencial en la tabla privada; retirar esta entrada MCP
y el toolset de las listas privadas. Hay una copia protegida del `config.yaml`
anterior en `/opt/data/secrets/cpce-registration-reader/config-before.yaml`.
La configuración previa de Dokploy está respaldada en el VPS, en un archivo
protegido bajo `/root/`. Restaurar únicamente las variables de esta integración
mediante Dokploy, conservando otras modificaciones posteriores si existieran.
El commit web previo es `45378e40bf00f79b0cf83fe1af4f1dfda499a8df`.

No se programaron reportes ni envíos, no se crearon cron y no se modificaron
el formulario ni sus consentimientos. La integración sólo habilita consultas.
