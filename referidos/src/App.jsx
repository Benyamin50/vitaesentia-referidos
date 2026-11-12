import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import LandingReferido from './components/LandingReferido'
import Login from './components/Login/Login'
import PaginaVideos from './components/PaginaVideos/PaginaVideos'

function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem('admin_token') === 'authenticated'
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  const basename = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/'
    : '/vitaesentiaref'

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/landing" element={<LandingReferido />} />
        <Route path="/videos-referidos" element={<PaginaVideos />} />  {/* ← CAMBIO */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App