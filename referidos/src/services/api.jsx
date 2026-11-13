// ✅ API de Referidos en Render
const API_BASE_URL = 'https://vitaesentia-referidos.onrender.com';

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
    localStorage.removeItem('admin_token');
    localStorage.removeItem('colaborador_codigo');
    localStorage.removeItem('colaborador_nombre');
    localStorage.removeItem('colaborador_rol');
    localStorage.removeItem('colaborador_id');
    localStorage.removeItem('colaborador_email');
    window.location.href = '/vitaesentiaref/login';
    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (data?.success === false || data?.error) {
    throw new Error(data.error || 'No se pudo completar la operación.');
  }
  return data;
};

export const api = {
  async getColaboradores() {
    const response = await fetch(`${API_BASE_URL}/colaboradores`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    if (!Array.isArray(data)) throw new Error('Lista de colaboradores inválida.');
    return data;
  },

  async crearColaborador(data) {
    const response = await fetch(`${API_BASE_URL}/colaboradores`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const resultado = await handleResponse(response);
    const colaborador = resultado.colaborador || resultado.data || resultado;
    const codigo = colaborador.codigo_unico || colaborador.codigo;
    if (colaborador.id == null || !codigo) {
      throw new Error('La respuesta no contiene el ID y código del colaborador. Usa Actualizar datos para comprobar su creación.');
    }
    return { ...colaborador, codigo_unico: codigo };
  },

  async getReferidos(colaboradorId) {
    const response = await fetch(`${API_BASE_URL}/colaboradores/${encodeURIComponent(colaboradorId)}/referidos`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    if (!Array.isArray(data)) throw new Error('Lista de referidos inválida.');
    return data;
  },

  async registrarReferido(ref) {
    const response = await fetch(`${API_BASE_URL}/landing-data?ref=${ref}`);
    return handleResponse(response);
  },

  async getReferidosPorId(colaboradorId) {
    const response = await fetch(
      `${API_BASE_URL}/colaboradores/id/${encodeURIComponent(colaboradorId)}/referidos`,
      { headers: getAuthHeaders() }
    );
    const data = await handleResponse(response);
    if (!Array.isArray(data)) throw new Error('Lista de referidos inválida.');
    return data;
  },

  async editarColaborador(id, data) {
    const response = await fetch(`${API_BASE_URL}/colaboradores/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async editarReferido(id, data) {
    const response = await fetch(
      `${API_BASE_URL}/referidos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }
    );
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
