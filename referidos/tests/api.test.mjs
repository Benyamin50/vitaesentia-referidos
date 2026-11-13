import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// El servicio solo usa JavaScript; lo cargamos sin configurar un compilador JSX.
const source = await readFile(new URL('../src/services/api.jsx', import.meta.url))
const { api } = await import(`data:text/javascript;base64,${source.toString('base64')}`)
let calls

beforeEach(() => {
  calls = []
  globalThis.localStorage = { getItem: () => 'ADMIN', removeItem() {} }
  globalThis.fetch = async () => { throw new Error('Las pruebas no deben llamar al servidor') }
})

function respond(body, status = 200) {
  globalThis.fetch = async (...args) => {
    calls.push(args)
    return new Response(JSON.stringify(body), { status })
  }
}

test('crear devuelve la identidad real sin hacer otra consulta', async () => {
  respond({ success: true, id: 18, codigo_unico: 'SHEETS-CODE', nombre: 'Nueva' })
  const result = await api.crearColaborador({ nombre: 'Nueva', email: 'n@example.com' })
  assert.equal(result.id, 18)
  assert.equal(result.codigo_unico, 'SHEETS-CODE')
  assert.equal(calls.length, 1)
  assert.equal(calls[0][1].method, 'POST')
  assert.equal(calls[0][1].headers.Authorization, 'Bearer ADMIN')
})

test('crear normaliza un registro anidado con codigo', async () => {
  respond({ colaborador: { id: 18, codigo: 'REAL' } })
  assert.equal((await api.crearColaborador({})).codigo_unico, 'REAL')
})

test('crear rechaza una respuesta sin identidad persistida', async () => {
  respond({ success: true, codigo_unico: 'SIN-ID' })
  await assert.rejects(api.crearColaborador({}), /ID y código/)
  assert.equal(calls.length, 1)
})

test('un error de negocio con HTTP 200 rechaza el guardado para activar la reversion', async () => {
  respond({ success: false, error: 'No guardado' })
  await assert.rejects(api.editarReferido(10, { estado: 'Vendido', observaciones: '' }), /No guardado/)
})

test('los errores HTTP conservan el mensaje para explicar la reversion', async () => {
  respond({ error: 'Sin permiso' }, 403)
  await assert.rejects(api.eliminarColaborador(18), /Sin permiso/)
})

test('editar y eliminar no recargan las listas', async () => {
  respond({ success: true })
  await api.editarReferido(10, { estado: 'Contactado', observaciones: 'Llamar' })
  await api.editarColaborador(18, { nombre: 'Actualizado', email: 'n@example.com' })
  await api.eliminarColaborador(18)
  assert.deepEqual(calls.map(([, options]) => options.method), ['PUT', 'PUT', 'DELETE'])
})

test('una lista invalida se rechaza antes de reemplazar los datos locales', async () => {
  respond({ success: true })
  await assert.rejects(api.getColaboradores(), /Lista de colaboradores/)
  await assert.rejects(api.getReferidos('OWN'), /Lista de referidos/)
  await assert.rejects(api.getReferidosPorId(2), /Lista de referidos/)
})
