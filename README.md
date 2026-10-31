# DulceRuta — GitHub Pages

PWA para que las familias de **El Rosario, Sinaloa**, encuentren los lugares donde regalan dulces y reciban rutas peatonales.

Este proyecto está **preparado para GitHub Pages**. Incluye mapa público, registro de casas/locales, generación de solicitudes JSON, instrucciones de WhatsApp, editor de importación múltiple con revisión, exportación consolidada, GPS, PWA y publicación con GitHub Actions.

> **Repositorio:** https://github.com/luisrendonsanz/dulceruta. El mapa incluye la ubicación autorizada «Casa Itzel»; los datos personales de la solicitante no se publican.

## 1. Publicación inicial en GitHub Pages

1. En GitHub, ve a **New repository** (`https://github.com/new`). Elige el nombre `dulceruta`, marca el repositorio como **Public** y no agregues README, `.gitignore` ni licencia desde GitHub (ya vienen en la carpeta).
2. Descomprime `DulceRuta_GitHub_Pages.zip` en tu computadora y abre esa carpeta desde VS Code.
3. En la terminal de esa carpeta ejecuta:

   ```bash
   npm install
   npm test
   npm run build
   git init
   git branch -M main
   git add .
   git commit -m "Publicar DulceRuta"
   git remote add origin https://github.com/luisrendonsanz/dulceruta.git
   git push -u origin main
   ```

   Cambia `luisrendonsanz` por tu usuario real de GitHub. Si Git solicita autenticación, usa la sesión/autorización oficial de GitHub o GitHub Desktop. No pegues tokens en el código ni en este chat.
4. En tu repositorio, abre **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Abre la pestaña **Actions** y comprueba que el flujo `Publicar DulceRuta en GitHub Pages` termina correctamente. El enlace aparecerá en Settings → Pages. Normalmente será `https://luisrendonsanz.github.io/dulceruta/`.

**GitHub Pages no acepta PHP, Java, Node backend ni una base de datos en su hosting estático.** El proyecto se diseñó sin backend.

Si el nombre del repo es distinto de `dulceruta`, no hace falta editar las rutas: el workflow calcula la base de Vite automáticamente. Para un repositorio `luisrendonsanz.github.io`, usa `/`.

## 2. Cómo se registran los participantes

Comparte la URL `https://luisrendonsanz.github.io/dulceruta/registro.html`:

1. Escriben nombre y apellido (datos solo para ti).
2. Eligen casa o local, nombre público, referencia y horario.
3. Acercan el mapa y **tocan exactamente su casa o local**. Pueden arrastrar el marcador.
4. Confirman que tienen autorización para registrar el lugar.
5. Tocan **Descargar mi archivo JSON**.
6. Abren tu conversación de WhatsApp, adjuntan el `.json` **como documento** y te lo envían. También pueden usar Compartir archivo en los teléfonos compatibles.

La web **no envía el archivo a un WhatsApp específico** porque no hay un número configurado y el sistema no tiene backend. No guarda nombres y apellidos en el sitio.

## 3. Cómo importar 1, 10 o 100 JSON y publicar puntos sin usar ChatGPT

1. Abre `https://luisrendonsanz.github.io/dulceruta/editor.html`.
2. Pulsa **Seleccionar archivos JSON** y elige hasta 100 archivos de solicitudes recibidos.
3. Revisa cada nombre público, coordenadas, tipo, referencia y solicitante. Confirma la autorización por un medio confiable antes de hacer pública una vivienda.
4. Marca los aprobados (o usa Seleccionar todas) y pulsa **Agregar seleccionadas al borrador**.
5. Si quieres, agrega/edita puntos manuales y revisa el mapa.
6. Pulsa **Descargar puntos.json**. Se genera una **lista consolidada**, con solo los campos públicos permitidos.
7. Abre el repositorio GitHub → `public/puntos.json` → botón **Edit this file (✎)**. Abre el archivo descargado en un editor de texto, **copia todo el contenido** y reemplaza el contenido del archivo de GitHub.
8. Pulsa **Commit changes** en la rama `main`. **GitHub Actions recompilará y publicará el nuevo mapa automáticamente**.

