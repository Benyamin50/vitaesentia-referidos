import { api } from '../../services/api'
import './CardMensaje.css'

export default function CardMensaje({ nombreColaborador, codigoReferido }) {
  return (
    <div className="card-container">
      <div className="card">
        <div className="icono">💚</div>
        <h1>Completa tu registro</h1>
        <p>
          Has sido referido por <strong>{nombreColaborador}</strong>
        </p>
        {codigoReferido ? (
          <a
            href={api.getFormularioReferidoUrl(codigoReferido)}
            className="btn-login"
          >
            Completar mis datos
          </a>
        ) : (
          <p role="alert">
            El enlace de invitación no contiene un código válido.
          </p>
        )}
      </div>
    </div>
  )
}
