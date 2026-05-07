import { useSearchParams } from 'react-router-dom'
import CardMensaje from './CardMensaje/CardMensaje'

export default function LandingReferido() {
  const [searchParams] = useSearchParams()
  const codigo = searchParams.get('ref')
  const nombre = searchParams.get('nombre') || 'un colaborador'

  return <CardMensaje nombreColaborador={nombre} codigoReferido={codigo} />
}