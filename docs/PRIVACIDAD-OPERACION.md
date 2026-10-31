# DulceRuta — Operación responsable y privacidad

**Estado:** mejoras técnicas incorporadas; el aviso requiere completar los datos reales del responsable y revisión jurídica. No considerar esto una certificación de cumplimiento legal.

## Obligatorio antes de promocionar la web
1. En Cloudflare Pages > dulceruta > Settings > Variables and Secrets, entorno **Production**, crear estas tres variables de texto, que serán visibles en el aviso público:
   - `PRIVACY_RESPONSIBLE_NAME`: identidad o denominación real del responsable del tratamiento. No inventar.
   - `PRIVACY_RESPONSIBLE_ADDRESS`: domicilio válido del responsable para efectos legales. No usar el domicilio particular sin valorarlo con asesoría.
   - `PRIVACY_CONTACT_EMAIL`: cuenta de correo funcional y revisada regularmente para solicitudes de derechos ARCO y retiro.
   Después hacer un nuevo despliegue de Pages. Comprobar `/privacidad.html` y que la advertencia de datos faltantes desaparezca. El endpoint público `/api/aviso-config` muestra los datos configurados.
2. Revisar el texto del aviso con un profesional jurídico mexicano conforme a la LFPDPPP. Contener identidad/domicilio, datos, finalidades, límites, ARCO y cambios al aviso. Nunca afirmar cumplimiento legal completo sin esa revisión.
3. Comprobar que las viviendas tienen permiso verificable (no basta con la casilla) y que los puntos del mapa son exactos.
4. No publicar información personal ni ubicaciones de menores y no cargar archivos de solicitudes originales en repositorios públicos.

## Incidencias
- Público: /reportar.html, también accesible por «Reportar esta ubicación» en cada marcador.
- Los reportes se almacenan en D1, tabla `reportes` (creada en el primer uso). No publican nombres de denunciantes ni borran automáticamente domicilios.
- Administrador: /editor.html, bloque «Reportes de privacidad y seguridad». Revisar frecuentemente durante el evento.
- Si es una reclamación legítima de una persona responsable de la vivienda, pulsar «Retirar esta casa del mapa público» para guardar el cambio directamente en D1. Confirmar en el mapa público y después marcar el reporte atendido.
- Si se agota el límite de reportes, mantener operativo el contacto publicado en el aviso.
- La protección contra abuso es básica; aplicar rate limiting / Turnstile desde Cloudflare si el sitio recibe spam. No usar la casilla de consentimiento como única prueba de permiso.

## Fin de evento
- En el administrador existe «Retirar todas las ubicaciones públicas al terminar el evento», con confirmación doble.
- Hacerlo cuando terminen las entregas de Halloween; verificar que el mapa ya no muestre domicilios.
- Borrar de los dispositivos y WhatsApp los JSON personales cuando ya no sean necesarios, respetando obligaciones aplicables. Evitar almacenarlos indefinidamente.
- Las solicitudes de derechos ARCO deben atenderse por el correo del aviso. El reporte anónimo no sustituye el mecanismo formal de ARCO.
- Los datos de reportes atendidos siguen en D1 hasta su depuración. No se ha implementado un proceso automático de borrado. Hacer revisión periódica y no conservarlos innecesariamente.

## Límites
El documento ayuda a operar el evento y no constituye asesoramiento jurídico definitivo ni una garantía de seguridad.
