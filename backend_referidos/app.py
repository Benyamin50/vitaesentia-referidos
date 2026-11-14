from flask import Flask, jsonify
from flask_cors import CORS
from config import ALLOWED_ORIGINS
from routes.colaboradores import register_colaboradores_routes
from routes.referidos import register_referidos_routes
from routes.stats import register_stats_routes
from routes.qr import register_qr_routes
from routes.videos import register_videos_routes

# Inicializar app
app = Flask(__name__)
CORS(app, origins=ALLOWED_ORIGINS)

# Registrar rutas
register_colaboradores_routes(app)
register_referidos_routes(app)
register_stats_routes(app)
register_qr_routes(app)
register_videos_routes(app)

# Ruta raíz
@app.route('/')
def root():
    return jsonify({
        "message": "API de Referidos - Vitaesentia",
        "status": "online"
    })

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port)
    # Version 2 - Render
