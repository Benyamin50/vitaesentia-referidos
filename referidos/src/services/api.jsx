// ✅ Para desarrollo (React en localhost, API en cPanel)
const API_BASE_URL = 'https://igrafic360.net/referidos-api';

// Obtener el código del colaborador desde localStorage
const getAuthHeaders = () => {
  const codigo = localStorage.getItem('colaborador_codigo');
  if (codigo) {
    return {
      'Authorization': `Bearer ${codigo}`,
      'X-Colaborador-Codigo': codigo,
      'Content-Type': 'application/json'
    };
  }
  return { 'Content-Type': 'application/json' };
};

// Función auxiliar para manejar errores
const handleResponse = async (response) => {
  if (response.status === 401) {
    // No autorizado - redirigir al login
    localStorage.removeItem('admin_token');
    localStorage.removeItem('colaborador_codigo');
    localStorage.removeItem('colaborador_nombre');
    localStorage.removeItem('colaborador_rol');
    localStorage.removeItem('colaborador_id');
    localStorage.removeItem('colaborador_email');
    // ✅ CAMBIA ESTA LÍNEA:
    window.location.href = '/VitaesentiaRef/login';
    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const api = {
  async getColaboradores() {
    const response = await fetch(`${API_BASE_URL}/colaboradores`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async crearColaborador(data) {
    const response = await fetch(`${API_BASE_URL}/colaboradores`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async getReferidos(colaboradorId) {
    const response = await fetch(`${API_BASE_URL}/colaboradores/${colaboradorId}/referidos`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async registrarReferido(ref) {
    const response = await fetch(`${API_BASE_URL}/landing-data?ref=${ref}`);
    return handleResponse(response);
  },

  async editarColaborador(id, data) {
    const response = await fetch(`${API_BASE_URL}/colaboradores/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async eliminarColaborador(id) {
    const response = await fetch(`${API_BASE_URL}/colaboradores/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async verificarColaborador(codigo) {
    const response = await fetch(`${API_BASE_URL}/verificar-colaborador?codigo=${codigo}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Código inválido');
    }
    return response.json();
  }
};