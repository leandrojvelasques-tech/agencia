# Lectura privada de inscripciones para Hermes

Estado de publicación y conexión del 18/11/2026: ver `PRODUCTION-VALIDATION.md`.
La API está publicada y el adaptador privado está instalado. No hay reportes
ni envíos programados. `LOCAL-VALIDATION.md` conserva la evidencia de la etapa local.

Rama: `codex/event-registration-readonly-20261118`, creada desde el commit
`45378e4` de `codex/eventos-agentes-20261117`. La publicación web usa la rama
productiva existente `codex/hostinger-dokploy-files`; los commits exactos y la
verificación operativa figuran en el informe de producción.

## Diagnóstico y decisión

El sitio tiene un servidor HTTP Node (`server.js`), endpoints CommonJS en `api/`
y una aplicación React/Vite que usa Supabase. Las inscripciones se guardan en
`public.registrations`: `event_id` identifica el evento y `participant_id`
relaciona cada fila con `public.participants`. El esquema local declara ambos
identificadores con claves foráneas e `id` UUID estable. Tiene dos fechas:
`registered_at` y `created_at`. Esta integración usa **created_at**, que registra
la creación de la fila; no cambia la ordenación actual del panel.

Fuentes revisadas:

- `eventos-app/supabase-schema.sql`: tablas, relaciones, estados e índices.
- `eventos-app/src/store/useStore.js`: lectura, alta, duplicados y borrado.
- `eventos-app/src/pages/admin/EventParticipants.jsx`: total y cancelaciones.
- `eventos-app/src/pages/public/AgentsEventPage.jsx`: formulario específico.
- `lib/eventAssistantContext.js`, `lib/eventChatHttp.js`, `lib/eventChatBroker.js`.
- `integrations/hermes-eventos/eventos_mcp.py` y su `README.md`.

El MCP existente se usa en el perfil del asistente público. Consulta la
información pública del evento y materiales, sin inscripciones. **No se le
agrega el acceso a participantes.** El código nuevo ofrece una API HTTP privada
y un cliente Python sin dependencias para el Hermes privado. La etapa de
conexión agrega un adaptador stdio de dos herramientas (`registration_mcp.py`)
que reutiliza el SDK MCP ya instalado en Hermes. Permite consultarlas en lenguaje
natural sin agregar puertos ni un servicio de red. Se mantiene separado del MCP
del asistente público.

La fuente es una RPC nueva de Supabase. Un envoltorio `SECURITY INVOKER` llama
a una función `SECURITY DEFINER` en un esquema nuevo y privado. La elevación
es necesaria para leer las tablas sin entregar permisos sobre ellas al
consumidor; la función valida una credencial dedicada, su habilitación y su
vencimiento antes de ejecutar SQL fijo. No acepta identificador de evento,
SQL, campos de selección ni nombres de tablas. `search_path` queda fijado en
`pg_catalog`. No se usan claves `service_role` ni sesiones administrativas.
La clave pública del proyecto identifica la API; no es la credencial privada.

