from flask import jsonify
from db import get_db
from models import Colaborador, Referido
from routes.colaboradores import require_auth

def register_stats_routes(app):
    
    @app.route('/stats', methods=['GET'])
    @require_auth
    def get_stats():
        db = next(get_db())
        total_colaboradores = db.query(Colaborador).count()
        total_referidos = db.query(Referido).count()
        return jsonify({
            "total_colaboradores": total_colaboradores,
            "total_referidos": total_referidos
        })