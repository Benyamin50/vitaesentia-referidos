import requests
import os

APPS_SCRIPT_URL = os.environ.get(
    'APPS_SCRIPT_URL', 
    'https://script.google.com/macros/s/AKfycbzB1wwdhov8u1wJjv-OnfR-xKBQW_p6SQlhUSdYqVVxhUNy4iTujfAxQupvzBgfNSBWyg/exec'
)

def get_colaboradores():
    res = requests.get(APPS_SCRIPT_URL, params={'action': 'getColaboradores'}, timeout=10)
    return res.json()

def crear_colaborador(nombre, email):
    res = requests.post(APPS_SCRIPT_URL, json={
        'action': 'crearColaborador',
        'nombre': nombre,
        'email': email
    }, timeout=10)
    return res.json()

def get_referidos(colab_id, ultimo_id=0):
    res = requests.get(
        APPS_SCRIPT_URL, 
        params={'action': 'getReferidos', 'colaborador_id': colab_id, 'ultimo_id': ultimo_id},
        timeout=10
    )
    res.raise_for_status()
    return res.json()

def verificar_colaborador(codigo):
    res = requests.get(
        APPS_SCRIPT_URL, 
        params={'action': 'verificarColaborador', 'codigo': codigo},
        timeout=10
    )
    return res.json()

def registrar_referido(data):
    if not data.get('submission_id'):
        raise ValueError('Falta el identificador del envío')
    res = requests.post(APPS_SCRIPT_URL, json={
        **data,
        'action': 'registrarReferido'
    }, timeout=10)
    res.raise_for_status()
    resultado = res.json()
    if not isinstance(resultado, dict) or resultado.get('success') is not True or resultado.get('error'):
        raise ValueError('Apps Script no confirmó el guardado del referido')
    return resultado

def editar_referido(referido_id, estado, observaciones):
    secreto = os.environ.get('APPS_SCRIPT_EDIT_SECRET')
    if not secreto:
        raise RuntimeError('Falta configurar APPS_SCRIPT_EDIT_SECRET')

    res = requests.post(
        APPS_SCRIPT_URL,
        json={
            'action': 'editarReferido',
            'id': referido_id,
            'estado': estado,
            'observaciones': observaciones,
            'edit_secret': secreto
        },
        timeout=15
    )

    res.raise_for_status()
    resultado = res.json()

    if not isinstance(resultado, dict):
        raise ValueError('Respuesta inválida de Apps Script')

    return resultado

def editar_colaborador(id, nombre, email):
    res = requests.post(APPS_SCRIPT_URL, json={
        'action': 'editarColaborador',
        'id': id,
        'nombre': nombre,
        'email': email
    }, timeout=10)
    return res.json()

def eliminar_colaborador(id):
    res = requests.post(APPS_SCRIPT_URL, json={
        'action': 'eliminarColaborador',
        'id': id
    }, timeout=10)
    return res.json()


def verificar_video_token(token):
    if not isinstance(token, str) or not token.strip() or len(token) > 256:
        return False
    res = requests.get(
        APPS_SCRIPT_URL, params={'action': 'verificarToken', 'token': token}, timeout=10
    )
    res.raise_for_status()
    resultado = res.json()
    if not isinstance(resultado, dict) or resultado.get('success') is False or 'valido' not in resultado:
        raise ValueError('Respuesta de verificación de token inválida')
    return resultado['valido'] is True


def obtener_videos():
    res = requests.get(APPS_SCRIPT_URL, params={'action': 'getVideos'}, timeout=10)
    res.raise_for_status()
    resultado = res.json()
    if not isinstance(resultado, list):
        raise ValueError('Lista de videos inválida')
    return resultado


def _guardar_video(action, **data):
    secreto = os.environ.get('APPS_SCRIPT_EDIT_SECRET')
    if not secreto:
        raise RuntimeError('Falta configurar APPS_SCRIPT_EDIT_SECRET')
    res = requests.post(
        APPS_SCRIPT_URL,
        json={'action': action, **data, 'edit_secret': secreto},
        timeout=15,
    )
    res.raise_for_status()
    resultado = res.json()
    if not isinstance(resultado, dict):
        raise ValueError('Respuesta de videos inválida')
    return resultado


def crear_video(titulo, url_youtube, orden):
    return _guardar_video('crearVideo', titulo=titulo, url_youtube=url_youtube, orden=orden)


def editar_video(video_id, titulo, url_youtube, orden):
    return _guardar_video('editarVideo', id=video_id, titulo=titulo, url_youtube=url_youtube, orden=orden)


def eliminar_video(video_id):
    return _guardar_video('eliminarVideo', id=video_id)
