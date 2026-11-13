from flask import jsonify, request, g
from requests import RequestException
from sheets_api import get_colaboradores, get_referidos
from routes.colaboradores import require_auth

def register_referidos_routes(app):

    @app.route('/colaboradores/id/<string:colaborador_id>/referidos', methods=['GET'])
    @require_auth
    def get_referidos_por_id_route(colaborador_id):
        # El ID permite consultar la ficha sin revelar el codigo de acceso del propietario.
        try:
            colaboradores = get_colaboradores()
            if not isinstance(colaboradores, list) or not all(
                isinstance(colab, dict) for colab in colaboradores
            ):
                raise ValueError('Lista de colaboradores invalida')
            propietario = next(
                (colab for colab in colaboradores if str(colab.get('id')) == colaborador_id),
                None,
            )
            if propietario is None:
                return jsonify({'error': 'Colaborador no encontrado'}), 404
            codigo = propietario.get('codigo_unico')
            if not codigo:
                raise ValueError('Colaborador sin codigo')
            refs = get_referidos(codigo)
            if not isinstance(refs, list) or not all(isinstance(ref, dict) for ref in refs):
                raise ValueError('Lista de referidos invalida')
        except (RequestException, ValueError):
            app.logger.exception('Error consultando referidos por ID')
            return jsonify({'error': 'No se pudieron consultar los referidos'}), 502

        # Solo datos de consulta: colaborador_id es una credencial y video_token es privado.
        campos_publicos = {
            'id', 'ip_address', 'user_agent', 'fecha_scan', 'pais', 'ciudad',
            'tipo_dispositivo', 'sistema_operativo', 'navegador', 'referido_nombre',
            'referido_apellido', 'referido_email', 'referido_telefono',
            'formulario_completado', 'acepto_datos', 'estado', 'observaciones',
        }
        return jsonify([
            {campo: valor for campo, valor in ref.items() if campo in campos_publicos}
            for ref in refs
        ])
    
    @app.route('/colaboradores/<string:colab_id>/referidos', methods=['GET'])
    @require_auth
    def get_referidos_route(colab_id):
        if g.colaborador.get('rol') != 'admin' and colab_id != g.colaborador_codigo:
            return jsonify({"error": "Solo puedes consultar tus propios referidos"}), 403
        try:
            refs = get_referidos(colab_id)
            if not isinstance(refs, list) or not all(isinstance(ref, dict) for ref in refs):
                raise ValueError('Lista de referidos inválida')
        except (RequestException, ValueError):
            app.logger.exception('Error consultando referidos')
            return jsonify({"error": "No se pudieron consultar los referidos"}), 502
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
