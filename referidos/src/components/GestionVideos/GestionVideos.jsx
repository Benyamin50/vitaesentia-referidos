import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { getYouTubeId, ordenarVideos } from '../../utils/youtube'
import './GestionVideos.css'

const formularioVacio = { titulo: '', url_youtube: '', orden: '0' }

export default function GestionVideos({
  active,
  refreshing = false,
  refreshKey = 0,
  onBusyChange,
}) {
  const [videos, setVideos] = useState([])
  const [form, setForm] = useState(formularioVacio)
  const [editandoId, setEditandoId] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [reintento, setReintento] = useState(0)
  const cargaConfirmadaRef = useRef(null)
  const operacionRef = useRef(false)
  const tituloRef = useRef(null)
  const ocupado = cargando || guardando || refreshing
  const previewId = getYouTubeId(form.url_youtube)

  useEffect(() => {
    onBusyChange?.(ocupado)
    return () => onBusyChange?.(false)
  }, [ocupado, onBusyChange])

  useEffect(() => {
    if (!active) {
      setCargando(false)
      return
    }
    if (cargaConfirmadaRef.current === `${refreshKey}:${reintento}`) return
    const controller = new AbortController()
    setCargando(true)
    setError('')
    api
      .getVideos({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setVideos(ordenarVideos(data))
        cargaConfirmadaRef.current = `${refreshKey}:${reintento}`
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })
    return () => controller.abort()
  }, [active, refreshKey, reintento])

  const limpiarFormulario = () => {
    setEditandoId(null)
    setForm(formularioVacio)
  }

  const guardar = async (event) => {
    event.preventDefault()
    if (operacionRef.current || cargando || refreshing) return
    const orden = Number(form.orden)
    if (
      !form.titulo.trim() ||
      !previewId ||
      form.orden === '' ||
      !Number.isInteger(orden) ||
      orden < 0 ||
      orden > 2147483647
    ) {
      setError(
        'Completa el título, una URL de YouTube válida y un orden entero mayor o igual a 0.',
      )
      return
    }
    const datos = {
      titulo: form.titulo.trim(),
      url_youtube: `https://www.youtube.com/watch?v=${previewId}`,
      orden,
    }
    const anterior = videos.find((video) => video.id === editandoId)
    if (editandoId !== null && !anterior) {
      setError(
        'Este video ya no está en el catálogo. Actualiza los datos antes de continuar.',
      )
      limpiarFormulario()
      return
    }
    const id = editandoId ?? `temporal-${crypto.randomUUID()}`
    const borrador = { ...form }
    operacionRef.current = true
    setGuardando(true)
    setError('')
    setMensaje('Guardando video...')
    setVideos((prev) =>
      ordenarVideos(
        anterior
          ? prev.map((video) =>
              video.id === id ? { ...video, ...datos, pendiente: true } : video,
            )
          : [...prev, { id, ...datos, pendiente: true }],
      ),
    )
    limpiarFormulario()
    try {
      const guardado = anterior
        ? await api.editarVideo(id, datos)
        : await api.crearVideo(datos)
      setVideos((prev) =>
        ordenarVideos(
          prev.map((video) => (video.id === id ? guardado : video)),
        ),
      )
      setMensaje('Video guardado. Ya está disponible para los referidos.')
    } catch (err) {
      setVideos((prev) =>
        ordenarVideos(
          anterior
            ? prev.map((video) => (video.id === id ? anterior : video))
            : prev.filter((video) => video.id !== id),
        ),
      )
      setForm(borrador)
      setEditandoId(anterior?.id ?? null)
      setMensaje('')
      setError(err.message)
    } finally {
      operacionRef.current = false
      setGuardando(false)
    }
  }

  const editar = (video) => {
    setEditandoId(video.id)
    setForm({
      titulo: video.titulo,
      url_youtube: video.url_youtube,
      orden: String(video.orden),
    })
    setError('')
    setMensaje('')
    tituloRef.current?.focus()
  }

  const eliminar = async (video) => {
    if (
      operacionRef.current ||
      cargando ||
      refreshing ||
      !window.confirm(`¿Eliminar el video "${video.titulo}"?`)
    )
      return
    operacionRef.current = true
    setGuardando(true)
    setError('')
    setMensaje('Eliminando video...')
    setVideos((prev) => prev.filter((item) => item.id !== video.id))
    try {
      await api.eliminarVideo(video.id)
      if (editandoId === video.id) limpiarFormulario()
      setMensaje('Video eliminado.')
    } catch (err) {
      setVideos((prev) => ordenarVideos([...prev, video]))
      setMensaje('')
      setError(err.message)
    } finally {
      operacionRef.current = false
      setGuardando(false)
    }
  }

  return (
    <section className="gestion-videos" aria-labelledby="gestion-videos-title">
      <div className="dashboard-page-heading">
        <p className="section-eyebrow">CONTENIDO</p>
        <h1 id="gestion-videos-title">Videos de YouTube</h1>
        <p>
          Gestiona los videos que ven tus referidos y su orden de presentación.
        </p>
      </div>
      {error && (
        <div className="gestion-videos-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="btn-pdf"
            disabled={ocupado}
            onClick={() => setReintento((valor) => valor + 1)}
          >
            Actualizar catálogo
          </button>
        </div>
      )}
      <p className="gestion-videos-status" role="status">
        {mensaje || (cargando ? 'Cargando videos...' : '')}
      </p>
      <div className="gestion-videos-layout">
        <section
          className="dashboard-card gestion-video-form-card"
          aria-labelledby="video-form-title"
        >
          <h2 id="video-form-title">
            {editandoId !== null ? 'Editar video' : 'Agregar video'}
          </h2>
          <form onSubmit={guardar}>
            <label htmlFor="video-titulo">Título</label>
            <input
              ref={tituloRef}
              id="video-titulo"
              value={form.titulo}
              maxLength={200}
              required
              disabled={ocupado}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, titulo: e.target.value }))
              }
            />
            <label htmlFor="video-url">URL de YouTube</label>
            <input
              id="video-url"
              type="text"
              inputMode="url"
              value={form.url_youtube}
              placeholder="https://www.youtube.com/watch?v=..."
              maxLength={2048}
              required
              disabled={ocupado}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, url_youtube: e.target.value }))
              }
              aria-describedby="video-url-ayuda"
            />
            <small id="video-url-ayuda">
              Acepta enlaces de YouTube, youtu.be y Shorts.
            </small>
            <label htmlFor="video-orden">Orden</label>
            <input
              id="video-orden"
              type="number"
              min="0"
              max="2147483647"
              step="1"
              value={form.orden}
              required
              disabled={ocupado}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, orden: e.target.value }))
              }
            />
            <small>Los números menores aparecen primero.</small>
            {previewId && (
              <img
                className="gestion-video-preview"
                src={`https://i.ytimg.com/vi/${previewId}/hqdefault.jpg`}
                alt="Vista previa del video de YouTube"
              />
            )}
            <div className="gestion-video-form-actions">
              <button type="submit" className="btn-primary" disabled={ocupado}>
                {guardando
                  ? 'Guardando...'
                  : editandoId !== null
                    ? 'Guardar cambios'
                    : 'Agregar video'}
              </button>
              {editandoId !== null && (
                <button
                  type="button"
                  className="btn-pdf"
                  disabled={ocupado}
                  onClick={limpiarFormulario}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>
        <section
          className="dashboard-card gestion-video-list-card"
          aria-labelledby="video-list-title"
        >
          <div className="gestion-video-list-header">
            <h2 id="video-list-title">Catálogo</h2>
            <span className="record-count">{videos.length} videos</span>
          </div>
          {!cargando && videos.length === 0 ? (
            <p className="empty-state">
              Todavía no hay videos. Agrega el primero desde el formulario.
            </p>
          ) : (
            <div
              className="gestion-video-table-scroll"
              tabIndex={0}
              aria-label="Catálogo desplazable de videos"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Orden</th>
                    <th scope="col">Video</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenarVideos(videos).map((video) => (
                    <tr key={video.id} aria-busy={!!video.pendiente}>
                      <td>{video.orden}</td>
                      <td>
                        <strong>{video.titulo}</strong>
                        <a
                          href={video.url_youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver en YouTube ↗
                        </a>
                        {video.pendiente && <small>Guardando...</small>}
                      </td>
                      <td>
                        <div className="gestion-video-row-actions">
                          <button
                            type="button"
                            className="btn-editar"
                            disabled={ocupado || video.pendiente}
                            onClick={() => editar(video)}
                            aria-label={`Editar ${video.titulo}`}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-eliminar"
                            disabled={ocupado || video.pendiente}
                            onClick={() => eliminar(video)}
                            aria-label={`Eliminar ${video.titulo}`}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
