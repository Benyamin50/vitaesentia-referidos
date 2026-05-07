import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import './Login.css'

export default function Login() {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const codigoLimpio = codigo.trim()

    if (!codigoLimpio) {
      setError('Por favor ingresa tu código')
      setLoading(false)
      return
    }

    try {
      const tiempoInicio = Date.now();
      const data = await api.verificarColaborador(codigoLimpio)
      
      const tiempoTranscurrido = Date.now() - tiempoInicio;
      if (tiempoTranscurrido < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - tiempoTranscurrido));
      }

      if (data.valido) {
        localStorage.setItem('admin_token', 'authenticated')
        localStorage.setItem('colaborador_codigo', data.codigo)
        localStorage.setItem('colaborador_nombre', data.nombre)
        localStorage.setItem('colaborador_id', data.id)
        localStorage.setItem('colaborador_email', data.email)
        localStorage.setItem('colaborador_rol', data.rol || 'colaborador') 
        
        navigate('/')
      } else {
        setError('Código inválido. Verifica e intenta nuevamente.')
      }
    } catch (err) {
      console.error('Error de login:', err)
      setError(err.message || 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="vitae-login-container">
      <div className="vitae-login-glow"></div>

      <div className="vitae-login-card">
        <div className="vitae-login-brand">
          <div className="vitae-logo-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        </div>

        <h1>Vitaesentia</h1>
        <p className="login-subtitle">Panel de Control de Colaboradores</p>

        <form onSubmit={handleSubmit}>
          <div className="vitae-login-input-group">
            <label>Código de acceso seguro</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
              </svg>
              <input
                type="text"
                placeholder="Ej. YsLtDiI0MTg"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="vitae-login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={loading ? 'loading-btn' : ''}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Autenticando...
              </>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        <div className="vitae-login-footer">
          <small>¿Problemas para ingresar? <span className="link-falso">Contactate con el Administrador</span></small>
        </div>
      </div>
    </div>
  )
}