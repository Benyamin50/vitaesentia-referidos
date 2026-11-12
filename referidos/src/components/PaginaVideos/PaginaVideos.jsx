import { useEffect, useState } from 'react'
import './PaginaVideos.css'

export default function PaginaVideos() {
  const [videoActivo, setVideoActivo] = useState(0)
  const [autorizado, setAutorizado] = useState(false)
  const [cargando, setCargando] = useState(true)

  const basePath = '/vitaesentiaref'

  useEffect(() => {
    // 1. Atrapamos el token de la URL
    const urlParams = new URLSearchParams(window.location.search)
    let token = urlParams.get('token')
    
    // 2. Si no hay en URL, buscar en localStorage (por si recarga)
    if (!token) {
      token = localStorage.getItem('video_token')
    }
    
    // 3. Si de plano no hay token, a la principal
    if (!token) {
      window.location.href = 'https://www.vitaesentia.com/'
      return
    }
    
    // 4. Guardamos el token para que no se pierda
    localStorage.setItem('video_token', token)
    
    // 5. Verificamos con Render
    fetch(`https://vitaesentia-referidos.onrender.com/verificar-token?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valido) {
          setAutorizado(true)
        } else {
          localStorage.removeItem('video_token')
          window.location.href = 'https://www.vitaesentia.com/'
        }
      })
      .catch(() => {
        // Si Render falla o tarda, no te sacamos (te dejamos ver los videos)
        setAutorizado(true) 
      })
      .finally(() => setCargando(false))
  }, []) // El arreglo vacío evita que se ejecute dos veces

  const videos = [
    { id: 1, titulo: '1. Introducción Colaboradores', src: `${basePath}/videos/video1.mp4` },
    { id: 2, titulo: '2. Nutrientes: Prueba, Enemigos y Nutrición', src: `${basePath}/videos/video2.mp4` },
    { id: 3, titulo: '3. Contaminación: Prueba y conclusiones', src: `${basePath}/videos/video3.mp4` },
  ]

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#64748B', fontSize: '1rem' }}>
        Verificando acceso...
      </div>
    )
  }

  if (!autorizado) {
    return null
  }

  return (
    <div className="videos-page">
      <div className="videos-bg-glow-1"></div>
      <div className="videos-bg-glow-2"></div>

      <div className="videos-container">
        <div className="video-player-layout">
          <div className="video-principal">
            <h3>{videos[videoActivo].titulo}</h3>
            <div className="video-wrapper-grande">
              <video 
                key={videos[videoActivo].src}
                controls 
                autoPlay
                preload="metadata"
              >
                <source src={videos[videoActivo].src} type="video/mp4" />
                Tu navegador no soporta video HTML5.
              </video>
            </div>
          </div>

          <div className="video-lista">
            <h4 className="lista-titulo">Más videos</h4>
            <div className="video-lista-scroll">
              {videos.map((video, index) => (
                <div 
                  key={video.id}
                  className={`video-miniatura ${index === videoActivo ? 'activa' : ''}`}
                  onClick={() => setVideoActivo(index)}
                >
                  <div className="miniatura-thumb">
                    <video preload="metadata" muted>
                      <source src={video.src} type="video/mp4" />
                    </video>
                    <div className="play-overlay">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  </div>
                  <div className="miniatura-info">
                    <p className="miniatura-titulo">{video.titulo}</p>
                    <span className="miniatura-numero">Video {index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="videos-footer">
          © 2026 igrafic360 - Sistema de Referidos. Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}