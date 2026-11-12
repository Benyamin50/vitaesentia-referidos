from flask import request, jsonify
import datetime
import requests
import secrets
from sheets_api import verificar_colaborador, registrar_referido

def obtener_geolocalizacion(ip):
    try:
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
        ref = request.args.get('ref', '')
        nombre_colaborador = 'nuestro equipo'
        mensaje = None
        
        # Verificamos con Google Sheets
        colab_info = verificar_colaborador(ref)
        if colab_info.get("valido"):
            nombre_colaborador = colab_info.get("nombre", "nuestro equipo")
            
        if request.method == 'POST':
            referido_nombre = request.form.get('nombre', '').strip()
            referido_apellido = request.form.get('apellido', '').strip()
            referido_email = request.form.get('email', '').strip()
            referido_telefono = request.form.get('telefono', '').strip()
            
            if not referido_nombre or not referido_apellido or not referido_email or not referido_telefono:
                mensaje = "Por favor complete todos los campos."
            else:
                ip = request.remote_addr
                user_agent = request.headers.get('User-Agent', '')
                pais, ciudad = obtener_geolocalizacion(ip)
                tipo_dispositivo, sistema_op, navegador = analizar_user_agent(user_agent)
                
                token = secrets.token_urlsafe(32)
                
                # Enviamos a Google Sheets
                data_referido = {
                    "colaborador_id": ref,
                    "ip_address": ip,
                    "user_agent": user_agent,
                    "pais": pais,
                    "ciudad": ciudad,
                    "tipo_dispositivo": tipo_dispositivo,
                    "sistema_operativo": sistema_op,
                    "navegador": navegador,
                    "referido_nombre": referido_nombre,
                    "referido_apellido": referido_apellido,
                    "referido_email": referido_email,
                    "referido_telefono": referido_telefono,
                    "video_token": token
                }
                
                registrar_referido(data_referido)
                
                return f'''
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <script>
                        window.location.href = 'https://igrafic360.net/VitaesentiaRef/videos?token={token}';
                    </script>
                </head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px; color: #64748B;">
                    Cargando videos...
                </body>
                </html>
                '''
        
        return f'''
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Formulario de Referido - Vitaesentia</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: 'Inter', sans-serif; min-height: 100vh; background-color: #F8FAFC; display: flex; align-items: center; justify-content: center; padding: 20px; }}
                .card {{ background: white; border-radius: 24px; padding: 40px; max-width: 450px; width: 100%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05); }}
                h1 {{ text-align: center; color: #0F172A; font-size: 1.6rem; margin-bottom: 8px; }}
                .subtitulo {{ text-align: center; color: #64748B; font-size: 0.9rem; margin-bottom: 25px; }}
                .referido-por {{ text-align: center; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 14px; border-radius: 12px; margin-bottom: 30px; font-size: 0.9rem; color: #334155; }}
                .referido-por strong {{ color: #007BFF; font-size: 1.05rem; display: block; margin-top: 4px; }}
                .form-group {{ margin-bottom: 20px; text-align: left; }}
                label {{ display: block; margin-bottom: 8px; font-weight: 600; font-size: 0.85rem; color: #334155; }}
                input {{ width: 100%; padding: 14px 16px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 1rem; background-color: #F8FAFC; outline: none; }}
                .btn-submit {{ width: 100%; background: #007BFF; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 10px; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Bienvenido</h1>
                <p class="subtitulo">Completa tus datos para continuar</p>
                <div class="referido-por">Has sido invitado por: <strong>{nombre_colaborador}</strong></div>
                <form method="POST">
                    <div class="form-group"><label>Nombre(s)</label><input type="text" name="nombre" required></div>
                    <div class="form-group"><label>Apellido(s)</label><input type="text" name="apellido" required></div>
                    <div class="form-group"><label>Correo Electronico</label><input type="email" name="email" required></div>
                    <div class="form-group"><label>Telefono</label><input type="tel" name="telefono" required></div>
                    <button type="submit" class="btn-submit">Enviar mis datos</button>
                </form>
            </div>
        </body>
        </html>
        '''

    @app.route('/verificar-token', methods=['GET'])
    def verificar_token():
        token = request.args.get('token', '')
        if not token:
            return jsonify({"valido": False}), 400
            
        # Aquí podrías verificar en Google Sheets, pero por ahora devolvemos True
        return jsonify({"valido": True})