Referencias de diseño verificadas: [funciones de base de datos](https://supabase.com/docs/guides/database/functions)
y [RLS y privilegios](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Alcance de datos y reglas actuales

Evento fijo, aplicado tanto en SQL como en los cursores del servidor:
`d9962e70-4b7a-44be-b6f3-20151c810bdb`.

Cada inscripción entrega exactamente:

| Campo | Fuente |
| --- | --- |
| `id` | `registrations.id` |
| `created_at` | `registrations.created_at`, UTC con seis decimales |
| `first_name` | `participants.first_name` |
| `last_name` | `participants.last_name` |
| `email` | `participants.email` |
| `profession` | Primera respuesta no vacía: `profesion_carrera`, `profesion_otro`, `profesion` |
| `residence_city` | `survey_responses['Ciudad de residencia']` |

La profesión y la ciudad corresponden a las claves que guarda el formulario
de este evento. Una inscripción manual puede carecer de estas respuestas:
devuelve `null`; no se infiere información ni se expande el JSON de encuesta.
El servidor vuelve a proyectar la lista de campos permitidos.

El total cuenta **filas de inscripción existentes con created_at anterior al
corte**. Incluye `registered`, `confirmed` y `cancelled`, como el total del panel
actual. Las novedades usan esa misma definición, dentro de `[from, cutoff)`.

- Cancelaciones: el panel cambia `status` y conserva la fila. Se incluyen en el
  total; no se expone el estado porque no está en los metadatos autorizados.
- Borrados: el panel puede borrar físicamente la inscripción. No hay historial
  de cambios en esta integración; una fila ya borrada no se puede recuperar.
- Pruebas: no se encontró una marca específica en las fuentes locales revisadas.
  Se incluyen si existen como filas. No se clasifican por nombre ni correo.
- Duplicados: el esquema local declara unicidad `(event_id, participant_id)` y
  correo no nulo único en participantes; el alta reutiliza el participante por
  correo y trata `23505` como inscripción existente. No se agrega deduplicación
  por persona; el consumidor deduplica entregas por `id` de inscripción.
- En la etapa de publicación se verificaron las columnas necesarias del esquema
  vivo, sin leer personas. El SQL
  local del esquema tampoco contiene todas las columnas posteriores; antes de
  desplegar hay que validar sólo estructura, permisos y configuración, sin
  leer participantes. No se aplicó el esquema histórico completo.

Queda por decidir si se quiere un total de inscripciones activas, excluir
pruebas identificadas o informar cancelaciones. Eso exige aprobar otra regla
y, si corresponde, ampliar los metadatos. No se alteró la regla actual.

## Contrato HTTP

Transporte: HTTPS. Endpoint propuesto:
`GET https://www.leandrovelasques.com.ar/api/event-registration-reader`

Autenticación: `Authorization: Bearer <credencial-dedicada>`.
La credencial no se acepta en URL, cookies ni cuerpos. Sólo GET; los métodos
de escritura se rechazan. Esta credencial no es un JWT de Supabase ni una sesión
administrativa, y no sirve para autenticar los otros endpoints del sitio.

| Parámetro | Regla |
| --- | --- |
| `operation` | `changes` (predeterminado) o `total` |
| `from` | Obligatorio para la primera página de `changes`, inclusivo |
| `cutoff` | Exclusivo; opcional en la primera consulta, por defecto hora del servidor |
| `limit` | Sólo `changes`; entero 1–500, predeterminado 100 |
| `cursor` | Sólo páginas siguientes de `changes`; combinar sólo con `limit` y `operation=changes` |

Fechas: UTC terminado en `Z`, de cero a seis decimales, por ejemplo
`2026-11-18T11:00:00.123456Z`. No se aceptan fechas sin hora, desfases horarios,
fechas imposibles, futuro, valores anteriores a 2000 ni intervalos de más de
366 días. No se aceptan parámetros repetidos o desconocidos.

### Ejemplos enteramente ficticios

Consulta inicial:

```text
GET /api/event-registration-reader?operation=changes&from=2026-11-17T00:00:00Z&cutoff=2026-11-18T11:00:00Z&limit=100
Authorization: Bearer CREDENCIAL_FICTICIA_NO_UTILIZABLE_EN_PRODUCCION_0000
```

```json
{
  "from": "2026-11-17T00:00:00.000000Z",
  "cutoff": "2026-11-18T11:00:00.000000Z",
  "total": 1,
  "inscriptions": [{
    "id": "00000000-0000-0000-0000-000000000001",
    "created_at": "2026-11-17T10:00:00.000001Z",
    "first_name": "Persona ficticia",
    "last_name": "Ejemplo",
    "profession": "Contador/a",
    "residence_city": "Ciudad ficticia",
    "email": "ficticio@example.invalid"
  }],
  "next_cursor": null
}
```

Si hay más páginas, `next_cursor` contiene una cadena opaca firmada; usarla
literalmente con `?cursor=<cursor>&limit=100`. No construir ni editar cursores.
El cursor vincula la captura, el evento y la última tupla `(created_at, id)`;
las fechas compartidas no pierden filas. La segunda página conserva `from`,
`cutoff` y `total` de la primera. No hay caché pública.

Total independiente:

```text
GET /api/event-registration-reader?operation=total&cutoff=2026-11-18T11:00:00Z
```

```json
{"cutoff":"2026-11-18T11:00:00.000000Z","total":1}
```

Un resultado vacío es HTTP 200, `inscriptions: []`, `next_cursor: null` y el
total que corresponda. Un intervalo vacío no implica total cero.

| HTTP | Código o significado |
| --- | --- |
| 400 | `invalid_parameters`, `invalid_date`, `invalid_interval`, `invalid_limit`, `invalid_cursor` |
| 401 | `credential_required` |
| 403 | `forbidden`: credencial incorrecta, revocada, vencida o rechazada por la fuente |
| 404 | `not_found`: ruta derivada no admitida |
| 405 | `method_not_allowed`, encabezado `Allow: GET` |
| 410 | `snapshot_expired` |
| 429 | `rate_limited` o `reader_busy`, `Retry-After: 60` |
| 503 | `reader_not_configured` o `source_unavailable` |

Los cuerpos de error sólo contienen `{"error":"codigo"}`. No se propagan errores
de SQL, fichas ni respuestas de Supabase. La falta de permisos de la credencial
se distingue de la indisponibilidad técnica. Una estructura incompatible,
timeout, respuesta excesiva o un intervalo con más de 10.000 novedades se
tratan como fuente no disponible: reducir el intervalo si se alcanzó ese límite.

## Consistencia, límites y reintentos

La RPC obtiene total y novedades en **una misma sentencia y captura MVCC**.
La API congela las novedades proyectadas en memoria y pagina esa captura:
cambios, cancelaciones o borrados posteriores no cambian sus páginas.
Las fechas conservan microsegundos de PostgreSQL; el orden es `(created_at,id)`.
No se usa paginación por desplazamiento sobre tablas que están cambiando.

Máximo 10.000 novedades por intervalo, ocho capturas por proceso y una lectura
inicial en curso. Las capturas vencen a los 15 minutos y se eliminan durante la
limpieza periódica de un minuto o la próxima consulta. Nunca se guardan en disco.
Los límites temporales de solicitudes siguen el patrón en memoria que ya usa
`EventChatBroker`: 300 solicitudes globales/minuto y 60 autorizadas/minuto para
este endpoint. No se reutiliza el estado del chat ni sus credenciales.
La RPC en Supabase no hereda ese limitador HTTP: mantener los límites del
proveedor y evitar publicar ejemplos que contengan la credencial.

Cada página valida también la habilitación y vencimiento en la base. Revocar la
credencial bloquea páginas almacenadas; una consulta ya autorizada y en curso
puede terminar. Los límites y las capturas son por proceso: antes de usar más de
una réplica, aprobar almacenamiento compartido o afinidad de sesión. Un reinicio
invalida los cursores; se repite el intervalo completo. No hay almacenamiento
distribuido nuevo.

Procedimiento del consumidor, documentado pero **no implementado como estado
en Hermes**:

1. Conservar un último corte completado `C` y los identificadores entregados.
2. Consultar `[C,N)` (o el intervalo solapado indicado abajo); fijar `N` o usar
   el corte devuelto. Seguir todos los cursores hasta `next_cursor=null`.
3. Deduplicar por `id`. Ante fallo, mantener `C` sin cambios. Reintentar el mismo
   cursor mientras sea válido; ante 410 o reinicio, repetir `[C,N)` y deduplicar.
4. Avanzar a `C=N` sólo cuando todas las páginas hayan sido procesadas y la
   entrega posterior haya concluido correctamente. No avanzar después de un
   correo fallido. La futura integración deberá guardar el estado de entrega
   y manejar reintentos del correo por separado.

**Límite de created_at:** PostgreSQL puede asignar esa fecha al inicio de una
transacción que recién confirma después del corte. Ningún lector basado sólo
en created_at garantiza detectar esas confirmaciones tardías con intervalos
consecutivos sin solapamiento. Para este evento pequeño, el consumidor debería
releer desde el inicio aprobado del período del evento hasta `N` y entregar
sólo IDs todavía no procesados; así también detecta confirmaciones tardías que
siguen presentes. Ese inicio y su almacenamiento están pendientes de aprobar.
Si se elige un solapamiento corto, su duración debe superar la demora máxima
de transacción y complementarse con conciliación completa. No se promete
recuperar registros borrados antes de la lectura ni conservar datos históricos.
Sin un registro de cambios no se informan modificaciones de fichas existentes.

## Configuración y aprovisionamiento posterior

Servidor web, variables privadas de Dokploy:

| Variable | Contenido |
| --- | --- |
| `EVENT_REGISTRATION_TOKEN_SHA256` | SHA-256 hexadecimal de la credencial dedicada |
| `EVENT_REGISTRATION_SUPABASE_URL` | URL HTTPS del proyecto Supabase correcto |
| `EVENT_REGISTRATION_PUBLISHABLE_KEY` | Clave pública `sb_publishable_...` o JWT `anon`, nunca `service_role` |

Hermes privado: `HERMES_CPCE_REGISTRATION_TOKEN` contiene la credencial real en
su entorno privado. No se copia al perfil `asistente-eventos`, a la configuración
del navegador, al frontend ni a un archivo versionado. No se necesitan variables
VITE para este acceso. El servidor sólo conserva el hash en su configuración;
recibe la credencial desde Hermes y la presenta por HTTPS a la RPC.

El secreto real se aprovisionó en el entorno privado; no figura en este documento.
Para renovar o reconstruir el acceso, usar este procedimiento:

1. Generar al menos 32 bytes aleatorios con una herramienta de secretos, codificar
   en base64url sin relleno y calcular SHA-256 sobre ese texto UTF-8 exacto.
   No imprimir el secreto ni ponerlo en argumentos, historial o tickets.
2. Guardar el secreto en el entorno privado de Hermes; sólo su hash en Dokploy
   y en `cpce_registration_private.reader_credential`. Insertar una sola fila con
   `singleton=true`, `token_sha256=<hash>`, `enabled=true` y una fecha de vencimiento
   aprobada. Usar una operación administrativa parametrizada, sin registrar
   parámetros. No hay una credencial inicial ni una fecha de vencimiento inventada.
3. Para revocar: `enabled=false` en la fila. Para rotar: cambiar el hash de la
   fila y de Dokploy, reemplazar el secreto en Hermes y reiniciar sólo el servicio
   web necesario. El desajuste falla cerrado, sin recurrir a credenciales generales.
4. Desactivar captura de encabezados Authorization y cuerpos de solicitudes o
   respuestas en proxies, APM y herramientas de depuración de esta ruta y de la
   RPC. Los módulos nuevos no imprimen consultas, credenciales, correos ni fichas.
   El stdout del adaptador es el resultado privado para Hermes, no un log técnico.

La tabla privada sólo guarda hash, habilitación y vencimiento. RLS está activo
sin políticas públicas; sólo el dueño de la función puede leerla. El esquema
`cpce_registration_private` debe permanecer fuera de los esquemas expuestos
por PostgREST. Los grants nuevos se limitan a los objetos nuevos: no se cambian
permisos de usuarios existentes sobre tablas, chat u otros eventos.

## Cómo consumirlo desde Hermes

El adaptador `registration_reader.py` usa sólo la biblioteca estándar de Python.
Se deberá copiar a un directorio de herramientas del **Hermes privado** y permitir
su invocación allí. El endpoint es fijo y los redirects se rechazan; no se
admiten URLs arbitrarias. La credencial se toma del entorno, nunca de argumentos.

```sh
python registration_reader.py total
python registration_reader.py changes --from 2026-11-17T00:00:00Z --cutoff 2026-11-18T11:00:00Z --limit 100
python registration_reader.py changes --cursor CURSOR_FICTICIO
```

Con esa herramienta conectada y verificada, Hermes podrá responder consultas
como «¿cuántas inscripciones hay?» o «mostrame las nuevas desde ayer». Deberá
convertir horarios de Argentina a UTC antes de invocar la API. El adaptador
consulta una página por invocación; Hermes debe seguir `next_cursor`.
La conexión nativa instalada usa `registration_mcp.py` y el SDK existente de
Hermes. La entrada MCP, el perfil, los propietarios de archivos y las pruebas
operativas se detallan en `PRODUCTION-VALIDATION.md`.

## Despliegue y reversión: procedimiento sin ejecutar

1. Revisar el diff de esta rama y conciliarlo con la rama de producción vigente.
   No asumir que `45378e4` continúa siendo la versión publicada.
2. Verificar estructura de `registrations`, `participants`, claves de encuesta,
   owner de funciones, RLS, grants y esquemas expuestos. Aplicar únicamente la
   migración `20261118132538_event_registration_reader.sql` cuando se autorice.
   No aplicar el esquema histórico ni otras migraciones pendientes por arrastre.
3. Aprovisionar credencial y variables según el apartado anterior. Validar con
   datos sintéticos en entorno aislado. La migración se instala cerrada porque
   no contiene credencial habilitada.
4. Con autorización de publicación: GitHub → VPS Hostinger → Dokploy, sin Vercel.
   Comprobar URL pública, rutas principales y endpoint privado. La prueba con
   inscripciones reales requiere autorización específica adicional.
5. Conectar el adaptador al Hermes privado y verificar una llamada desde ese
   mismo perfil cuando esté autorizado. Mantener separado el asistente público.

Reversión: deshabilitar primero la fila de credencial, retirar el adaptador y
las variables privadas, restaurar el commit web previo mediante Dokploy y,
si se aprueba retirar el esquema, ejecutar en orden:

```sql
drop function public.read_cpce_registration_snapshot(text,timestamptz,timestamptz,boolean);
drop function cpce_registration_private.read_snapshot(text,timestamptz,timestamptz,boolean);
drop table cpce_registration_private.reader_credential;
drop schema cpce_registration_private;
```

Sin `CASCADE`: si surgieron dependencias nuevas, detener y revisar. No se tocan
registros, participantes ni formularios. La reversión no se ejecutó.

## Pruebas locales

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run test:registration-reader
python -m unittest discover -s integrations/hermes-registration-reader -p test_registration_reader.py -v
```

PGlite es una dependencia exacta de desarrollo, `0.3.14`. Ejecuta PostgreSQL
embebido en memoria: instala la migración real sobre dos tablas sintéticas,
prueba grants y consulta como `anon`. No usa Docker, red ni datos de producción.
Las pruebas HTTP usan un puerto local y una fuente simulada. No prueban el
gateway alojado de Supabase ni la configuración real de PostgREST/Dokploy/Hermes.

## Decisiones pendientes

- Renovar o revocar la credencial antes de su vencimiento si corresponde.
- Confirmar definición alternativa de total o exclusión de pruebas, si se desea.
- Para reportes posteriores: destinatario operativo, horarios (8:00 y 20:00
  siguen sin confirmar), zona America/Argentina/Buenos_Aires, primer período,
  fecha de finalización, estado persistente y tratamiento de reintentos.

No se enviaron mensajes, no se crearon cron ni automatizaciones, no se alteraron
formularios ni consentimientos y no se consultaron datos reales de participantes.
