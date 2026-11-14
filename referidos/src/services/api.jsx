import { borrarCachesReferidos } from './referidosCache.js';

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
const handleResponse = async (response, { redirectOn401 = true } = {}) => {
  if (response.status === 401 && redirectOn401) {
    borrarCachesReferidos(localStorage);
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
    const failure = new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    failure.status = response.status;
    failure.code = error.code;
    throw failure;
  }
  const data = await response.json();
  if (data?.success === false || data?.error) {
    throw new Error(data.error || 'No se pudo completar la operación.');
  }
  return data;
};

export const api = {
  async verificarVideoToken(token, { signal } = {}) {
    const response = await fetch(`${API_BASE_URL}/verificar-token?token=${encodeURIComponent(token)}`, { signal });
    if (response.status === 400 || response.status === 401) return { valido: false };
    return handleResponse(response, { redirectOn401: false });
  },

  async getVideos({ token, signal } = {}) {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      headers: token ? { 'X-Video-Token': token } : getAuthHeaders(),
      signal
    });
    const data = await handleResponse(response, { redirectOn401: !token });
    if (!Array.isArray(data)) throw new Error('Lista de videos inválida.');
    return data;
  },

  async crearVideo(data) {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    const result = await handleResponse(response);
    if (!result.video?.id) throw new Error('No se recibió el video guardado. Actualiza el catálogo antes de reintentar.');
    return result.video;
  },

  async editarVideo(id, data) {
    const response = await fetch(`${API_BASE_URL}/videos/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    const result = await handleResponse(response);
    if (!result.video?.id) throw new Error('No se recibió el video guardado. Actualiza el catálogo antes de reintentar.');
    return result.video;
  },

  async eliminarVideo(id) {
    const response = await fetch(`${API_BASE_URL}/videos/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

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

  async getReferidos(colaboradorId, ultimoId = 0) {
    const response = await fetch(`${API_BASE_URL}/colaboradores/${encodeURIComponent(colaboradorId)}/referidos?ultimo_id=${encodeURIComponent(ultimoId)}`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    if (response.status === 204) return [];
    const data = await handleResponse(response);
    if (!Array.isArray(data)) throw new Error('Lista de referidos inválida.');
    return data;
  },

  getFormularioReferidoUrl(ref) {
    return `${API_BASE_URL}/qr?ref=${encodeURIComponent(ref)}`;
  },

  async getReferidosPorId(colaboradorId, ultimoId = 0) {
    const response = await fetch(
      `${API_BASE_URL}/colaboradores/id/${encodeURIComponent(colaboradorId)}/referidos?ultimo_id=${encodeURIComponent(ultimoId)}`,
      { headers: getAuthHeaders(), cache: 'no-store' }
    );
    if (response.status === 204) return [];
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
