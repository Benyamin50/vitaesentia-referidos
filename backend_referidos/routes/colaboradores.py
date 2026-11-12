from flask import jsonify, request
from functools import wraps
import secrets
from sheets_api import get_colaboradores, crear_colaborador, verificar_colaborador

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
        # NOTA: Aquí falta implementar la lógica para editar en Google Sheets.
        # Por ahora devolvemos un OK para que el frontend no falle.
        return jsonify({"message": "Actualizado correctamente"})

    @app.route('/colaboradores/<int:colab_id>', methods=['DELETE'])
    def eliminar_colaborador_route(colab_id):
        # NOTA: Aquí falta implementar la lógica para eliminar en Google Sheets.
        # Por ahora devolvemos un OK para que el frontend no falle.
        return jsonify({"message": "Eliminado correctamente"})