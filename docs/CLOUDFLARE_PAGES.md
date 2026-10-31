# Publicar DulceRuta en Cloudflare Pages

Esta guía sirve para mover la dirección visible de la web a un subdominio `pages.dev` sin mostrar el nombre de usuario de GitHub en la URL.

## Requisitos

- Cuenta gratuita en Cloudflare: https://dash.cloudflare.com/sign-up
- Acceso a GitHub para autorizar la conexión.
- Repositorio: `luisrendonsanz/dulceruta`.

## Configurar Pages (no Workers)

1. Entra a https://dash.cloudflare.com y abre **Workers & Pages**.
2. Elige **Create application** → **Pages** → **Connect to Git** (los nombres exactos pueden variar ligeramente en la interfaz).
3. Selecciona **GitHub** y autoriza a Cloudflare. Otorga acceso al repositorio **luisrendonsanz/dulceruta**.
4. Selecciona ese repositorio y comienza su configuración.
5. Elige como nombre del proyecto **dulceruta-rosario** si está disponible. Cloudflare asignará el subdominio **dulceruta-rosario.pages.dev**; si el nombre no está disponible, elige otro.
6. Establece la siguiente configuración:
   - **Production branch:** `main`
   - **Framework preset:** `Vite` si aparece; de lo contrario `None` y configura manualmente.
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** directorio raíz del repositorio; deja el campo vacío (no pongas `public`).
   - **Environment variable (opcional):** `VITE_BASE_PATH=/`. La aplicación usa `/` por defecto en Cloudflare.
   - **Node.js:** 22, indicado por `.node-version`.
7. Selecciona **Save and Deploy**.

## Comprobar antes de compartir

- La página principal abre el mapa.
- `/registro.html` deja marcar un punto y descargar su JSON.
- `/editor.html` abre primero el cuadro de contraseña.
- `/puntos.json` devuelve `[]` si aún no hay ubicaciones aprobadas.
- La ruta de la aplicación parte de `/`, no de `/dulceruta/`.
- Al cambiar `public/puntos.json` en GitHub y confirmar el commit, Cloudflare Pages debería desplegar automáticamente.

Cuando el sitio de Cloudflare funcione, actualiza los enlaces públicos. El sitio anterior de GitHub Pages `https://luisrendonsanz.github.io/dulceruta/` seguirá funcionando mientras no desactives GitHub Pages desde **Settings → Pages**. Si quieres que deje de estar accesible, desactívalo solo después de comprobar Cloudflare.

## Seguridad y privacidad

- Cloudflare Pages **no protege** por sí mismo `/editor.html`. La contraseña de JavaScript existente es un filtro visual que una persona con conocimientos puede saltarse.
- No cargues los JSON individuales recibidos por WhatsApp a GitHub: contienen nombres y apellidos.
- El borrador del administrador queda guardado en el navegador y **no se sincroniza** entre el antiguo sitio de GitHub y el nuevo sitio de Cloudflare, porque ambos usan distintos orígenes de almacenamiento. Antes de cambiar de alojamiento, descarga un respaldo del borrador que te interese conservar.
- El editor **no publica automáticamente**. Para actualizar el mapa, exporta `puntos.json` y modifica `public/puntos.json` en GitHub.
- Verifica autorizaciones y privacidad antes de publicar coordenadas precisas de domicilios.
