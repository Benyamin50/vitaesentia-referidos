from flask import jsonify
from sheets_api import get_colaboradores, get_referidos

def register_stats_routes(app):
    
    @app.route('/stats', methods=['GET'])
    def get_stats():
        try:
            colaboradores = get_colaboradores()
            # Nota: Si tu API de Sheets no tiene un "get_all_referidos", 
            # esto podría necesitar ajustes.
            return jsonify({
                "total_colaboradores": len(colaboradores),
                "total_referidos": 0 
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500