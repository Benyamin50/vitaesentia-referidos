from functools import wraps

from flask import jsonify, request
from requests import RequestException
from routes.colaboradores import require_admin, require_auth
from sheets_api import obtener_videos, crear_video, editar_video, eliminar_video, verificar_video_token
from video_utils import validar_video


def require_video_access(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        if request.headers.get('X-Video-Token'):
            try:
                valido = verificar_video_token(request.headers['X-Video-Token'])
            except (RequestException, ValueError):
                return jsonify({'error': 'No se pudo verificar el acceso. Intenta nuevamente.'}), 502
            if not valido:
                return jsonify({'error': 'El enlace de acceso no es válido', 'code': 'INVALID_VIDEO_TOKEN'}), 401
            return func(*args, **kwargs)
        return require_auth(func)(*args, **kwargs)
    return decorated


def register_videos_routes(app):
    def error_servicio():
        app.logger.exception('Error comunicando con el catálogo de videos')
        return jsonify({'error': 'No se pudo completar la operación de videos. Intenta nuevamente.'}), 502

    def responder_mutacion(resultado, status=200, requiere_video=True):
        if resultado.get('success') is not True:
            codigo = resultado.get('code')
            status_error = 404 if codigo == 'NOT_FOUND' else 502
            return jsonify({'error': resultado.get('error') or 'No se pudo guardar el cambio'}), status_error
        if requiere_video:
            video = resultado.get('video')
            if not isinstance(video, dict) or not video.get('id'):
                raise ValueError('Falta el video guardado')
            resultado = {'success': True, 'video': {'id': video['id'], **validar_video(video)}}
        return jsonify(resultado), status

    @app.get('/videos')
    @require_video_access
    def listar_videos():
        try:
            videos = []
            for video in obtener_videos():
                if not isinstance(video, dict) or not video.get('id'):
                    raise ValueError('Video inválido')
                videos.append({'id': video['id'], **validar_video(video)})
            videos.sort(key=lambda video: (video['orden'], str(video['id'])))
            return jsonify(videos)
        except (RequestException, ValueError, RuntimeError):
            return error_servicio()

    @app.post('/videos')
    @require_admin
    def crear_video_route():
        try:
            data = validar_video(request.get_json(silent=True))
        except ValueError as error:
            return jsonify({'error': str(error)}), 400
        try:
            return responder_mutacion(crear_video(**data), status=201)
        except (RequestException, ValueError, RuntimeError):
            return error_servicio()

    @app.put('/videos/<string:video_id>')
    @require_admin
    def editar_video_route(video_id):
        try:
            data = validar_video(request.get_json(silent=True))
        except ValueError as error:
            return jsonify({'error': str(error)}), 400
        try:
            return responder_mutacion(editar_video(video_id, **data))
        except (RequestException, ValueError, RuntimeError):
            return error_servicio()

    @app.delete('/videos/<string:video_id>')
    @require_admin
    def eliminar_video_route(video_id):
        try:
            return responder_mutacion(eliminar_video(video_id), requiere_video=False)
        except (RequestException, ValueError, RuntimeError):
            return error_servicio()
