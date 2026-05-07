import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import './TablaColaboradores.css'

export default function TablaColaboradores() {
  const navigate = useNavigate()
  
  const [colaboradores, setColaboradores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showReferidos, setShowReferidos] = useState(null)
  const [referidos, setReferidos] = useState({})
  const [nuevoColab, setNuevoColab] = useState({ nombre: '', email: '' })
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({ nombre: '', email: '' })
  
  const colaboradorNombre = localStorage.getItem('colaborador_nombre') || 'Colaborador'
  const colaboradorCodigo = localStorage.getItem('colaborador_codigo') || ''
  const colaboradorRol = localStorage.getItem('colaborador_rol') || 'colaborador'
  const esAdmin = colaboradorRol === 'admin'

  const handleLogout = () => {
    localStorage.clear()
    // Navegación limpia con React Router en lugar de recargar la página
    navigate('/login')
  }

  const cargarColaboradores = async () => {
    try {
      const tiempoInicio = Date.now()
      const data = await api.getColaboradores()
      
      const tiempoTranscurrido = Date.now() - tiempoInicio
      if (tiempoTranscurrido < 1500) {
        await new Promise(resolve => setTimeout(resolve, 1500 - tiempoTranscurrido))
      }

      setColaboradores(data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const crearColaborador = async (e) => {
    e.preventDefault()
    if (!esAdmin) {
      alert('No tienes permisos para crear colaboradores')
      return
    }
    try {
      await api.crearColaborador(nuevoColab)
      setNuevoColab({ nombre: '', email: '' })
      cargarColaboradores()
    } catch (err) {
      alert('Error al crear: ' + err.message)
    }
  }

  const eliminarColaborador = async (id, nombre) => {
    if (!esAdmin) {
      alert('No tienes permisos para eliminar colaboradores')
      return
    }
    if (window.confirm(`¿Eliminar a "${nombre}"? Se perderán todos sus referidos.`)) {
      try {
        await api.eliminarColaborador(id)
        cargarColaboradores()
      } catch (err) {
        alert('Error al eliminar: ' + err.message)
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
    try {
      await api.editarColaborador(id, editForm)
      setEditando(null)
      cargarColaboradores()
    } catch (err) {
      alert('Error al editar: ' + err.message)
    }
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setEditForm({ nombre: '', email: '' })
  }

  const verReferidos = async (colabId) => {
    if (showReferidos === colabId) {
      setShowReferidos(null)
    } else {
      try {
        const data = await api.getReferidos(colabId)
        setReferidos({ ...referidos, [colabId]: data })
        setShowReferidos(colabId)
      } catch (err) {
        alert('Error al cargar referidos')
      }
    }
  }

  const generarQR = (codigo, nombre) => {
    const url = `https://igrafic360.net/referidos-api/qr?ref=${codigo}&nombre=${encodeURIComponent(nombre)}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`
    window.open(qrUrl, '_blank')
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
        second: '2-digit'
      })
    } catch {
      return fecha
    }
  }

  useEffect(() => {
    cargarColaboradores()
  }, [])

  if (loading) {
    return (
      <div className="loader-screen">
        <div className="loader-ring">
          <div className="loader-ring-inner"></div>
        </div>
        <h2 className="loader-title">VITAESENTIA</h2>
        <p className="loader-subtitle">Preparando tu entorno de trabajo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h3>❌ Error de Conexión</h3>
          <p>{error}</p>
          <p className="error-help">Verifica que el servidor esté activo.</p>
          <button className="btn-reintentar" onClick={cargarColaboradores}>Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header-user">
        <h1>👥 Panel de Colaboradores - Vitaesentia</h1>
        
        <div className="user-info">
          <span className="user-role">
            {esAdmin ? '👑 Administrador' : '👤 Colaborador'}
          </span>
          <span className="user-code">
            🔑 {colaboradorCodigo}
          </span>
          <span className="user-name">
            👤 {colaboradorNombre}
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {esAdmin && (
        <form className="form-nuevo" onSubmit={crearColaborador}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={nuevoColab.nombre}
            onChange={(e) => setNuevoColab({ ...nuevoColab, nombre: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={nuevoColab.email}
            onChange={(e) => setNuevoColab({ ...nuevoColab, email: e.target.value })}
            required
          />
          <button type="submit">➕ Agregar Colaborador</button>
        </form>
      )}

      {!esAdmin && (
        <div className="info-message">
          ℹ️ Tienes acceso de solo lectura. No puedes modificar colaboradores.
        </div>
      )}

      <div className="table-wrapper">
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              {esAdmin && <th>Código</th>}
              <th>QR</th>
              <th>Referidos</th>
              {esAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {colaboradores.map(colab => (
              <Fragment key={colab.id}>
                <tr>
                  <td>{colab.id}</td>
                  <td className="nombre">
                    {editando === colab.id && esAdmin ? (
                      <input
                        value={editForm.nombre}
                        onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                        style={{ width: '100%', padding: '6px' }}
                        autoFocus
                      />
                    ) : (
                      <span className="selectable-text">{colab.nombre}</span>
                    )}
                  </td>
                  <td>
                    {editando === colab.id && esAdmin ? (
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        style={{ width: '100%', padding: '6px' }}
                      />
                    ) : (
                      <span className="selectable-text">{colab.email}</span>
                    )}
                  </td>
                  {esAdmin && (
                    <td className="codigo">
                      <span className="selectable-text">{colab.codigo_unico}</span>
                     </td>
                  )}
                  <td>
                    <button className="btn-qr" onClick={() => generarQR(colab.codigo_unico, colab.nombre)}>
                      📱 QR
                    </button>
                  </td>
                  <td className="referidos-count">
                    <button className="btn-referidos" onClick={() => verReferidos(colab.id)}>
                      {showReferidos === colab.id ? '▲ Ocultar' : '▼ Ver'} ({colab.total_referidos || 0})
                    </button>
                  </td>
                  {esAdmin && (
                    <td className="acciones">
                      {editando === colab.id ? (
                        <div className="action-buttons">
                          <button className="btn-guardar" onClick={() => guardarEdicion(colab.id)}>💾 Guardar</button>
                          <button className="btn-cancelar" onClick={cancelarEdicion}>✖ Cancelar</button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button className="btn-editar" onClick={() => editarColaborador(colab)}>✏ Editar</button>
                          <button className="btn-eliminar" onClick={() => eliminarColaborador(colab.id, colab.nombre)}>🗑 Eliminar</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
                {showReferidos === colab.id && (
                  <tr className="referidos-row">
                    <td colSpan={esAdmin ? 7 : 5}>
                      <div className="subtabla">
                        <h4>📋 Referidos de {colab.nombre}</h4>
                        {referidos[colab.id]?.length === 0 ? (
                          <p className="no-referidos">Aún no hay referidos registrados.</p>
                        ) : (
                          <div className="subtable-wrapper">
                            <table className="tabla-referidos">
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>IP</th>
                                  <th>País</th>
                                  <th>Ciudad</th>
                                  <th>Nombre</th>
                                  <th>Apellido</th>
                                  <th>Email</th>
                                  <th>Teléfono</th>
                                  <th>SO / Navegador</th>
                                </tr>
                              </thead>
                              <tbody>
                                {referidos[colab.id]?.map(ref => (
                                  <tr key={ref.id}>
                                    <td className="selectable-text">{formatearFecha(ref.fecha_scan)}</td>
                                    <td className="selectable-text">{ref.ip_address || 'No registrada'}</td>
                                    <td className="selectable-text">{ref.pais || 'No disponible'}</td>
                                    <td className="selectable-text">{ref.ciudad || 'No disponible'}</td>
                                    <td className="selectable-text">{ref.referido_nombre || '-'}</td>
                                    <td className="selectable-text">{ref.referido_apellido || '-'}</td>
                                    <td className="selectable-text">{ref.referido_email || '-'}</td>
                                    <td className="selectable-text">{ref.referido_telefono || '-'}</td>
                                    <td className="user-agent selectable-text">
                                      {ref.sistema_operativo || '?'} / {ref.navegador || '?'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                     </td>
                   </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}