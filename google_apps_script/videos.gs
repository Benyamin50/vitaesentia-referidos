// Añadir este archivo al proyecto de Apps Script existente.
// Integración con doGet/doPost: ver README.md en esta carpeta.

function videosLibro_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var libro = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!libro) throw new Error('Configura SPREADSHEET_ID en las propiedades del script');
  return libro;
}

function videosHoja_() {
  var hoja = videosLibro_().getSheetByName('videos');
  if (!hoja) throw new Error('Falta la pestaña videos');
  var headers = hoja.getRange(1, 1, 1, 4).getValues()[0];
  if (headers.join('|') !== 'id|titulo|url_youtube|orden') {
    throw new Error('La fila 1 de videos debe contener: id, titulo, url_youtube, orden');
  }
  return hoja;
}

function videosUrl_(valor) {
  if (typeof valor !== 'string' || valor.length > 2048) throw new Error('URL de YouTube inválida');
  var texto = valor.trim();
  if (texto.indexOf('://') < 0) texto = 'https://' + texto;
  var match = texto.match(/^https?:\/\/([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
  if (!match) throw new Error('URL de YouTube inválida');
  var host = match[1].toLowerCase();
  var path = (match[2] || '/').replace(/^\/+|\/+$/g, '');
  var partes = path.split('/');
  var videoId = '';
  if (['youtu.be', 'www.youtu.be'].indexOf(host) >= 0 && partes.length === 1) {
    videoId = partes[0];
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].indexOf(host) >= 0) {
    if (path === 'watch') {
      (match[3] || '').split('&').some(function (parametro) {
        var par = parametro.split('=');
        if (decodeURIComponent(par[0]) === 'v') {
          videoId = decodeURIComponent(par[1] || '');
          return true;
        }
        return false;
      });
    } else if (partes.length === 2 && ['embed', 'shorts', 'live'].indexOf(partes[0]) >= 0) {
      videoId = partes[1];
    }
  } else if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].indexOf(host) >= 0 && partes.length === 2 && partes[0] === 'embed') {
    videoId = partes[1];
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('URL de YouTube inválida');
  return 'https://www.youtube.com/watch?v=' + videoId;
}

function videosDatos_(data) {
  if (!data || typeof data.titulo !== 'string' || !data.titulo.trim() || data.titulo.trim().length > 200) {
    throw new Error('El título debe tener entre 1 y 200 caracteres');
  }
  if (typeof data.orden !== 'number' || !Number.isInteger(data.orden) || data.orden < 0 || data.orden > 2147483647) {
    throw new Error('El orden debe ser un entero entre 0 y 2147483647');
  }
  return { titulo: data.titulo.trim(), url_youtube: videosUrl_(data.url_youtube), orden: data.orden };
}

function videosFilas_(hoja) {
  return hoja.getLastRow() < 2 ? [] : hoja.getRange(2, 1, hoja.getLastRow() - 1, 4).getValues();
}

function videosError_(error) {
  return { success: false, error: error.message || 'No se pudo completar la operación', code: error.code || 'VIDEO_ERROR' };
}

function getVideos() {
  try {
    return videosFilas_(videosHoja_()).filter(function (fila) {
      return fila.some(function (valor) { return valor !== ''; });
    }).map(function (fila) {
      if (!fila[0]) throw new Error('Hay un video sin ID en la hoja');
      var datos = videosDatos_({ titulo: fila[1], url_youtube: fila[2], orden: fila[3] === '' ? 0 : fila[3] });
      return Object.assign({ id: String(fila[0]) }, datos);
    }).sort(function (a, b) {
      return a.orden - b.orden || a.id.localeCompare(b.id);
    });
  } catch (error) { return videosError_(error); }
}

function videosMutar_(data, operacion) {
  var secreto = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_EDIT_SECRET');
  if (!secreto || !data || typeof data.edit_secret !== 'string' || data.edit_secret !== secreto) {
    return { success: false, error: 'Operación no autorizada', code: 'FORBIDDEN' };
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var resultado = operacion(videosHoja_());
    SpreadsheetApp.flush();
    return resultado;
  } catch (error) { return videosError_(error); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}

function videosTexto_(titulo) {
  // Evita que un título que empieza por = se interprete como fórmula en Sheets.
  return /^[=+\-@]/.test(titulo) ? "'" + titulo : titulo;
}

function crearVideo(data) {
  return videosMutar_(data, function (hoja) {
    var datos = videosDatos_(data);
    var video = Object.assign({ id: Utilities.getUuid() }, datos);
    hoja.appendRow([video.id, videosTexto_(video.titulo), video.url_youtube, video.orden]);
    return { success: true, video: video };
  });
}

function videosFilaId_(hoja, id) {
  if (id === undefined || id === null || String(id) === '') throw new Error('ID requerido');
  var indice = videosFilas_(hoja).findIndex(function (fila) { return String(fila[0]) === String(id); });
  if (indice < 0) {
    var error = new Error('Video no encontrado');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return indice + 2;
}

function editarVideo(data) {
  return videosMutar_(data, function (hoja) {
    var datos = videosDatos_(data);
    var fila = videosFilaId_(hoja, data.id);
    var video = Object.assign({ id: String(data.id) }, datos);
    hoja.getRange(fila, 1, 1, 4).setValues([[video.id, videosTexto_(video.titulo), video.url_youtube, video.orden]]);
    return { success: true, video: video };
  });
}

function eliminarVideo(data) {
  return videosMutar_(data, function (hoja) {
    hoja.deleteRow(videosFilaId_(hoja, data.id));
    return { success: true, id: String(data.id) };
  });
}

function verificarTokenVideos(token) {
  try {
    if (typeof token !== 'string' || !token.trim() || token.length > 256) return { valido: false };
    var hoja = videosLibro_().getSheetByName('referidos');
    if (!hoja) throw new Error('Falta la pestaña referidos');
    var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    var columna = headers.indexOf('video_token');
    if (columna < 0) throw new Error('Falta la columna video_token');
    if (hoja.getLastRow() < 2) return { valido: false };
    var valido = hoja.getRange(2, columna + 1, hoja.getLastRow() - 1, 1).getValues().some(function (fila) {
      return String(fila[0]) === token;
    });
    return { valido: valido };
  } catch (error) { return videosError_(error); }
}

function videosSalida_(resultado) {
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}

function manejarVideosGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'getVideos') return videosSalida_(getVideos());
  if (action === 'verificarToken') return videosSalida_(verificarTokenVideos(e.parameter.token));
  return null;
}

function manejarVideosPost(data) {
  if (!data) return null;
  if (data.action === 'crearVideo') return videosSalida_(crearVideo(data));
  if (data.action === 'editarVideo') return videosSalida_(editarVideo(data));
  if (data.action === 'eliminarVideo') return videosSalida_(eliminarVideo(data));
  return null;
}
