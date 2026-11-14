# Contrato de registro idempotente de referidos

El formulario y Flask ya envían estos campos a la acción `registrarReferido`, además de los datos de contacto existentes:

- `submission_id`: identificador aleatorio del formulario, estable al reenviar o reintentar.
- `video_token`: token generado al abrir el formulario, también estable entre reintentos.
- `colaborador_id`: código de la invitación.

`submission_token` es el estado firmado que viaja entre el navegador y Flask; Apps Script no necesita recibirlo.

## Cambios que debe aplicar el administrador en Apps Script

1. Añadir una columna **submission_id** al final de `referidos`, conservando las columnas existentes y usando sus encabezados para encontrarlas.
2. En `registrarReferido`, adquirir `LockService.getScriptLock()` y mantener el bloqueo durante **la búsqueda y la escritura**.
3. Buscar el `submission_id` antes de insertar. Si ya existe, no añadir otra fila ni regenerar el token: devolver el token que ya está guardado. Si la misma clave llega con datos de contacto o colaborador diferentes, rechazarla en vez de modificar el registro anterior.
4. Si no existe, guardar una sola fila con `submission_id` y el `video_token` recibido. Ejecutar `SpreadsheetApp.flush()` antes de confirmar el éxito y liberar el bloqueo en `finally`.

Respuesta de éxito, tanto para un alta como para una repetición:

```json
{
  "success": true,
  "id": "ID_REAL_DEL_REFERIDO",
  "video_token": "TOKEN_GUARDADO_EN_LA_FILA",
  "duplicate": false
}
```

En la repetición, `duplicate` puede ser `true`; Flask exige `success: true` y usa el `video_token` devuelto para la redirección 303. Si una versión antigua no devuelve el token, Flask utiliza el token estable enviado por ese mismo formulario.

Respuesta de error:

```json
{"success": false, "error": "No se pudo registrar el referido"}
```

La protección contra solicitudes simultáneas en diferentes procesos o instancias de Render depende de publicar esta comprobación atómica en Apps Script. Flask no utiliza una caché de memoria que se pierda al reiniciar o que deje pasar duplicados entre instancias.

## Configuración y orden

- Flask firma el estado con `FORM_SIGNING_SECRET`, o con `APPS_SCRIPT_EDIT_SECRET` si la primera variable no existe. Debe mantenerse estable y ser igual en todas las instancias. No se expone al navegador.
- Los errores conservan los campos y ambos identificadores del formulario para reintentar con la misma clave.
- El panel y el PDF reciben los referidos ordenados por `fecha_scan`, de mayor a menor, sin depender de la posición física de la fila en Sheets.
- Preferir fechas ISO 8601 con zona, por ejemplo `2026-11-14T12:30:00.000Z`. También se aceptan fechas `dd/mm/aaaa`; las fechas sin zona se interpretan como UTC. Las ausentes o inválidas quedan al final y los empates conservan el orden original.
