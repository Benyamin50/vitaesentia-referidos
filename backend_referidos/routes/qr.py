from flask import request, jsonify
from db import get_db
from models import Colaborador, Referido
import datetime
import requests
import secrets

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
        error_db = False
        db = None
        
        try:
            db = next(get_db())
            colab = db.query(Colaborador).filter(Colaborador.codigo_unico == ref).first()
            if colab:
                nombre_colaborador = colab.nombre
            
            if request.method == 'POST':
                referido_nombre = request.form.get('nombre', '').strip()
                referido_apellido = request.form.get('apellido', '').strip()
                referido_email = request.form.get('email', '').strip()
                referido_telefono = request.form.get('telefono', '').strip()
                
                if not referido_nombre or not referido_apellido or not referido_email or not referido_telefono:
                    mensaje = "Por favor complete todos los campos."
                elif colab:
                    ip = request.remote_addr
                    user_agent = request.headers.get('User-Agent', '')
                    pais, ciudad = obtener_geolocalizacion(ip)
                    tipo_dispositivo, sistema_op, navegador = analizar_user_agent(user_agent)
                    
                    ahora = datetime.datetime.utcnow()
                    hace_30_segundos = ahora - datetime.timedelta(seconds=30)
                    
                    ultimo_escaneo = db.query(Referido).filter(
                        Referido.colaborador_id == colab.id,
                        Referido.ip_address == ip,
                        Referido.fecha_scan > hace_30_segundos,
                        Referido.formulario_completado == 1
                    ).first()
                    
                    if not ultimo_escaneo:
                        token = secrets.token_urlsafe(32)
                        
                        referido = Referido(
                            colaborador_id=colab.id,
                            ip_address=ip,
                            user_agent=user_agent,
                            pais=pais,
                            ciudad=ciudad,
                            tipo_dispositivo=tipo_dispositivo,
                            sistema_operativo=sistema_op,
                            navegador=navegador,
                            referido_nombre=referido_nombre,
                            referido_apellido=referido_apellido,
                            referido_email=referido_email,
                            referido_telefono=referido_telefono,
                            formulario_completado=1,
                            video_token=token
                        )
                        db.add(referido)
                        db.commit()
                        
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
                    else:
                        mensaje = "Ya hemos recibido tus datos recientemente."
        
        except Exception as e:
            if db:
                db.rollback()
            print(f"====== ERROR DEL SISTEMA ====== \n{e}")
            mensaje = "Error del servidor guardando los datos."
            error_db = True

        finally:
            if db:
                db.close()
        
        if error_db:
            return f'''
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Error - Vitaesentia</title>
                <style>
                    body {{ font-family: sans-serif; min-height: 100vh; background-color: #F8FAFC; display: flex; align-items: center; justify-content: center; padding: 20px; }}
                    .card {{ background: white; border-radius: 24px; padding: 45px 35px; max-width: 420px; text-align: center; }}
                    h1 {{ color: #0F172A; }}
                    p {{ color: #64748B; }}
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>{mensaje}</h1>
                    <p>Por favor contacta soporte si el problema persiste.</p>
                </div>
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
                body {{
                    font-family: 'Inter', sans-serif;
                    min-height: 100vh;
                    background-color: #F8FAFC;
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px; position: relative; overflow-x: hidden;
                }}
                .bg-glow-1 {{ position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0,123,255,0.2) 0%, transparent 70%); top: -50px; left: -50px; filter: blur(40px); z-index: 0; }}
                .bg-glow-2 {{ position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(0,242,254,0.15) 0%, transparent 70%); bottom: -100px; right: -100px; filter: blur(50px); z-index: 0; }}
                
                .card {{
                    background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 24px;
                    padding: 40px; max-width: 450px; width: 100%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05); z-index: 1;
                }}
                
                h1 {{ text-align: center; color: #0F172A; font-size: 1.6rem; letter-spacing: -0.02em; margin-bottom: 8px; }}
                .subtitulo {{ text-align: center; color: #64748B; font-size: 0.9rem; margin-bottom: 25px; }}
                
                .referido-por {{
                    text-align: center; background: #EFF6FF; border: 1px solid #BFDBFE;
                    padding: 14px; border-radius: 12px; margin-bottom: 30px; font-size: 0.9rem; color: #334155;
                }}
                .referido-por strong {{ color: #007BFF; font-size: 1.05rem; display: block; margin-top: 4px; }}
                
                .form-group {{ margin-bottom: 20px; text-align: left; }}
                label {{ display: block; margin-bottom: 8px; font-weight: 600; font-size: 0.85rem; color: #334155; }}
                input {{
                    width: 100%; padding: 14px 16px; border: 1px solid #E2E8F0;
                    border-radius: 10px; font-size: 1rem; font-family: inherit;
                    background-color: #F8FAFC; transition: all 0.3s ease; outline: none;
                }}
                input:focus {{ border-color: #007BFF; background-color: #fff; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1); }}
                
                .btn-submit {{
                    width: 100%; background: #007BFF; color: white; border: none;
                    padding: 16px; border-radius: 12px; font-size: 1rem; font-weight: 600;
                    cursor: pointer; transition: all 0.3s; margin-top: 10px;
                    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.25);
                }}
                .btn-submit:hover {{ background: #0056b3; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 123, 255, 0.35); }}
                .footer {{ text-align: center; margin-top: 25px; color: #94A3B8; font-size: 0.75rem; }}
            </style>
        </head>
        <body>
            <div class="bg-glow-1"></div>
            <div class="bg-glow-2"></div>
            <div class="card">
                <h1>Bienvenido</h1>
                <p class="subtitulo">Completa tus datos para continuar</p>
                <div class="referido-por">
                    Has sido invitado por:
                    <strong>{nombre_colaborador}</strong>
                </div>
                <form method="POST">
                    <div class="form-group">
                        <label>Nombre(s)</label>
                        <input type="text" name="nombre" placeholder="Ej. Carlos" required>
                    </div>
                    <div class="form-group">
                        <label>Apellido(s)</label>
                        <input type="text" name="apellido" placeholder="Ej. Perez" required>
                    </div>
                    <div class="form-group">
                        <label>Correo Electronico</label>
                        <input type="email" name="email" placeholder="carlos@email.com" required>
                    </div>
                    <div class="form-group">
                        <label>Telefono</label>
                        <input type="tel" name="telefono" placeholder="+1 234 567 8900" required>
                    </div>
                    <button type="submit" class="btn-submit">Enviar mis datos</button>
                </form>
                <div class="footer">Vitaesentia - Distribuidor Oficial Saladmaster</div>
            </div>
        </body>
        </html>
        '''

    @app.route('/verificar-token', methods=['GET'])
    def verificar_token():
        token = request.args.get('token', '')
        
        if not token:
            return jsonify({"valido": False}), 400
        
        db = next(get_db())
        referido = db.query(Referido).filter(Referido.video_token == token).first()
        db.close()
        
        if referido:
            return jsonify({"valido": True})
        return jsonify({"valido": False}), 401