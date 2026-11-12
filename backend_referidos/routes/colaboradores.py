from flask import jsonify, request
from functools import wraps
from requests import RequestException
import secrets
from sheets_api import (
    get_colaboradores, 
    crear_colaborador, 
    verificar_colaborador, 
    editar_colaborador, 
    eliminar_colaborador,
    editar_referido
)

# ============================================
# DECORADOR DE AUTENTICACIÓN (Temporal)
# ============================================
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated

# ============================================
# REGISTRO DE RUTAS
# ============================================
def register_colaboradores_routes(app):
    
    @app.route('/verificar-colaborador', methods=['GET'])
    def verificar_colaborador_route():
        codigo = request.args.get('codigo')
        if not codigo:
            return jsonify({"error": "Código requerido"}), 400
        
        resultado = verificar_colaborador(codigo)
        if resultado.get("valido"):
            return jsonify(resultado)
        return jsonify({"valido": False, "error": "Código inválido"}), 401

    @app.route('/colaboradores', methods=['GET'])
    def get_colaboradores_route():
        cols = get_colaboradores()
        return jsonify(cols)

    @app.route('/colaboradores', methods=['POST'])
    def create_colaborador_route():
        data = request.json
        if not data or not data.get('nombre') or not data.get('email'):
            return jsonify({"error": "Nombre y email son requeridos"}), 400
        
        codigo = secrets.token_urlsafe(8)
        crear_colaborador(data['nombre'], data['email'])
        
        return jsonify({
            "nombre": data['nombre'],
            "email": data['email'],
            "codigo_unico": codigo,
            "status": "creado en google sheets"
        })

    @app.route('/colaboradores/<int:colab_id>', methods=['PUT'])
    def editar_colaborador_route(colab_id):
        data = request.json
        if not data:
            return jsonify({"error": "Datos requeridos"}), 400
        
        # AQUÍ LLAMAMOS A LA FUNCIÓN REAL QUE VA A GOOGLE SHEETS
        resultado = editar_colaborador(colab_id, data.get('nombre'), data.get('email'))
        
        if resultado.get('success'):
            return jsonify({"message": "Actualizado correctamente"})
        return jsonify({"error": resultado.get('error', 'Error al actualizar')}), 400

    @app.route('/colaboradores/<int:colab_id>', methods=['DELETE'])
    def eliminar_colaborador_route(colab_id):
        # AQUÍ LLAMAMOS A LA FUNCIÓN REAL QUE VA A GOOGLE SHEETS
        resultado = eliminar_colaborador(colab_id)
        
        if resultado.get('success'):
            return jsonify({"message": "Eliminado correctamente"})
        return jsonify({"error": resultado.get('error', 'Error al eliminar')}), 400

    @app.route('/referidos/<string:referido_id>', methods=['PUT'])
    def editar_referido_route(referido_id):
        autorizacion = request.headers.get('Authorization', '').split()

        if len(autorizacion) != 2 or autorizacion[0].lower() != 'bearer':
            return jsonify({"error": "Autenticación requerida"}), 401

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({"error": "Se requiere un objeto JSON"}), 400

        estado = data.get('estado')
        observaciones = data.get('observaciones')
        estados_permitidos = {
            '', 'Agendado', 'Cocinado', 'Vendido', 'Contactado'
        }

        if not isinstance(estado, str) or estado not in estados_permitidos:
            return jsonify({"error": "Estado inválido"}), 400

        if not isinstance(observaciones, str) or len(observaciones) > 5000:
            return jsonify({
                "error": "Las observaciones deben tener hasta 5000 caracteres"
            }), 400

        try:
            usuario = verificar_colaborador(autorizacion[1])

            if not usuario.get('valido'):
                return jsonify({"error": "Código inválido"}), 401

            if usuario.get('rol') != 'admin':
                return jsonify({
                    "error": "Solo el administrador puede editar referidos"
                }), 403

            resultado = editar_referido(
                referido_id,
                estado,
                observaciones
            )
        except (RequestException, ValueError, RuntimeError):
            app.logger.exception('Error al editar referido')
            return jsonify({
                "error": "No se pudo completar el guardado. Intenta nuevamente."
            }), 502

        if not resultado.get('success'):
            status = 404 if resultado.get('code') == 'NOT_FOUND' else 502
            return jsonify({
                "error": resultado.get('error', 'Error al guardar')
            }), status

        return jsonify(resultado)
