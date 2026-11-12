from flask import jsonify, request
from db import get_db
from models import Referido, Colaborador
from routes.colaboradores import require_auth

def register_referidos_routes(app):
    
    # Endpoint protegido (requiere autenticación)
    @app.route('/colaboradores/<int:colab_id>/referidos', methods=['GET'])
    @require_auth
    def get_referidos(colab_id):
        db = next(get_db())
        refs = db.query(Referido).filter(Referido.colaborador_id == colab_id).all()
        return jsonify([{
            "id": r.id,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "fecha_scan": r.fecha_scan.strftime('%Y-%m-%d %H:%M:%S') if r.fecha_scan else None,
            # ========== GEOLOCALIZACIÓN ==========
            "pais": r.pais,
            "ciudad": r.ciudad,
            "sistema_operativo": r.sistema_operativo,
            "navegador": r.navegador,
            "tipo_dispositivo": r.tipo_dispositivo,
            # ========== DATOS DEL FORMULARIO ==========
            "referido_nombre": r.referido_nombre,
            "referido_apellido": r.referido_apellido,
            "referido_email": r.referido_email,
            "referido_telefono": r.referido_telefono,
            "formulario_completado": r.formulario_completado
        } for r in refs])

    # Endpoint público (para registrar referidos desde el QR)
    @app.route('/landing-data', methods=['GET'])
    def landing_data():
        ref = request.args.get('ref')
        if not ref:
            return jsonify({"error": "Se requiere parametro ref"}), 400
        db = next(get_db())
        colab = db.query(Colaborador).filter(Colaborador.codigo_unico == ref).first()
        if not colab:
            return jsonify({"error": "Codigo invalido"}), 404
        
        # Registrar el referido (solo IP y User-Agent, el formulario se guarda en /qr)
        referido = Referido(
            colaborador_id=colab.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        db.add(referido)
        db.commit()
        
        return jsonify({
            "nombre_colaborador": colab.nombre,
            "mensaje": f"Gracias por confiar en {colab.nombre}"
        })