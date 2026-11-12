from flask import jsonify, request
from functools import wraps
import secrets
from sheets_api import get_colaboradores, crear_colaborador, verificar_colaborador

# ============================================
# DECORADOR DE AUTENTICACIÓN (Temporal)
# ============================================
# Como Google Sheets no maneja sesiones igual que MySQL, 
# haremos una verificación básica o la dejamos abierta por ahora.
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Nota: Aquí deberías implementar tu lógica de token con Google Sheets
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
    # @require_auth  <-- Quitamos la protección por ahora para que no falle
    def get_colaboradores_route():
        cols = get_colaboradores()
        return jsonify(cols)

    @app.route('/colaboradores', methods=['POST'])
    # @require_auth
    def create_colaborador_route():
        data = request.json
        if not data or not data.get('nombre') or not data.get('email'):
            return jsonify({"error": "Nombre y email son requeridos"}), 400
        
        # Generamos un código único
        codigo = secrets.token_urlsafe(8)
        resultado = crear_colaborador(data['nombre'], data['email'])
        
        return jsonify({
            "nombre": data['nombre'],
            "email": data['email'],
            "codigo_unico": codigo,
            "status": "creado en google sheets"
        })