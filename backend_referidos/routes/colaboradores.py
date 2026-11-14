from flask import jsonify, request, g, current_app
from functools import wraps
from requests import RequestException
from sheets_api import (
    get_colaboradores, 
    crear_colaborador, 
    verificar_colaborador, 
    editar_colaborador, 
    eliminar_colaborador,
    editar_referido,
    get_referidos
)

# ============================================
# AUTENTICACIÓN Y PERMISOS
# ============================================
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        autorizacion = request.headers.get('Authorization', '').split()
        if len(autorizacion) != 2 or autorizacion[0].lower() != 'bearer':
            return jsonify({"error": "Autenticación requerida"}), 401
        try:
            usuario = verificar_colaborador(autorizacion[1])
            if not isinstance(usuario, dict):
                raise ValueError('Respuesta de autenticación inválida')
        except (RequestException, ValueError):
            current_app.logger.exception('Error verificando autenticación')
            return jsonify({"error": "No se pudo verificar la sesión"}), 502
        if not usuario.get('valido'):
            return jsonify({"error": "Código inválido"}), 401
        g.colaborador = usuario
        g.colaborador_codigo = autorizacion[1]
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if g.colaborador.get('rol') != 'admin':
            return jsonify({"error": "Solo el administrador puede realizar esta acción"}), 403
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
    @require_auth
    def get_colaboradores_route():
        try:
            cols = get_colaboradores()
            if not isinstance(cols, list) or not all(isinstance(col, dict) for col in cols):
                raise ValueError('Lista de colaboradores inválida')
        except (RequestException, ValueError):
            app.logger.exception('Error consultando colaboradores')
            return jsonify({"error": "No se pudieron consultar los colaboradores"}), 502
        if g.colaborador.get('rol') != 'admin':
            campos_directorio = (
                'id', 'nombre', 'email', 'fecha_registro', 'rol', 'total_referidos'
            )
            directorio = []
            for col in cols:
                perfil = {campo: col[campo] for campo in campos_directorio if campo in col}
                if str(col.get('codigo_unico', '')) == g.colaborador_codigo:
                    perfil['codigo_unico'] = g.colaborador_codigo
                directorio.append(perfil)
            cols = directorio
        return jsonify(cols)

    @app.route('/colaboradores', methods=['POST'])
    @require_admin
    def create_colaborador_route():
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not all(
            isinstance(data.get(campo), str) and data[campo].strip()
            for campo in ('nombre', 'email')
        ):
            return jsonify({"error": "Nombre y email son requeridos"}), 400

        nombre, email = data['nombre'].strip(), data['email'].strip()
        try:
            resultado = crear_colaborador(nombre, email)
            if not isinstance(resultado, dict):
                raise ValueError('Respuesta de creacion invalida')
            if resultado.get('success') is False or resultado.get('error'):
                return jsonify({'error': resultado.get('error') or 'No se pudo crear el colaborador'}), 502
            creado = resultado.get('colaborador', resultado.get('data', resultado))
            if not isinstance(creado, dict):
                raise ValueError('Colaborador creado invalido')
            codigo = creado.get('codigo_unico') or creado.get('codigo')
            if resultado.get('success') is not True and not codigo:
                raise ValueError('Creacion no confirmada por Apps Script')
            if creado.get('id') is None or not codigo:
                # Compatibilidad con Apps Script que solo devuelve success o codigo.
                cols = get_colaboradores()
                if not isinstance(cols, list) or not all(isinstance(col, dict) for col in cols):
                    raise ValueError('Lista de colaboradores invalida')
                coincidencias = [col for col in cols if (
                    str(col.get('codigo_unico', '')) == str(codigo) if codigo else
                    col.get('nombre') == nombre and col.get('email') == email
                )]
                if len(coincidencias) != 1:
                    raise ValueError('No se pudo identificar el colaborador creado')
                creado = coincidencias[0]
                codigo = creado.get('codigo_unico')
            if creado.get('id') is None or not codigo:
                raise ValueError('Faltan ID o codigo del colaborador creado')
        except (RequestException, ValueError):
            app.logger.exception('Error creando colaborador')
            return jsonify({'error': 'No se pudo confirmar la creacion. Actualiza los datos antes de volver a intentarlo.'}), 502

        return jsonify({
            'nombre': nombre, 'email': email, 'rol': 'colaborador',
            'total_referidos': 0, **creado, 'codigo_unico': codigo,
        })

    @app.route('/colaboradores/<int:colab_id>', methods=['PUT'])
    @require_admin
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
    @require_admin
    def eliminar_colaborador_route(colab_id):
        # AQUÍ LLAMAMOS A LA FUNCIÓN REAL QUE VA A GOOGLE SHEETS
        resultado = eliminar_colaborador(colab_id)
        
        if resultado.get('success'):
            return jsonify({"message": "Eliminado correctamente"})
        return jsonify({"error": resultado.get('error', 'Error al eliminar')}), 400

    @app.route('/referidos/<string:referido_id>', methods=['PUT'])
    @require_auth
    def editar_referido_route(referido_id):
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
            if g.colaborador.get('rol') != 'admin':
                propios = get_referidos(g.colaborador_codigo)
                if not isinstance(propios, list) or not all(isinstance(ref, dict) for ref in propios):
                    raise ValueError('Lista de referidos inválida')
                if not any(str(ref.get('id', '')) == referido_id for ref in propios):
                    return jsonify({
                        "error": "Solo puedes gestionar tus propios referidos"
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
