import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import html2pdf from 'html2pdf.js'
import logoVitaesentia from '../../assets/vitaesentia-logo.png'
import GestionVideos from '../GestionVideos/GestionVideos'
import './TablaColaboradores.css'

const dashboardIcons = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  referrals:
    'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 21v-2a7 7 0 0 1 14 0v2 M18 10h5 M20.5 7.5v5',
  calendar: 'M4 5h16v16H4z M16 3v4 M8 3v4 M4 11h16 M8 15h2 M14 15h2',
  plus: 'M12 5v14 M5 12h14',
  download: 'M12 3v12 M7 10l5 5 5-5 M5 16v5h14v-5',
  logout: 'M9 21H4V3h5 M9 12h12 M17 8l4 4-4 4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M6 18L18 6',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2 M7 21v-8h10v8 M7 3v5h8V3',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  refresh:
    'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 2 M4 17l2 2a7 7 0 0 0 12-2',
  video: 'M3 5h18v14H3z M10 9l5 3-5 3z',
}

function DashboardIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dashboardIcons[name] || dashboardIcons.dashboard} />
    </svg>
  )
}

export default function TablaColaboradores() {
  const navigate = useNavigate()

  const [colaboradores, setColaboradores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showReferidos, setShowReferidos] = useState(null)
  const [referidos, setReferidos] = useState({})
  const [guardandoReferidos, setGuardandoReferidos] = useState({})
  const [cargandoReferidos, setCargandoReferidos] = useState({})
  const [erroresReferidos, setErroresReferidos] = useState({})
  const [nuevoColab, setNuevoColab] = useState({ nombre: '', email: '' })
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({ nombre: '', email: '' })
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [seccionActiva, setSeccionActiva] = useState('resumen')
  const [modalColaboradorAbierto, setModalColaboradorAbierto] = useState(false)
  const [creandoColaborador, setCreandoColaborador] = useState(false)
  const [errorNuevoColab, setErrorNuevoColab] = useState('')
  const [actualizandoDatos, setActualizandoDatos] = useState(false)
  const [operacionesPendientes, setOperacionesPendientes] = useState(0)
  const [guardandoColaboradores, setGuardandoColaboradores] = useState({})
  const [mensajesReferidos, setMensajesReferidos] = useState({})
  const [videosOcupados, setVideosOcupados] = useState(false)
  const [revisionVideos, setRevisionVideos] = useState(0)
  const crearDialogRef = useRef(null)
  const operacionesRef = useRef(new Set())
  const actualizandoRef = useRef(false)
  const referidosConfirmadosRef = useRef(new Map())
  const cambiosPendientesRef = useRef(new Map())
  const versionesReferidosRef = useRef(new Map())
  const cargaInicialRef = useRef(null)

  const colaboradorNombre =
    localStorage.getItem('colaborador_nombre') || 'Colaborador'
  const colaboradorCodigo = localStorage.getItem('colaborador_codigo') || ''
  const colaboradorRol =
    localStorage.getItem('colaborador_rol') || 'colaborador'
  const esAdmin = colaboradorRol === 'admin'
  const totalReferidos = colaboradores.reduce((total, colab) => {
    const cantidad = Number(colab.total_referidos)
    return total + (Number.isFinite(cantidad) ? cantidad : 0)
  }, 0)
  const colaboradoresConReferidos = colaboradores.filter(
    (colab) => Number(colab.total_referidos) > 0,
  )
  const colaboradoresDestacados = [...colaboradoresConReferidos]
    .sort((a, b) => Number(b.total_referidos) - Number(a.total_referidos))
    .slice(0, 3)
  const colaboradoresOrdenados = [...colaboradores].sort(
    (a, b) =>
      (Number(b.total_referidos) || 0) - (Number(a.total_referidos) || 0) ||
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'),
  )
  const codigoReferidosActivo =
    seccionActiva === 'mis-referidos' ? colaboradorCodigo : showReferidos
  const colaboradorEnDetalle = colaboradores.find(
    (colab) =>
      colab.codigo_unico === codigoReferidosActivo ||
      `id:${colab.id}` === codigoReferidosActivo,
  )
  const tituloSeccion = {
    resumen: 'Resumen',
    colaboradores: 'Colaboradores',
    'mis-referidos': 'Mis Referidos',
    detalle: 'Detalle del colaborador',
    videos: 'Videos',
  }[seccionActiva]

  const cambiarSeccion = (seccion) => {
    if (seccion === 'mis-referidos') {
      setShowReferidos(colaboradorCodigo)
      if (!referidos[colaboradorCodigo]) cargarReferidos(colaboradorCodigo)
    }
    setSeccionActiva(seccion)
    setMenuAbierto(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const inicialesUsuario = colaboradorNombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((nombre) => nombre[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    if (!menuAbierto) return
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuAbierto(false)
        document.getElementById('dashboard-menu-trigger')?.focus()
      }
    }
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.body.style.overflow = overflowAnterior
      window.removeEventListener('keydown', cerrarConEscape)
    }
  }, [menuAbierto])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const cargarColaboradores = async () => {
    setError(null)
    try {
      const solicitud = cargaInicialRef.current || api.getColaboradores()
      cargaInicialRef.current = solicitud
      const data = await solicitud
      setColaboradores(data)
    } catch (err) {
      setError(err.message)
    } finally {
      cargaInicialRef.current = null
      setLoading(false)
    }
  }

  const iniciarOperacion = (clave) => {
    if (actualizandoRef.current || operacionesRef.current.has(clave))
      return false
    operacionesRef.current.add(clave)
    setOperacionesPendientes(operacionesRef.current.size)
    return true
  }

  const finalizarOperacion = (clave) => {
    operacionesRef.current.delete(clave)
    setOperacionesPendientes(operacionesRef.current.size)
  }

  const leerReferidos = (codigo) =>
    codigo.startsWith('id:')
      ? api.getReferidosPorId(codigo.slice(3))
      : api.getReferidos(codigo)

  const datosGestion = (ref) => ({
    estado: ref.estado || '',
    observaciones: ref.observaciones || '',
  })

  const actualizarDatos = async () => {
    if (
      !esAdmin ||
      actualizandoRef.current ||
      videosOcupados ||
      operacionesRef.current.size ||
      Object.values(cargandoReferidos).some(Boolean)
    )
      return
    actualizandoRef.current = true
    setActualizandoDatos(true)
    try {
      const nuevosColaboradores = await api.getColaboradores()
      const clavesValidas = new Set([
        colaboradorCodigo,
        ...nuevosColaboradores.flatMap((colab) => [
          colab.codigo_unico,
          `id:${colab.id}`,
        ]),
      ])
      // Primero comprobamos el directorio por si alguien elimino un colaborador.
      const claves = [
        ...new Set([
          ...Object.keys(referidos),
          ...Object.keys(erroresReferidos),
          ...(['detalle', 'mis-referidos'].includes(seccionActiva) &&
          codigoReferidosActivo
            ? [codigoReferidosActivo]
            : []),
        ]),
      ].filter((codigo) => clavesValidas.has(codigo))
      const listasValidas = await Promise.all(
        claves.map(async (codigo) => [codigo, await leerReferidos(codigo)]),
      )
      for (const [, lista] of listasValidas) {
        for (const ref of lista) {
          referidosConfirmadosRef.current.set(String(ref.id), datosGestion(ref))
        }
      }
      setColaboradores(nuevosColaboradores)
      setReferidos((prev) => ({
        ...Object.fromEntries(
          Object.entries(prev).filter(([codigo]) => clavesValidas.has(codigo)),
        ),
        ...Object.fromEntries(listasValidas),
      }))
      setErroresReferidos((prev) => {
        const errores = { ...prev }
        for (const [codigo] of listasValidas) delete errores[codigo]
        return errores
      })
      setMensajesReferidos({})
      setRevisionVideos((revision) => revision + 1)
      if (seccionActiva === 'detalle' && !clavesValidas.has(showReferidos)) {
        setShowReferidos(null)
        setSeccionActiva('colaboradores')
      }
    } catch (err) {
      alert('No se pudieron actualizar los datos: ' + err.message)
    } finally {
      actualizandoRef.current = false
      setActualizandoDatos(false)
    }
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible'
    try {
      const date = new Date(fecha)
      if (isNaN(date.getTime())) return fecha
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return fecha
    }
  }

  const exportarPDF = async () => {
    try {
      // Usamos el código del colaborador logueado
      const data = await api.getReferidos(colaboradorCodigo)

      if (!data || data.length === 0) {
        alert('No hay referidos para exportar')
        return
      }

      let tablaFilas = ''
      data.forEach((ref, index) => {
        tablaFilas += `
          <tr>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px; text-align: center;">${index + 1}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${formatearFecha(ref.fecha_scan)}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.ip_address || 'No registrada'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.pais || 'No disponible'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.ciudad || 'No disponible'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.referido_nombre || '-'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.referido_apellido || '-'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.referido_email || '-'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.referido_telefono || '-'}</td>
            <td style="border-bottom: 1px solid #E2E8F0; padding: 10px;">${ref.sistema_operativo || '?'}/${ref.navegador || '?'}</td>
          </tr>
        `
      })

      const contenidoHTML = `
        <div id="reporte-pdf" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; background-color: #FFFFFF; color: #0F172A;">
          <div style="text-align: left; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #0056B3; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Reporte de Referidos</h1>
            <p style="margin: 5px 0 0 0; color: #64748B; font-size: 13px;">VITAESENTIA</p>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; border-left: 3px solid #0056B3; margin-bottom: 30px; border-radius: 4px;">
            <p style="margin: 5px 0; font-size: 13px; color: #334155;"><strong>Colaborador:</strong> ${colaboradorNombre}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #334155;"><strong>Código:</strong> ${colaboradorCodigo}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #334155;"><strong>Rol:</strong> ${esAdmin ? 'Administrador' : 'Colaborador'}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #334155;"><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #334155;"><strong>Total:</strong> ${data.length} registros</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="text-align: left; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; background-color: #F8FAFC;">
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">#</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Fecha</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">IP</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">País</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Ciudad</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Nombre</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Apellido</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Email</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Teléfono</th>
                <th style="border-bottom: 2px solid #E2E8F0; padding: 12px 10px;">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              ${tablaFilas}
            </tbody>
          </table>
          
          <div style="text-align: left; margin-top: 50px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 20px;">
            <p style="margin: 0;">igrafic360 - Sistema de Referidos Oficial</p>
          </div>
        </div>
      `

      const element = document.createElement('div')
      element.innerHTML = contenidoHTML
      document.body.appendChild(element)

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `referidos_${colaboradorNombre}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
      }

      await html2pdf().set(opt).from(element).save()
      document.body.removeChild(element)
    } catch (err) {
      console.error('Error en PDF:', err)
      alert('Error al generar PDF: ' + err.message)
    }
  }

  const crearColaborador = async (e) => {
    e.preventDefault()
    if (!esAdmin || creandoColaborador) return
    const nombre = nuevoColab.nombre.trim()
    const email = nuevoColab.email.trim()
    if (!nombre || !email) {
      setErrorNuevoColab('Completa el nombre y el correo del colaborador.')
      return
    }
    if (!iniciarOperacion('crear-colaborador')) return
    const idTemporal = `temporal-${crypto.randomUUID()}`
    const temporal = {
      id: idTemporal,
      nombre,
      email,
      total_referidos: 0,
      rol: 'colaborador',
      pendiente: true,
    }
    setColaboradores((prev) => [...prev, temporal])
    setModalColaboradorAbierto(false)
    setNuevoColab({ nombre: '', email: '' })
    setCreandoColaborador(true)
    setErrorNuevoColab('')
    try {
      const creado = await api.crearColaborador({ nombre, email })
      setColaboradores((prev) =>
        prev.map((colab) =>
          colab.id === idTemporal
            ? { ...temporal, ...creado, pendiente: false }
            : colab,
        ),
      )
    } catch (err) {
      setColaboradores((prev) =>
        prev.filter((colab) => colab.id !== idTemporal),
      )
      setNuevoColab({ nombre, email })
      setErrorNuevoColab(err.message || 'No se pudo crear el colaborador.')
      setModalColaboradorAbierto(true)
    } finally {
      setCreandoColaborador(false)
      finalizarOperacion('crear-colaborador')
    }
  }

  const abrirModalColaborador = () => {
    if (!esAdmin) return
    setNuevoColab({ nombre: '', email: '' })
    setErrorNuevoColab('')
    setModalColaboradorAbierto(true)
  }

  const cerrarModalColaborador = () => {
    if (!creandoColaborador) setModalColaboradorAbierto(false)
  }

  useEffect(() => {
    const dialog = crearDialogRef.current
    if (!dialog) return
    if (modalColaboradorAbierto && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('input')?.focus()
    } else if (!modalColaboradorAbierto && dialog.open) {
      dialog.close()
    }
    if (!modalColaboradorAbierto) return
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAnterior
    }
  }, [modalColaboradorAbierto])

  const eliminarColaborador = async (id, nombre) => {
    if (!esAdmin) {
      alert('No tienes permisos para eliminar colaboradores')
      return
    }
    if (
      window.confirm(
        `¿Eliminar a "${nombre}"? Se perderán todos sus referidos.`,
      )
    ) {
      const indice = colaboradores.findIndex((colab) => colab.id === id)
      const eliminado = colaboradores[indice]
      const clave = `colaborador:${id}`
      if (!eliminado || eliminado.pendiente || !iniciarOperacion(clave)) return
      setColaboradores((prev) => prev.filter((colab) => colab.id !== id))
      try {
        await api.eliminarColaborador(id)
        setReferidos((prev) => {
          const siguiente = { ...prev }
          delete siguiente[eliminado.codigo_unico]
          delete siguiente[`id:${id}`]
          return siguiente
        })
      } catch (err) {
        setColaboradores((prev) => {
          if (prev.some((colab) => colab.id === id)) return prev
          const siguiente = [...prev]
          siguiente.splice(Math.min(indice, siguiente.length), 0, eliminado)
          return siguiente
        })
        alert('Error al eliminar: ' + err.message)
      } finally {
        finalizarOperacion(clave)
      }
    }
  }

  const editarColaborador = (colab) => {
    if (!esAdmin) {
      alert('No tienes permisos para editar colaboradores')
      return
    }
    setEditando(colab.id)
    setEditForm({ nombre: colab.nombre, email: colab.email })
  }

  const guardarEdicion = async (id) => {
    const anterior = colaboradores.find((colab) => colab.id === id)
    const clave = `colaborador:${id}`
    if (!esAdmin || !anterior || anterior.pendiente || !iniciarOperacion(clave))
      return
    const cambios = {
      nombre: editForm.nombre.trim(),
      email: editForm.email.trim(),
    }
    setGuardandoColaboradores((prev) => ({ ...prev, [id]: true }))
    setColaboradores((prev) =>
      prev.map((colab) => (colab.id === id ? { ...colab, ...cambios } : colab)),
    )
    setEditando(null)
    try {
      await api.editarColaborador(id, cambios)
    } catch (err) {
      setColaboradores((prev) =>
        prev.map((colab) =>
          colab.id === id
            ? { ...colab, nombre: anterior.nombre, email: anterior.email }
            : colab,
        ),
      )
      alert('Error al editar: ' + err.message)
    } finally {
      setGuardandoColaboradores((prev) => ({ ...prev, [id]: false }))
      finalizarOperacion(clave)
    }
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setEditForm({ nombre: '', email: '' })
  }

  const actualizarReferidoLocal = (codigo, id, campo, valor) => {
    setMensajesReferidos((prev) => ({ ...prev, [id]: '' }))
    setReferidos((prev) => ({
      ...prev,
      [codigo]: (prev[codigo] || []).map((ref) =>
        ref.id === id ? { ...ref, [campo]: valor } : ref,
      ),
    }))
  }

  const puedeGestionarReferido = (referido, codigo) =>
    esAdmin || (referido.colaborador_id || codigo) === colaboradorCodigo

  const aplicarCambiosReferido = (id, cambios) => {
    setReferidos((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([codigo, lista]) => [
          codigo,
          lista.map((ref) =>
            String(ref.id) === String(id) ? { ...ref, ...cambios } : ref,
          ),
        ]),
      ),
    )
  }

  const guardarReferido = async (referido, codigo) => {
    if (
      !puedeGestionarReferido(referido, codigo) ||
      guardandoReferidos[referido.id] ||
      !iniciarOperacion(`referido:${referido.id}`)
    )
      return

    const id = String(referido.id)
    const anteriores = referidosConfirmadosRef.current.get(id)
    const cambios = datosGestion(referido)
    // Conservamos los valores confirmados aunque los inputs ya muestren el borrador.
    cambiosPendientesRef.current.set(id, cambios)
    versionesReferidosRef.current.set(
      id,
      (versionesReferidosRef.current.get(id) || 0) + 1,
    )
    aplicarCambiosReferido(id, cambios)
    setMensajesReferidos((prev) => ({ ...prev, [id]: '' }))
    setGuardandoReferidos((prev) => ({
      ...prev,
      [referido.id]: true,
    }))

    try {
      await api.editarReferido(referido.id, cambios)
      referidosConfirmadosRef.current.set(id, cambios)
      setMensajesReferidos((prev) => ({ ...prev, [id]: 'Cambios guardados' }))
    } catch (err) {
      if (anteriores) aplicarCambiosReferido(id, anteriores)
      setMensajesReferidos((prev) => ({
        ...prev,
        [id]: 'Se restauraron los valores guardados',
      }))
      alert('No se guardaron los cambios: ' + err.message)
    } finally {
      cambiosPendientesRef.current.delete(id)
      versionesReferidosRef.current.set(
        id,
        (versionesReferidosRef.current.get(id) || 0) + 1,
      )
      setGuardandoReferidos((prev) => ({
        ...prev,
        [referido.id]: false,
      }))
      finalizarOperacion(`referido:${id}`)
    }
  }

  const cargarReferidos = async (codigo) => {
    const versionesAlSolicitar = new Map(versionesReferidosRef.current)
    setCargandoReferidos((prev) => ({ ...prev, [codigo]: true }))
    setErroresReferidos((prev) => ({ ...prev, [codigo]: '' }))
    try {
      const recibidos = await leerReferidos(codigo)
      const data = recibidos.map((ref) => {
        const id = String(ref.id)
        const pendiente = cambiosPendientesRef.current.get(id)
        const cambioDuranteCarga =
          versionesAlSolicitar.get(id) !== versionesReferidosRef.current.get(id)
        if (pendiente || cambioDuranteCarga) {
          return {
            ...ref,
            ...(pendiente || referidosConfirmadosRef.current.get(id)),
          }
        }
        referidosConfirmadosRef.current.set(id, datosGestion(ref))
        return ref
      })
      setReferidos((prev) => ({ ...prev, [codigo]: data }))
    } catch (err) {
      setErroresReferidos((prev) => ({ ...prev, [codigo]: err.message }))
    } finally {
      setCargandoReferidos((prev) => ({ ...prev, [codigo]: false }))
    }
  }

  const abrirReferidos = (colaborador) => {
    const codigo = colaborador.codigo_unico || `id:${colaborador.id}`
    setShowReferidos(codigo)
    cambiarSeccion(codigo === colaboradorCodigo ? 'mis-referidos' : 'detalle')
    if (codigo !== colaboradorCodigo && !referidos[codigo])
      cargarReferidos(codigo)
  }

  const generarQR = (codigo, nombre) => {
    const url = `https://vitaesentia-referidos.onrender.com/qr?ref=${codigo}&nombre=${encodeURIComponent(nombre)}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`
    window.open(qrUrl, '_blank')
  }

  useEffect(() => {
    cargarColaboradores()
  }, [])

  const renderListaReferidos = (codigo) => {
    if (!codigo) return null
    if (erroresReferidos[codigo]) {
      return (
        <div className="referidos-error" role="alert">
          <p>{erroresReferidos[codigo]}</p>
          <button
            type="button"
            className="btn-pdf"
            onClick={() => cargarReferidos(codigo)}
          >
            Reintentar
          </button>
        </div>
      )
    }
    if (cargandoReferidos[codigo] || !referidos[codigo]) {
      return (
        <p className="empty-state" role="status">
          Cargando referidos...
        </p>
      )
    }
    if (referidos[codigo].length === 0) {
      return (
        <p className="empty-state">Todavía no hay referidos registrados.</p>
      )
    }
    return (
      <div
        className="subtable-wrapper"
        tabIndex={0}
        aria-label="Lista desplazable de referidos"
      >
        {referidos[codigo]?.map((ref) => {
          const puedeGestionar = puedeGestionarReferido(ref, codigo)
          return (
            <article
              className={`referido-card${puedeGestionar ? '' : ' referido-card-lectura'}`}
              key={ref.id}
            >
              <div className="referido-details">
                <div className="referido-heading">
                  <span className="referido-avatar">
                    <DashboardIcon name="referrals" size={22} />
                  </span>
                  <div>
                    <h4>
                      {`${ref.referido_nombre || ''} ${ref.referido_apellido || ''}`.trim() ||
                        'Sin nombre registrado'}
                    </h4>
                    <p>Datos de contacto y registro</p>
                  </div>
                </div>
                <dl className="referido-data">
                  {[
                    ['Fecha de registro', formatearFecha(ref.fecha_scan)],
                    ['Correo', ref.referido_email],
                    ['Teléfono', ref.referido_telefono],
                    ['Dirección IP', ref.ip_address],
                    ['País', ref.pais],
                    ['Ciudad', ref.ciudad],
                    ['Dispositivo', ref.tipo_dispositivo],
                    [
                      'Sistema / navegador',
                      `${ref.sistema_operativo || '—'} / ${ref.navegador || '—'}`,
                    ],
                    ...(!puedeGestionar
                      ? [
                          ['Estado', ref.estado || 'Sin estado'],
                          [
                            'Observaciones',
                            ref.observaciones || 'Sin observaciones',
                          ],
                        ]
                      : []),
                  ].map(([label, value]) => (
                    <div className="referido-dato" key={label}>
                      <dt>{label}</dt>
                      <dd className="selectable-text">
                        {value || 'No disponible'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              {puedeGestionar && (
                <div className="referido-management">
                  <h4>
                    <DashboardIcon name="shield" size={18} />
                    Gestión del referido
                  </h4>
                  <p>Actualiza su estado y registra tus observaciones.</p>
                  <label htmlFor={`estado-${ref.id}`}>Estado</label>
                  <select
                    id={`estado-${ref.id}`}
                    className="referido-estado"
                    value={ref.estado || ''}
                    disabled={!!guardandoReferidos[ref.id] || actualizandoDatos}
                    onChange={(e) =>
                      actualizarReferidoLocal(
                        codigo,
                        ref.id,
                        'estado',
                        e.target.value,
                      )
                    }
                  >
                    <option value="">Sin estado</option>
                    <option value="Agendado">Agendado</option>
                    <option value="Cocinado">Cocinado</option>
                    <option value="Vendido">Vendido</option>
                    <option value="Contactado">Contactado</option>
                  </select>
                  <label htmlFor={`observaciones-${ref.id}`}>
                    Observaciones
                  </label>
                  <textarea
                    id={`observaciones-${ref.id}`}
                    className="referido-observaciones"
                    placeholder="Escribe notas sobre el seguimiento..."
                    rows={4}
                    maxLength={5000}
                    value={ref.observaciones || ''}
                    disabled={!!guardandoReferidos[ref.id] || actualizandoDatos}
                    onChange={(e) =>
                      actualizarReferidoLocal(
                        codigo,
                        ref.id,
                        'observaciones',
                        e.target.value,
                      )
                    }
                  />
                  <div className="referido-save-row">
                    <span role="status">
                      {guardandoReferidos[ref.id]
                        ? 'Guardando cambios...'
                        : mensajesReferidos[ref.id] ||
                          'Los cambios se aplican al guardar.'}
                    </span>
                    <button
                      type="button"
                      className="btn-guardar"
                      disabled={
                        !!guardandoReferidos[ref.id] || actualizandoDatos
                      }
                      onClick={() => guardarReferido(ref, codigo)}
                    >
                      <DashboardIcon name="save" size={16} />
                      {guardandoReferidos[ref.id]
                        ? 'Guardando...'
                        : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="vita-dashboard dashboard-feedback" role="status">
        <div className="loader-ring" />
        <h1>VITAESENTIA</h1>
        <p>Preparando tu panel de colaboradores...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="vita-dashboard dashboard-feedback">
        <div className="dashboard-error-card" role="alert">
          <DashboardIcon name="shield" size={32} />
          <h1>No pudimos cargar el panel</h1>
          <p>{error}</p>
          <button
            className="btn-primary"
            onClick={() => {
              setLoading(true)
              cargarColaboradores()
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`vita-dashboard${menuAbierto ? ' menu-abierto' : ''}`}>
      {menuAbierto && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      <aside
        className="dashboard-sidebar"
        id="dashboard-sidebar"
        aria-label="Menú principal"
      >
        <div className="sidebar-brand">
          <button
            type="button"
            className="sidebar-logo"
            aria-label="Ir al resumen"
            onClick={() => cambiarSeccion('resumen')}
          >
            <img src={logoVitaesentia} alt="Vitaesentia" />
          </button>
          <button
            className="sidebar-close icon-button"
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
          >
            <DashboardIcon name="close" />
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Secciones del panel">
          <button
            type="button"
            className={seccionActiva === 'resumen' ? 'active' : ''}
            aria-pressed={seccionActiva === 'resumen'}
            onClick={() => cambiarSeccion('resumen')}
          >
            <DashboardIcon name="dashboard" />
            <span>Resumen</span>
          </button>
          <button
            type="button"
            className={
              ['colaboradores', 'detalle'].includes(seccionActiva)
                ? 'active'
                : ''
            }
            aria-pressed={['colaboradores', 'detalle'].includes(seccionActiva)}
            onClick={() => cambiarSeccion('colaboradores')}
          >
            <DashboardIcon name="users" />
            <span>Colaboradores</span>
            <span className="sidebar-count">{colaboradores.length}</span>
          </button>
          <button
            type="button"
            className={seccionActiva === 'mis-referidos' ? 'active' : ''}
            aria-pressed={seccionActiva === 'mis-referidos'}
            onClick={() => cambiarSeccion('mis-referidos')}
          >
            <DashboardIcon name="referrals" />
            <span>Mis Referidos</span>
          </button>
          {esAdmin && (
            <button
              type="button"
              className={seccionActiva === 'videos' ? 'active' : ''}
              aria-pressed={seccionActiva === 'videos'}
              onClick={() => cambiarSeccion('videos')}
            >
              <DashboardIcon name="video" />
              <span>Videos</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-session">
            <span className="session-dot" />
            {esAdmin ? 'Acceso de administrador' : 'Acceso de colaborador'}
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            <DashboardIcon name="logout" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-location">
            <button
              id="dashboard-menu-trigger"
              className="menu-toggle icon-button"
              aria-label="Abrir menú de navegación"
              aria-controls="dashboard-sidebar"
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto(true)}
            >
              <DashboardIcon name="menu" />
            </button>
            <span className="topbar-section">{tituloSeccion}</span>
          </div>
          <div className="topbar-user">
            {esAdmin && (
              <button
                type="button"
                className="btn-pdf dashboard-refresh"
                disabled={
                  actualizandoDatos ||
                  videosOcupados ||
                  operacionesPendientes > 0 ||
                  Object.values(cargandoReferidos).some(Boolean)
                }
                onClick={actualizarDatos}
                aria-busy={actualizandoDatos}
              >
                <DashboardIcon name="refresh" size={17} />
                {actualizandoDatos ? 'Actualizando...' : 'Actualizar datos'}
              </button>
            )}
            <span className="user-avatar" aria-hidden="true">
              {inicialesUsuario}
            </span>
            <div className="user-identity">
              <strong>{colaboradorNombre}</strong>
              <span>{esAdmin ? 'Administrador' : 'Colaborador'}</span>
            </div>
            <span className="user-code">
              <span>Código</span>
              <code>{colaboradorCodigo}</code>
            </span>
          </div>
        </header>

        <main className="dashboard-content">
          {esAdmin && (
            <div hidden={seccionActiva !== 'videos'}>
              <GestionVideos
                active={seccionActiva === 'videos'}
                refreshing={actualizandoDatos}
                refreshKey={revisionVideos}
                onBusyChange={setVideosOcupados}
              />
            </div>
          )}
          {seccionActiva === 'resumen' && (
            <section id="resumen" aria-labelledby="dashboard-title">
              <div className="dashboard-page-heading">
                <p className="section-eyebrow">VISTA GENERAL</p>
                <h1 id="dashboard-title">Tu red, en un solo lugar</h1>
                <p>
                  Consulta tus colaboradores y da seguimiento a cada referido.
                </p>
              </div>
              <div className="dashboard-widgets">
                <article className="stat-card stat-blue">
                  <div>
                    <p>Total Colaboradores</p>
                    <strong>
                      {colaboradores.length.toLocaleString('es-ES')}
                    </strong>
                    <span>Personas en tu red</span>
                  </div>
                  <span className="stat-icon">
                    <DashboardIcon name="users" size={25} />
                  </span>
                </article>
                <article className="stat-card stat-green">
                  <div>
                    <p>Total Referidos</p>
                    <strong>{totalReferidos.toLocaleString('es-ES')}</strong>
                    <span>Registros de tus colaboradores</span>
                  </div>
                  <span className="stat-icon">
                    <DashboardIcon name="referrals" size={25} />
                  </span>
                </article>
              </div>
              <section
                className="dashboard-card overview-panel"
                aria-labelledby="overview-title"
              >
                <div className="dashboard-card-header">
                  <div>
                    <h2 id="overview-title">Resumen de tu red</h2>
                    <p>Una mirada al alcance de tus colaboradores.</p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => cambiarSeccion('colaboradores')}
                  >
                    <DashboardIcon name="users" size={17} />
                    Ver colaboradores
                  </button>
                </div>
                <div className="overview-grid">
                  <div className="overview-metrics">
                    <h3>Participación del equipo</h3>
                    <dl>
                      <div>
                        <dt>Colaboradores con referidos</dt>
                        <dd>
                          {colaboradoresConReferidos.length.toLocaleString(
                            'es-ES',
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Colaboradores sin referidos</dt>
                        <dd>
                          {(
                            colaboradores.length -
                            colaboradoresConReferidos.length
                          ).toLocaleString('es-ES')}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="overview-leaders">
                    <h3>Colaboradores destacados</h3>
                    {colaboradoresDestacados.length > 0 ? (
                      <ol>
                        {colaboradoresDestacados.map((colab, index) => (
                          <li key={colab.id}>
                            <span
                              className="leader-position"
                              aria-hidden="true"
                            >
                              {index + 1}
                            </span>
                            <span>{colab.nombre}</span>
                            <strong>
                              {Number(colab.total_referidos).toLocaleString(
                                'es-ES',
                              )}{' '}
                              referidos
                            </strong>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="overview-empty">
                        Aún no hay referidos registrados.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </section>
          )}

          {!esAdmin && (
            <div className="info-message">
              <DashboardIcon name="shield" />
              <span>
                Puedes consultar el directorio completo. Solo puedes gestionar
                tus propios referidos desde «Mis Referidos».
              </span>
            </div>
          )}

          {seccionActiva === 'colaboradores' && (
            <section
              className="dashboard-card directory-view"
              id="colaboradores"
              aria-labelledby="colaboradores-title"
            >
              <div className="dashboard-card-header">
                <div>
                  <div className="card-title-line">
                    <h1 id="colaboradores-title">Colaboradores</h1>
                    <span className="record-count">{colaboradores.length}</span>
                  </div>
                  <p>
                    Conoce a tu equipo y descubre quiénes están ampliando la
                    red.
                  </p>
                </div>
                <div className="directory-toolbar">
                  <button
                    type="button"
                    className="btn-pdf"
                    onClick={exportarPDF}
                  >
                    <DashboardIcon name="download" size={17} />
                    Descargar PDF
                  </button>
                  {esAdmin && (
                    <button
                      id="nuevo-colaborador-trigger"
                      type="button"
                      className="btn-primary"
                      disabled={creandoColaborador || actualizandoDatos}
                      onClick={abrirModalColaborador}
                    >
                      <DashboardIcon name="plus" size={18} />
                      Nuevo Colaborador
                    </button>
                  )}
                </div>
              </div>
              <div className="directory-list-heading">
                <p>Ordenados por mayor número de referidos</p>
                <span>{colaboradores.length} perfiles</span>
              </div>
              {colaboradores.length === 0 ? (
                <p className="empty-state">
                  Todavía no hay colaboradores registrados.
                </p>
              ) : (
                <div className="directory-grid">
                  {colaboradoresOrdenados.map((colab, index) => {
                    const esPropio = colab.codigo_unico === colaboradorCodigo
                    const destacado =
                      index < 3 && Number(colab.total_referidos) > 0
                    const iniciales = String(colab.nombre || 'Colaborador')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((nombre) => nombre[0])
                      .join('')
                      .toUpperCase()
                    return (
                      <article
                        className={`directory-card${destacado ? ' directory-card-featured' : ''}`}
                        key={colab.id}
                        aria-label={`Colaborador ${colab.nombre}`}
                        aria-busy={
                          !!colab.pendiente ||
                          !!guardandoColaboradores[colab.id]
                        }
                      >
                        <div className="directory-card-heading">
                          <span className="directory-avatar" aria-hidden="true">
                            {iniciales}
                          </span>
                          <div className="directory-identity">
                            <h2>{colab.nombre}</h2>
                            <span>
                              {colab.pendiente
                                ? 'Creando colaborador...'
                                : guardandoColaboradores[colab.id]
                                  ? 'Guardando cambios...'
                                  : esPropio
                                    ? 'Tu perfil'
                                    : 'Colaborador'}
                            </span>
                          </div>
                          {destacado && (
                            <span className="directory-featured-badge">
                              Destacado
                            </span>
                          )}
                        </div>
                        {editando === colab.id && esAdmin ? (
                          <form
                            className="directory-edit-form"
                            onSubmit={(e) => {
                              e.preventDefault()
                              guardarEdicion(colab.id)
                            }}
                          >
                            <label htmlFor={`editar-nombre-${colab.id}`}>
                              Nombre del colaborador
                              <input
                                id={`editar-nombre-${colab.id}`}
                                value={editForm.nombre}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    nombre: e.target.value,
                                  })
                                }
                                required
                                autoFocus
                              />
                            </label>
                            <label htmlFor={`editar-email-${colab.id}`}>
                              Correo del colaborador
                              <input
                                id={`editar-email-${colab.id}`}
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    email: e.target.value,
                                  })
                                }
                                required
                              />
                            </label>
                            <div className="directory-card-actions">
                              <button type="submit" className="btn-guardar">
                                Guardar
                              </button>
                              <button
                                type="button"
                                className="btn-cancelar"
                                onClick={cancelarEdicion}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p className="directory-email">
                              {colab.email || 'Sin correo registrado'}
                            </p>
                            <div className="directory-referral-count">
                              <span className="directory-referral-icon">
                                <DashboardIcon name="referrals" size={22} />
                              </span>
                              <div>
                                <strong>
                                  {(
                                    Number(colab.total_referidos) || 0
                                  ).toLocaleString('es-ES')}
                                </strong>
                                <span>referidos registrados</span>
                              </div>
                            </div>
                            {esAdmin && (
                              <div className="directory-code">
                                <span>Código</span>
                                <code>
                                  {colab.pendiente
                                    ? 'Asignando...'
                                    : colab.codigo_unico}
                                </code>
                              </div>
                            )}
                            <div className="directory-card-actions">
                              <button
                                type="button"
                                className="btn-pdf directory-details-button"
                                disabled={
                                  !!colab.pendiente || actualizandoDatos
                                }
                                aria-label={`Abrir ficha de ${colab.nombre}`}
                                onClick={() => abrirReferidos(colab)}
                              >
                                <DashboardIcon name="referrals" size={15} />
                                {esPropio ? 'Mis Referidos' : 'Ver referidos'}
                              </button>
                              {(esAdmin || esPropio) && (
                                <button
                                  type="button"
                                  className="btn-qr"
                                  disabled={!!colab.pendiente}
                                  aria-label={`Ver QR de ${colab.nombre}`}
                                  onClick={() =>
                                    generarQR(colab.codigo_unico, colab.nombre)
                                  }
                                >
                                  QR
                                </button>
                              )}
                              {esAdmin && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-editar"
                                    disabled={
                                      !!colab.pendiente ||
                                      !!guardandoColaboradores[colab.id] ||
                                      actualizandoDatos
                                    }
                                    onClick={() => editarColaborador(colab)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-eliminar"
                                    disabled={
                                      !!colab.pendiente ||
                                      !!guardandoColaboradores[colab.id] ||
                                      actualizandoDatos
                                    }
                                    onClick={() =>
                                      eliminarColaborador(
                                        colab.id,
                                        colab.nombre,
                                      )
                                    }
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                              {!esAdmin && !esPropio && (
                                <span className="directory-readonly">
                                  <DashboardIcon name="shield" size={14} />
                                  Solo consulta
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {['detalle', 'mis-referidos'].includes(seccionActiva) && (
            <section
              className="dashboard-card detail-view"
              aria-labelledby="referidos-title"
            >
              <div className="dashboard-card-header">
                <div>
                  <p className="section-eyebrow">
                    {seccionActiva === 'detalle'
                      ? 'FICHA DEL COLABORADOR'
                      : 'SEGUIMIENTO PERSONAL'}
                  </p>
                  <h1 id="referidos-title">
                    {seccionActiva === 'detalle'
                      ? `Referidos de ${colaboradorEnDetalle?.nombre || 'colaborador'}`
                      : 'Mis Referidos'}
                  </h1>
                  <p>{colaboradorEnDetalle?.email || colaboradorNombre}</p>
                </div>
                <button
                  type="button"
                  className="btn-pdf"
                  onClick={() => cambiarSeccion('colaboradores')}
                >
                  Volver a colaboradores
                </button>
              </div>
              <div className="detail-content">
                <div className="detail-list-heading">
                  <h2>Datos y seguimiento</h2>
                  <span className="record-count">
                    {(referidos[codigoReferidosActivo] || []).length} registros
                  </span>
                </div>
                {renderListaReferidos(codigoReferidosActivo)}
              </div>
            </section>
          )}

          {esAdmin && (
            <dialog
              ref={crearDialogRef}
              className="create-colaborador-dialog"
              aria-labelledby="crear-colaborador-title"
              aria-describedby="crear-colaborador-description"
              onCancel={(event) => {
                event.preventDefault()
                cerrarModalColaborador()
              }}
              onClose={() => setModalColaboradorAbierto(false)}
              onClick={(event) => {
                if (event.target === event.currentTarget)
                  cerrarModalColaborador()
              }}
            >
              <div className="create-modal-panel">
                <div className="create-modal-header">
                  <div>
                    <p className="section-eyebrow">TU EQUIPO</p>
                    <h2 id="crear-colaborador-title">Nuevo Colaborador</h2>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Cerrar ventana de nuevo colaborador"
                    disabled={creandoColaborador}
                    onClick={cerrarModalColaborador}
                  >
                    <DashboardIcon name="close" />
                  </button>
                </div>
                <p id="crear-colaborador-description">
                  Agrega sus datos para incorporarlo al programa de referidos.
                </p>
                <form
                  className="create-colaborador-form"
                  onSubmit={crearColaborador}
                  aria-busy={creandoColaborador}
                >
                  <label htmlFor="nuevo-nombre">
                    Nombre completo
                    <input
                      id="nuevo-nombre"
                      type="text"
                      autoComplete="name"
                      value={nuevoColab.nombre}
                      onChange={(e) =>
                        setNuevoColab({ ...nuevoColab, nombre: e.target.value })
                      }
                      required
                      disabled={creandoColaborador}
                    />
                  </label>
                  <label htmlFor="nuevo-email">
                    Correo electrónico
                    <input
                      id="nuevo-email"
                      type="email"
                      autoComplete="email"
                      value={nuevoColab.email}
                      onChange={(e) =>
                        setNuevoColab({ ...nuevoColab, email: e.target.value })
                      }
                      required
                      disabled={creandoColaborador}
                    />
                  </label>
                  {errorNuevoColab && (
                    <p className="create-modal-error" role="alert">
                      {errorNuevoColab}
                    </p>
                  )}
                  <div className="create-modal-actions">
                    <button
                      type="button"
                      className="btn-pdf"
                      disabled={creandoColaborador}
                      onClick={cerrarModalColaborador}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={creandoColaborador}
                    >
                      <DashboardIcon name="plus" size={17} />
                      {creandoColaborador ? 'Creando...' : 'Crear colaborador'}
                    </button>
                  </div>
                </form>
              </div>
            </dialog>
          )}

          <footer className="footer-copyright">
            <p>© 2026</p>
            <a
              href="https://igrafic360.net"
              target="_blank"
              rel="noopener noreferrer"
            >
              Desarrollado por igrafic360.net
            </a>
          </footer>
        </main>
      </div>
    </div>
  )
}
