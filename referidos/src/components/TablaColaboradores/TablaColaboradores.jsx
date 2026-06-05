import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
<<<<<<< HEAD
import html2pdf from 'html2pdf.js'
=======
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
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
<<<<<<< HEAD
  const colaboradorId = localStorage.getItem('colaborador_id') || ''
=======
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
  const esAdmin = colaboradorRol === 'admin'

  const handleLogout = () => {
    localStorage.clear()
<<<<<<< HEAD
=======
    // Navegación limpia con React Router en lugar de recargar la página
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
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

<<<<<<< HEAD
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

  const exportarPDF = async () => {
    try {
      const data = await api.getReferidos(colaboradorId)
      
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
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
      }
      
      await html2pdf().set(opt).from(element).save()
      document.body.removeChild(element)
      
    } catch (err) {
      console.error('Error en PDF:', err)
      alert('Error al generar PDF: ' + err.message)
    }
  }

=======
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
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

<<<<<<< HEAD
=======
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

>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
  useEffect(() => {
    cargarColaboradores()
  }, [])

  if (loading) {
    return (
      <div className="loader-screen">
<<<<<<< HEAD
        <div className="loader-ring"></div>
        <h2 className="loader-title">VITAESENTIA</h2>
        <p className="loader-subtitle">Cargando datos del servidor...</p>
=======
        <div className="loader-ring">
          <div className="loader-ring-inner"></div>
        </div>
        <h2 className="loader-title">VITAESENTIA</h2>
        <p className="loader-subtitle">Preparando tu entorno de trabajo...</p>
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
      </div>
    )
  }

  if (error) {
    return (
<<<<<<< HEAD
      <div className="error-container" style={{ padding: '50px', textAlign: 'center', color: '#0F172A' }}>
        <div className="error-card" style={{ background: '#FFFFFF', padding: '40px', borderRadius: '8px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#DC2626' }}>Error de Conexión</h3>
          <p>{error}</p>
          <button className="btn-reintentar" onClick={cargarColaboradores} style={{ background: '#0056B3', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px', fontWeight: '600' }}>Reintentar</button>
=======
      <div className="error-container">
        <div className="error-card">
          <h3>❌ Error de Conexión</h3>
          <p>{error}</p>
          <p className="error-help">Verifica que el servidor esté activo.</p>
          <button className="btn-reintentar" onClick={cargarColaboradores}>Reintentar</button>
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header-user">
<<<<<<< HEAD
        <h1>Panel de Colaboradores</h1>
        
        <div className="user-info">
          <span className="user-role">
            {esAdmin ? 'Administrador' : 'Colaborador'}
          </span>
          <span className="user-code">
            {colaboradorCodigo}
          </span>
          <span className="user-name">
            {colaboradorNombre}
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar Sesión
=======
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
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
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
<<<<<<< HEAD
            placeholder="Correo electrónico"
=======
            placeholder="Email"
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
            value={nuevoColab.email}
            onChange={(e) => setNuevoColab({ ...nuevoColab, email: e.target.value })}
            required
          />
<<<<<<< HEAD
          <button type="submit">Agregar</button>
=======
          <button type="submit">➕ Agregar Colaborador</button>
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
        </form>
      )}

      {!esAdmin && (
        <div className="info-message">
<<<<<<< HEAD
          Modo de lectura activado. No es posible modificar registros.
        </div>
      )}

      <div className="export-pdf-container">
        <button className="btn-pdf" onClick={exportarPDF}>
          Descargar PDF
        </button>
      </div>

=======
          ℹ️ Tienes acceso de solo lectura. No puedes modificar colaboradores.
        </div>
      )}

>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
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
<<<<<<< HEAD
                    </td>
                  )}
                  <td>
                    <button className="btn-qr" onClick={() => generarQR(colab.codigo_unico, colab.nombre)}>
                      QR
=======
                     </td>
                  )}
                  <td>
                    <button className="btn-qr" onClick={() => generarQR(colab.codigo_unico, colab.nombre)}>
                      📱 QR
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
                    </button>
                  </td>
                  <td className="referidos-count">
                    <button className="btn-referidos" onClick={() => verReferidos(colab.id)}>
