import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import LandingReferido from './components/LandingReferido'
import Login from './components/Login/Login'

// Componente para proteger rutas
function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem('admin_token') === 'authenticated'
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  // Detectar automáticamente el basename según el entorno
  const basename = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/'
    : '/VitaesentiaRef'

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/landing" element={<LandingReferido />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App