# Propuesta de eventos — 17 de noviembre de 2026

Rama: `codex/eventos-agentes-20261117`. Base: `1364df9` de la rama de producción en Dokploy. No publicada.

## Revisión local

Desde `eventos-app`, ejecutar en dos terminales:

```text
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort --base /
python scripts/preview-events.py
```

Abrir `http://127.0.0.1:5187/preview.html?view=landing`. La barra superior permite recorrer el formulario, el gestor y Novedades. La vista previa usa datos de ejemplo y no guarda inscripciones ni envía correos.

## Cambios preparados

- Página y formulario de la charla, con los recursos gráficos existentes.
- Nombre, apellido, profesión y correo; solicitud opcional de diapositivas. Revisión antes de confirmar.
- Integración con `selfRegister`: datos de la persona en `participants`; profesión y solicitud de material en `registrations.survey_responses`.
- Catálogo del gestor más compacto, próximo evento destacado, filtros y accesos a participantes.
- Novedades en una fila: cuatro tarjetas en escritorio, tres o dos en anchos intermedios, una en celular. Flechas, teclado y desplazamiento táctil.
- Tarjeta de la Oficina Anticorrupción con estado finalizado. Es contenido estático de la portada; no hay un evento coincidente en la base consultada.

## Registro creado

En el proyecto existente Website Leandro se creó el evento `d9962e70-4b7a-44be-b6f3-20151c810bdb`, slug `agentes-de-inteligencia-artificial-en-ciencias-economicas-2026`, como borrador privado, con inscripciones cerradas y recordatorios desactivados. Fecha: 21/11/2026, 14:30; duración: 40 minutos. Fuentes: placa del encuentro y duración indicada por Leandro.

## Pendiente de activación

- Revisar diseño y texto con Leandro antes de desplegar por GitHub → Hostinger → Dokploy.
- Publicar la landing y habilitar el evento en coordinación con su tarjeta de portada: la tarjeta preparada usa la ruta pública, que permanece cerrada mientras el evento es borrador privado.
- Probar una inscripción real autorizada y verificarla en el panel.
- Configurar el perfil especialista en Hermes, el canal web y sus herramientas. El espacio del chat en la propuesta indica que está en preparación; no simula respuestas de IA.
- Conectar avisos al agente general y el envío de materiales cuando se autorice. No se configuraron ni enviaron notificaciones.
- Nombre recomendado de la conexión de Hermes: `Consultora · Leandro Velasques`; no se modificó la configuración de Hermes.

## Verificación

Build de producción correcto. Comprobaciones de búsqueda, estados, fechas múltiples y validación del formulario correctas. Recorrido local probado: inscripción, validación, revisión, corrección y confirmación de prueba. Carrusel verificado en escritorio con una fila y cuatro tarjetas visibles.
