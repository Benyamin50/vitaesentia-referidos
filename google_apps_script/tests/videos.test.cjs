const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const source = fs.readFileSync(path.join(__dirname, '../videos.gs'), 'utf8')

function setup() {
  const events = []
  function sheet(rows) {
    return {
      rows,
      getLastRow: () => rows.length,
      getLastColumn: () => rows[0].length,
      getRange: (row, col, height, width) => ({
        getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(col - 1, col - 1 + width)),
        setValues: values => { events.push('write'); rows[row - 1] = [...values[0]] },
      }),
      appendRow: row => { events.push('write'); rows.push([...row]) },
      deleteRow: row => { events.push('write'); rows.splice(row - 1, 1) },
    }
  }
  const videos = sheet([['id', 'titulo', 'url_youtube', 'orden']])
  const referidos = sheet([['id', 'video_token'], [1, 'real-token']])
  let held = false
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'APPS_SCRIPT_EDIT_SECRET' ? 'test-secret' : 'spreadsheet' }) },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: name => ({ videos, referidos })[name] }),
      flush: () => events.push('flush'),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => { held = true; events.push('lock') }, hasLock: () => held, releaseLock: () => { held = false; events.push('release') } }) },
    Utilities: { getUuid: () => 'saved-id' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this } }) },
  })
  vm.runInContext(source, context)
  const payload = { titulo: 'Presentación', url_youtube: 'https://youtu.be/dQw4w9WgXcQ', orden: 2, edit_secret: 'test-secret' }
  return { context, videos, referidos, payload, events }
}

test('las tres mutaciones rechazan un secreto ausente o incorrecto antes de escribir', () => {
  const { context, payload, events } = setup()
  for (const method of ['crearVideo', 'editarVideo', 'eliminarVideo']) {
    assert.equal(context[method]({ ...payload, edit_secret: 'incorrecto' }).code, 'FORBIDDEN')
    assert.equal(context[method]({}).success, false)
  }
  assert.equal(events.length, 0)
})

test('crear, editar y eliminar devuelven la identidad persistida con bloqueo y flush', () => {
  const { context, payload, videos, events } = setup()
  const created = context.crearVideo(payload)
  assert.equal(created.video.id, 'saved-id')
  assert.equal(videos.rows[1][2], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.equal(context.editarVideo({ ...payload, id: 'saved-id', orden: 0, titulo: 'Actualizado' }).video.orden, 0)
  assert.equal(context.getVideos()[0].titulo, 'Actualizado')
  assert.equal(context.eliminarVideo({ id: 'saved-id', edit_secret: 'test-secret' }).success, true)
  assert.equal(context.getVideos().length, 0)
  assert.deepEqual(events, ['lock', 'write', 'flush', 'release', 'lock', 'write', 'flush', 'release', 'lock', 'write', 'flush', 'release'])
})

test('getVideos ordena un catálogo vacío o poblado por orden numérico', () => {
  const { context, payload, videos } = setup()
  assert.equal(context.getVideos().length, 0)
  videos.rows.push(['a', 'Primero', payload.url_youtube, 1], ['b', 'Antes', payload.url_youtube, 0])
  assert.equal(context.getVideos()[0].id, 'b')
})

test('ID inexistente no elimina otra fila y libera el bloqueo', () => {
  const { context, events } = setup()
  assert.equal(context.eliminarVideo({ id: 'missing', edit_secret: 'test-secret' }).code, 'NOT_FOUND')
  assert.deepEqual(events, ['lock', 'release'])
})

test('rechaza URLs ajenas y orden inválido sin escribir', () => {
  const { context, payload, events } = setup()
  assert.equal(context.crearVideo({ ...payload, url_youtube: 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ' }).success, false)
  assert.equal(context.crearVideo({ ...payload, orden: -1 }).success, false)
  assert.equal(events.includes('write'), false)
})

test('un título con fórmula se guarda como texto', () => {
  const { context, payload, videos } = setup()
  context.crearVideo({ ...payload, titulo: '=IMPORTXML("url")' })
  assert.equal(videos.rows[1][1].startsWith("'="), true)
})

test('el token coincide exactamente con Sheets y no vence por el paso del tiempo', () => {
  const { context, referidos } = setup()
  assert.equal(context.verificarTokenVideos('real-token').valido, true)
  assert.equal(context.verificarTokenVideos('inventado').valido, false)
  assert.equal(context.verificarTokenVideos('').valido, false)
  referidos.rows.splice(1, 1)
  assert.equal(context.verificarTokenVideos('real-token').valido, false)
})

test('los despachadores manejan las acciones nuevas y dejan pasar las existentes', () => {
  const { context, payload } = setup()
  assert.equal(context.manejarVideosGet({ parameter: { action: 'getColaboradores' } }), null)
  assert.equal(context.manejarVideosPost({ action: 'editarReferido' }), null)
  const created = JSON.parse(context.manejarVideosPost({ ...payload, action: 'crearVideo' }).text)
  assert.equal(created.video.id, 'saved-id')
  const list = JSON.parse(context.manejarVideosGet({ parameter: { action: 'getVideos' } }).text)
  assert.equal(list.length, 1)
  assert.equal(JSON.parse(context.manejarVideosGet({ parameter: { action: 'verificarToken', token: 'real-token' } }).text).valido, true)
})
