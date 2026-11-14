import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { getYouTubeId, ordenarVideos } from '../../utils/youtube'
import logoVitaesentia from '../../assets/vitaesentia-logo.png'
import './PaginaVideos.css'

export default function PaginaVideos() {
  const [videos, setVideos] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [mensaje, setMensaje] = useState('Verificando acceso...')
  const [error, setError] = useState('')
  const [reintento, setReintento] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const token =
      new URLSearchParams(window.location.search).get('token') ||
      localStorage.getItem('video_token')
    const denegar = () => {
      localStorage.removeItem('video_token')
      setEstado('denegado')
    }
    if (!token) {
      denegar()
      return () => controller.abort()
    }
    setEstado('cargando')
    setMensaje('Verificando acceso...')
    setError('')
    const cargar = async () => {
      try {
        const acceso = await api.verificarVideoToken(token, {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (acceso.valido !== true) {
          denegar()
          return
        }
        localStorage.setItem('video_token', token)
        setMensaje('Cargando videos...')
        const data = await api.getVideos({ token, signal: controller.signal })
        if (controller.signal.aborted) return
        if (data.some((video) => !getYouTubeId(video.url_youtube)))
          throw new Error('No se pudo preparar el catálogo de videos.')
        setVideos(ordenarVideos(data))
        setEstado('listo')
      } catch (err) {
        if (controller.signal.aborted) return
        if (err.status === 401 || err.status === 403) denegar()
        else {
          setError(err.message || 'No se pudieron cargar los videos.')
          setEstado('error')
        }
      }
    }
    cargar()
    return () => controller.abort()
  }, [reintento])

  return (
    <main className="videos-page">
      <div className="videos-bg-glow" aria-hidden="true" />
      <div className="videos-container">
        <header className="videos-header">
          <img src={logoVitaesentia} alt="Vitaesentia" />
          <h1>Descubre nuestros productos</h1>
          <p>Conoce más a través de nuestros videos.</p>
        </header>
        {estado === 'cargando' && (
          <div className="videos-feedback" role="status">
            {mensaje}
          </div>
        )}
        {estado === 'denegado' && (
          <section className="videos-feedback" role="alert">
            <h2>Acceso no disponible</h2>
            <p>
              Abre el enlace que recibiste después de completar el formulario de
              referido.
            </p>
            <a href="https://www.vitaesentia.com/">Ir a la página principal</a>
          </section>
        )}
        {estado === 'error' && (
          <section className="videos-feedback" role="alert">
            <h2>No pudimos cargar los videos</h2>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReintento((valor) => valor + 1)}
            >
              Reintentar
            </button>
          </section>
        )}
        {estado === 'listo' &&
          (videos.length === 0 ? (
            <section className="videos-feedback">
              <h2>Estamos preparando los videos</h2>
              <p>Vuelve a consultar este enlace más adelante.</p>
              <button
                type="button"
                onClick={() => setReintento((valor) => valor + 1)}
              >
                Actualizar videos
              </button>
            </section>
          ) : (
            <div className="videos-catalog">
              {videos.map((video, index) => (
                <article className="video-card" key={video.id}>
                  <div className="video-card-heading">
                    <span>Video {index + 1}</span>
                    <h2>{video.titulo}</h2>
                  </div>
                  <div className="youtube-frame-wrapper">
                    <iframe
                      src={
                        'https://www.youtube.com/embed/' +
                        getYouTubeId(video.url_youtube) +
                        '?rel=0'
                      }
                      title={video.titulo}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </article>
              ))}
            </div>
          ))}
        <footer className="videos-footer">
          © {new Date().getFullYear()} · Desarrollado por igrafic360.net
        </footer>
      </div>
    </main>
  )
}
