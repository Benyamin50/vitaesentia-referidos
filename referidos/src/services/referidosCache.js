const VERSION = 1
const PREFIX = 'referidos_user_'
const CAMPOS = [
  'id',
  'ip_address',
  'user_agent',
  'fecha_scan',
  'pais',
  'ciudad',
  'tipo_dispositivo',
  'sistema_operativo',
  'navegador',
  'referido_nombre',
  'referido_apellido',
  'referido_email',
  'referido_telefono',
  'formulario_completado',
  'acepto_datos',
  'estado',
  'observaciones',
]

export function idReferido(id) {
  if (!/^\d+$/.test(String(id))) throw new Error('ID de referido inválido.')
  const numero = Number(id)
  if (!Number.isSafeInteger(numero) || numero <= 0)
    throw new Error('ID de referido inválido.')
  return numero
}

export function claveCacheReferidos(usuario, rol) {
  return `${PREFIX}${encodeURIComponent(usuario)}_${encodeURIComponent(rol)}`
}

function fecha(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return -Infinity
  const texto = valor.trim()
  const local = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  const normalizada = local
    ? `${local[3]}-${local[2]}-${local[1]}T${local[4] || '00'}:${local[5] || '00'}:${local[6] || '00'}Z`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(texto)
      ? `${texto}Z`
      : texto
  const numero = Date.parse(normalizada)
  return Number.isNaN(numero) ? -Infinity : numero
}

export function mezclarReferidos(anteriores, nuevos) {
  const registros = new Map()
  for (const ref of [...anteriores, ...nuevos]) {
    const id = idReferido(ref.id)
    // Un registro ya cargado conserva sus ediciones o borradores locales.
    if (!registros.has(id)) registros.set(id, { ...ref, id })
  }
  return [...registros.values()].sort(
    (a, b) => fecha(b.fecha_scan) - fecha(a.fecha_scan),
  )
}

export function leerCacheReferidos(storage, clave) {
  const vacio = { referidos: {}, ultimoIds: {} }
  try {
    const cache = JSON.parse(storage.getItem(clave))
    if (cache?.version !== VERSION || !cache.referidos || !cache.ultimoIds)
      return vacio
    const resultado = { referidos: {}, ultimoIds: {} }
    for (const [grupo, lista] of Object.entries(cache.referidos)) {
      try {
        const cursor = cache.ultimoIds[grupo]
        if (
          !Array.isArray(lista) ||
          !Number.isSafeInteger(cursor) ||
          cursor < 0
        )
          continue
        const registros = mezclarReferidos(lista, [])
        if (registros.some((ref) => ref.id > cursor)) continue
        resultado.referidos[grupo] = registros
        resultado.ultimoIds[grupo] = cursor
      } catch {
        /* Una entrada dañada se vuelve a consultar desde 0. */
      }
    }
    return resultado
  } catch {
    return vacio
  }
}

export function guardarCacheReferidos(storage, clave, referidos, ultimoIds) {
  try {
    const limpios = Object.fromEntries(
      Object.entries(referidos).map(([grupo, lista]) => [
        grupo,
        lista.map((ref) =>
          Object.fromEntries(
            CAMPOS.filter((campo) => campo in ref).map((campo) => [
              campo,
              ref[campo],
            ]),
          ),
        ),
      ]),
    )
    // Datos y cursor se guardan juntos para no avanzar sin conservar las filas.
    storage.setItem(
      clave,
      JSON.stringify({ version: VERSION, referidos: limpios, ultimoIds }),
    )
    return true
  } catch {
    return false
  }
}

export function borrarCachesReferidos(storage) {
  try {
    for (let index = storage.length - 1; index >= 0; index--) {
      const clave = storage.key(index)
      if (clave?.startsWith(PREFIX)) storage.removeItem(clave)
    }
  } catch {
    /* El cierre de sesión también funciona si el storage no está disponible. */
  }
}