<<<<<<< HEAD
                      {showReferidos === colab.id ? 'Ocultar' : 'Ver'} ({colab.total_referidos || 0})
=======
                      {showReferidos === colab.id ? '▲ Ocultar' : '▼ Ver'} ({colab.total_referidos || 0})
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
                    </button>
                  </td>
                  {esAdmin && (
                    <td className="acciones">
                      {editando === colab.id ? (
                        <div className="action-buttons">
<<<<<<< HEAD
                          <button className="btn-guardar" onClick={() => guardarEdicion(colab.id)}>Guardar</button>
                          <button className="btn-cancelar" onClick={cancelarEdicion}>Cancelar</button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button className="btn-editar" onClick={() => editarColaborador(colab)}>Editar</button>
                          <button className="btn-eliminar" onClick={() => eliminarColaborador(colab.id, colab.nombre)}>Eliminar</button>
=======
                          <button className="btn-guardar" onClick={() => guardarEdicion(colab.id)}>💾 Guardar</button>
                          <button className="btn-cancelar" onClick={cancelarEdicion}>✖ Cancelar</button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button className="btn-editar" onClick={() => editarColaborador(colab)}>✏ Editar</button>
                          <button className="btn-eliminar" onClick={() => eliminarColaborador(colab.id, colab.nombre)}>🗑 Eliminar</button>
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
                        </div>
                      )}
                    </td>
                  )}
                </tr>
                {showReferidos === colab.id && (
                  <tr className="referidos-row">
                    <td colSpan={esAdmin ? 7 : 5}>
                      <div className="subtabla">
<<<<<<< HEAD
                        <h4>Referidos de {colab.nombre}</h4>
                        {referidos[colab.id]?.length === 0 ? (
                          <p className="no-referidos" style={{ color: '#64748B', fontSize: '0.85rem' }}>No se encontraron registros.</p>
                        ) : (
                          <div className="subtable-wrapper">
                            <table className="tabla-referidos" style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Fecha</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>IP</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>País</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Ciudad</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Nombre</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Apellido</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Email</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>Teléfono</th>
                                  <th style={{ padding: '10px 15px', textAlign: 'left' }}>SO / Navegador</th>
=======
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
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
                                </tr>
                              </thead>
                              <tbody>
                                {referidos[colab.id]?.map(ref => (
                                  <tr key={ref.id}>
<<<<<<< HEAD
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{formatearFecha(ref.fecha_scan)}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.ip_address || 'No registrada'}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.pais || 'No disponible'}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.ciudad || 'No disponible'}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.referido_nombre || '-'}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.referido_apellido || '-'}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.referido_email || '-'}</td>
                                    <td className="selectable-text" style={{ padding: '12px 15px' }}>{ref.referido_telefono || '-'}</td>
                                    <td className="user-agent selectable-text" style={{ padding: '12px 15px' }}>
=======
                                    <td className="selectable-text">{formatearFecha(ref.fecha_scan)}</td>
                                    <td className="selectable-text">{ref.ip_address || 'No registrada'}</td>
                                    <td className="selectable-text">{ref.pais || 'No disponible'}</td>
                                    <td className="selectable-text">{ref.ciudad || 'No disponible'}</td>
                                    <td className="selectable-text">{ref.referido_nombre || '-'}</td>
                                    <td className="selectable-text">{ref.referido_apellido || '-'}</td>
                                    <td className="selectable-text">{ref.referido_email || '-'}</td>
                                    <td className="selectable-text">{ref.referido_telefono || '-'}</td>
                                    <td className="user-agent selectable-text">
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
                                      {ref.sistema_operativo || '?'} / {ref.navegador || '?'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
<<<<<<< HEAD
                    </td>
                  </tr>
=======
                     </td>
                   </tr>
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
<<<<<<< HEAD

      <div className="footer-copyright">
        <p>© 2026 igrafic360 - Sistema de Referidos. Todos los derechos reservados.</p>
        <p>Desarrollado por <a href="https://igrafic360.net" target="_blank" rel="noopener noreferrer">igrafic360.net</a></p>
      </div>
=======
>>>>>>> 3d89107d0615188c8d63016ad7e02ce8520b4285
    </div>
  )
}