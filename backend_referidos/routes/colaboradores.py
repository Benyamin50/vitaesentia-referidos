from flask import jsonify, request
from sqlalchemy.orm import Session
from db import get_db
from models import Colaborador, Referido
from functools import wraps
import secrets

# ============================================
# DECORADOR DE AUTENTICACIÓN
# ============================================
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        codigo_header = request.headers.get('X-Colaborador-Codigo')
        
        if not auth_header or not codigo_header:
            return jsonify({"error": "No autorizado. Token requerido."}), 401
        
        token = auth_header.replace('Bearer ', '')
        
        db = next(get_db())
        colab = db.query(Colaborador).filter(Colaborador.codigo_unico == token).first()
        
        if not colab or colab.codigo_unico != codigo_header:
            return jsonify({"error": "Token inválido o expirado"}), 401
        
        return f(*args, **kwargs)
    return decorated

# ============================================
# REGISTRO DE RUTAS
# ============================================
def register_colaboradores_routes(app):
    
    # ============================================
    # ENDPOINT PÚBLICO - Verificar colaborador (para login)
    # ============================================
    @app.route('/verificar-colaborador', methods=['GET'])
    def verificar_colaborador():
        codigo = request.args.get('codigo')
        if not codigo:
            return jsonify({"error": "Código requerido"}), 400
        
        db = next(get_db())
        colab = db.query(Colaborador).filter(Colaborador.codigo_unico == codigo).first()
        
        if colab:
            return jsonify({
                "valido": True,
                "id": colab.id,
                "nombre": colab.nombre,
                "email": colab.email,
                "codigo": colab.codigo_unico,
                "rol": colab.rol if hasattr(colab, 'rol') else 'colaborador'
            })
        return jsonify({"valido": False, "error": "Código inválido"}), 401

    # ============================================
    # ENDPOINTS PROTEGIDOS (requieren autenticación)
    # ============================================
    
    @app.route('/colaboradores', methods=['GET'])
    @require_auth
    def get_colaboradores():
        db = next(get_db())
        cols = db.query(Colaborador).all()
        result = []
        for c in cols:
            total = db.query(Referido).filter(Referido.colaborador_id == c.id).count()
            result.append({
                "id": c.id,
                "nombre": c.nombre,
                "email": c.email,
                "codigo_unico": c.codigo_unico,
                "total_referidos": total
            })
        return jsonify(result)

    @app.route('/colaboradores', methods=['POST'])
    @require_auth
    def create_colaborador():
        data = request.json
        if not data or not data.get('nombre') or not data.get('email'):
            return jsonify({"error": "Nombre y email son requeridos"}), 400
        db = next(get_db())
        codigo = secrets.token_urlsafe(8)
        nuevo = Colaborador(nombre=data['nombre'], email=data['email'], codigo_unico=codigo)
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return jsonify({
            "id": nuevo.id,
            "nombre": nuevo.nombre,
            "email": nuevo.email,
            "codigo_unico": nuevo.codigo_unico
        })

    @app.route('/colaboradores/<int:colab_id>', methods=['PUT'])
    @require_auth
    def editar_colaborador(colab_id):
        data = request.json
        db = next(get_db())
        colab = db.query(Colaborador).filter(Colaborador.id == colab_id).first()
        if not colab:
            return jsonify({"error": "Colaborador no encontrado"}), 404
        if data.get('nombre'):
            colab.nombre = data['nombre']
        if data.get('email'):
            colab.email = data['email']
        db.commit()
        return jsonify({"message": "Actualizado correctamente"})

    @app.route('/colaboradores/<int:colab_id>', methods=['DELETE'])
    @require_auth
    def eliminar_colaborador(colab_id):
        db = next(get_db())
        colab = db.query(Colaborador).filter(Colaborador.id == colab_id).first()
        if not colab:
            return jsonify({"error": "Colaborador no encontrado"}), 404
        db.delete(colab)
        db.commit()
        return jsonify({"message": "Eliminado correctamente"})