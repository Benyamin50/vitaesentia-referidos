from flask import request, jsonify, redirect, render_template, current_app, make_response
from itsdangerous import URLSafeSerializer, BadSignature
from urllib.parse import urlencode
import os
import re
import requests
import secrets
from sheets_api import verificar_colaborador, registrar_referido, verificar_video_token


def _firmador_formulario():
    secreto = (
        current_app.config.get('FORM_SIGNING_SECRET')
        or os.environ.get('FORM_SIGNING_SECRET')
        or os.environ.get('APPS_SCRIPT_EDIT_SECRET')
    )
    if not secreto:
        raise RuntimeError('Falta configurar FORM_SIGNING_SECRET o APPS_SCRIPT_EDIT_SECRET')
    return URLSafeSerializer(secreto, salt='referidos-form-v1')


def _validar_estado_formulario(estado, ref, submission_id):
    if (
        not isinstance(estado, dict)
        or estado.get('ref') != ref
        or estado.get('submission_id') != submission_id
        or not re.fullmatch(r'[A-Za-z0-9_-]{32,128}', str(submission_id))
        or not re.fullmatch(r'[A-Za-z0-9_-]{32,128}', str(estado.get('video_token', '')))
    ):
        raise BadSignature('Estado del formulario inválido')

def obtener_geolocalizacion(ip):
    try:
        # Si la IP es local, no intentes buscar (para que no dé error)
        if not ip or ip == '127.0.0.1' or ip.startswith('192.168.') or ip.startswith('10.'):
            return '', ''
            
        response = requests.get(f'http://ip-api.com/json/{ip}?fields=status,country,city', timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return data.get('country', ''), data.get('city', '')
    except:
        pass
    return '', ''

def analizar_user_agent(user_agent):
    tipo = 'desktop'
    sistema = 'desconocido'
    navegador = 'desconocido'
    user_agent_lower = user_agent.lower()
    
    if 'mobile' in user_agent_lower or 'android' in user_agent_lower:
        tipo = 'movil'
    elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
        tipo = 'tablet'
    
    if 'android' in user_agent_lower:
        sistema = 'Android'
    elif 'ios' in user_agent_lower or 'iphone' in user_agent_lower:
        sistema = 'iOS'
    elif 'windows' in user_agent_lower:
        sistema = 'Windows'
    elif 'mac' in user_agent_lower:
        sistema = 'macOS'
    
    if 'chrome' in user_agent_lower and 'edg' not in user_agent_lower:
        navegador = 'Chrome'
    elif 'firefox' in user_agent_lower:
        navegador = 'Firefox'
    elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
        navegador = 'Safari'
    elif 'edg' in user_agent_lower:
        navegador = 'Edge'
    
    return tipo, sistema, navegador

def register_qr_routes(app):

    @app.route('/qr', methods=['GET', 'POST'])
    def qr():
        ref = request.args.get('ref', '').strip()
        datos = {campo: request.form.get(campo, '').strip() for campo in ('nombre', 'apellido', 'email', 'telefono')}
        acepto_datos = request.form.get('acepto_datos') == '1'
        mensaje = None
        status = 200
        nombre_colaborador = 'nuestro equipo'
        habilitado = True
        submission_token = request.form.get('submission_token', '')
        submission_id = request.form.get('submission_id', '')
        estado = None

        try:
            firmador = _firmador_formulario()
            if request.method == 'POST':
                estado = firmador.loads(submission_token)
                _validar_estado_formulario(estado, ref, submission_id)
            else:
                estado = {
                    'ref': ref,
                    'submission_id': secrets.token_urlsafe(24),
                    'video_token': secrets.token_urlsafe(32),
                }
                submission_id = estado['submission_id']
                submission_token = firmador.dumps(estado)
        except BadSignature:
            mensaje = 'Este formulario no es válido. Vuelve a abrirlo desde el enlace de invitación.'
            status, habilitado = 400, False
        except RuntimeError:
            app.logger.exception('No se pudo preparar el formulario de referido')
            mensaje = 'El formulario no está disponible temporalmente. Intenta nuevamente más tarde.'
            status, habilitado = 503, False

        if habilitado:
            try:
                colab_info = verificar_colaborador(ref)
                if not isinstance(colab_info, dict) or colab_info.get('valido') is not True:
                    mensaje = 'El código de invitación no es válido.'
                    status, habilitado = 404, False
                else:
                    nombre_colaborador = colab_info.get('nombre') or nombre_colaborador
            except (requests.RequestException, ValueError):
                app.logger.exception('No se pudo verificar la invitación')
                mensaje = 'No pudimos verificar la invitación. Intenta enviar tus datos nuevamente.'
                status = 502

        if request.method == 'POST' and habilitado and mensaje is None:
            if not all(datos.values()):
                mensaje, status = 'Por favor completa todos los campos.', 400
            elif not acepto_datos:
                mensaje, status = 'Debes aceptar la política de protección de datos para continuar.', 400
            else:
                ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()
                user_agent = request.headers.get('User-Agent', '')
                pais, ciudad = obtener_geolocalizacion(ip)
                tipo_dispositivo, sistema_op, navegador = analizar_user_agent(user_agent)
                data_referido = {
                    'submission_id': estado['submission_id'],
                    'colaborador_id': ref,
                    'ip': ip,
                    'user_agent': user_agent,
                    'pais': pais,
                    'ciudad': ciudad,
                    'tipo_dispositivo': tipo_dispositivo,
                    'sistema_operativo': sistema_op,
                    'navegador': navegador,
                    'referido_nombre': datos['nombre'],
                    'referido_apellido': datos['apellido'],
                    'referido_email': datos['email'],
                    'referido_telefono': datos['telefono'],
                    'video_token': estado['video_token'],
                    'acepto_datos': 1,
                }
                try:
                    resultado = registrar_referido(data_referido)
                    if not isinstance(resultado, dict) or resultado.get('success') is not True or resultado.get('error'):
                        raise ValueError('Guardado no confirmado')
                    # En una repetición, Apps Script devuelve el token del registro existente.
                    token = resultado.get('video_token', estado['video_token'])
                    if not isinstance(token, str) or not re.fullmatch(r'[A-Za-z0-9_-]{32,128}', token):
                        raise ValueError('Token guardado inválido')
                except (requests.RequestException, ValueError):
                    app.logger.exception('No se pudo confirmar el registro del referido')
                    mensaje = 'No pudimos confirmar el guardado. Reintenta con este mismo formulario; se conservará el identificador de tu envío.'
                    status = 502
                else:
                    response = redirect(
                        'https://www.vitaesentia.com/vitaesentiaref/videos-referidos?' + urlencode({'token': token}),
                        code=303,
                    )
                    response.headers['Cache-Control'] = 'no-store'
                    return response

        response = make_response(render_template(
            'formulario_referido.html',
            ref=ref,
            nombre_colaborador=nombre_colaborador,
            datos=datos,
            acepto_datos=acepto_datos,
            submission_id=submission_id,
            submission_token=submission_token,
            mensaje=mensaje,
            habilitado=habilitado,
        ), status)
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.route('/verificar-token', methods=['GET'])
    def verificar_token():
        token = request.args.get('token', '')
        if not token:
            return jsonify({"valido": False}), 400
        try:
            valido = verificar_video_token(token)
        except (requests.RequestException, ValueError):
            app.logger.exception('Error verificando acceso a videos')
            return jsonify({'error': 'No se pudo verificar el acceso. Intenta nuevamente.'}), 502
        return jsonify({'valido': valido}), 200 if valido else 401