También puedes reemplazar `public/puntos.json` en tu proyecto local y hacer `git add public/puntos.json && git commit -m "Actualizar puntos" && git push`.

**No subas los JSON individuales recibidos por WhatsApp a un repositorio público**: contienen nombre y apellido. Solo sube `public/puntos.json` exportado desde el editor.

### Importante: permisos de administrador

La ruta `/editor.html` es pública porque GitHub Pages no tiene autenticación de servidor. Cualquier visitante puede importar archivos en **su propio navegador**, pero **NO puede cambiar tu sitio publicado** sin permisos de escritura en el repositorio GitHub. No agregues una contraseña en JavaScript ni un token de GitHub al frontend: sería inseguro.

El borrador se guarda en el `localStorage` del dispositivo. Para no perder los puntos, descarga `puntos.json` periódicamente. El borrador **no** se sincroniza entre celulares o computadoras.

## 4. Datos, privacidad y seguridad

- Los datos del participante son solo para la solicitud privada; el editor **descarta propiedades extra** de los puntos cuando importa o exporta.
- `puntos.json` se valida en cada publicación mediante GitHub Actions; se rechazan campos ajenos al esquema y coordenadas inválidas.
- Se detectan duplicados por ID o mismo nombre cercano, pero el organizador siempre debe revisar.
- Publicar la coordenada precisa de una vivienda puede afectar su privacidad. Verifica la autorización real y ofrece una forma de retirar ubicaciones, no solo la casilla del formulario. **GitHub conserva versiones anteriores del archivo en su historial público**: eliminar un punto de `puntos.json` no elimina automáticamente su presencia histórica en commits; evita publicar información que luego deba ser confidencial.
- No se publica en automático después de enviar un WhatsApp.
- La geolocalización de las familias solo se solicita cuando tocan «Mi ubicación»; no se almacena en el servidor.
- Los mapas y Google Maps requieren conexión a internet. **Offline no implica mapas ni rutas offline**.
- El proyecto usa las teselas públicas de OpenStreetMap: respeta sus límites de uso y considera otro proveedor si la audiencia crece.
- La búsqueda de direcciones del editor usa Photon (servicio externo). El servicio puede ser limitado, lento o impreciso. También se puede marcar un punto manualmente.
- Se recomienda agregar un aviso de privacidad con identidad y contacto del responsable antes de un lanzamiento público. La pantalla actual contiene consentimiento básico, no una política jurídica completa.

## 5. Desarrollo local

Requiere Node.js 22+:

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Puedes probar el sitio en `http://localhost:5173/` con `registro.html` y `editor.html`. El GPS en dispositivos reales requiere HTTPS, que GitHub Pages proporciona.

## 6. Estructura

```text
index.html                 Mapa público
registro.html              Formulario y JSON individual
editor.html                Editor, importación masiva, revisión y exportación
src/main.ts                Pantalla pública y ubicación del usuario
src/registro.ts            Registro de participante
src/editor.ts              Importador y administración local
src/data.ts                Validadores de entradas y separación de datos privados
public/puntos.json         ÚNICO archivo de puntos que debe publicarse
public/sw.js               Service worker PWA
public/manifest.webmanifest Manifiesto PWA
.github/workflows/deploy.yml  Compilación y despliegue automático
scripts/validate-public-json.mjs Validación de publicación
```

## 7. Limitación del despliegue

Para activar la publicación, entra a Settings → Pages y selecciona GitHub Actions. Comprueba la pestaña Actions y su resultado.

El paquete incluye el código fuente y el workflow. Si la dependencia npm no está instalada o no hay acceso a la red durante la comprobación local, GitHub Actions la instalará cuando hagas push.
