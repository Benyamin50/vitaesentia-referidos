# Integración del catálogo de videos

El Apps Script actual no está en este repositorio. Este módulo se añade al proyecto existente; conserva las acciones de colaboradores y referidos.

1. En el mismo spreadsheet, crea la pestaña **videos** con estos encabezados exactos en la fila 1:

   | A1 | B1 | C1 | D1 |
   | --- | --- | --- | --- |
   | id | titulo | url_youtube | orden |

   El administrador añade los registros desde el panel. Apps Script genera los IDs y el orden empieza en 0.

2. En Apps Script, añade un archivo `videos.gs` y copia el contenido de [videos.gs](videos.gs).

3. En Configuración del proyecto → Propiedades del script, conserva **APPS_SCRIPT_EDIT_SECRET** con el mismo valor que la variable de entorno de Render. Nunca lo copies a React. Configura **SPREADSHEET_ID** con el ID del spreadsheet existente (la parte entre `/d/` y `/edit` en su URL). Si el script está vinculado al spreadsheet y ya puede obtenerlo con `getActiveSpreadsheet()`, esa propiedad es opcional.

4. Inserta estas líneas al **principio del `doGet(e)` existente**, antes de procesar las otras acciones:

   ```javascript
   var respuestaVideos = manejarVideosGet(e);
   if (respuestaVideos !== null) return respuestaVideos;
   ```

5. En el **`doPost(e)` existente**, inmediatamente después de convertir el JSON de `e.postData.contents` a un objeto, inserta:

   ```javascript
   // Usa el nombre de tu objeto JSON existente; en este ejemplo se llama data.
   var respuestaVideos = manejarVideosPost(data);
   if (respuestaVideos !== null) return respuestaVideos;
   ```

   Si tu objeto se llama `datos`, usa `manejarVideosPost(datos)`. Mantén el manejo de errores JSON y el resto del enrutamiento actual. No crees un segundo `doGet` ni `doPost`.

6. Actualiza la implementación de Apps Script a una **nueva versión**. Si creas una implementación con otra URL `/exec`, actualiza `APPS_SCRIPT_URL` en Render. Despliega también el backend y el frontend.

## Contrato

- GET `action=getVideos`: lista ordenada de `{id, titulo, url_youtube, orden}`.
- POST `action=crearVideo`: `titulo`, `url_youtube`, `orden`, `edit_secret`.
- POST `action=editarVideo`: los campos anteriores más `id`.
- POST `action=eliminarVideo`: `id`, `edit_secret`.
- Crear/editar devuelve `{success: true, video: {...}}`; eliminar devuelve `{success: true, id: ...}`.
- GET `action=verificarToken&token=...`: comprueba una coincidencia exacta en la columna `video_token` de `referidos`. No añade vencimiento a los enlaces existentes. Borrar ese referido o su token revoca el acceso.
- GET `/videos` en Flask requiere una sesión válida o la cabecera `X-Video-Token`. POST/PUT/DELETE requieren rol administrador y envían el secreto a Apps Script desde Flask.

El módulo valida dominios de YouTube, genera una URL canónica y usa un bloqueo para las escrituras. El reproductor admite videos que permitan reproducción incrustada; los videos privados o con restricciones de inserción pueden ser rechazados por YouTube. Utiliza videos públicos o no listados que tengan habilitada la inserción.

Referencias: [reproductores incrustados de YouTube](https://developers.google.com/youtube/player_parameters), [web apps de Apps Script](https://developers.google.com/apps-script/guides/web), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service).
