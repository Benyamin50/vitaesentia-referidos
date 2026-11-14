import test from 'node:test'
import assert from 'node:assert/strict'
import {
  claveCacheReferidos, leerCacheReferidos, guardarCacheReferidos,
  mezclarReferidos, idReferido, borrarCachesReferidos,
} from '../src/services/referidosCache.js'

function storage() {
  const datos = new Map()
  return {
    get length() { return datos.size },
    key: index => [...datos.keys()][index],
    getItem: key => datos.get(key) ?? null,
    setItem: (key, value) => datos.set(key, value),
    removeItem: key => datos.delete(key),
  }
}

test('mezcla IDs numéricos y de texto sin duplicados, preservando las ediciones locales', () => {
  const viejo = { id: 45, estado: 'Vendido', fecha_scan: '2026-11-10T10:00:00Z' }
  const resultado = mezclarReferidos([viejo], [
    { id: '45', estado: 'Contactado' },
    { id: 46, fecha_scan: '14/11/2026 10:00:00' },
    { id: '46' },
    { id: 47, fecha_scan: '2026-11-14T12:00:00-04:00' },
    { id: 48, fecha_scan: 'inválida' },
  ])
  assert.deepEqual(resultado.map(ref => ref.id), [47, 46, 45, 48])
  assert.equal(resultado[2].estado, 'Vendido')
  assert.equal(viejo.estado, 'Vendido')
})

test('datos y cursores sobreviven al montaje y no retroceden al borrar el ID mayor', () => {
  const local = storage(), clave = claveCacheReferidos(1, 'admin')
  guardarCacheReferidos(local, clave, { OWN: [{ id: 44 }] }, { OWN: 45 })
  assert.deepEqual(leerCacheReferidos(local, clave), {
    referidos: { OWN: [{ id: 44 }] }, ultimoIds: { OWN: 45 },
  })
  guardarCacheReferidos(local, clave, { OWN: [] }, { OWN: 45 })
  assert.equal(leerCacheReferidos(local, clave).ultimoIds.OWN, 45)
})

test('la caché separa usuarios, roles y colaboradores y omite tokens privados', () => {
  const local = storage(), clave = claveCacheReferidos(1, 'admin')
  guardarCacheReferidos(local, clave, {
    OWN: [{ id: 45, estado: 'Agendado', video_token: 'secreto', colaborador_id: 'LOGIN-CODE' }],
    'id:2': [{ id: 46, observaciones: 'Nota' }],
  }, { OWN: 45, 'id:2': 46 })
  assert.deepEqual(leerCacheReferidos(local, clave).referidos, {
    OWN: [{ id: 45, estado: 'Agendado' }], 'id:2': [{ id: 46, observaciones: 'Nota' }],
  })
  assert.deepEqual(leerCacheReferidos(local, claveCacheReferidos(2, 'admin')).referidos, {})
  assert.deepEqual(leerCacheReferidos(local, claveCacheReferidos(1, 'colaborador')).referidos, {})
  assert.ok(!local.getItem(clave).includes('secreto'))
})

test('cachés dañadas, obsoletas o con cursor incoherente vuelven a consultar desde cero', () => {
  const local = storage()
  for (const valor of ['mal JSON', 'null', '{"version":0}', JSON.stringify({
    version: 1, referidos: { OWN: [{ id: 45 }] }, ultimoIds: { OWN: 44 },
  })]) {
    local.setItem('cache', valor)
    assert.deepEqual(leerCacheReferidos(local, 'cache'), { referidos: {}, ultimoIds: {} })
  }
  local.setItem('cache', JSON.stringify({ version: 1,
    referidos: { OWN: [{ id: 'uuid' }], 'id:2': [{ id: 2 }] }, ultimoIds: { OWN: 45, 'id:2': 2 },
  }))
  assert.deepEqual(leerCacheReferidos(local, 'cache').referidos, { 'id:2': [{ id: 2 }] })
})

test('storage lleno o bloqueado no impide trabajar con el estado en memoria', () => {
  const bloqueado = { getItem() { throw new Error('Bloqueado') }, setItem() { throw new Error('QuotaExceededError') } }
  assert.equal(guardarCacheReferidos(bloqueado, 'cache', {}, {}), false)
  assert.deepEqual(leerCacheReferidos(bloqueado, 'cache'), { referidos: {}, ultimoIds: {} })
})

test('limpiar sesión elimina todas las cachés sin eliminar otras preferencias', () => {
  const local = storage()
  local.setItem(claveCacheReferidos(1, 'admin'), '{}')
  local.setItem(claveCacheReferidos(2, 'colaborador'), '{}')
  local.setItem('tema', 'claro')
  borrarCachesReferidos(local)
  assert.equal(local.length, 1)
  assert.equal(local.getItem('tema'), 'claro')
})

test('IDs que no son enteros positivos seguros se rechazan antes de avanzar el cursor', () => {
  for (const valor of ['uuid', -1, 0, '', null, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => idReferido(valor), /ID de referido/)
  }
  assert.equal(idReferido('45'), 45)
})
