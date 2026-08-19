# Staging en Dokploy

La imagen definida en `Dockerfile` ejecuta el sitio institucional, la aplicación de eventos y las rutas HTTP previamente atendidas por Vercel. El contenedor escucha en el puerto interno `3000`.

## Configuración en Dokploy

1. Crear un proyecto y una aplicación desde `leandrojvelasques-tech/agencia`.
2. Usar el `Dockerfile` de la raíz del repositorio y el puerto interno `3000`.
3. Cargar en Dokploy únicamente las variables de producción necesarias para Brevo y Supabase. No incorporarlas al repositorio.
   Para que Vite las incorpore al bundle durante el build, configurar también estos build arguments con los mismos valores:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Asociar `staging.leandrovelasques.com.ar`, con HTTPS, y verificar los flujos críticos antes de modificar el dominio principal.

Supabase y Brevo permanecen externos en esta etapa. Vercel se conserva operativo hasta completar la validación y el período de estabilización.
