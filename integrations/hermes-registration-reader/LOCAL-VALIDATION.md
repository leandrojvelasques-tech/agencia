# Informe de implementación local — 18/11/2026

Implementado localmente en `codex/event-registration-readonly-20261118`:

- API privada de lectura de novedades y total para el evento autorizado.
- Credencial dedicada por hash, revocable y con vencimiento en la base.
- Restricción de evento en SQL fijo y cursores firmados.
- Proyección de cinco datos personales y los metadatos autorizados.
- Validación de fechas UTC, intervalos, límites y cursores.
- Captura MVCC para total y novedades; paginación estable sobre una copia temporal
  en memoria, con orden por fecha de creación e identificador.
- Errores sanitizados, respuestas privadas sin caché y límites por proceso.
- Adaptador Python para que el Hermes privado consuma la API cuando se conecte.
- Documentación de contrato, reintentos, límites, aprovisionamiento y reversión.

## Archivos modificados y creados

| Archivo | Cambio |
| --- | --- |
| `server.js` | Conecta la ruta privada antes de los handlers generales |
| `lib/eventRegistrationReader.js` | Autenticación, fuente, proyección, capturas, cursores y HTTP |
| `supabase/migrations/20261118132538_event_registration_reader.sql` | Tabla de hash y RPC limitada al evento; preparada, no aplicada en producción |
| `tests/event-registration-reader.test.js` | Pruebas sintéticas de Node, HTTP y PostgreSQL embebido |
| `package.json` | Comando de pruebas y PGlite como dependencia exacta de desarrollo |
| `package-lock.json` | Lock de la dependencia de pruebas |
| `integrations/hermes-registration-reader/registration_reader.py` | Cliente privado sin estado ni envíos |
| `integrations/hermes-registration-reader/test_registration_reader.py` | Pruebas del cliente y errores |
| `integrations/hermes-registration-reader/README.md` | Diagnóstico y contrato de integración |
| `integrations/hermes-registration-reader/LOCAL-VALIDATION.md` | Este informe |

## Verificación ejecutada

```text
node --test tests/home-workshop.test.js scripts/event-chat.test.js scripts/event-assistant-context.test.js tests/event-registration-reader.test.js
32 pruebas aprobadas, 0 fallidas.

python -m unittest discover -s integrations/hermes-registration-reader -p test_registration_reader.py -v
4 pruebas aprobadas, 0 fallidas.

node --check server.js
node --check lib/eventRegistrationReader.js
git diff --check
Sin errores.
```

Las 13 pruebas del lector incluyen la ejecución de la migración real en PGlite
(PostgreSQL en memoria), con tablas, personas y credenciales ficticias. Prueban
autenticación, aislamiento entre eventos, denegación de escritura y lectura
directa de tablas, proyección, total con cancelados, fechas límite y revocación.
También pasan datos del SQL real por el lector HTTP y su flujo de cursores.
Las otras pruebas cubren paginación con fechas iguales y microsegundos distintos,
reintentos, cambios posteriores en la fuente, caducidad, cursores manipulados,
parámetros de otro evento, límites, rutas, errores y ausencia de caché pública.

Las 19 pruebas de regresión existentes usan fuentes simuladas; cubren la tarjeta
de capacitación, contexto público del evento y broker de chat. No se ejecutaron
pruebas que lean informes privados de otros clientes.

## Pendiente de aprobación, configuración o verificación externa

- Revisión del diff e integración con la versión de producción vigente.
- Validación de estructura y permisos reales sin leer participantes.
- Aplicación autorizada de la migración nueva y verificación del gateway Supabase.
- Generación segura de credencial, fecha de vencimiento y variables privadas.
- Publicación por GitHub → Hostinger → Dokploy, verificación de rutas públicas.
- Conexión y prueba desde el Hermes privado elegido.
- Cualquier prueba que necesite datos reales de participantes.
- En una etapa posterior: reglas de reporte, destinatario, horarios, período
  inicial, finalización, estado persistente, conciliación y envío de correo.

Los totales conservan la definición actual del panel, incluyendo cancelados.
No se identifican ni excluyen pruebas sin una regla aprobada. El corte es sobre
filas existentes al consultar; no reconstruye datos borrados ni versiones
históricas. El tratamiento de transacciones tardías se documenta mediante
relectura del período y deduplicación por ID.

No hubo push, merge, despliegue, modificación de producción, lectura de personas
reales, creación de automatizaciones, cambios de formulario ni envíos. No se
generaron credenciales reales. Los reportes no están activos.
