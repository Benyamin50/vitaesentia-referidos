import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import './CardMensaje.css'

export default function CardMensaje({ nombreColaborador, codigoReferido }) {
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (codigoReferido) {
      api.registrarReferido(codigoReferido).catch(err => console.error('Error:', err))
    }
  }, [codigoReferido])

  return (
    <div className="card-container">
      <div className="card">
        <div className="icono">💚</div>
        <h1>¡Gracias por confiar en nosotros!</h1>
        <p>Has sido referido por <strong>{nombreColaborador}</strong></p>
        <a 
          href="https://www.vitaesentia.com/area-de-clientes-2/" 
          className="btn-login"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ir a Iniciar Sesión
        </a>
      </div>
    </div>
  )
}