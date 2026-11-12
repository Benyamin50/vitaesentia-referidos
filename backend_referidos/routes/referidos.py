from flask import jsonify, request
from sheets_api import get_referidos

def register_referidos_routes(app):
    
    @app.route('/colaboradores/<string:colab_id>/referidos', methods=['GET'])
    def get_referidos_route(colab_id):
        # Llamamos a Google Sheets en lugar de MySQL
        refs = get_referidos(colab_id)
        return jsonify(refs)

    @app.route('/landing-data', methods=['GET'])
    def landing_data():
        ref = request.args.get('ref')
        if not ref:
            return jsonify({"error": "Se requiere parametro ref"}), 400
            
        return jsonify({
            "nombre_colaborador": "Colaborador de Prueba",
            "mensaje": f"Gracias por confiar en nosotros"
        })