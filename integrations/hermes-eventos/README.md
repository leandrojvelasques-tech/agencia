# MCP de eventos para Hermes

Conexión de lectura para el evento CPCE del 21/11/2026. Usa el SDK `mcp 2.3.0`
ya instalado en Hermes. No requiere nuevas cuentas, claves, puertos ni acceso
administrativo a Supabase.

- Datos vigentes: GET `https://www.leandrovelasques.com.ar/api/event-assistant-context`.
  El sitio consulta el backoffice con su configuración pública existente, filtra
  el evento por ID y estado público y proyecta únicamente campos de la landing.
- Materiales: inventario explícito de las fichas y diapositivas 02–05, en la
  carpeta privada de conocimiento del perfil. No se publican en el sitio.
- Inscripciones: devuelve disponibilidad e instrucciones del formulario. No
  crea registros ni consulta personas, correos o estadísticas internas.

## Instalación en el perfil asistente-eventos

Copiar los tres scripts a
`/opt/data/profiles/asistente-eventos/workspace/integrations/leandro-eventos/`.
Conservar copia del `config.yaml` antes de agregar exclusivamente esta entrada:

```yaml
mcp_servers:
  leandro-eventos:
    command: /opt/hermes/.venv/bin/python
    args:
      - /opt/data/profiles/asistente-eventos/workspace/integrations/leandro-eventos/eventos_mcp.py
    enabled: true
    timeout: 30
    tools:
      include:
        - get_event_information
        - list_event_materials
        - read_event_text
        - view_event_slide
        - get_registration_instructions
      resources: false
      prompts: false
```

No reemplazar otras entradas ni copiar credenciales del perfil principal.
No reiniciar servicios compartidos para conectar este perfil. Usar la función
de conexión/relectura MCP de Hermes o abrir una sesión nueva del mismo perfil.

Verificar con el intérprete existente:

```sh
cd /opt/data/profiles/asistente-eventos/workspace/integrations/leandro-eventos
/opt/hermes/.venv/bin/python -m unittest -v test_eventos_mcp.py
/opt/hermes/.venv/bin/python verify_protocol.py
```

Las pruebas comprueban transporte MCP real, lectura vigente, inventario, ficha,
imagen, rechazo de rutas y ausencia de operaciones de inscripción. No crean
asistentes de prueba ni envían correos.

Después, el propio asistente debe consultar `get_event_information` desde una
sesión con MCP conectado, y distinguir esa lectura de la ficha de contexto.

## Alcance pendiente

El chat público de la landing y los informes privados para el agente general
requieren su propia integración. No exponer el perfil completo de Hermes a
visitantes: habilitar solo estas herramientas, sesiones separadas y límites de
uso del modelo antes de conectar el canal público.
